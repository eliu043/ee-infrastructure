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

## Limits
Distance-based shortest paths, not travel time or observed convoys. No checkpoints, damaged bridges, mines or closures. The river-front proxy is the 2023-05-01 reservoir outline; the eastern land front is not modelled. Endpoints snap to the nearest major/tertiary road (≤4.1 km; ZNPP snaps 3.8 km to its access road). Road refs on the left bank are as tagged in OSM, including occupation-era numbering.

Copies for reference. The source of truth is `great-meadow-atlas/research/logistics/` (the scripts read sibling research folders and `raw/roads.json`, which is not committed).
