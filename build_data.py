"""Pack existing research layers into data.js for the POWERLINES film.
Run: python3 build_data.py   (from this folder)
Sources are all in ../research; nothing new is invented here."""
import json, pathlib
from shapely.geometry import shape, mapping

R = pathlib.Path(__file__).resolve().parent.parent / "research"
OUT = pathlib.Path(__file__).resolve().parent / "data.js"


def load(p):
    return json.load(open(R / p))


def simp(geom, tol):
    g = shape(geom).simplify(tol, preserve_topology=True)
    return json.loads(json.dumps(mapping(g)), parse_float=lambda s: round(float(s), 5))


def fc(features):
    return {"type": "FeatureCollection", "features": features}


layers = load("network-scan/map-layers.geojson")["features"]
grid = []
for f in layers:
    p = f["properties"]
    if p["layer"] == "power_line" and p.get("kv") in (150, 154, 330, 750):
        grid.append({"type": "Feature", "properties": {"kv": p["kv"], "name": p.get("name", "")},
                     "geometry": simp(f["geometry"], 0.0003)})

znpp = [{"type": "Feature", "properties": f["properties"], "geometry": simp(f["geometry"], 0.0001)}
        for f in load("attack-events/znpp-lines.geojson")["features"]]

zones = [{"type": "Feature", "properties": f["properties"], "geometry": simp(f["geometry"], 0.0002)}
         for f in load("attack-events/reported-damage-zones.geojson")["features"]]

res = load("network-scan/reservoir-2023-05-01.geojson")["features"][0]
reservoir = [{"type": "Feature", "properties": {"name": "Kakhovka reservoir, OSM 2023-05-01"},
              "geometry": simp(res["geometry"], 0.0006)}]

canals = [{"type": "Feature", "properties": {"name": f["properties"]["name"]}, "geometry": simp(f["geometry"], 0.0005)}
          for f in load("canals-ndvi/canals-main.geojson")["features"]]

ucdp = []
for f in load("attack-events/ucdp-events-precise.geojson")["features"]:
    p = f["properties"]
    ucdp.append({"type": "Feature",
                 "properties": {"d": p["date"], "w": p["where_coordinates"], "best": p.get("best", 0),
                                "civ": p.get("deaths_civilians", 0)},
                 "geometry": {"type": "Point", "coordinates": [round(p["longitude"], 4), round(p["latitude"], 4)]}})

power = load("network-scan/znpp-offsite-power.json")

# --- logistics (research/logistics: OSM roads + shortest-path routes) ---
roads = [{"type": "Feature", "properties": {"hw": f["properties"]["hw"]}, "geometry": simp(f["geometry"], 0.0008)}
         for f in load("logistics/roads-major.geojson")["features"] if f["properties"]["hw"] in ("motorway", "trunk", "primary")]
routes = [{"type": "Feature", "properties": {k: f["properties"][k] for k in ("kind", "from", "to", "road_km", "km_within_20km_of_river_front")},
           "geometry": simp(f["geometry"], 0.0002)} for f in load("logistics/routes.geojson")["features"]]

# --- plant water (OSM, research/logistics/raw/water.json) ---
water = []
for e in load("logistics/raw/water.json")["elements"]:
    t, g = e.get("tags", {}), [(p["lon"], p["lat"]) for p in e.get("geometry", [])]
    if len(g) < 2: continue
    kind = ("pond" if e["id"] == 21507833 else "spray" if t.get("description") == "bassin de refrigération"
            else "canal" if t.get("waterway") == "canal" or t.get("water") == "canal" else None)
    if not kind: continue
    closed = g[0] == g[-1] and len(g) > 3
    geom = {"type": "Polygon", "coordinates": [g]} if closed else {"type": "LineString", "coordinates": g}
    water.append({"type": "Feature", "properties": {"k": kind, "osm": e["id"]}, "geometry": simp(geom, 0.00005)})

railMain = [{"type": "Feature", "properties": {"u": f["properties"]["usage"]}, "geometry": simp(f["geometry"], 0.0008)}
            for f in load("logistics/rail-main.geojson")["features"]]
railDisused = load("logistics/rail-disused-branch.geojson")["features"]
supplyEvents = load("logistics/supply-events.geojson")["features"]
wells = load("logistics/wells-zone.geojson")["features"]
fort = load("fortifications/fortifications-2025.geojson")["features"]
cand = pathlib.Path(__file__).resolve().parent.parent / "research/logistics/wells-candidates.geojson"
wellCandidates = json.load(open(cand))["features"] if cand.exists() else []

# --- land change (research/land-change, Earth Engine) ---
import csv, shutil
LC = R / "land-change"
landchange = None
if (LC / "maps/bounds.json").exists():
    out = pathlib.Path(__file__).resolve().parent / "landchange"; out.mkdir(exist_ok=True)
    from PIL import Image
    for p in (LC / "maps").glob("*.png"):                       # ~4.5 MB PNG -> ~1 MB JPEG for the browser
        Image.open(p).convert("RGB").save(out / (p.stem + ".jpg"), quality=86)
    landchange = {"bounds": json.load(open(LC / "maps/bounds.json"))}
    if (LC / "pond-by-month.csv").exists():
        pond = [[r["month"], float(r["water_km2"])] for r in csv.DictReader(open(LC / "pond-by-month.csv"))]
        # drop cloud/snow artefacts: months >10% below the median of their 4 neighbours
        import statistics
        keep = []
        for i, (m, v) in enumerate(pond):
            nb = [x[1] for x in pond[max(0, i - 2):i] + pond[i + 1:i + 3]]
            if v >= 0.9 * statistics.median(nb): keep.append([m, v])
            else: print("pond: dropped outlier", m, v)
        landchange["pond"] = keep
    if (LC / "bed-by-year.csv").exists():
        landchange["bed"] = [{k: (float(v) if k != "year" else int(v)) for k, v in r.items()} for r in csv.DictReader(open(LC / "bed-by-year.csv"))]

data = {
    "grid": fc(grid), "znpp": fc(znpp), "zones": fc(zones), "reservoir": fc(reservoir),
    "canals": fc(canals), "ucdp": fc(ucdp), "power": power, "landchange": landchange,
    "roads": fc(roads), "routes": fc(routes), "water": fc(water),
    "railMain": fc(railMain), "railDisused": fc(railDisused), "supplyEvents": fc(supplyEvents),
    "wells": fc(wells), "fort": fc([{"type": "Feature", "geometry": f["geometry"], "properties": {"kind": f["properties"]["kind"]}} for f in fort]), "wellCandidates": fc(wellCandidates),
}
OUT.write_text("// generated by build_data.py from ../research — do not edit\nwindow.PL_DATA=" +
               json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
print(OUT, OUT.stat().st_size // 1024, "KB", {k: len(v["features"]) for k, v in data.items() if isinstance(v, dict) and "features" in v})
