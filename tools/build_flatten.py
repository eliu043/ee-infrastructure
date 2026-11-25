"""Build models/flatten.json: where and to what height the film levels the terrain under the plant model.

The film's DEM (AWS Terrain Tiles, terrarium) is coarse and, around the plant, a surface model: the halls, the
cooling towers and the spoil heaps show as lumps and ripples, which the 3D buildings then sit on awkwardly. The film
therefore blends the DEM, inside the plant's footprint, toward a smooth "terrace" height (film.js, the `flatdem://`
protocol), and plant3d.js sets every building on that same surface. This script makes the grid both read.

    PIPE=/Users/patrickrodriguez/dev/sandbox/frame-geo-evidence-pipeline
    $PIPE/.venv/bin/python tools/build_flatten.py          # needs numpy + PIL (that project's venv has both)

Grid (40 m cells, lng/lat-aligned, row 0 = north) over the model's extent plus the feather:
- w (0-1): 1 within CORE m of the model's plan footprint (every triangle of models/znpp.glb), easing (smoothstep) to 0
  at CORE + FEATHER m. Outside, the terrain is untouched.
- t (m): the terrace height: the DEM's 25th percentile within 320 m (drops the buildings' bumps), then averaged over
  320 m, so it's smooth but still follows the site's real levels (the units' platform, the lower thermal plant).
"""

from __future__ import annotations

import base64
import io
import json
import math
import struct
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GLB, META, OUT = ROOT / "models/znpp.glb", ROOT / "models/znpp.json", ROOT / "models/flatten.json"
DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
DEM_Z, CELL, CORE, FEATHER, PCT_R, AVG_R = 14, 40.0, 90.0, 380.0, 320.0, 320.0


def mercator(lng, lat):
    s = math.sin(math.radians(lat))
    return (lng + 180) / 360, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def unmercator(x, y):
    return x * 360 - 180, math.degrees(math.atan(math.exp((0.5 - y) * 2 * math.pi))) * 2 - 90


def glb_plan(path, origin):
    """Every triangle of the GLB in lng/lat (the model's frame: +x east, +z south, metres about origin, scaled the way
    plant3d.js places it: MercatorCoordinate at the origin x meterInMercatorCoordinateUnits)."""
    b = path.read_bytes()
    jl = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bin0 = 20 + jl + 8
    def acc(i):
        a = j["accessors"][i]; v = j["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC3": 3}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        off = bin0 + v.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(b, dt, a["count"] * n, off).reshape(-1, n) if n > 1 else np.frombuffer(b, dt, a["count"], off)
    ox, oy = mercator(*origin)
    s = 1 / (40075016.68557849 * math.cos(math.radians(origin[1])))   # metres → mercator units at the origin
    tris = []
    for p in j["meshes"][0]["primitives"]:
        pos = acc(p["attributes"]["POSITION"]).astype(np.float64)
        idx = acc(p["indices"]) if "indices" in p else np.arange(len(pos))
        mx, my = ox + pos[:, 0] * s, oy + pos[:, 2] * s
        tris.append(np.stack([mx, my], 1)[idx.reshape(-1, 3)])
    return np.concatenate(tris), (ox, oy, s)


def dem_tile(z, x, y, cache={}):
    if (z, x, y) not in cache:
        with urllib.request.urlopen(DEM_URL.format(z=z, x=x, y=y), timeout=30) as r:
            a = np.asarray(Image.open(io.BytesIO(r.read())).convert("RGB"), dtype=np.float64)
        cache[(z, x, y)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return cache[(z, x, y)]


def dem_at(mx, my):
    """Bilinear DEM height at mercator points (z14 pixel centres), like the film's terrain."""
    n = 2 ** DEM_Z * 256
    px, py = mx * n - 0.5, my * n - 0.5
    x0, y0 = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - x0, py - y0
    def h(ix, iy):
        out = np.empty(ix.shape)
        for k in np.ndindex(ix.shape):
            t = dem_tile(DEM_Z, ix[k] // 256, iy[k] // 256)
            out[k] = t[iy[k] % 256, ix[k] % 256]
        return out
    return (h(x0, y0) * (1 - fx) * (1 - fy) + h(x0 + 1, y0) * fx * (1 - fy)
            + h(x0, y0 + 1) * (1 - fx) * fy + h(x0 + 1, y0 + 1) * fx * fy)


def main():
    meta = json.loads(META.read_text())
    origin = tuple(meta["origin_lnglat"])
    tris, (ox, oy, s) = glb_plan(GLB, origin)
    pad = (CORE + FEATHER + 2 * CELL) * s
    mx0, my0 = tris[..., 0].min() - pad, tris[..., 1].min() - pad
    mx1, my1 = tris[..., 0].max() + pad, tris[..., 1].max() + pad
    w_, s_ = unmercator(mx0, my1); e_, n_ = unmercator(mx1, my0)
    # lng/lat-aligned grid (what the protocol samples per DEM pixel)
    lat_c = (s_ + n_) / 2
    dlng = CELL / (111320 * math.cos(math.radians(lat_c))); dlat = CELL / 110574
    nx, ny = int(math.ceil((e_ - w_) / dlng)) + 1, int(math.ceil((n_ - s_) / dlat)) + 1
    lngs = w_ + np.arange(nx) * dlng; lats = n_ - np.arange(ny) * dlat
    LNG, LAT = np.meshgrid(lngs, lats)
    MX = (LNG + 180) / 360
    SN = np.sin(np.radians(LAT)); MY = 0.5 - np.log((1 + SN) / (1 - SN)) / (4 * np.pi)

    # footprint: grid cells under any triangle's plan (sampled densely), then the distance to it
    foot = np.zeros((ny, nx), bool)
    for k in range(len(tris)):
        t = tris[k]
        a, b, c = t[0], t[1], t[2]
        n = int(max(2, math.ceil(max(np.ptp(t[:, 0]), np.ptp(t[:, 1])) / s / (CELL / 2))))
        u, v = np.meshgrid(np.linspace(0, 1, n + 1), np.linspace(0, 1, n + 1))
        m = u + v <= 1
        pts = a + np.outer(u[m], b - a) + np.outer(v[m], c - a)
        lng = pts[:, 0] * 360 - 180
        lat = np.degrees(np.arctan(np.exp((0.5 - pts[:, 1]) * 2 * np.pi))) * 2 - 90
        ix = np.clip(np.round((lng - w_) / dlng).astype(int), 0, nx - 1)
        iy = np.clip(np.round((n_ - lat) / dlat).astype(int), 0, ny - 1)
        foot[iy, ix] = True
    # exact-enough Euclidean distance (cells) via brute force over footprint cells in chunks
    fy_, fx_ = np.nonzero(foot)
    gy, gx = np.mgrid[0:ny, 0:nx]
    d = np.full((ny, nx), np.inf)
    for i in range(0, len(fy_), 2000):
        dy = gy[..., None] - fy_[None, None, i:i + 2000]; dx = gx[..., None] - fx_[None, None, i:i + 2000]
        d = np.minimum(d, np.sqrt(dx * dx + dy * dy).min(-1))
    d *= CELL
    u = np.clip((d - CORE) / FEATHER, 0, 1)
    w = 1 - u * u * (3 - 2 * u)

    # terrace height: low percentile (bare ground under the DSM's buildings), then a smooth average
    h = dem_at(MX, MY)
    from numpy.lib.stride_tricks import sliding_window_view as win
    r1 = int(round(PCT_R / CELL)); hp = np.pad(h, r1, mode="edge")
    ww = win(hp, (2 * r1 + 1, 2 * r1 + 1))
    yy, xx = np.mgrid[-r1:r1 + 1, -r1:r1 + 1]; disk = (xx * xx + yy * yy) <= r1 * r1
    low = np.percentile(ww[..., disk], 25, axis=-1)
    r2 = int(round(AVG_R / CELL)); lp = np.pad(low, r2, mode="edge")
    yy, xx = np.mgrid[-r2:r2 + 1, -r2:r2 + 1]; disk2 = (xx * xx + yy * yy) <= r2 * r2
    t = (win(lp, (2 * r2 + 1, 2 * r2 + 1))[..., disk2]).mean(-1)

    core = w > 0.99
    print(f"grid {nx}x{ny} ({CELL:.0f} m), core cells {core.sum()}, feather cells {((w > 0) & ~core).sum()}")
    print(f"DEM in core: {h[core].min():.1f}–{h[core].max():.1f} m (sd {h[core].std():.1f}); terrace: {t[core].min():.1f}–{t[core].max():.1f} m")
    print(f"largest change in core: {np.abs(h - t)[core].max():.1f} m; mean |change| {np.abs(h - t)[core].mean():.1f} m")
    enc = lambda a: base64.b64encode(a.tobytes()).decode()
    OUT.write_text(json.dumps({
        "about": "Terrain levelling under the plant model (tools/build_flatten.py). Grid row 0 = north, cell centres at "
                 "west + i*dlng, north - j*dlat. flattened = dem + w * (t - dem); w = byte / 255; t = uint16 / 10 - 1000 (m).",
        "west": w_, "north": n_, "dlng": dlng, "dlat": dlat, "nx": nx, "ny": ny,
        "core_m": CORE, "feather_m": FEATHER,
        "w": enc(np.round(w * 255).astype(np.uint8)),
        "t": enc(np.round((t + 1000.0) * 10).astype(np.uint16)),
        "dem": "AWS Terrain Tiles (terrarium) z14", "generated_by": "tools/build_flatten.py",
    }, separators=(",", ":")))
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
