"""Land change after the Kakhovka dam breach (6 Jun 2023), for POWERLINES.

Run:  python3 -I gee_landchange.py          (Earth Engine credentials in ~/.config/earthengine)
Writes:
  bed-by-year.csv      reservoir bed (OSM outline, 1 May 2023): water km² and green-vegetation km², late summer 2019–2026
  pond-by-month.csv    ZNPP cooling pond + channels: water km² per month, Jan 2022 – Nov 2026 (cloud-screened)
  change-stats.csv     mean late-summer NDVI / NDMI by zone (bed, south-bank land, north-bank land), baseline vs after
  maps/ndvi-change.png, maps/ndmi-change.png, maps/ndvi-2021.png, maps/ndvi-2025.png, maps/bounds.json
                       (EPSG:4326 PNGs for the film; change = mean 2024–2026 minus mean 2019–2022)

Method
- Sentinel-2 L2A harmonized; SCL mask (cloud, shadow, cirrus, snow removed); late-summer median 15 Jul–31 Aug.
- NDVI = (B8−B4)/(B8+B4). NDMI = (B8−B11)/(B8+B11) — canopy/soil moisture proxy; falls as land dries.
- Water = MNDWI (B3−B11)/(B3+B11) > 0. Green = NDVI > 0.5.
- Baseline 2019–2022 (pre-breach; 2022 is wartime but the reservoir was full). After = 2024–2026.
  2023 is excluded from both: the breach happened mid-season.
- Cooling pond: OSM way 21507833 buffered 250 m (to include channels and lost shoreline); monthly median of
  scenes with <30% cloud over the area; months with <60% valid pixels are dropped.
Limits: annual composites hide within-season change; NDMI is affected by harvest timing and bare soil;
the bed outline is OSM's 2023 water polygon, so 'bed' includes former shallows only as mapped there."""
import csv, json, os, urllib.request
from pathlib import Path
import ee

HERE = Path(__file__).resolve().parent
R = HERE.parent
d = json.load(open(os.path.expanduser("~/.config/earthengine/credentials")))
ee.Initialize(project=os.environ.get("EE_PROJECT") or d.get("project"))

BOX = ee.Geometry.Rectangle([33.25, 46.65, 35.45, 47.95])     # Kakhovka reservoir + both banks, Nikopol–dam
bed = ee.FeatureCollection(json.loads((R / "network-scan/reservoir-2023-05-01.geojson").read_text())).geometry()
water_osm = json.loads((R / "logistics/raw/water.json").read_text())["elements"]
pond_coords = [[p["lon"], p["lat"]] for e in water_osm if e["id"] == 21507833 for p in e["geometry"]]
POND = ee.Geometry.Polygon([pond_coords]).buffer(250)
# bank zones: 0–15 km from the bed, split at the bed's mean latitude line is crude; use the river side instead:
ring = bed.buffer(15000).difference(bed.buffer(300))
north_bank = ring.intersection(ee.Geometry.Polygon([[[33.25, 47.95], [35.45, 47.95], [35.45, 47.55], [34.0, 47.35], [33.25, 46.95]]]))
south_bank = ring.difference(north_bank)
ZONES = {"reservoir bed": bed, "north bank 0-15 km": north_bank, "south bank 0-15 km": south_bank}


def s2(start, end, region, cloud=40):
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(region).filterDate(start, end)
           .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud)))
    def mask(i):
        scl = i.select("SCL")
        ok = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
        return i.updateMask(ok).divide(10000)
    return col.map(mask)


def indices(img):
    return ee.Image.cat(img.normalizedDifference(["B8", "B4"]).rename("ndvi"),
                        img.normalizedDifference(["B8", "B11"]).rename("ndmi"),
                        img.normalizedDifference(["B3", "B11"]).rename("mndwi"))


def summer(y):
    return indices(s2(f"{y}-07-15", f"{y}-08-31", BOX).median())


YEARS = list(range(2019, 2027))
area = ee.Image.pixelArea().divide(1e6)

# ---- 1. reservoir bed by year ----
rows = []
for y in YEARS:
    im = summer(y)
    st = ee.Image.cat(area.updateMask(im.select("mndwi").gt(0)).rename("water"),
                      area.updateMask(im.select("ndvi").gt(0.5)).rename("green")).reduceRegion(
        ee.Reducer.sum(), bed, 60, maxPixels=1e10, bestEffort=True).getInfo()
    nd = im.select("ndvi").reduceRegion(ee.Reducer.mean(), bed, 60, maxPixels=1e10, bestEffort=True).getInfo()
    rows.append({"year": y, "water_km2": round(st["water"], 1), "green_km2": round(st["green"], 1), "ndvi_mean": round(nd["ndvi"], 3)})
    print("bed", rows[-1], flush=True)
with open(HERE / "bed-by-year.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

# ---- 2. zone means baseline vs after ----
def mean_years(ys):
    return ee.ImageCollection([summer(y) for y in ys]).mean()
base, after = mean_years([2019, 2020, 2021, 2022]), mean_years([2024, 2025, 2026])
rows = []
for name, g in ZONES.items():
    b = base.select(["ndvi", "ndmi"]).reduceRegion(ee.Reducer.mean(), g, 100, maxPixels=1e10, bestEffort=True).getInfo()
    a = after.select(["ndvi", "ndmi"]).reduceRegion(ee.Reducer.mean(), g, 100, maxPixels=1e10, bestEffort=True).getInfo()
    rows.append({"zone": name, "ndvi_2019_22": round(b["ndvi"], 3), "ndvi_2024_26": round(a["ndvi"], 3),
                 "ndmi_2019_22": round(b["ndmi"], 3), "ndmi_2024_26": round(a["ndmi"], 3)})
    print("zone", rows[-1], flush=True)
with open(HERE / "change-stats.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

# ---- 3. maps ----
(HERE / "maps").mkdir(exist_ok=True)
REGION = BOX
div = {"min": -0.35, "max": 0.35, "palette": ["8c2d04", "cc4c02", "ec7014", "fdae61", "f7f7f7", "a6d96a", "41ab5d", "1a9850", "00441b"]}
seq = {"min": 0.0, "max": 0.8, "palette": ["3b2a1a", "7a5a2e", "b59b5a", "d9d38a", "9fcf6a", "4caf50", "1b7a34"]}
maps = {
    "ndvi-change": after.select("ndvi").subtract(base.select("ndvi")).visualize(**div),
    "ndmi-change": after.select("ndmi").subtract(base.select("ndmi")).visualize(**div),
    "ndvi-2021": summer(2021).select("ndvi").visualize(**seq),
    "ndvi-2025": summer(2025).select("ndvi").visualize(**seq),
}
for k, img in maps.items():
    url = img.getThumbURL({"region": REGION, "dimensions": 2048, "crs": "EPSG:4326", "format": "png"})
    urllib.request.urlretrieve(url, HERE / "maps" / f"{k}.png"); print("map", k, flush=True)
(HERE / "maps" / "bounds.json").write_text(json.dumps({"west": 33.25, "south": 46.65, "east": 35.45, "north": 47.95}))

# ---- 4. cooling pond by month ----
rows = []
months = [(y, m) for y in range(2022, 2027) for m in range(1, 13) if (y, m) <= (2026, 11)]
for y, m in months:
    start = ee.Date.fromYMD(y, m, 1)
    col = s2(start, start.advance(1, "month"), POND, cloud=30)
    n = col.size().getInfo()
    if n == 0: continue
    im = indices(col.median())
    st = ee.Image.cat(area.updateMask(im.select("mndwi").gt(0)).rename("water"),
                      area.updateMask(im.select("mndwi").mask()).rename("valid")).reduceRegion(
        ee.Reducer.sum(), POND, 10, maxPixels=1e9).getInfo()
    total = POND.area(1).getInfo() / 1e6
    if not st.get("valid") or st["valid"] < 0.6 * total: continue
    rows.append({"month": f"{y}-{m:02d}", "water_km2": round(st["water"], 3), "scenes": n})
    print("pond", rows[-1], flush=True)
with open(HERE / "pond-by-month.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["month", "water_km2", "scenes"]); w.writeheader(); w.writerows(rows)
print("done")
