# Land change after the Kakhovka dam breach — Earth Engine

25 November 2026. Script: `gee_landchange.py` (Sentinel-2 L2A harmonized, Google Earth Engine). The method and its limits are in the script's docstring.

## Reservoir bed (OSM outline, 1 May 2023), late summer (15 Jul–31 Aug)
| Year | Water km² | Green (NDVI > 0.5) km² | Mean NDVI |
|---|---|---|---|
| 2019 | 2,041 | 8 | −0.16 |
| 2020 | 2,039 | 10 | −0.17 |
| 2021 | 2,041 | 11 | −0.13 |
| 2022 | 2,039 | 11 | −0.12 |
| 2023 | 313 | 112 | 0.18 |
| 2024 | 186 | 1,195 | 0.52 |
| 2025 | 119 | 1,358 | 0.53 |
| 2026 | 127 | 1,547 | 0.60 |

The breach turned ~2,000 km² of open water into land. By 2026, three-quarters of the bed was green vegetation (largely young willow/poplar forest and reeds, per field reporting; not classified here).

## Banks (0–15 km from the bed), late-summer means, 2019–22 vs 2024–26
| Zone | NDVI before → after | NDMI (moisture) before → after |
|---|---|---|
| Reservoir bed | −0.14 → 0.56 | 0.43 → 0.18 (water became land, not drought) |
| North bank (Ukrainian-held) | 0.42 → 0.33 | −0.04 → −0.14 |
| South bank (occupied) | 0.40 → 0.27 | −0.08 → −0.21 |

Both banks are less green and drier. The south bank, where centre-pivot irrigation from the reservoir's canals was concentrated, shows the larger fall. This is consistent with `../canals-ndvi/`, which separates the canal effect from drought: 2024–25 were also the driest April–August seasons in the CHIRPS series.

## ZNPP cooling pond + channels, monthly water area (MNDWI > 0)
About 8.4–8.6 km² from 2022 to mid-2023, then a steady fall: 8.0 (early 2024), 7.8 (mid-2025), 7.2 (Dec 2025), **5.5 km² (Oct 2026), down about a third**. The outline is the OSM pond buffered 250 m, so the area includes the channels and differs from McKenzie's measurement (9.60 → 8.66 km², 2022–25). McKenzie's Jun→Aug 2025 change has the same direction as ours (7.83 → 7.60 km²). Two cloud/snow-affected months (2022-09, 2022-11, ≤2 scenes) are dropped as outliers in the film.

## Maps (`maps/`, EPSG:4326, bounds in `bounds.json`)
- `ndvi-2021.png`, `ndvi-2025.png`: late-summer NDVI.
- `ndvi-change.png`, `ndmi-change.png`: mean 2024–26 minus mean 2019–22, brown = loss / drier, green = gain / wetter.

Copy for reference; source of truth is great-meadow-atlas/research/land-change/.
