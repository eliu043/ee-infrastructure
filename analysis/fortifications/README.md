# Fortifications around ZNPP, June–October 2025 (traced)

`fortifications-2025.geojson`: 37 features traced from **McKenzie Intelligence Services for Greenpeace Ukraine, "Analysis of Russian Military Activity at the ZNPP During June & August 2025", v1.2, 18 Dec 2025** (Airbus Pléiades Neo 30 cm imagery from 1 Jun, 12 Aug and 15 Oct 2025). The report is in `source/` (local only, not redistributed).

| Kind | n | From |
|---|---|---|
| trench (fighting / communication / pre-existing) | 12 | Figs 6, 8, 9, 12 |
| sangar (raised guard post, most caged) | 11 | Fig 15 |
| position (observation post, scrapes, destroyed BTR, structures) | 8 | Figs 6, 8, 9, 12 |
| checkpoint | 2 | Figs 9, 13 |
| scrapes (armoured-vehicle positions, regular pattern) | 1 | Fig 9 |
| storage (revetments with crates; possibly ammunition) | 1 | Fig 9 |
| bunker (possible reinforced structure) | 1 | Fig 11 |
| burnt ground | 1 | Fig 12 |

## Method
Each report figure was matched by eye against Esri World Imagery rendered with a labelled lat/lon grid (`gridimg.py`, `sidebyside.py`). Anchors were the pond shoreline, roads, tree rows, the cooling towers and a road-junction checkpoint. Several west-bank zig-zag trenches are also visible in current Esri imagery and were traced on it directly. The sangars (Fig. 15 is rotated) come from a similarity transform fitted on the six reactor domes, with a residual of 1–5 m. Every feature carries its figure number, image date and the report's wording (`features.py`).

## Uncertainty
- Generally ~30–80 m.
- Sangars: within ~10 m.
- South-east checkpoint (Fig. 13): ±200 m, because the figure is a tight crop without landmarks.
- These are the report's observations, not independent identifications. The report assesses some objects as uncertain ("possible", "highly unlikely to be military hardware"), and the notes keep that wording.

Copy for reference; source of truth is great-meadow-atlas/research/fortifications/. The report PDF and figure extracts are not redistributed.
