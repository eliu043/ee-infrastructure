# Logistics screen — roads to the plant and to the line breaks

24 November 2026. Supports POWERLINES ch. "Roads": diesel backup and line repairs both depend on road access.

- `fetch_roads.sh` → `raw/roads.json`: OSM motorway–secondary (45.95–48.55 N, 33.3–36.2 E) plus tertiary near the plant, via Overpass on 2026-11-24.
- `raw/water.json`: OSM water features around the plant (cooling pond, spray ponds, thermal plant canals).
- `analyze_roads.py` → `routes.geojson`, `summary.json`, `roads-major.geojson`.

## Findings (shortest road distance, OSM network)
| Route | Road km | Within 20 km of river front |
|---|---|---|
| Melitopol → ZNPP (diesel / supply, occupied side) | 125.6 | 30.0 |
| Chonhar, Crimea → ZNPP | 228.7 | 30.0 |
| Enerhodar → Z2 switchyard (Russian-side crews) | 2.1 | 2.1 |
| Nikopol → Z1 north-bank break (Ukrainian-side crews) | 3.6 | 3.6 |
| Marhanets → Z10 | 3.2 | 3.2 |
| Dnipro → Z4 Dniprovska substation | 101.7 | 0 |

- In this OSM extract the two banks form separate road networks (44,250 vs 11,869 nodes): no major-road connection between the occupied left bank and the right bank in the study region. Crews on each bank reach only their own breaks.
- Ukrainian crews reach the north-bank breaks within ~3–4 km of Nikopol / Marhanets, but those breaks sit on the frontline (hence the IAEA-brokered ceasefire windows).
- Supply to the plant on the occupied side runs ~126 km from Melitopol; the last ~30 km lie within 20 km of the river front.

## Supply corridor (analyze_supply.py, 24 Nov 2026)
- **Rail:** OSM has no active (`railway=rail`) line reaching the plant. The Enerhodar branch from Kakhovske More station (near Dniprorudne) is tagged `railway=disused` (`rail-disused-branch.geojson`). The nearest connected main-line track lies ~46 km south-east. On the mapped network, the last leg to the plant is by road. OSM tagging may lag reality.
- **Recorded violence along the road route:** UCDP GED 26.1 + 2026 candidate events give 45 fatal events (best estimate 129 deaths) within 2 km of the Melitopol → ZNPP road route since 24 Feb 2022 (2022: 10, 2023: 18, 2024: 6, 2025: 5, 2026: 6). 30 of the 45 are geolocated to Melitopol town itself. UCDP counts only lethal events, often at settlement centroids, so this is not a count of strikes on roads.

## Wells (24 Nov 2026)
`wells-zone.geojson` is the reported well area: a 5–60 m band around the convex hull of the OSM spray-pond outlines (14 polygons; McKenzie counts 12 ponds). It is based on IAEA reporting via NEI that wells are "close to" and "around the perimeter of the sprinkler ponds" (Aug–Nov 2023). There are 11 wells, ~250 m³/h (Nov 2023). No coordinates are published. Esri Wayback before/after imagery (Dec 2022 vs Feb 2024 releases) did not resolve individual wellheads, so no points are mapped.

## Limits
Distance-based shortest paths, not travel time or observed convoys. No checkpoints, damaged bridges, mines or closures. The river-front proxy is the 2023-05-01 reservoir outline; the eastern land front is not modelled. Endpoints snap to the nearest major/tertiary road (≤4.1 km; ZNPP snaps 3.8 km to its access road). Road refs on the left bank are as tagged in OSM, including occupation-era numbering.

Copies for reference. The source of truth is `great-meadow-atlas/research/logistics/` (the scripts read sibling research folders and raw downloads, which are not committed).
