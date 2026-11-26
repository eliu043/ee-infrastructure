# Infrastructure: Instruments of Power — 7:18 film script

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
| **3 / 13** / L | slide list; click a slide to jump to it |
| 🔈 button / M | narration on/off (the soundtrack pauses when a slide holds and follows you when you jump) |
| ❚❚ button / Space | pause / play the current slide · replay it once it has finished |
| Red line above the buttons | the slide's progress; click or drag it to scrub |
| A | autoplay: run straight on into the next slide (the old continuous film) |
| R | record mode: hides the panel and legend, shows full-screen captions, chapter cards and title, autoplay on |
| C | captions on/off (record mode) |
| F | fullscreen |
| Home / End | first / last chapter |
| URL | `#repair` opens that slide and skips the opening title (the address updates as you go) · `?t=95` · `?scene=repair` · `?rec=1` · `?nocap=1` · `?paused` · `?mute=1` |

## Soundtrack
`audio/soundtrack.m4a` plays in sync with the film: narration plus a low backing drone. The film follows the audio clock, so scrubbing and chapter jumps stay aligned. **M** toggles sound; `?mute=1` starts silent.

### Voice engines (`audio/build_audio.py`)
| Engine | Command | Notes |
|---|---|---|
| **Kokoro** (current track) | `python3 build_audio.py --engine kokoro` | Open-source Kokoro-82M, runs locally, free; nothing leaves your Mac. Default voice `bm_george`. Other British voices: `bm_daniel`, `bm_lewis`, `bm_fable`, `bf_emma`, `bf_isabella`. `--speed 0.95` |
| **ElevenLabs** | `export ELEVENLABS_API_KEY=…` then `python3 build_audio.py --engine elevenlabs` | Most broadcast-like. `--voice daniel` (British news presenter, default) or `--voice george`, or any voice ID. The script (~2,000 characters) fits the free tier. The text is sent to ElevenLabs |
| macOS `say` | `python3 build_audio.py --engine say --voice "Jamie (Premium)"` | Built in. Install Premium voices under System Settings → Accessibility → Spoken Content |

- **Cache:** rendered lines are cached in `audio/cache/`, so re-runs only render changed lines. This means ElevenLabs credits are spent once per line.
- **Outputs:** each build writes `soundtrack.m4a` (what the film plays) and keeps `soundtrack-<engine>.m4a` for side-by-side comparison. Switch back by rebuilding with the other engine; cached lines make that instant.
- **Pronunciation:** the `PRON` table fixes engine-specific readings. For Kokoro: ZNPP as "zed‑en‑pee‑pee", Kyiv as "KEE‑iv", Kakhovka as "ka‑HOV‑ka". Add entries there if a name sounds wrong.
- **Voice samples:** `audio/samples/kokoro-*.wav` hold the same two sentences in four Kokoro voices for auditioning.
- **Timing check:** every line must fit its chapter; the build prints `ok` or `OVERRUNS` per line. The current Kokoro read fits all 12.
- **Backing:** a synthesized low drone that darkens chapter by chapter, with impacts when Kyiv goes dark, on the title, and at Occupation, Shelling, Supply and Frontier. It ducks ~8 dB under the voice. Tune with `--music-db -17 --duck-db -8`.
- **Stems for editing** (local only): `narration.wav`, `backing.wav`, `soundtrack.wav`.

### Kokoro setup on a new machine
```
brew install espeak-ng
cd audio && uv venv --python 3.12 .venv-kokoro
uv pip install --python .venv-kokoro/bin/python "kokoro>=0.9" soundfile "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
```
The first run downloads the model (~330 MB) from Hugging Face. `kokoro_tts.py` points the phonemizer at Homebrew's espeak-ng, because the pip wheel ships without its data on macOS.

## Recording
1. **Do a warm-up run first.** Play the whole film once, or scrub through every chapter. The satellite and terrain tiles come from the internet, and on a first pass they load in visibly. The second pass plays from the browser cache.
2. Record with OBS or QuickTime (screen + system audio for the built-in soundtrack, or screen + mic to narrate live with M muting the voice track), using `?rec=1`.
   - **Voice live over picture:** in record mode press A to turn autoplay off; each chapter then holds at its end until you press →.
   - **Voice-over recorded separately:** play straight through, then lay the audio over it in Premiere.
3. Captions can stay on as subtitles. Turn them off (C) if you'd rather read from this sheet.

## Timing and narration (v3 — Kyiv cold open)
Each chapter's first line starts after its chapter card (~5 s in). Added lines (`more` in story.js) start at the time shown, in seconds into the chapter.

| Time | Chapter | Narration (main line, then added lines with their start time into the chapter) | What's on screen |
|---|---|---|---|
| 0:00 | Cold open · Kyiv | For a few hours on the last day of January this year, virtually all of Kyiv was submerged in darkness.<br>*+10 s:* A week earlier, from orbit, the capital still glowed.<br>*+16.5 s:* In midwinter, a blackout is more than darkness. Heat, water and lifts for three million people all run on the same grid. | Real VIIRS night pass of Kyiv lit (24 Jan 2026), then it fades to dark at 0:16 — labelled **illustration** |
| 0:28 | Hostage | Hidden in plain sight is the slow violence of infrastructural warfare as Ukraine’s energy facilities are being held hostage. | Night flight Kyiv → ZNPP (440 km), then the POWERLINES title |
| 0:56 | 01 Lifeline | During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat.<br>*+16.5 s:* Six reactors, six gigawatts: roughly a fifth of the country’s electricity, carried away on seven-hundred-fifty and three-hundred-thirty kilovolt lines. | Grid pulses outward; particles flow out |
| 1:26 | 02 Occupation | After the 2022 Russian occupation of the left bank of the Dnipro River, ZNPP became an instrument of coercion.<br>*+16.3 s:* The river became the front line. Across it, Nikopol and Marhanets stayed Ukrainian, within sight of the reactors. | Frontline along the reservoir |
| 1:52 | 03 It cannot be switched off | Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor.<br>*+15.8 s:* Six shut-down reactors still need cooling, every hour of every day. | Energy / Water / Labor callouts |
| 2:16 | 04 Water | Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP has come to rely on newly drilled wells, as the remaining water in the nearby Zaporizhzhia Thermal Power Plant’s canals ran down.<br>*+23.5 s:* Beyond its old shores, the land is drying, the irrigated fields of the south bank most of all.<br>*+30.2 s:* And the cooling pond itself has shrunk by about a third since 2023.<br>*+38 s:* Eleven wells now stand between six reactors and the heat they still produce.<br>*+43.8 s:* Where exactly they were drilled has never been published.<br>*+50 s:* In 2025, a dam was built across the intake channel, holding what water remains in a smaller pond. | Reservoir drains → **Earth Engine maps over the whole reservoir**: vegetation 2021 vs 2025 (the bed turns green), then moisture change 2024–26 vs 2019–22 (the land dries) → cooling pond with a **monthly water-area chart** (down a third since 2023) → spray ponds and the reported well zone → pond and thermal plant canals 2025 |
| 3:16 | 05 Not so soon | Eventually, Russia wants to connect ZNPP to its own grid, but not so soon. | Schematic arrow |
| 3:31 | 06 Shelling and repair | In the meantime, shelling of the plant’s facilities and power lines saw Ukrainian and Russian workers rushing to repair them, exerting pressure on local road networks and labor force.<br>*+20 s:* Repairs now need local ceasefires, brokered by the IAEA, so crews can work under the guns.<br>*+28.5 s:* In September 2025, damage one and a half kilometres from the plant cut its last line. It ran on diesel for a month.<br>*+40 s:* Where the line crosses the river, it crosses the front. Crews repaired it on pylons a hundred metres above the water.<br>*+52 s:* On the north bank, Ukrainian crews work within sight of Nikopol. By August 2026, the plant had lost off-site power twenty-six times. | Outage timeline 2022–26, damage zones, plus crew road routes |
| 4:35 | 07 Sovereignty becomes dependency | Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians now draws on electricity from the grid to keep its reactors cool.<br>*+19 s:* The plant that once sent power out across Ukraine now draws it in, through the same lines that are shelled and repaired. | Close orbit; power flows **into** the plant |
| 5:07 | 08 Blackout and supply | During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators, whose fuel arrives by road, through a war zone.<br>*+26.5 s:* Forty-five deadly events have been recorded within two kilometres of the route. Its final thirty kilometres run within twenty of the front. | Counter to 8. Diesel generators, then the Melitopol supply route, the disused rail branch, and fatal events along the route |
| 5:47 | 09 Frontier | Furthermore, trenches are carved into the soil surrounding ZNPP, and fighting positions turn the landscape into a military frontier, from which Ukrainian towns across the river are shelled.<br>*+20.5 s:* Across the drained reservoir, Nikopol has recorded more deadly strikes than any other town near the plant.<br>*+28 s:* Marhanets, too, lies within range. | Low pass over **traced fortifications** (zig-zag trenches on the west bank; checkpoint, vehicle scrapes and possible ammunition store on the north-west bank; 11 caged sangars on the plant perimeter), then UCDP event columns 2022 → 2026 |
| 6:21 | 10 Winter | As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe. | Opens on **measured pre-war night lights** (VIIRS monthly, Sep–Nov 2021 median, Earth Engine, inferno palette, after the studio's EE_VIIRS script), crossfades at 0:05–0:08 into NASA Black Marble, then Ukraine's lights dim (illustration, 0:09–0:21); ZNPP beacon |
| 6:46 | End · conclusion | Power lines, roads, reservoirs and canals once carried everyday life. At Zaporizhzhia, each has been turned into an instrument of power: cut, drained, fortified, held hostage. This is slow violence, and it is written into the land itself. | Camera returns to the plant with every layer on (grid, roads, routes, reservoir, water, trenches, strikes); callouts Cut / Drained / Fortified / Held hostage. Title and credits from 7:09; ends 7:18 |


### Night lights (Earth Engine, `research/night-lights/`)
- Winter opens on the studio's EE_VIIRS method: `NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG`, `avg_rad`, median of monthly composites, inferno palette. Area widened to Ukraine; months Sep–Nov 2021 (pre-war autumn).
- Not a wartime winter month: snow brightens the composites (Jan 2026 sums about as bright as Jan 2022 over Ukraine), so a winter "after" image would mislead.
- Stretch: log from 0.5 to 60 nW/cm²/sr. The script's linear 0–p98 stretch saturates every village at country scale.
- The image is exported in EPSG:3857 so it lines up with the web map. The dimming that follows is still illustrative.

### Narrative edits (critical review, 25 Nov 2026)
Changes to the main lines, so that the words match the evidence on screen:
- **Supply:** "whose delivery was challenged by Russia's shelling of roads and railways" → "whose fuel arrives by road, through a war zone". The analysed diesel route runs from Melitopol through Russian-held territory, and the rail branch is disused, so blaming Russia for shelling it contradicts the map.
- **Shelling and repair:** "Russia's shelling of its facilities and powerline" → "shelling of the plant's facilities and power lines". The IAEA does not attribute the line damage, and Ukraine and Russia blame each other. Put the attribution back only with a source for each strike.
- **Frontier:** "artillery positions" → "fighting positions". The traced features are trenches, sangars, checkpoints and vehicle scrapes; no artillery was identified in the McKenzie figures. That Ukrainian towns are shelled from this bank is kept.
- **Dependency:** "to prevent total meltdowns" → "to keep its reactors cool". The reactors have been in cold shutdown since 2022–24; the risk from losing cooling is real but slower, and the winter line already names the threat of catastrophe.
- **Water:** "became reliant on newly drilled wells after the remaining water … depleted" → "has come to rely on newly drilled wells, as the remaining water … ran down". The wells were drilled in Aug–Nov 2023 while the canal was still the pond's other supply, so "after" got the order wrong.
- **Not so soon:** "the national grid" → "its own grid" (whose grid was ambiguous).
- **Occupation:** "Dnieper" → "Dnipro", to match the callouts.
- **Frontier callout:** Nikopol was labelled the most-recorded location on the right bank, but Zaporizhzhia city has more UCDP events (144 vs 85). It now reads "most deadly events of any town near the plant".
- Still unsourced: the Kyiv blackout of 31 January 2026 (keep your own source), and the drought caveat for the drying line (`research/canals-ndvi/`).
### Water and wells evidence
- **Count, output and power:** the IAEA, as reported by Nuclear Engineering International, gives:
  - 1 well (24 Aug 2023), "located close to the plant's sprinkler ponds";
  - plans for "an additional 10-12 wells around the perimeter of the sprinkler ponds";
  - 9 wells (20 Sep 2023);
  - **11 wells feeding ~250 m³/h to the sprinkler ponds** (14 Nov 2023), with pumps that can run on the two common emergency diesel generators.
  
  Sources: [NEI 24 Aug 2023](https://www.neimagazine.com/news/new-groundwater-sources-begin-to-supply-zaporizhia-npp-11096354/), [NEI 20 Sep 2023](https://www.neimagazine.com/news/more-wells-drilled-at-zaporizhia-npp-11160730/), [NEI 14 Nov 2023](https://www.neimagazine.com/news/iaea-monitors-maintenance-activities-at-zaporizhia-npp-11297138/). The IAEA's own pages were not reachable from here, so cite the IAEA updates directly if you can.
- **Where:** no source publishes well coordinates. The film draws the **reported zone**: a band around the perimeter of the spray ponds, from their OpenStreetMap outlines (`research/logistics/wells-zone.geojson`). It is not a set of well points.
- **Imagery check:** I compared Esri Wayback imagery of the spray-pond block from before (Dec 2022 release) and after (Feb 2024 release) the drilling. At ~0.5–1 m resolution, and with a different viewing angle, individual wellheads can't be identified, so no well points are placed. 30 cm Pléiades Neo imagery (what McKenzie used) might show them.
- **Pond decline:** the cooling pond was dropping ~1 cm a day (NEI, Aug 2023). McKenzie Intelligence / Greenpeace Ukraine ([report, Dec 2025](https://www.greenpeace.org/ukraine/en/news/5438/new-level-of-militarization/)) measured the pond and channels at 9,599,617 m² (3 Jul 2022), 8,767,820 m² (1 Jun 2025) and 8,662,141 m² (12 Aug 2025). They also found a dam built across the intake channel in summer 2025, creating a smaller pond. The thermal plant canal was the pond's other supply ("its other main supply of water", NEI Aug 2023).

### Land change (Earth Engine, `research/land-change/`)
- **Reservoir bed:** about 2,040 km² of water each late summer 2019–22; 313 km² in 2023, 119 km² in 2025. Green vegetation grew from ~10 km² to 1,358 km² (2025) and 1,547 km² (2026).
- **Banks, 2024–26 vs 2019–22:** less green (NDVI 0.40 → 0.27 south bank, 0.42 → 0.33 north bank) and drier (NDMI down 0.10–0.12). Irrigated fields fall the most.
- **Drought caveat:** 2024–25 were also exceptionally dry. `research/canals-ndvi/` separates the canal effect from drought.
- **Cooling pond + channels:** Sentinel-2 monthly water area fell from 8.6 to 5.5 km² between mid-2023 and Oct 2026.

### Fortifications (`research/fortifications/`)
37 features traced from the McKenzie Intelligence / Greenpeace Ukraine report (Pléiades Neo, Jun–Oct 2025). Positions are approximate (~30–80 m; sangars ~10 m; one checkpoint ±200 m). See that folder's README.

### Supply evidence (`research/logistics/`)
- **Road:** Melitopol → ZNPP is 126 km (229 km from Crimea). The last 30 km run within 20 km of the river front.
- **Rail:** OSM shows no active line reaching the plant. The Enerhodar branch is tagged *disused*, so on the mapped network the last leg is by road.
- **Recorded violence:** UCDP has 45 fatal events within 2 km of the road route (Feb 2022 – Sep 2026), 30 of them in Melitopol. UCDP counts only lethal events, so it is **not** a record of strikes on roads or railways.
- **Your sources:** the narration's claim that roads *and railways* were shelled needs its own source (IAEA or press). Our data shows the corridor's exposure, not the strikes.

## Before presenting: check these
- **Kyiv cold open:**
  - The lit image is a real satellite pass (24 Jan 2026).
  - The fade to dark is an illustration. I checked the 31 Jan pass: the sky was clear, but near full moon the snow is brighter than the city, so it can't show the outage. The on-screen source line says so.
  - Keep your own source for the blackout itself.
- **Unsourced figures:** confirm or cut 6 × VVER-1000 / ~6 GW / a fifth of national generation / seized 4 March 2022 / no generation since Sept 2022.
- **Water:** the wells are shown as a reported zone, not as points. The pond imagery comes from annual composites; the area figures are McKenzie's.
- **Frontier:** the event columns also include the occupied bank. Fortifications are traced from a third-party report, so credit McKenzie / Greenpeace Ukraine on screen (done in the source line).
- **Winter:** the night-lights dimming is illustrative.

## Adding trenches / artillery (chapter 07)
Digitize them in QGIS or geojson.io over the Esri/Sentinel imagery. Paste the FeatureCollections into `extra.js`. They draw automatically in chapter 07: trenches as yellow lines, artillery as points. Add a `source` property (imagery + date) to each feature.

## Rebuilding data
`python3 build_data.py` regenerates `data.js` from `../research/` (grid ≥150 kV, both ZNPP lines, damage zones, reservoir 2023-05-01, canals, UCDP events, the IAEA outage chronology).
