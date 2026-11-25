# Infrastructure: Instruments of Power — 7:00 film script

A narrated web film. Camera, callouts and data animations are all driven by one clock, so every take is identical. Edit `story.js` to change timing, camera or text. `film.js` is the engine.

## Run it
```
cd great-meadow-atlas/powerlines-film
python3 -m http.server 8765
```
Open http://localhost:8765 in Chrome. Set the window to 1920×1080, or press **F** for fullscreen.

The site opens on the centred title, which fades after a few seconds into a compact story panel at the top left (click or press any key to skip ahead). Each chapter is one slide: it plays its camera move and data animation, then holds until you continue. Moving forwards, backwards or jumping from the slide list always glides the camera from where it is.

| Control | Action |
|---|---|
| **Next ›** / → / PageDown | next slide (Space also continues once a slide has finished) |
| **‹ Back** / ← / PageUp | previous slide |
| **3 / 9** / M | slide list; click a slide to jump to it |
| ❚❚ button / Space | pause / play the current slide · replay it once it has finished |
| Red line above the buttons | the slide's progress; click or drag it to scrub |
| A | autoplay: run straight on into the next slide (the old continuous film) |
| R | record mode: hides the panel and legend, shows full-screen captions, chapter cards and title, autoplay on |
| C | captions on/off (record mode) |
| F | fullscreen |
| Home / End | first / last chapter |
| URL | `#repair` opens that slide and skips the opening title (the address updates as you go) · `?t=95` · `?scene=repair` · `?rec=1` · `?nocap=1` · `?paused` |

## Recording
1. **Do a warm-up run first.** Play the whole film once, or scrub through every chapter. The satellite and terrain tiles come from the internet, and on a first pass they load in visibly. The second pass plays from the browser cache.
2. Record with OBS or QuickTime (screen + mic), using `?rec=1`.
   - **Voice live over picture:** in record mode press A to turn autoplay off; each chapter then holds at its end until you press →.
   - **Voice-over recorded separately:** play straight through, then lay the audio over it in Premiere.
3. Captions can stay on as subtitles. Turn them off (C) if you'd rather read from this sheet.

## Timing and narration
Your narration runs about 2½ minutes at a measured pace. The other ~4½ minutes are deliberate pauses for the camera moves and data animations. Each chapter's narration is timed to start ~1.5 s in, after the chapter card.

| Time | Chapter | Narration (yours, verbatim) | What's on screen |
|---|---|---|---|
| 0:00 | Title | *(silence / ambient)* | Pre-war Ukraine at night (Black Marble 2016), slow descent, centred title (fades after ~4 s, then the story panel appears) |
| 0:25 | 01 Lifeline | During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat. | Flight down to the plant. High-voltage grid pulses outward, particles flow out along both ZNPP lines. Callouts: ZNPP, Enerhodar heat, thermal plant switchyard |
| 1:10 | 02 Occupation | After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion. | Pull back. The reservoir becomes the frontline zone (red tint, dashed edge). Nikopol and Marhanets on the right bank |
| 1:50 | 03 It cannot be switched off | Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor. | Cold shutdown, cooling pond, labor. Imagery crossfades 2021 → 2024 as the Kakhovka reservoir drains. Glide downstream to the destroyed dam |
| 2:40 | 04 Not so soon | Eventually Russia wants to connect ZNPP to the national grid, but not so soon. | Dashed arrow toward the Russian grid, labelled schematic |
| 3:00 | 05 Shelling and repair | In the meantime, Russia's shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force. | **The core sequence.** Date counter runs Mar 2022 → Nov 2026. Lines go dark during each outage, damage zones Z1–Z10 flash, and complete-loss banners (#9 … #27) appear. Event log and outage timeline at the bottom. The camera visits Z7 (1.5 km), Z6 (span over the Dnipro), Z1 (north bank) and Z2 (switchyard) |
| 4:30 | 06 Sovereignty becomes dependency | Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns. | Close orbit of the reactors. Particles now flow **into** the plant. Counter climbs to 27. Diesel callouts |
| 5:05 | 07 Frontier | Trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted. | UCDP fatal events accumulate as 3D columns per location, rising highest at Nikopol. Trenches/artillery appear here once digitized (see below) |
| 5:50 | 08 Winter | As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe. | Zoom out to all of Ukraine. City lights dim. ZNPP is left as a red beacon |
| 6:25 | Close | POWERLINES traces the slow violence of war through the militarization of energy infrastructure. By following the disruption of electricity, water, and territory, it examines how the occupation of critical infrastructure contests sovereignty, reorganizes material dependencies, and drains the resources needed to sustain everyday life. | Return orbit over ZNPP, narration as caption until 6:47, then the title and source credits |

*Typo fixed in the caption: "Power Plan" → "Power Plant".*

## Before presenting: check these
- **On-screen figures that are not from the research folder** (written from general knowledge; confirm or cut in `story.js`):
  - 6 × VVER-1000 / ~6 GW / largest in Europe
  - "roughly a fifth of national generation"
  - seized 4 March 2022
  - no generation since Sept 2022
  - 20 emergency diesel generators
- **Figures from the research folder** (`research/network-scan/znpp-offsite-power.json`, `research/attack-events/`):
  - outage dates
  - damage zones
  - 27 complete losses
  - 10-day diesel minimum
  - ceasefire repairs
  - UCDP events
- **Chapter 07 vs. the data.** The narration says Ukrainian towns across the river are targeted. The UCDP columns also show events on the occupied left bank (e.g. Enerhodar, Vasylivka), because UCDP records fatal events from both sides. Either keep it as honest context or filter the events in `build_data.py`.
- **Chapter 08 night-lights dimming** is illustrative (2016 baseline faded), not a measurement. The on-screen source line says so. Your `southern_ukraine_historical_lights_2021_2025.ipynb` could supply real VIIRS change if you run it.
- **"Roads and labor force" (ch. 05)** has no road layer yet. Adding OSM primary roads would let the repair-crew claim show on the map.

## Adding trenches / artillery (chapter 07)
Digitize them in QGIS or geojson.io over the Esri/Sentinel imagery. Paste the FeatureCollections into `extra.js`. They draw automatically in chapter 07: trenches as yellow lines, artillery as points. Add a `source` property (imagery + date) to each feature.

## Rebuilding data
`python3 build_data.py` regenerates `data.js` from `../research/` (grid ≥150 kV, both ZNPP lines, damage zones, reservoir 2023-05-01, canals, UCDP events, the IAEA outage chronology).
