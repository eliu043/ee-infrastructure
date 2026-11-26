"""Pre-war night lights over Ukraine for the Winter slide of POWERLINES.

Method follows the studio's EE_VIIRS toolkit script (Kakhovka night lights):
  NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG, band avg_rad, median of monthly composites,
  matplotlib-inferno palette, stretch 0 .. 98th percentile.
Changes: area = Ukraine and neighbours (the film's national view); months = Sep–Nov 2021
(pre-war autumn, "as winter approaches"). Winter months are avoided because snow brightens the
composites: Jan 2026 sums about as bright as Jan 2022 over Ukraine, which is not credible.
Stretch: the toolkit's linear 0..p98 does not carry to a whole country (p98 over Ukraine's mostly dark land
falls below 2 nW/cm²/sr, so every village saturates and the background turns purple). Here: log stretch
from a 0.5 nW floor (background airglow/noise → black) to 60 nW (city centres), same inferno palette.

Run:  python3 -I gee_nightlights.py
Writes: viirs-2021-autumn.png (EPSG:3857, so it drapes exactly on the web map), bounds.json, stats.json
"""
import json, os, urllib.request
from pathlib import Path
import ee

HERE = Path(__file__).resolve().parent
d = json.load(open(os.path.expanduser("~/.config/earthengine/credentials")))
ee.Initialize(project=os.environ.get("EE_PROJECT") or d.get("project"))

W, S, E, N = 21.5, 43.5, 41.5, 53.5
REGION = ee.Geometry.Rectangle([W, S, E, N], None, False)
UA = ee.FeatureCollection("FAO/GAUL/2015/level0").filter(ee.Filter.eq("ADM0_NAME", "Ukraine")).geometry()
INFERNO = ["000004", "1b0c41", "4a0c6b", "781c6d", "a52c60", "cf4446", "ed6925", "fb9b06", "f7d13d", "fcffa4"]

viirs = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").select("avg_rad")
img = viirs.filterDate("2021-09-01", "2021-12-01").median()
FLOOR, CEIL = 0.5, 60.0
vis = img.subtract(FLOOR).max(0).add(1).log().divide(float(__import__('math').log(1 + CEIL - FLOOR))).min(1) \
    .visualize(min=0, max=1, palette=INFERNO)
p98 = None
url = vis.getThumbURL({"region": REGION, "dimensions": 2400, "crs": "EPSG:3857", "format": "png"})
urllib.request.urlretrieve(url, HERE / "viirs-2021-autumn.png")
(HERE / "bounds.json").write_text(json.dumps({"west": W, "south": S, "east": E, "north": N}))
(HERE / "stats.json").write_text(json.dumps({"collection": "NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG", "band": "avg_rad",
    "months": "2021-09..2021-11", "reducer": "median", "stretch": "log", "floor_nW": FLOOR, "ceiling_nW": CEIL}, indent=1))
print("done")
