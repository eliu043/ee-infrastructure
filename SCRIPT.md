# POWERLINES — 7:00 film script (v3)

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
   - **Voice live over picture:** use presenter mode (P) and advance after each paragraph.
   - **Voice-over recorded separately:** play straight through, then lay the audio over it in Premiere.
3. Captions can stay on as subtitles. Turn them off (C) if you'd rather read from this sheet.

## Timing and narration (v3 — Kyiv cold open)
Each chapter's caption appears after its chapter card (~5 s in).

| Time | Chapter | Narration (yours, verbatim) | What's on screen |
|---|---|---|---|
| 0:00 | Cold open · Kyiv | For a few hours on the last day of January this year, virtually all of Kyiv was submerged in darkness. | Real VIIRS night pass of Kyiv lit (24 Jan 2026), then it fades to dark at 0:16 — labelled **illustration** |
| 0:34 | Hostage | Hidden in plain sight is the slow violence of infrastructural warfare as Ukraine's energy facilities are being held hostage. | Night flight Kyiv → ZNPP (440 km), then the POWERLINES title |
| 1:02 | 01 Lifeline | During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat. | Grid pulses outward; particles flow out |
| 1:32 | 02 Occupation | After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion. | Frontline along the reservoir |
| 1:58 | 03 It cannot be switched off | Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor. | Energy / Water / Labor callouts |
| 2:22 | 04 Water | Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP became reliant on newly drilled wells after the remaining water from the nearby Zaporizhzhia Thermal Power Plants canals depleted. | Imagery 2021 → 2023 → 2024 → 2025; pond, canals, wells |
| 3:08 | 05 Not so soon | Eventually Russia wants to connect ZNPP to the national grid, but not so soon. | Schematic arrow |
| 3:23 | 06 Shelling and repair | In the meantime, Russia's shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force. | Outage timeline 2022–26, damage zones, plus crew road routes |
| 4:27 | 07 Sovereignty becomes dependency | Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns. | Close orbit; power flows **into** the plant |
| 4:59 | 08 Blackout and supply | During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators, whose delivery was challenged by Russia's shelling of roads and railways. | Counter to 8. Diesel generators, then the Melitopol supply route, the disused rail branch, and fatal events along the route |
| 5:43 | 09 Frontier | Furthermore, trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted. | UCDP event columns rise 2022 → 2026 |
| 6:21 | 10 Winter | As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe. | Ukraine's lights dim; ZNPP beacon |
| 6:46 | End | — | Title and credits |

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
- **Water:** the wells' locations aren't mapped, and the pond change comes from annual composites.
- **Frontier:** the event columns also include the occupied bank.
- **Winter:** the night-lights dimming is illustrative.

## Adding trenches / artillery (chapter 07)
Digitize them in QGIS or geojson.io over the Esri/Sentinel imagery. Paste the FeatureCollections into `extra.js`. They draw automatically in chapter 07: trenches as yellow lines, artillery as points. Add a `source` property (imagery + date) to each feature.

## Rebuilding data
`python3 build_data.py` regenerates `data.js` from `../research/` (grid ≥150 kV, both ZNPP lines, damage zones, reservoir 2023-05-01, canals, UCDP events, the IAEA outage chronology).
