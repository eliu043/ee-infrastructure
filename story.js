/* POWERLINES — scene script (v2: cold open, water, roads).
   Edit freely: durations (s), camera keyframes, callouts, captions.
   Camera keyframe: {t: seconds into scene, c:[lng,lat], z: zoom, p: pitch, b: bearing, e: 'io'|'lin'|'out'|'in'}
   Callout: {t, d (duration), ll:[lng,lat], title, sub, h (stem px), side: 'c'|'l'|'r'}
   layers: target opacity per named layer for the scene (anything omitted fades to 0).
   imagerySeq: [[t, layer], ...] crossfades base imagery (2 s) — layers s2021, s2023, s2024, s2025, esri.
   stamps: [[t, text], ...] changes the top-right stamp during a scene.
   Total runtime = sum of durations (currently 7:00). Keep each scene's first camera keyframe equal
   to the previous scene's last one, or the cut will jump. */

const P = {
  znpp: [34.5881, 47.5102], enerhodar: [34.6567, 47.4986], tpp: [34.6250, 47.5076],
  nikopol: [34.3956, 47.5712], marhanets: [34.6167, 47.6417], zap: [35.139, 47.838],
  crossing: [34.646, 47.564], dam: [33.3706, 46.7781], melitopol: [35.3653, 46.8489],
  kyiv: [30.52, 50.45], kharkiv: [36.23, 49.99], odesa: [30.73, 46.48], dnipro: [35.05, 48.46], lviv: [24.03, 49.84],
  pond: [34.561, 47.512],            // OSM way 21507833, checked against imagery
  tppCanal: [34.6441, 47.5327],      // OSM way 239908337, thermal plant canal to the former reservoir
  spray: [34.5915, 47.5105],         // OSM spray ponds ("bassin de refrigération")
  z1: [34.3768, 47.5969], z10: [34.62, 47.6132], z4: [34.009, 48.42],
};
// shared camera positions so chapter joins stay continuous
const C = {
  frontierEnd: { c: [34.5, 47.57], z: 10.3, p: 64, b: 300 },
  lifelineEnd: { c: [34.61, 47.505], z: 12.6, p: 64, b: 140 },
  occEnd: { c: [34.52, 47.53], z: 10.5, p: 58, b: 230 },
  drawEnd: { c: [34.6, 47.508], z: 13.4, p: 62, b: 210 },
  waterEnd: { c: [34.585, 47.513], z: 13.0, p: 62, b: 160 },
  notyetEnd: { c: [34.95, 47.15], z: 8.3, p: 50, b: 150 },
  repairEnd: { c: P.tpp, z: 13.4, p: 66, b: 225 },
  depEnd: { c: P.znpp, z: 14.9, p: 72, b: 400 },
  roadsEnd: { c: [34.55, 47.9], z: 8.4, p: 50, b: 345 },
  winterEnd: { c: [31.6, 48.6], z: 5.3, p: 34, b: 362 },
};
const at = (t, k, e) => ({ t, ...k, e });

window.STORY = {
  title: 'POWERLINES',
  exaggeration: 6,            // vertical exaggeration in wide shots (shown on screen)
  exaggerationClose: 1.5,     // …easing to this in close-ups (zoom ≥ 13) so lines don't wobble on the surface model
  places: P,
  scenes: [
  /* COLD OPEN ───────────────────────────────────── */
  {
    id: 'frontier', chapter: '', name: 'Frontier', dur: 40,
    stamp: '',  // driven by event accumulation
    vo: 'Trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted.',
    layers: { s2024: 1, hillshade: 0.4, plant: 1, ucdp: 1, frontline: 0.8, trenches: 1, artillery: 1 },
    dates: [[0, '2022-02-24'], [3, '2022-02-24'], [32, '2026-11-24'], [40, '2026-11-24']],
    cam: [
      { t: 0, c: [34.42, 47.42], z: 9.4, p: 58, b: 345 },
      { t: 14, c: [34.53, 47.565], z: 10.9, p: 66, b: 335, e: 'io' },
      { t: 32, c: [34.51, 47.57], z: 10.6, p: 66, b: 310, e: 'lin' },
      at(40, C.frontierEnd, 'io'),
    ],
    callouts: [
      { t: 9, d: 27, ll: P.nikopol, title: 'Nikopol', sub: 'Most-recorded location on the right bank', h: 90 },
      { t: 12, d: 24, ll: P.marhanets, title: 'Marhanets', sub: 'Across the drained reservoir', h: 70, side: 'r' },
      { t: 16, d: 20, ll: P.znpp, title: 'ZNPP', sub: 'Fortified perimeter · trench lines to digitize', h: 60, side: 'l' },
    ],
    sources: 'Events: UCDP GED, fatal events with precise location (n = 829) · fatal events only, an undercount',
  },
  /* TITLE ───────────────────────────────────────── */
  {
    id: 'title', chapter: '', name: 'POWERLINES', dur: 15,
    stamp: 'BEFORE · 2021', vo: '',
    titleCard: true,
    layers: { lights: 0.9, s2021: 0.3, hillshade: 0.25 },
    cam: [
      at(0, C.frontierEnd),
      { t: 15, c: [33.6, 47.85], z: 6.6, p: 42, b: 360, e: 'io' },
    ],
    callouts: [],
    sources: 'Night lights: NASA Black Marble (2016, pre-war baseline)',
  },
  /* 01 ─────────────────────────────────────────── */
  {
    id: 'lifeline', chapter: '01', name: 'Lifeline', dur: 32,
    stamp: 'PEACETIME · 1984–2022',
    vo: "During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat.",
    layers: { s2021: 1, hillshade: 0.35, grid: 0.9, gridflow: 0.9, znpp: 1, particles: 1, plant: 1 },
    flow: 1,
    cam: [
      { t: 0, c: [33.6, 47.85], z: 6.6, p: 42, b: 360 },
      { t: 10, c: [34.62, 47.53], z: 11.2, p: 62, b: 380, e: 'io' },
      { t: 24, c: P.znpp, z: 13.6, p: 68, b: 455, e: 'io' },
      at(32, { ...C.lifelineEnd, b: 500 }, 'io'),
    ],
    callouts: [
      { t: 9, d: 22, ll: P.znpp, title: 'Zaporizhzhia NPP', sub: '6 × VVER-1000 reactors · ~6 GW · largest in Europe', h: 120 },
      { t: 13, d: 18, ll: P.enerhodar, title: 'Enerhodar', sub: 'District heat from the plant', h: 80, side: 'r' },
      { t: 17, d: 14, ll: P.tpp, title: 'Zaporizhzhia thermal plant', sub: '330 kV switchyard', h: 50, side: 'l' },
      { t: 23, d: 9, ll: [34.58, 47.535], title: '750 kV / 330 kV export lines', sub: 'Roughly a fifth of national generation', h: 60, side: 'l' },
    ],
    sources: 'Lines: OpenStreetMap (power=line, ≥150 kV) · Imagery: Sentinel-2 cloudless 2021, EOX',
  },
  /* 02 ─────────────────────────────────────────── */
  {
    id: 'occupation', chapter: '02', name: 'Occupation', dur: 28,
    stamp: '04 · 03 · 2022',
    vo: 'After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion.',
    layers: { s2021: 1, hillshade: 0.35, reservoir: 0.6, frontline: 1, grid: 0.35, znpp: 0.6, plant: 1 },
    cam: [
      at(0, { ...C.lifelineEnd, b: 500 }),
      { t: 10, c: [34.5, 47.53], z: 10.2, p: 55, b: 560, e: 'io' },
      at(28, { ...C.occEnd, b: 590 }, 'io'),
    ],
    callouts: [
      { t: 5, d: 22, ll: P.znpp, title: 'Seized 4 March 2022', sub: 'Left (south) bank — under Russian occupation', h: 150, side: 'r' },
      { t: 10, d: 17, ll: P.nikopol, title: 'Nikopol', sub: 'Right bank — Ukrainian-held', h: 70, side: 'l' },
      { t: 12, d: 15, ll: P.marhanets, title: 'Marhanets', sub: 'Right bank — Ukrainian-held', h: 50, side: 'r' },
      { t: 15, d: 12, ll: [34.47, 47.535], title: 'Frontline', sub: 'Runs along the Dnipro / Kakhovka reservoir', h: 110, side: 'l' },
    ],
    sources: 'Reservoir outline: OSM, 2023-05-01 · Frontline drawn schematically along the river',
  },
  /* 03 ─────────────────────────────────────────── */
  {
    id: 'draw', chapter: '03', name: 'It cannot be switched off', dur: 26,
    stamp: 'COLD SHUTDOWN · SINCE SEPT 2022',
    vo: 'Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor.',
    layers: { s2021: 1, hillshade: 0.3, plant: 1, znpp: 0.5, frontline: 0.4 },
    cam: [
      at(0, { ...C.occEnd, b: 590 }),
      { t: 10, c: [34.60, 47.505], z: 13.2, p: 60, b: 560, e: 'io' },
      at(26, { ...C.drawEnd, b: 570 }, 'lin'),
    ],
    callouts: [
      { t: 6, d: 19, ll: P.znpp, title: 'Energy', sub: 'No electricity generated since Sept 2022 · cooling never stops', h: 120 },
      { t: 10, d: 15, ll: P.spray, title: 'Water', sub: 'Spray ponds and cooling pond keep the cores cool', h: 60, side: 'l' },
      { t: 14, d: 11, ll: P.enerhodar, title: 'Labor', sub: 'Staff must live beside the reactors', h: 60, side: 'r' },
    ],
    sources: 'Imagery: Sentinel-2 cloudless 2021, EOX',
  },
  /* 04 WATER ───────────────────────────────────── */
  {
    id: 'water', chapter: '04', name: 'Water', dur: 52,
    stamp: '2021',
    vo: 'Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP became reliant on newly drilled wells after the remaining water from the nearby Zaporizhzhia Thermal Power Plant’s canals depleted.',
    layers: { s2021: 1, hillshade: 0.35, plant: 0.6, water: 1, frontline: 0 },
    imagerySeq: [[0, 's2021'], [17, 's2023'], [32, 's2024'], [41, 's2025']],
    stamps: [[0, '2021 · RESERVOIR FULL'], [16, 'JUNE 2023 · DAM DESTROYED'], [32, '2024'], [41, '2025']],
    cam: [
      at(0, { ...C.drawEnd, b: 570 }),
      { t: 8, c: [34.25, 47.42], z: 9.6, p: 56, b: 600, e: 'io' },
      { t: 16, c: [33.75, 47.1], z: 8.6, p: 52, b: 610, e: 'io' },
      { t: 22, c: [34.2, 47.4], z: 9.3, p: 56, b: 590, e: 'io' },
      { t: 31, c: [34.585, 47.515], z: 12.8, p: 60, b: 540, e: 'io' },
      at(52, { ...C.waterEnd, b: 520 }, 'lin'),
    ],
    callouts: [
      { t: 3, d: 9, ll: P.pond, title: 'Cooling pond', sub: 'Topped up from the Kakhovka reservoir', h: 90, side: 'l' },
      { t: 12, d: 10, ll: [33.95, 47.25], title: 'Kakhovka reservoir', sub: 'Drained after the dam was destroyed, 6 June 2023', h: 70 },
      { t: 33, d: 18, ll: P.pond, title: 'Cooling pond', sub: 'No longer refilled · banks exposed by 2024–25', h: 170, side: 'r' },
      { t: 36, d: 15, ll: P.tppCanal, title: 'Thermal plant canals', sub: 'Remaining water pumped to the pond until depleted', h: 80, side: 'r' },
      { t: 42, d: 10, ll: [34.575, 47.503], title: 'Newly drilled wells', sub: 'Groundwater now feeds the site · locations not mapped', h: 45, side: 'l' },
    ],
    sources: 'Imagery: Sentinel-2 cloudless 2021 / 2023 / 2024 / 2025, EOX (annual composites) · Water bodies: OpenStreetMap',
  },
  /* 05 ─────────────────────────────────────────── */
  {
    id: 'notyet', chapter: '05', name: 'Not so soon', dur: 16,
    stamp: 'INTENTION · NO DATE',
    vo: 'Eventually Russia wants to connect ZNPP to the national grid, but not so soon.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, grid: 0.25, frontline: 0.6, proposed: 1 },
    cam: [
      at(0, { ...C.waterEnd, b: 520 }),
      { t: 7, c: [34.6, 47.15], z: 8.2, p: 45, b: 480, e: 'io' },
      at(16, C.notyetEnd, 'lin'),
    ],
    callouts: [
      { t: 5, d: 11, ll: P.melitopol, title: 'Toward the Russian grid', sub: 'Stated intention · schematic, no route verified', h: 70 },
      { t: 6, d: 10, ll: P.znpp, title: 'ZNPP', sub: 'Disconnected · waiting', h: 70, side: 'l' },
    ],
    sources: 'Dashed arrow is schematic — no planned route is shown',
  },
  /* 06 ─────────────────────────────────────────── */
  {
    id: 'repair', chapter: '06', name: 'Shelling and repair', dur: 72,
    stamp: '',   // driven by the timeline
    vo: 'In the meantime, Russia’s shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, znpp: 1, particles: 0.9, zones: 1, frontline: 0.5, timeline: 1, log: 1, grid: 0.15 },
    flow: 1,
    dates: [[0, '2022-03-04'], [3, '2022-03-04'], [24, '2025-06-01'], [68.8, '2026-11-24'], [72, '2026-11-24']],
    cam: [
      at(0, C.notyetEnd),
      { t: 6.4, c: [34.45, 47.72], z: 8.9, p: 48, b: 190, e: 'io' },
      { t: 24, c: [34.5, 47.68], z: 9.1, p: 52, b: 215, e: 'lin' },
      { t: 30.4, c: [34.60, 47.52], z: 12.6, p: 66, b: 200, e: 'io' },
      { t: 38.4, c: [34.60, 47.52], z: 12.8, p: 66, b: 175, e: 'lin' },
      { t: 44, c: P.crossing, z: 12.4, p: 72, b: 120, e: 'io' },
      { t: 53.6, c: P.crossing, z: 12.6, p: 72, b: 90, e: 'lin' },
      { t: 58.4, c: [34.5, 47.6], z: 11.0, p: 62, b: 150, e: 'io' },
      { t: 64, c: [34.52, 47.59], z: 11.1, p: 62, b: 170, e: 'lin' },
      { t: 68, c: P.tpp, z: 13.2, p: 64, b: 210, e: 'io' },
      at(72, C.repairEnd, 'lin'),
    ],
    callouts: [
      { t: 7, d: 16, ll: [34.6236, 47.8325], title: 'Dniprovska 750 kV', sub: 'Main line — north, ~130 km mapped', h: 60 },
      { t: 9.5, d: 14, ll: [34.42, 47.6], title: 'Ferosplavna-1 330 kV', sub: 'Backup line via the thermal plant switchyard', h: 60, side: 'l' },
      { t: 32, d: 7, ll: [34.598, 47.522], title: 'Z7 · ~1.5 km from the plant', sub: '23 Sep 2025 · 10th loss · one month on diesel', h: 70 },
      { t: 45, d: 9.5, ll: P.crossing, title: 'Z6 · span over the Dnipro', sub: 'The frontline · out since 24 Mar 2026', h: 90 },
      { t: 49, d: 5.5, ll: [34.655, 47.585], title: 'Repaired on pylons 100 m above water', sub: '6th ceasefire, June 2026', h: 40, side: 'r' },
      { t: 59, d: 6.5, ll: [34.48, 47.61], title: 'Z1 · north bank', sub: '20 Aug 2026 · 26th loss · 18 days', h: 70, side: 'l' },
      { t: 68, d: 4, ll: P.tpp, title: 'Z2 · switchyard', sub: 'Backup transformer destroyed again, Nov 2026', h: 70 },
    ],
    sources: 'Outages: IAEA updates via WNA (compiled 2026-11-19) · Damage zones: our reading of IAEA locations (approximate)',
  },
  /* 07 ─────────────────────────────────────────── */
  {
    id: 'dependency', chapter: '07', name: 'Sovereignty becomes dependency', dur: 38,
    stamp: 'COMPLETE BLACKOUTS · 2022–2024',
    vo: 'Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns. During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators.',
    layers: { esri: 1, hillshade: 0.2, plant: 1, znpp: 1, particles: 1, counter: 1 },
    flow: -1,
    counter: { n: 8, t0: 14, t1: 22, label: 'COMPLETE BLACKOUTS, 2022–2024 · ALL OFF-SITE POWER LOST', note: '27 by November 2026 · IAEA' },
    cam: [
      at(0, C.repairEnd),
      { t: 8, c: P.znpp, z: 14.6, p: 70, b: 270, e: 'io' },
      at(38, C.depEnd, 'lin'),
    ],
    callouts: [
      { t: 6, d: 14, ll: P.znpp, title: 'Power flows in, not out', sub: 'Cooling pumps run on grid electricity', h: 110 },
      { t: 20, d: 17, ll: [34.584, 47.5135], title: '20 reserve diesel generators', sub: 'The only power during a blackout', h: 190, side: 'l' },
    ],
    sources: 'Imagery: Esri World Imagery · Blackout count: IAEA (8 complete losses of off-site power by end of 2023; 27 by 8 Nov 2026)',
  },
  /* 08 ROADS ───────────────────────────────────── */
  {
    id: 'roads', chapter: '08', name: 'Roads', dur: 45,
    stamp: 'ROAD ACCESS · OSM 2026',
    vo: '',   // write narration for this chapter — see SCRIPT.md for the findings
    layers: { s2024: 0.8, hillshade: 0.35, plant: 1, roads: 1, routes: 1, trucks: 1, frontline: 0.7, zones: 0.6 },
    cam: [
      at(0, C.depEnd),
      { t: 9, c: [35.0, 47.12], z: 8.3, p: 52, b: 340, e: 'io' },
      { t: 18, c: [34.95, 47.2], z: 8.4, p: 54, b: 352, e: 'lin' },
      { t: 26, c: [34.5, 47.59], z: 10.4, p: 60, b: 335, e: 'io' },
      { t: 36, c: [34.5, 47.6], z: 10.5, p: 60, b: 345, e: 'lin' },
      at(45, C.roadsEnd, 'io'),
    ],
    callouts: [
      { t: 9, d: 15, ll: P.melitopol, title: 'Melitopol → ZNPP · 126 km', sub: 'Diesel and supplies by road · from Crimea 229 km', h: 80 },
      { t: 12, d: 12, ll: [34.78, 47.42], title: 'Last 30 km within 20 km of the river front', sub: 'Shortest route, OSM network', h: 60, side: 'r' },
      { t: 26, d: 11, ll: P.z1, title: 'Nikopol → Z1 · 3.6 km', sub: 'Ukrainian crews · the break sits on the frontline', h: 80, side: 'l' },
      { t: 28, d: 9, ll: P.z10, title: 'Marhanets → Z10 · 3.2 km', sub: 'Repairs only under IAEA ceasefires', h: 60, side: 'r' },
      { t: 30, d: 8, ll: [34.5, 47.54], title: 'No road links the two banks', sub: 'Each side repairs its own breaks', h: 40 },
      { t: 38, d: 7, ll: P.z4, title: 'Dnipro → Dniprovska substation · 102 km', sub: 'Struck May and Nov 2026', h: 60 },
    ],
    sources: 'Roads: OpenStreetMap (Overpass, 24 Nov 2026) · Routes: shortest road distance, not observed convoys (research/logistics)',
  },
  /* 09 ─────────────────────────────────────────── */
  {
    id: 'winter', chapter: '09', name: 'Winter', dur: 28,
    stamp: 'WINTER 2026–27',
    vo: 'As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe.',
    layers: { lights: 1, s2024: 0.18, hillshade: 0.25, plant: 1, beacon: 1 },
    dim: { t0: 8, t1: 24, from: 1, to: 0.12 },
    cam: [
      at(0, C.roadsEnd),
      { t: 12, c: [32.0, 48.6], z: 5.4, p: 30, b: 350, e: 'io' },
      at(28, C.winterEnd, 'lin'),
    ],
    callouts: [
      { t: 12, d: 15, ll: P.kyiv, title: 'Kyiv', sub: '', h: 30 },
      { t: 13, d: 14, ll: P.kharkiv, title: 'Kharkiv', sub: '', h: 30 },
      { t: 14, d: 13, ll: P.odesa, title: 'Odesa', sub: '', h: 30 },
      { t: 15, d: 12, ll: P.dnipro, title: 'Dnipro', sub: '', h: 30 },
      { t: 16, d: 11, ll: P.znpp, title: 'ZNPP', sub: 'Suspended', h: 50 },
    ],
    sources: 'Lights dimmed for illustration — baseline NASA Black Marble 2016; not a measurement of 2026 outages',
  },
  /* END ─────────────────────────────────────────── */
  {
    id: 'end', chapter: '', name: 'POWERLINES', dur: 28,
    stamp: '',
    // The v1 closing paragraph ("POWERLINES traces the slow violence of war…") is no longer in the narrative.
    // Paste it back here if you want it read over the final orbit; capUntil controls when the title replaces it.
    vo: '',
    capUntil: 6,
    endCard: true,
    layers: { s2024: 0.8, hillshade: 0.35, plant: 1, znpp: 0.7, grid: 0.3, frontline: 0.5, lights: 0.1 },
    cam: [
      at(0, C.winterEnd),
      { t: 12, c: P.znpp, z: 10.6, p: 66, b: 420, e: 'io' },
      { t: 28, c: P.znpp, z: 11.0, p: 68, b: 480, e: 'lin' },
    ],
    callouts: [],
    sources: '',
  },
  ],
};
