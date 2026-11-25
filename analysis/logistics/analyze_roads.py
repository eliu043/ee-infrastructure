"""Road-access screen for ZNPP: diesel supply and line-repair routes.

Input : raw/roads.json (OSM motorway–secondary for the region, tertiary near the plant;
        fetched by fetch_roads.sh), ../attack-events/reported-damage-zones.geojson,
        ../network-scan/reservoir-2023-05-01.geojson (frontline proxy).
Output: routes.geojson, roads-major.geojson, summary.json

Method: an undirected graph of OSM ways (nodes = shared vertices), edge weight = length.
Shortest paths by distance, not travel time. The graph knows nothing about checkpoints,
closed bridges, mined roads or the frontline itself, so routes are *possible* road
geometry, not observed convoy movements. Exposure = route km within 10 / 20 km of the
2023 reservoir outline, used as a proxy for the river frontline only (the eastern
land front near Kamianske/Orikhiv is not modelled)."""
import json, math, pathlib
import networkx as nx
from shapely.geometry import LineString, Point, shape, mapping
from shapely.ops import transform, unary_union

H = pathlib.Path(__file__).resolve().parent
R = H.parent
LAT0 = 47.5
KX, KY = 111.32 * math.cos(math.radians(LAT0)), 110.57
to_km = lambda x, y, z=None: (x * KX, y * KY)
to_ll = lambda x, y, z=None: (x / KX, y / KY)


def dist_km(a, b):
    return math.hypot((b[0] - a[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (b[1] - a[1]) * 110.57)


osm = json.load(open(H / "raw/roads.json"))["elements"]
G = nx.Graph()
major = []
for w in osm:
    g = [(round(p["lon"], 6), round(p["lat"], 6)) for p in w.get("geometry", [])]
    hw = w["tags"].get("highway", "")
    for a, b in zip(g, g[1:]):
        G.add_edge(a, b, w=dist_km(a, b), hw=hw, ref=w["tags"].get("ref", ""), name=w["tags"].get("name", ""))
    if hw in ("motorway", "trunk", "primary", "secondary") and len(g) > 1:
        major.append({"type": "Feature", "properties": {"hw": hw, "ref": w["tags"].get("ref", "")},
                      "geometry": mapping(LineString(g).simplify(0.0004))})
comps = sorted(nx.connected_components(G), key=len, reverse=True)
print("graph:", G.number_of_nodes(), "nodes;", "largest components:", [len(c) for c in comps[:5]])
nodes = [n for c in comps if len(c) > 200 for n in c]   # ignore tiny fragments when snapping


def snap(ll):
    return min(nodes, key=lambda n: (n[0] - ll[0]) ** 2 + (n[1] - ll[1]) ** 2)


zones = {f["properties"]["id"]: shape(f["geometry"]) for f in json.load(open(R / "attack-events/reported-damage-zones.geojson"))["features"]}
front = shape(json.load(open(R / "network-scan/reservoir-2023-05-01.geojson"))["features"][0]["geometry"])
front_km = transform(to_km, front).boundary
buf10, buf20 = front_km.buffer(10), front_km.buffer(20)

P = {"Melitopol": (35.3653, 46.8489), "Chonhar (Crimea)": (34.53, 46.03), "ZNPP": (34.5881, 47.5102),
     "Enerhodar": (34.6567, 47.4986), "Nikopol": (34.3956, 47.5712), "Marhanets": (34.6167, 47.6417), "Dnipro": (35.05, 48.46)}


def zpt(z, near):
    """Point of a damage zone closest to the crew's origin (zones are bands, not points)."""
    g = zones[z]
    from shapely.ops import nearest_points
    return nearest_points(g, Point(near))[0].coords[0]


ROUTES = [
    ("diesel", "Melitopol", P["Melitopol"], "ZNPP", P["ZNPP"], "Diesel and supplies from the occupied hinterland"),
    ("diesel", "Chonhar (Crimea)", P["Chonhar (Crimea)"], "ZNPP", P["ZNPP"], "Supply from Crimea"),
    ("crew-ru", "Enerhodar", P["Enerhodar"], "Z2 switchyard", zpt("Z2", P["Enerhodar"]), "Russian-side repairs"),
    ("crew-ua", "Nikopol", P["Nikopol"], "Z1 north bank", zpt("Z1", P["Nikopol"]), "Ukrainian-side repairs"),
    ("crew-ua", "Marhanets", P["Marhanets"], "Z10 (~10 km from switchyard)", zpt("Z10", P["Marhanets"]), "Ukrainian-side repairs"),
    ("crew-ua", "Dnipro", P["Dnipro"], "Z4 Dniprovska substation", zpt("Z4", P["Dnipro"]), "Ukrainian-side repairs"),
]

feats, summary = [], []
for kind, oname, o, dname, d, note in ROUTES:
    a, b = snap(o), snap(d)
    snap_km = max(dist_km(o, a), dist_km(d, b))
    if not nx.has_path(G, a, b):
        print(f"{kind:8} {oname:>17} → {dname:<30} NO CONNECTED ROAD PATH in this network"); continue
    path = nx.shortest_path(G, a, b, weight="w")
    km = sum(G[u][v]["w"] for u, v in zip(path, path[1:]))
    line = LineString(path)
    lk = transform(to_km, line)
    refs = []
    for u, v in zip(path, path[1:]):
        r = G[u][v]["ref"]
        if r and r not in refs: refs.append(r)
    row = {"kind": kind, "from": oname, "to": dname, "road_km": round(km, 1), "straight_km": round(dist_km(o, d), 1),
           "detour": round(km / max(dist_km(o, d), 0.1), 2),
           "km_within_10km_of_river_front": round(lk.intersection(buf10).length, 1),
           "km_within_20km_of_river_front": round(lk.intersection(buf20).length, 1),
           "roads": " · ".join(refs[:8]), "note": note, "snap_km": round(snap_km, 2)}
    summary.append(row)
    feats.append({"type": "Feature", "properties": row, "geometry": mapping(line.simplify(0.0002))})
    print(f"{kind:8} {oname:>17} → {dname:<30} {km:6.1f} km road / {row['straight_km']:5.1f} km straight; "
          f"≤20 km of river front: {row['km_within_20km_of_river_front']} km  snap {row['snap_km']} km [{row['roads']}]")

json.dump({"type": "FeatureCollection", "features": feats}, open(H / "routes.geojson", "w"))
json.dump({"type": "FeatureCollection", "features": major}, open(H / "roads-major.geojson", "w"))
json.dump({"method": __doc__.strip(), "osm_timestamp": "2026-11-24 (Overpass)", "routes": summary}, open(H / "summary.json", "w"), indent=1, ensure_ascii=False)
