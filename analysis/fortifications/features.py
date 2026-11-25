# Traced from McKenzie Intelligence Services / Greenpeace Ukraine, "Analysis of Russian Military Activity at ZNPP
# during June & August 2025" (v1.2, 18 Dec 2025), figures georeferenced by eye against Esri World Imagery.
# Positional uncertainty ~30-80 m. kind: trench | position | bunker | checkpoint | sangar | storage
F = []
def add(kind, coords, fig, note, date="2025-06-01"):
    F.append({"kind": kind, "coords": coords, "fig": fig, "note": note, "image_date": date})

# Fig. 6 — sluice gate area (1 Jun 2025)
add("trench", [[34.52369, 47.51198], [34.52444, 47.51121], [34.52495, 47.51100], [34.52419, 47.51040], [34.52387, 47.50998]], 6, "New trench network beside the bank road")
add("trench", [[34.52150, 47.51290], [34.52205, 47.51280], [34.52210, 47.51245], [34.52160, 47.51240], [34.52150, 47.51290]], 6, "Enhanced trench network with overhead cover / protection")
add("position", [34.52375, 47.51510], 6, "Unidentified construction with overhead cover, possible observation post")
add("trench", [[34.52320, 47.51210], [34.52360, 47.51245]], 6, "New digging")

# Fig. 8 — western bank (1 Jun 2025); zig-zag trenches also visible in current Esri imagery
add("trench", [[34.52622, 47.51969], [34.52636, 47.51954], [34.52610, 47.51938]], 8, "Fighting trench, zig-zag (extended network)")
add("trench", [[34.52636, 47.51954], [34.52668, 47.51944]], 8, "Communication trench")
add("trench", [[34.52576, 47.51884], [34.52585, 47.51859], [34.52561, 47.51840], [34.52552, 47.51828]], 8, "Extended trench network, linked into a single zig-zag trench")
add("trench", [[34.52561, 47.51840], [34.52595, 47.51840]], 8, "Trench branch")
add("trench", [[34.52496, 47.51769], [34.52515, 47.51761], [34.52545, 47.51757]], 8, "Trench")
add("position", [34.52924, 47.52259], 8, "Unidentified structure under camouflage netting; 'barrel'-like object nearby (assessed highly unlikely to be military hardware)")

# Fig. 9 — north-western bank (1 Jun 2025); anchored on the road-junction checkpoint
add("checkpoint", [34.54183, 47.52698], 9, "Checkpoint: barrier and guard post on the road parallel to the pond")
add("storage", [34.54225, 47.52742], 9, "Revetments among trees, crates visible: possible storage area, possibly ammunition")
add("position", [34.54091, 47.52772], 9, "New digging or scrapes")
add("position", [34.54244, 47.52803], 9, "New digging or scrapes")
add("scrapes", [[34.53672, 47.52775], [34.53842, 47.52782], [34.53971, 47.52869]], 9, "Scrapes dug in regular succession: prepared positions for armoured vehicles")
add("position", [34.53698, 47.52830], 9, "Destroyed BTR-variant chassis in the cleared area")
add("trench", [[34.53733, 47.52903], [34.54041, 47.52991]], 9, "Pre-existing trench line (since occupation)", "2025-06-01")
add("trench", [[34.54074, 47.52991], [34.54483, 47.53009]], 9, "Pre-existing trench line (since occupation)", "2025-06-01")

# Figs. 10-12 — northern bank (Jun / Aug / Oct 2025); anchored on the venturi cooling towers, checked on the red-roof building
add("trench", [[34.54686, 47.52945], [34.54800, 47.52930]], 12, "New trench", "2025-08-12")
add("trench", [[34.54919, 47.52945], [34.55010, 47.52890]], 12, "Further extension to trenches", "2025-08-12")
add("position", [34.55066, 47.52790], 12, "Fresh digging or scrapes", "2025-08-12")
add("position", [34.55494, 47.52732], 12, "Fresh digging or scrapes", "2025-08-12")
add("position", [34.55935, 47.52649], 12, "Fresh digging or scrapes", "2025-08-12")
add("bunker", [34.54944, 47.52805], 11, "Deep construction with beams (Jun), covered with soil (Aug), flat solid structure (Oct): possible reinforced bunker", "2025-10-15")
add("burnt", [34.56682, 47.52485], 12, "Burnt ground near the venturi cooling towers", "2025-08-12")

# Fig. 13 — south-eastern bank checkpoint (1 Jun 2025). Tight crop without landmarks: placed on the channel-side road
# between the cooling channels and the plant, ±200 m.
add("checkpoint", [34.5787, 47.5031], 13, "Checkpoint with man-made chicane, BTR-variant APC and utility truck; revetted positions either side of the road (location approximate ±200 m)")

# Fig. 15 — sangars (raised guard posts, most with steel anti-drone cages) on the plant perimeter (1 Jun 2025).
# Fig. 15 is rotated; positions come from a similarity transform fitted on the six reactor domes (residual 1-5 m).
import ast, pathlib
for lo, la in ast.literal_eval(pathlib.Path(__file__).with_name("work").joinpath("sangars.txt").read_text().replace("np.float64", "")):
    add("sangar", [lo, la], 15, "Sangar (raised guard position), most with a steel cage against drones")

if __name__ == "__main__":
    import json
    feats = []
    for f in F:
        c = f["coords"]
        geom = {"type": "Point", "coordinates": c} if isinstance(c[0], float) else {"type": "LineString", "coordinates": c}
        if geom["type"] == "LineString" and c[0] == c[-1] and len(c) > 3: geom = {"type": "Polygon", "coordinates": [c]}
        feats.append({"type": "Feature", "geometry": geom, "properties": {
            "kind": f["kind"], "note": f["note"], "figure": f"Fig. {f['fig']}", "image_date": f["image_date"],
            "source": "McKenzie Intelligence Services for Greenpeace Ukraine, 18 Dec 2025 (Airbus Pléiades Neo imagery)",
            "method": "traced by eye from report figures, georeferenced to Esri World Imagery; uncertainty ~30-80 m unless noted"}})
    out = {"type": "FeatureCollection", "features": feats}
    pathlib.Path(__file__).with_name("fortifications-2025.geojson").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    from collections import Counter
    print(len(feats), Counter(f["properties"]["kind"] for f in feats))
