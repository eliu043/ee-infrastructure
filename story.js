/* POWERLINES — scene script.
   Edit freely: durations (s), camera keyframes, callouts, captions.
   Camera keyframe: {t: seconds into scene, c:[lng,lat], z: zoom, p: pitch, b: bearing, e: 'io'|'lin'|'out'|'in'}
   Callout: {t, d (duration), ll:[lng,lat], title, sub, h (stem px), side: 'c'|'l'|'r', ring: px}
   layers: target opacity per named layer for the scene (anything omitted fades to 0).
   Total runtime = sum of durations (currently 7:00). */

const P = {
  znpp: [34.5881, 47.5102], enerhodar: [34.6567, 47.4986], tpp: [34.6250, 47.5076],
  nikopol: [34.3956, 47.5712], marhanets: [34.6167, 47.6417], zap: [35.139, 47.838],
  crossing: [34.646, 47.564], dam: [33.3706, 46.7781], melitopol: [35.3653, 46.8489],
  kyiv: [30.52, 50.45], kharkiv: [36.23, 49.99], odesa: [30.73, 46.48], dnipro: [35.05, 48.46], lviv: [24.03, 49.84],
  pond: [34.561, 47.512],         // checked against Esri imagery
};

window.STORY = {
  title: 'POWERLINES',
  exaggeration: 6,            // vertical exaggeration in wide shots (shown on screen)
  exaggerationClose: 1.5,     // …easing to this in close-ups (zoom ≥ 13) so lines don't wobble on the surface model
  places: P,
  scenes: [
  /* 00 ─────────────────────────────────────────── */
  {
    id: 'title', chapter: '', name: 'POWERLINES', dur: 25,
    stamp: '', vo: '',
    titleCard: true,
    layers: { lights: 1, s2021: 0.25, hillshade: 0.25 },
    cam: [
      { t: 0, c: [31.6, 48.3], z: 5.0, p: 20, b: -8 },
      { t: 25, c: [33.4, 47.9], z: 6.4, p: 45, b: 6, e: 'io' },
    ],
    callouts: [],
    sources: 'Night lights: NASA Black Marble (2016, pre-war baseline)',
  },
  /* 01 ─────────────────────────────────────────── */
  {
    id: 'lifeline', chapter: '01', name: 'Lifeline', dur: 45,
    stamp: 'PEACETIME · 1984–2022',
    vo: "During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat.",
    layers: { s2021: 1, hillshade: 0.35, grid: 0.9, gridflow: 0.9, znpp: 1, particles: 1, plant: 1 },
    flow: 1,
    cam: [
      { t: 0, c: [33.4, 47.9], z: 6.4, p: 45, b: 6 },
      { t: 12, c: [34.62, 47.53], z: 11.2, p: 62, b: 20, e: 'io' },
      { t: 30, c: P.znpp, z: 13.6, p: 68, b: 95, e: 'io' },
      { t: 45, c: [34.61, 47.505], z: 12.6, p: 64, b: 140, e: 'io' },
    ],
    callouts: [
      { t: 12, d: 30, ll: P.znpp, title: 'Zaporizhzhia NPP', sub: '6 × VVER-1000 reactors · ~6 GW · largest in Europe', h: 120 },
      { t: 17, d: 25, ll: P.enerhodar, title: 'Enerhodar', sub: 'District heat from the plant', h: 80, side: 'r' },
      { t: 22, d: 20, ll: P.tpp, title: 'Zaporizhzhia thermal plant', sub: '330 kV switchyard', h: 50, side: 'l' },
      { t: 30, d: 14, ll: [34.58, 47.535], title: '750 kV / 330 kV export lines', sub: 'Roughly a fifth of national generation', h: 60, side: 'l' },
    ],
    sources: 'Lines: OpenStreetMap (power=line, ≥150 kV) · Imagery: Sentinel-2 cloudless 2021, EOX',
  },
  /* 02 ─────────────────────────────────────────── */
  {
    id: 'occupation', chapter: '02', name: 'Occupation', dur: 40,
    stamp: '04 · 03 · 2022',
    vo: 'After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion.',
    layers: { s2021: 1, hillshade: 0.35, reservoir: 0.6, frontline: 1, grid: 0.35, znpp: 0.6, plant: 1, bankL: 1 },
    cam: [
      { t: 0, c: [34.61, 47.505], z: 12.6, p: 64, b: 140 },
      { t: 12, c: [34.5, 47.53], z: 10.2, p: 55, b: 200, e: 'io' },
      { t: 40, c: [34.52, 47.53], z: 10.5, p: 58, b: 230, e: 'io' },
    ],
    callouts: [
      { t: 6, d: 32, ll: P.znpp, title: 'Seized 4 March 2022', sub: 'Left (south) bank — under Russian occupation', h: 150, side: 'r' },
      { t: 13, d: 26, ll: P.nikopol, title: 'Nikopol', sub: 'Right bank — Ukrainian-held', h: 70, side: 'l' },
      { t: 16, d: 23, ll: P.marhanets, title: 'Marhanets', sub: 'Right bank — Ukrainian-held', h: 50, side: 'r' },
      { t: 21, d: 18, ll: [34.47, 47.535], title: 'Frontline', sub: 'Runs along the Dnipro / Kakhovka reservoir', h: 110, side: 'l' },
    ],
    sources: 'Reservoir outline: OSM, 2023-05-01 · Frontline drawn schematically along the river',
  },
  /* 03 ─────────────────────────────────────────── */
  {
    id: 'draw', chapter: '03', name: 'It cannot be switched off', dur: 50,
    stamp: 'SEPT 2022 → JUNE 2023 → 2024',
    vo: 'Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor.',
    layers: { s2021: 1, hillshade: 0.35, plant: 1, reservoir: 0.0, frontline: 0.6, canals: 0.0 },
    imagerySwap: { from: 's2021', to: 's2024', t0: 22, t1: 32 },
    cam: [
      { t: 0, c: [34.52, 47.53], z: 10.5, p: 58, b: 230 },
      { t: 10, c: [34.60, 47.505], z: 13.2, p: 60, b: 200, e: 'io' },
      { t: 20, c: [34.45, 47.42], z: 9.6, p: 58, b: 250, e: 'io' },
      { t: 34, c: [34.0, 47.2], z: 8.4, p: 52, b: 255, e: 'io' },
      { t: 44, c: P.dam, z: 10.8, p: 60, b: 230, e: 'io' },
      { t: 50, c: P.dam, z: 11.2, p: 64, b: 210, e: 'lin' },
    ],
    callouts: [
      { t: 2, d: 14, ll: P.znpp, title: 'Cold shutdown', sub: 'No electricity generated since Sept 2022 · cooling never stops', h: 110 },
      { t: 6, d: 12, ll: P.pond, title: 'Cooling pond', sub: 'Needs a continuous supply of water', h: 60, side: 'l' },
      { t: 9, d: 8, ll: P.enerhodar, title: 'Labor', sub: 'Staff must live beside the reactors', h: 50, side: 'r' },
      { t: 22, d: 12, ll: [34.25, 47.45], title: '2021 → 2024', sub: 'Kakhovka reservoir drained', h: 50 },
      { t: 38, d: 12, ll: P.dam, title: 'Kakhovka dam', sub: 'Destroyed 6 June 2023', h: 80 },
    ],
    sources: 'Imagery: Sentinel-2 cloudless 2021 / 2024, EOX · Dam breach date: WNA / IAEA',
  },
  /* 04 ─────────────────────────────────────────── */
  {
    id: 'notyet', chapter: '04', name: 'Not so soon', dur: 20,
    stamp: 'INTENTION · NO DATE',
    vo: 'Eventually Russia wants to connect ZNPP to the national grid, but not so soon.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, grid: 0.25, frontline: 0.6, proposed: 1 },
    cam: [
      { t: 0, c: [33.3706, 46.7781], z: 11.2, p: 64, b: 210 },
      { t: 7, c: [34.6, 47.15], z: 8.2, p: 45, b: 120, e: 'io' },
      { t: 20, c: [34.95, 47.15], z: 8.3, p: 50, b: 150, e: 'lin' },
    ],
    callouts: [
      { t: 4, d: 16, ll: P.melitopol, title: 'Toward the Russian grid', sub: 'Stated intention · schematic, no route verified', h: 70 },
      { t: 7, d: 13, ll: P.znpp, title: 'ZNPP', sub: 'Disconnected · waiting', h: 70, side: 'l' },
    ],
    sources: 'Dashed arrow is schematic — no planned route is shown',
  },
  /* 05 ─────────────────────────────────────────── */
  {
    id: 'repair', chapter: '05', name: 'Shelling and repair', dur: 90,
    stamp: '',   // driven by the timeline
    vo: 'In the meantime, Russia’s shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, znpp: 1, particles: 0.9, zones: 1, frontline: 0.5, timeline: 1, log: 1, grid: 0.15 },
    flow: 1,
    // piecewise mapping of scene time → calendar date
    dates: [[0, '2022-03-04'], [4, '2022-03-04'], [30, '2025-06-01'], [86, '2026-11-24'], [90, '2026-11-24']],
    cam: [
      { t: 0, c: [34.95, 47.15], z: 8.3, p: 50, b: 150 },
      { t: 8, c: [34.45, 47.72], z: 8.9, p: 48, b: 190, e: 'io' },
      { t: 30, c: [34.5, 47.68], z: 9.1, p: 52, b: 215, e: 'lin' },
      { t: 38, c: [34.60, 47.52], z: 12.6, p: 66, b: 200, e: 'io' },
      { t: 48, c: [34.60, 47.52], z: 12.8, p: 66, b: 175, e: 'lin' },
      { t: 55, c: P.crossing, z: 12.4, p: 72, b: 120, e: 'io' },
      { t: 67, c: P.crossing, z: 12.6, p: 72, b: 90, e: 'lin' },
      { t: 73, c: [34.5, 47.6], z: 11.0, p: 62, b: 150, e: 'io' },
      { t: 80, c: [34.52, 47.59], z: 11.1, p: 62, b: 170, e: 'lin' },
      { t: 85, c: P.tpp, z: 13.2, p: 64, b: 210, e: 'io' },
      { t: 90, c: P.tpp, z: 13.4, p: 66, b: 225, e: 'lin' },
    ],
    callouts: [
      { t: 9, d: 20, ll: [34.6236, 47.8325], title: 'Dniprovska 750 kV', sub: 'Main line — north, ~130 km mapped', h: 60 },
      { t: 12, d: 17, ll: [34.42, 47.6], title: 'Ferosplavna-1 330 kV', sub: 'Backup line via the thermal plant switchyard', h: 60, side: 'l' },
      { t: 40, d: 9, ll: [34.598, 47.522], title: 'Z7 · ~1.5 km from the plant', sub: '23 Sep 2025 · 10th loss · one month on diesel', h: 70 },
      { t: 56, d: 12, ll: P.crossing, title: 'Z6 · span over the Dnipro', sub: 'The frontline · out since 24 Mar 2026', h: 90 },
      { t: 61, d: 7, ll: [34.655, 47.585], title: 'Repaired on pylons 100 m above water', sub: '6th ceasefire, June 2026', h: 40, side: 'r' },
      { t: 74, d: 8, ll: [34.48, 47.61], title: 'Z1 · north bank', sub: '20 Aug 2026 · 26th loss · 18 days', h: 70, side: 'l' },
      { t: 85, d: 5, ll: P.tpp, title: 'Z2 · switchyard', sub: 'Backup transformer destroyed again, Nov 2026', h: 70 },
    ],
    sources: 'Outages: IAEA updates via WNA (compiled 2026-11-19) · Damage zones: our reading of IAEA locations (approximate)',
  },
  /* 06 ─────────────────────────────────────────── */
  {
    id: 'dependency', chapter: '06', name: 'Sovereignty becomes dependency', dur: 35,
    stamp: '27 COMPLETE LOSSES OF OFF-SITE POWER',
    vo: 'Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns.',
    layers: { esri: 1, hillshade: 0.2, plant: 1, znpp: 1, particles: 1, counter: 1 },
    flow: -1,
    cam: [
      { t: 0, c: P.tpp, z: 13.4, p: 66, b: 225 },
      { t: 8, c: P.znpp, z: 14.6, p: 70, b: 270, e: 'io' },
      { t: 35, c: P.znpp, z: 14.9, p: 72, b: 400, e: 'lin' },
    ],
    callouts: [
      { t: 6, d: 30, ll: P.znpp, title: 'Power flows in, not out', sub: 'Cooling pumps run on grid electricity', h: 110 },
      { t: 16, d: 20, ll: [34.584, 47.5135], title: '20 emergency diesel generators', sub: 'When both lines fail', h: 190, side: 'l' },
      { t: 24, d: 14, ll: [34.592, 47.507], title: '10-day diesel minimum', sub: 'Reached during the 18-day outage, Aug–Sep 2026', h: 36, side: 'l' },
    ],
    sources: 'Imagery: Esri World Imagery · Counts: IAEA (27th loss, 8 Nov 2026)',
  },
  /* 07 ─────────────────────────────────────────── */
  {
    id: 'frontier', chapter: '07', name: 'Frontier', dur: 45,
    stamp: '',  // driven by event accumulation
    vo: 'Trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted.',
    layers: { s2024: 1, hillshade: 0.4, plant: 1, ucdp: 1, frontline: 0.8, trenches: 1, artillery: 1 },
    dates: [[0, '2022-02-24'], [5, '2022-02-24'], [38, '2026-11-24'], [45, '2026-11-24']],
    cam: [
      { t: 0, c: P.znpp, z: 14.9, p: 72, b: 400 },
      { t: 8, c: [34.53, 47.565], z: 10.9, p: 66, b: 335, e: 'io' },
      { t: 38, c: [34.51, 47.57], z: 10.6, p: 66, b: 310, e: 'lin' },
      { t: 45, c: [34.5, 47.57], z: 10.3, p: 64, b: 300, e: 'io' },
    ],
    callouts: [
      { t: 10, d: 30, ll: P.nikopol, title: 'Nikopol', sub: 'Most-recorded target on the right bank', h: 90 },
      { t: 14, d: 26, ll: P.marhanets, title: 'Marhanets', sub: 'Across the drained reservoir', h: 70, side: 'r' },
      { t: 20, d: 20, ll: P.znpp, title: 'Fortified perimeter', sub: 'Trench lines — to digitize from imagery', h: 60, side: 'l' },
    ],
    sources: 'Events: UCDP GED, fatal events with precise location (n = 829) · fatal events only, an undercount',
  },
  /* 08 ─────────────────────────────────────────── */
  {
    id: 'winter', chapter: '08', name: 'Winter', dur: 35,
    stamp: 'WINTER 2026–27',
    vo: 'As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe.',
    layers: { lights: 1, s2024: 0.18, hillshade: 0.25, plant: 1, beacon: 1 },
    dim: { t0: 8, t1: 28, from: 1, to: 0.12 },
    cam: [
      { t: 0, c: [34.5, 47.57], z: 10.3, p: 64, b: 300 },
      { t: 14, c: [32.0, 48.6], z: 5.4, p: 30, b: 350, e: 'io' },
      { t: 35, c: [31.6, 48.6], z: 5.3, p: 34, b: 362, e: 'lin' },
    ],
    callouts: [
      { t: 15, d: 18, ll: P.kyiv, title: 'Kyiv', sub: '', h: 30 },
      { t: 16, d: 17, ll: P.kharkiv, title: 'Kharkiv', sub: '', h: 30 },
      { t: 17, d: 16, ll: P.odesa, title: 'Odesa', sub: '', h: 30 },
      { t: 18, d: 15, ll: P.dnipro, title: 'Dnipro', sub: '', h: 30 },
      { t: 19, d: 14, ll: P.znpp, title: 'ZNPP', sub: 'Suspended', h: 50 },
    ],
    sources: 'Lights dimmed for illustration — baseline NASA Black Marble 2016; not a measurement of 2026 outages',
  },
  /* 09 ─────────────────────────────────────────── */
  {
    id: 'end', chapter: '', name: 'POWERLINES', dur: 35,
    capUntil: 22,
    stamp: '',
    vo: 'POWERLINES traces the slow violence of war through the militarization of energy infrastructure. By following the disruption of electricity, water, and territory, it examines how the occupation of critical infrastructure contests sovereignty, reorganizes material dependencies, and drains the resources needed to sustain everyday life.',
    endCard: true,
    layers: { s2024: 0.8, hillshade: 0.35, plant: 1, znpp: 0.7, grid: 0.3, frontline: 0.5, lights: 0.1 },
    cam: [
      { t: 0, c: [31.6, 48.6], z: 5.3, p: 34, b: 362 },
      { t: 12, c: P.znpp, z: 10.6, p: 66, b: 420, e: 'io' },
      { t: 35, c: P.znpp, z: 11.0, p: 68, b: 500, e: 'lin' },
    ],
    callouts: [],
    sources: '',
  },
  ],
};
