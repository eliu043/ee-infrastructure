"""Supply-corridor screen: rail route to the plant, and recorded violence along road and rail routes.

Input : raw/rail.json (OSM railway=rail, Overpass 2026-11-24), routes.geojson (analyze_roads.py),
        ../attack-events/raw/ged261-csv.zip (UCDP GED 26.1) + GEDEvent_v26_01_26_09.csv (UCDP candidate, 2026).
Output: rail-route.geojson, rail-main.geojson, supply-events.geojson, supply-summary.json

Limits: UCDP records only events with at least one death, geolocated often to a settlement or district
centroid (we keep where_prec 1–2: exact place or within ~25 km). It is not a record of shelling of
roads or railways as such; it shows that the corridors run through places where lethal violence was
recorded. Rail path is the shortest track distance in OSM and says nothing about which lines operate."""
import csv, io, json, math, pathlib, zipfile
import networkx as nx
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform

H = pathlib.Path(__file__).resolve().parent
R = H.parent
KX, KY = 111.32 * math.cos(math.radians(47.3)), 110.57
to_km = lambda x, y, z=None: (x * KX, y * KY)
d_km = lambda a, b: math.hypot((b[0] - a[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (b[1] - a[1]) * 110.57)

# ---------- rail graph ----------
G, main = nx.Graph(), []
for w in json.load(open(H / "raw/rail.json"))["elements"]:
    g = [(round(p["lon"], 6), round(p["lat"], 6)) for p in w.get("geometry", [])]
    if w["tags"].get("service") in ("yard", "crossover"): continue
    for a, b in zip(g, g[1:]): G.add_edge(a, b, w=d_km(a, b))
    if w["tags"].get("usage") in ("main", "branch") and len(g) > 1:
        main.append({"type": "Feature", "properties": {"usage": w["tags"]["usage"]}, "geometry": mapping(LineString(g).simplify(0.0006))})
comp = sorted(nx.connected_components(G), key=len, reverse=True)
nodes = [n for c in comp if len(c) > 100 for n in c]
snap = lambda ll: min(nodes, key=lambda n: (n[0] - ll[0]) ** 2 + (n[1] - ll[1]) ** 2)

MELITOPOL_STN = (35.3653, 46.8489)
ZNPP = (34.5881, 47.5102)
a, b = snap(MELITOPOL_STN), snap(ZNPP)
rail = None
if nx.has_path(G, a, b):
    path = nx.shortest_path(G, a, b, weight="w")
    rail = LineString(path)
    rail_km = sum(G[u][v]["w"] for u, v in zip(path, path[1:]))
    print(f"rail Melitopol → plant: {rail_km:.1f} km (snap {d_km(MELITOPOL_STN, a):.2f} / {d_km(ZNPP, b):.2f} km) end {b}")
else:
    print("rail: no connected railway=rail path to the plant in OSM; the Enerhodar branch is tagged "
          "railway=disused (see rail-disused-branch.geojson, fetched separately)")

# ---------- UCDP events ----------
ev = []
def take(rows):
    for r in rows:
        if r.get("country") != "Ukraine" or r.get("where_prec") not in ("1", "2"): continue
        lo, la = float(r["longitude"]), float(r["latitude"])
        if 46.0 <= la <= 48.0 and 33.8 <= lo <= 36.0:
            ev.append({"id": r["id"], "date": r["date_start"][:10], "lon": lo, "lat": la, "where": r["where_coordinates"],
                       "prec": int(r["where_prec"]), "best": int(float(r["best"] or 0))})
z = zipfile.ZipFile(R / "attack-events/raw/ged261-csv.zip")
take(csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8")))
take(csv.DictReader(open(R / "attack-events/raw/GEDEvent_v26_01_26_09.csv", encoding="utf-8")))
seen, uniq = set(), []
for e in ev:
    if e["id"] not in seen: seen.add(e["id"]); uniq.append(e)
ev = [e for e in uniq if e["date"] >= "2022-02-24"]
print("UCDP events in corridor bbox since 24 Feb 2022:", len(ev))

routes = {f["properties"]["from"]: shape(f["geometry"]) for f in json.load(open(H / "routes.geojson"))["features"] if f["properties"]["kind"] == "diesel"}
corr = {"road: Melitopol → ZNPP": routes["Melitopol"]}
if rail is not None: corr["rail: Melitopol → plant"] = rail

BUF = 2.0
summary, feats = [], []
for name, line in corr.items():
    lk = transform(to_km, line)
    near = [e for e in ev if lk.distance(Point(to_km(e["lon"], e["lat"]))) <= BUF]
    by_year = {}
    for e in near: by_year[e["date"][:4]] = by_year.get(e["date"][:4], 0) + 1
    locs = {}
    for e in near: locs[e["where"]] = locs.get(e["where"], 0) + 1
    row = {"corridor": name, "km": round(lk.length, 1), "buffer_km": BUF, "events": len(near),
           "deaths_best": sum(e["best"] for e in near), "by_year": dict(sorted(by_year.items())),
           "top_locations": sorted(locs.items(), key=lambda x: -x[1])[:8]}
    summary.append(row); print(json.dumps(row, ensure_ascii=False))
    for e in near:
        feats.append({"type": "Feature", "properties": {"corridor": name.split(":")[0], "d": e["date"], "w": e["where"], "best": e["best"]},
                      "geometry": {"type": "Point", "coordinates": [round(e["lon"], 4), round(e["lat"], 4)]}})

if rail is not None:
    json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"kind": "rail", "from": "Melitopol", "to": "ZNPP", "km": round(rail_km, 1)},
               "geometry": mapping(rail.simplify(0.0002))}]}, open(H / "rail-route.geojson", "w"))
json.dump({"type": "FeatureCollection", "features": main}, open(H / "rail-main.geojson", "w"))
json.dump({"type": "FeatureCollection", "features": feats}, open(H / "supply-events.geojson", "w"))
json.dump({"method": __doc__.strip(), "corridors": summary}, open(H / "supply-summary.json", "w"), indent=1, ensure_ascii=False)
