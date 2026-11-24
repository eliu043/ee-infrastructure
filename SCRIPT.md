# POWERLINES — 7:00 film script (v2)

A narrated web film. Camera, callouts and data animations are all driven by one clock, so every take is identical. Edit `story.js` to change timing, camera or text. `film.js` is the engine.

## Run it
```
cd great-meadow-atlas/powerlines-film
python3 -m http.server 8765
```
Open http://localhost:8765 in Chrome. Set the window to 1920×1080, or press **F** for fullscreen.

| Key | Action |
|---|---|
| Space | play / pause |
| ← → | previous / next chapter |
| Home | restart |
| C | captions (your narration on screen) |
| P | presenter mode: holds at the end of each chapter until you press → or Space |
| R | record mode: hides the control bar |
| URL | `?t=95` start at 95 s · `?scene=repair` · `?rec=1` · `?nocap=1` |

## Recording
1. **Do a warm-up run first.** Play the whole film once, or scrub through every chapter. The satellite and terrain tiles come from the internet, and on a first pass they load in visibly. The second pass plays from the browser cache.
2. Record with OBS or QuickTime (screen + mic), using `?rec=1`.
   - **Voice live over picture:** use presenter mode (P) and advance after each paragraph.
   - **Voice-over recorded separately:** play straight through, then lay the audio over it in Premiere.
3. Captions can stay on as subtitles. Turn them off (C) if you'd rather read from this sheet.

## Timing and narration (v2 — cold open, water, roads)
Narration is about 3 minutes at a measured pace. Each chapter's caption appears after its chapter card (~5 s in).

| Time | Chapter | Narration (yours, verbatim) | What's on screen |
|---|---|---|---|
| 0:00 | Cold open · Frontier | Trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted. | Hook: UCDP fatal events rise as 3D columns from Feb 2022 to Nov 2026, tallest at Nikopol. Date and event counter running |
| 0:40 | Title | *(silence)* | Camera rises to pre-war night lights. POWERLINES |
| 0:55 | 01 Lifeline | During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat. | Grid pulses outward. Particles flow out along both ZNPP lines |
| 1:27 | 02 Occupation | After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion. | Reservoir becomes the frontline zone. Nikopol and Marhanets on the right bank |
| 1:55 | 03 It cannot be switched off | Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor. | Close-up: three callouts, Energy / Water / Labor |
| 2:21 | 04 Water | Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP became reliant on newly drilled wells after the remaining water from the nearby Zaporizhzhia Thermal Power Plant's canals depleted. | Pond, wide reservoir, dam. Imagery steps 2021 → 2023 → 2024 → 2025 as the reservoir drains and the pond's banks emerge. OSM outlines of the pond, spray ponds and thermal plant canals. Wells callout |
| 3:13 | 05 Not so soon | Eventually Russia wants to connect ZNPP to the national grid, but not so soon. | Schematic arrow toward the Russian grid |
| 3:29 | 06 Shelling and repair | In the meantime, Russia's shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force. | Outage timeline 2022 → 2026. Lines go dark, damage zones flash, loss banners and event log. Camera visits Z7, Z6, Z1 and Z2 |
| 4:41 | 07 Sovereignty becomes dependency | Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns. During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators. | Close orbit. Particles flow **into** the plant. Counter climbs to **8** (note: 27 by Nov 2026). Diesel callout |
| 5:19 | 08 Roads | *(narration to write; suggested draft below)* | Regional major roads, then shortest routes with moving dots. Diesel/supply routes in amber, Ukrainian crews in green, Russian crews in red |
| 6:04 | 09 Winter | As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe. | Zoom out to Ukraine, lights dim, ZNPP beacon |
| 6:32 | End | *(silence; the v1 closing paragraph can be pasted back in `story.js`)* | Final orbit, title, source credits |

### Roads: findings and a draft line
From `research/logistics/` (OSM roads, 24 Nov 2026; shortest road distance, not observed convoys):
- **Melitopol → ZNPP:** 126 km by road. The last 30 km run within 20 km of the river front.
- **Crimea (Chonhar) → ZNPP:** 229 km.
- **Ukrainian crews:** reach the north-bank breaks within 3–4 km of Nikopol (Z1) and Marhanets (Z10), but those breaks lie on the frontline, so repairs wait for IAEA-brokered ceasefires.
- **Dnipro → Dniprovska substation:** 102 km. The substation was struck in May and November 2026.
- **No major road links the two banks** in the study area, so each side repairs only its own breaks.

*Draft:* "Every blackout is a supply problem. Diesel for the reserve generators travels some 126 km by road from Melitopol, its last stretch within range of the front, while Ukrainian crews wait for ceasefires to reach breaks only a few kilometres from Nikopol."

## Before presenting: check these
- **On-screen figures not from the research folder** (from general knowledge; confirm or cut in `story.js`):
  - 6 × VVER-1000 / ~6 GW / largest in Europe
  - roughly a fifth of national generation
  - seized 4 March 2022
  - no generation since Sept 2022
- **Water:** the pond's refill from the reservoir and the pumping from the thermal plant canals follow your narrative. Your sources should support the wells (IAEA reported them in 2023). Their exact locations aren't in OSM, so the callout says "locations not mapped". The pond/canal change is shown from annual cloud-free composites, not dated scenes.
- **Blackouts:** "eight times 2022–2024" matches the IAEA count (the 8th complete loss was in 2023; the 9th in July 2025). Our dated chronology only covers some of the early ones.
- **Cold open:** the UCDP columns also show events on the occupied bank (Enerhodar, Vasylivka), not only "Ukrainian towns across the river".
- **Winter night-lights dimming** is illustrative, not measured.

## Adding trenches / artillery (chapter 07)
Digitize them in QGIS or geojson.io over the Esri/Sentinel imagery. Paste the FeatureCollections into `extra.js`. They draw automatically in chapter 07: trenches as yellow lines, artillery as points. Add a `source` property (imagery + date) to each feature.

## Rebuilding data
`python3 build_data.py` regenerates `data.js` from `../research/` (grid ≥150 kV, both ZNPP lines, damage zones, reservoir 2023-05-01, canals, UCDP events, the IAEA outage chronology).
