"""Export the Zaporizhzhia NPP model (solid, as-photographed colours) to models/znpp.glb for the film.

The geometry and colours are NOT made here: they come from frame-geo-evidence-pipeline's procedural model,
src/image_evidence/satellite/scene3d/plant.py (`plant.build`), the solid, as-photographed version (red-brown
containments, white vent stacks with a red band, the red-and-white special chimney, rust-brown cooling towers, the
thermal plant's dark banded chimneys). Not the ghosted shot (research_notes/Visual pass 1/scripts/shot_plant_ghosted.py),
which greys the domes and adds the IAEA's red marks.

Run it with that project's venv (it needs numpy + PIL), from anywhere:

    PIPE=/Users/patrickrodriguez/dev/sandbox/frame-geo-evidence-pipeline
    $PIPE/.venv/bin/python tools/export_plant_glb.py --pipeline $PIPE

It (1) builds the mesh from the pipeline's saved OpenStreetMap reply (raw/osm_plant.json), keeping the nuclear site,
its 750 kV switchyard and the thermal plant (not Enerhodar's housing), in local metres about ORIGIN; (2) sets each
building on the AWS Terrain Tiles (terrarium, z14: the DEM the film draws), relative to the ground at ORIGIN, so the
film only has to lift the whole model to the terrain there; (3) runs Blender headless (this same file, `blender -b -P`)
to triangulate, smooth by angle and write a GLB with one flat material per colour.

Frame: glTF's usual Y-up: +x east, +y up, +z south, metres. models/znpp.json records the origin and the base height.
Data © OpenStreetMap contributors (ODbL). Heights and the turbine halls as plant.py says (representative / inferred).
"""

from __future__ import annotations

import argparse
import io
import json
import math
import subprocess
import sys
import urllib.request
from pathlib import Path

ORIGIN = (34.5881, 47.5102)        # lng, lat: the film's P.znpp
KEEP = (34.562, 47.4955, 34.6385, 47.527)   # west, south, east, north: the site, cooling towers, switchyards, thermal plant
DEM_Z = 14
DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
BLENDER = "/Users/patrickrodriguez/.local/bin/blender"
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "models"
CROSSING = "libraries/conductive-seam/satellite/networks/znpp/scenes/crossing3d"


# ------------------------------------------------------------------ step 1-2: the mesh (pipeline venv)

def metres_per_degree(lat: float) -> tuple[float, float]:
    p = math.radians(lat)
    return (111412.84 * math.cos(p) - 93.5 * math.cos(3 * p),
            111132.954 - 559.822 * math.cos(2 * p) + 1.175 * math.cos(4 * p))


class Terrarium:
    """Bilinear heights (m) from the terrarium tiles at DEM_Z, cached in memory."""

    def __init__(self, cache: Path) -> None:
        self.tiles: dict[tuple[int, int], object] = {}
        self.cache = cache
        cache.mkdir(parents=True, exist_ok=True)

    def _tile(self, x: int, y: int):
        import numpy as np
        from PIL import Image
        if (x, y) not in self.tiles:
            f = self.cache / f"{DEM_Z}_{x}_{y}.png"
            if not f.is_file():
                req = urllib.request.Request(DEM_URL.format(z=DEM_Z, x=x, y=y), headers={"User-Agent": "plant-export"})
                f.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            a = np.asarray(Image.open(io.BytesIO(f.read_bytes())).convert("RGB"), dtype=np.float64)
            self.tiles[(x, y)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        return self.tiles[(x, y)]

    def at(self, lng: float, lat: float) -> float:
        n = 2 ** DEM_Z
        fx = (lng + 180) / 360 * n * 256
        s = math.sin(math.radians(lat))
        fy = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n * 256
        x0, y0 = math.floor(fx - 0.5), math.floor(fy - 0.5)
        u, v = fx - 0.5 - x0, fy - 0.5 - y0

        def px(X: int, Y: int) -> float:
            return float(self._tile(X // 256, Y // 256)[Y % 256, X % 256])
        return ((1 - u) * (1 - v) * px(x0, y0) + u * (1 - v) * px(x0 + 1, y0)
                + (1 - u) * v * px(x0, y0 + 1) + u * v * px(x0 + 1, y0 + 1))


def build_mesh(pipe: Path, tmp: Path) -> Path:
    import numpy as np
    sys.path.insert(0, str(pipe / "src"))
    from image_evidence.satellite.scene3d import plant   # the solid, as-photographed model

    reply = json.loads((pipe / CROSSING / "raw" / "osm_plant.json").read_text())
    w, s, e, n = KEEP

    def keep(el: dict) -> bool:
        t = el.get("tags", {})
        if t.get("power") == "plant" and t.get("plant:source") == "nuclear":
            return True                       # plant.build needs the site's outline
        if el["type"] == "node":
            return w <= el["lon"] <= e and s <= el["lat"] <= n
        g = el.get("geometry") or []
        if not g:
            return False
        lon = sum(p["lon"] for p in g) / len(g)
        lat = sum(p["lat"] for p in g) / len(g)
        return w <= lon <= e and s <= lat <= n

    kept = [el for el in reply["reply"]["elements"] if keep(el)]
    sub = {**reply, "reply": {**reply["reply"], "elements": kept}}

    lng0, lat0 = ORIGIN
    mx, my = metres_per_degree(lat0)

    def xy(rows):
        a = np.asarray(rows, float).reshape(-1, 2)
        return np.c_[(a[:, 0] - lng0) * mx, (a[:, 1] - lat0) * my]

    dem = Terrarium(tmp / "dem")
    base = dem.at(lng0, lat0)

    def ground(q) -> float:
        return dem.at(lng0 + float(q[0]) / mx, lat0 + float(q[1]) / my) - base

    m, doc = plant.build(sub, xy, ground)
    arrs = m.arrays()
    # each vertex's ground (m above the ground at ORIGIN): the film lifts vertices by (exaggeration - 1) x this,
    # so every building stays on the exaggerated terrain, not only the one at the origin
    gv = np.array([ground(q) for q in arrs["v"][:, :2]], np.float32)
    npz = tmp / "znpp_mesh.npz"
    np.savez(npz, **arrs, ground=gv, mat_rgb=np.array([plant.MATERIALS[k][1] for k in sorted(plant.MATERIALS)], np.float32))
    v = arrs["v"]
    meta = {
        "file": "znpp.glb",
        "origin_lnglat": [lng0, lat0],
        "base_elevation_m": round(base, 2),
        "frame": "glTF Y-up: +x east, +y up, +z south; metres; y relative to the terrain at the origin",
        "ground_attribute": "_GROUND: each vertex's terrain height relative to the origin's (m); lift by (exaggeration - 1) x _GROUND",
        "terrain": f"AWS Terrain Tiles (terrarium) z{DEM_Z}, the DEM the film draws",
        "extent_m": {"x": [float(v[:, 0].min()), float(v[:, 0].max())], "north": [float(v[:, 1].min()), float(v[:, 1].max())],
                     "up": [float(v[:, 2].min()), float(v[:, 2].max())]},
        "kept_bbox": KEEP, "osm_elements_kept": len(kept),
        "materials": {plant.MATERIALS[k][0]: plant.MATERIALS[k][1] for k in sorted(plant.MATERIALS)},
        "source": "frame-geo-evidence-pipeline src/image_evidence/satellite/scene3d/plant.py (plant.build: solid, "
                  "as-photographed colours; not the ghosted shot)",
        "osm": f"{CROSSING}/raw/osm_plant.json, © OpenStreetMap contributors (ODbL)",
        "counts": doc["counts"], "heights": doc["heights"], "statement": doc["statement"],
        "generated_by": "tools/export_plant_glb.py",
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "znpp.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    print(f"mesh: {len(v)} vertices, {len(arrs['counts'])} faces, {len(kept)} OSM elements; base {base:.1f} m")
    return npz


# ------------------------------------------------------------------ step 3: Blender (blender -b -P this file -- npz glb)

def blender_main(npz: str, glb: str) -> None:
    import bmesh
    import bpy
    import numpy as np

    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    d = np.load(npz)
    v, loops, counts, mat, rgb = d["v"], d["loops"], d["counts"], d["mat"], d["mat_rgb"]
    starts = np.r_[0, np.cumsum(counts)[:-1]]
    faces = [loops[a:a + c].tolist() for a, c in zip(starts, counts)]
    me = bpy.data.meshes.new("znpp")
    me.from_pydata(v.tolist(), [], faces)
    me.validate(clean_customdata=False)
    ga = me.attributes.new("_GROUND", "FLOAT", "POINT")
    ga.data.foreach_set("value", d["ground"].astype(float).tolist())
    used = sorted(set(mat.tolist()))
    slot = {k: i for i, k in enumerate(used)}
    for k in used:
        m = bpy.data.materials.new(f"m{k}")
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*[float(c) for c in rgb[k]], 1.0)   # linear, as plant.py gives them
        b.inputs["Roughness"].default_value = 0.95
        b.inputs["Metallic"].default_value = 0.0
        me.materials.append(m)
    me.polygons.foreach_set("material_index", [slot[int(k)] for k in mat])
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    for f in bm.faces:
        f.smooth = True
    for ed in bm.edges:     # smooth round the towers and domes, sharp at the boxes' corners
        if len(ed.link_faces) != 2 or ed.calc_face_angle(math.pi) > math.radians(32) or \
                ed.link_faces[0].material_index != ed.link_faces[1].material_index:
            ed.smooth = False
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("znpp", me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_yup=True, export_apply=True,
                              export_normals=True, export_texcoords=False, export_materials="EXPORT",
                              export_cameras=False, export_lights=False, export_extras=False, export_attributes=True)
    print(f"glb: {len(me.polygons)} triangles -> {glb}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline", type=Path, default=Path("/Users/patrickrodriguez/dev/sandbox/frame-geo-evidence-pipeline"))
    ap.add_argument("--tmp", type=Path, default=HERE / ".cache")
    a = ap.parse_args()
    a.tmp.mkdir(exist_ok=True)
    npz = build_mesh(a.pipeline, a.tmp)
    glb = OUT / "znpp.glb"
    subprocess.run([BLENDER, "-b", "--factory-startup", "-noaudio", "-P", __file__, "--", str(npz), str(glb)], check=True)
    print(f"{glb}: {glb.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    if "bpy" in sys.modules:   # running inside Blender
        blender_main(*sys.argv[sys.argv.index("--") + 1:])
    else:
        main()
