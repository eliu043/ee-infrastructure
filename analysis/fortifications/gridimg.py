"""Render Esri World Imagery for a lon/lat box with a labelled coordinate grid (for tracing).
usage: python3 gridimg.py lon0 lat0 lon1 lat1 step out.jpg [width]"""
import sys, io, urllib.request
from PIL import Image, ImageDraw
lon0, lat0, lon1, lat1, step = map(float, sys.argv[1:6]); out = sys.argv[6]; W = int(sys.argv[7]) if len(sys.argv) > 7 else 1600
import math
# ArcGIS export keeps pixels square in the output SR, so request square-degree pixels, then stretch for display
Hdeg = int(round(W * (lat1 - lat0) / (lon1 - lon0)))
H = int(round(Hdeg / math.cos(math.radians((lat0 + lat1) / 2))))
u = (f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox={lon0},{lat0},{lon1},{lat1}"
     f"&bboxSR=4326&imageSR=4326&size={W},{Hdeg}&format=jpg&f=image")
im = Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=60).read())).convert("RGB").resize((W, H))
d = ImageDraw.Draw(im)
px = lambda lo: (lo - lon0) / (lon1 - lon0) * W
py = lambda la: (lat1 - la) / (lat1 - lat0) * H
v = math.ceil(lon0 / step) * step
while v < lon1:
    x = px(v); d.line([(x, 0), (x, H)], fill=(255, 255, 0), width=1); d.text((x + 2, 2), f"{v:.4f}", fill=(255, 255, 0)); v += step
v = math.ceil(lat0 / step) * step
while v < lat1:
    y = py(v); d.line([(0, y), (W, y)], fill=(0, 255, 255), width=1); d.text((2, y + 2), f"{v:.4f}", fill=(0, 255, 255)); v += step
im.save(out, quality=90); print(out, im.size)
