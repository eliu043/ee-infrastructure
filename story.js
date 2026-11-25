/* Infrastructure: Instruments of Power — scene script (v3: Kyiv cold open → ZNPP → supply → frontier → winter).
   Edit freely: durations (s), camera keyframes, callouts, captions.
   Camera keyframe: {t: seconds into scene, c:[lng,lat], z: zoom, p: pitch, b: bearing, e: 'io'|'lin'|'out'|'in'}
   Callout: {t, d (duration), ll:[lng,lat], title, sub, h (stem px), side: 'c'|'l'|'r'}
   layers: target opacity per named layer for the scene (anything omitted fades to 0).
   imagerySeq: [[t, layer], ...] crossfades base imagery (2 s) — s2021, s2023, s2024, s2025, esri, dnb20260124 (VIIRS night, 24 Jan 2026).
   stamps: [[t, text], ...] changes the top-right stamp during a scene.
   routeKinds: which analysed routes to draw ('diesel', 'crew-ua', 'crew-ru').
   titleCard: true or {t0, t1}; capUntil: hide the caption after this many seconds.
   sources: full citation for the scene · credit: the short version shown bottom-left while the slide is on.
   Total runtime = sum of durations (currently 7:00). Keep each scene's first camera keyframe equal
   to the previous scene's last one, or the cut will jump. Bearings turn the short way round. */

const P = {
  znpp: [34.5881, 47.5102], enerhodar: [34.6567, 47.4986], tpp: [34.6250, 47.5076],
  nikopol: [34.3956, 47.5712], marhanets: [34.6167, 47.6417], zap: [35.139, 47.838],
  crossing: [34.646, 47.564], dam: [33.3706, 46.7781], melitopol: [35.3653, 46.8489],
  kyiv: [30.52, 50.45], kharkiv: [36.23, 49.99], odesa: [30.73, 46.48], dnipro: [35.05, 48.46], lviv: [24.03, 49.84],
  pond: [34.561, 47.512],            // OSM way 21507833, checked against imagery
  tppCanal: [34.6441, 47.5327],      // OSM way 239908337, thermal plant canal to the former reservoir
  spray: [34.5915, 47.5105],         // OSM spray ponds ("bassin de refrigération")
  kakhovskeMore: [35.03, 47.3825],   // OSM station where the disused Enerhodar branch leaves the network
  vesele: [34.93, 47.01],
};
const C = {
  kyivEnd: { c: [30.6, 50.35], z: 8.3, p: 50, b: 25 },
  hostageEnd: { c: [34.2, 47.75], z: 7.6, p: 45, b: 0 },
  lifelineEnd: { c: [34.61, 47.505], z: 12.6, p: 64, b: 140 },
  occEnd: { c: [34.52, 47.53], z: 10.5, p: 58, b: 230 },
  drawEnd: { c: [34.6, 47.508], z: 13.4, p: 62, b: 210 },
  waterEnd: { c: [34.585, 47.513], z: 13.0, p: 62, b: 160 },
  notyetEnd: { c: [34.95, 47.15], z: 8.3, p: 50, b: 150 },
  repairEnd: { c: [34.625, 47.5076], z: 13.4, p: 66, b: 225 },
  depEnd: { c: [34.5881, 47.5102], z: 14.9, p: 72, b: 40 },
  supplyEnd: { c: [34.5, 47.45], z: 9.6, p: 58, b: 345 },
  frontierEnd: { c: [34.5, 47.57], z: 10.3, p: 64, b: 300 },
  winterEnd: { c: [31.6, 48.6], z: 5.3, p: 34, b: 2 },
};
const at = (t, k, e) => ({ t, ...k, e });

window.STORY = {
  title: 'Infrastructure: Instruments of Power', // text after ':' becomes the second line of the opening title
  exaggeration: 6,            // vertical exaggeration in wide shots (shown on screen)
  exaggerationClose: 1,       // …easing to true scale in close-ups (zoom ≥ 13); above 1 the elevation data warps buildings and riverbanks
  places: P,
  scenes: [
  /* COLD OPEN · KYIV ────────────────────────────── */
  {
    id: 'kyiv', chapter: '', name: 'Kyiv', dur: 34,
    vo: 'For a few hours on the last day of January this year, virtually all of Kyiv was submerged in darkness.',
    layers: { dnb20260124: 1 },
    dim: { layer: 'dnb20260124', t0: 16, t1: 23, from: 1, to: 0.05 },
    stamps: [[0, 'KYIV · 24 JAN 2026 · SATELLITE'], [16, 'KYIV · 31 JAN 2026 · ILLUSTRATION']],
    cam: [
      { t: 0, c: [30.52, 50.45], z: 8.9, p: 30, b: -20 },
      { t: 34, ...C.kyivEnd, e: 'io' },
    ],
    callouts: [
      { t: 4, d: 11, ll: P.kyiv, title: 'Kyiv', sub: 'Night satellite pass · 24 January 2026', h: 90 },
      { t: 18, d: 14, ll: P.kyiv, title: 'Kyiv · 31 January 2026', sub: 'Blackout for a few hours', h: 90 },
    ],
    sources: 'VIIRS Day/Night Band, NOAA-20 (NASA GIBS), 24 Jan 2026, ~01:30 local. The fade to dark is an illustration: the 31 Jan pass is moonlit snow and cannot show the outage',
    credit: 'Night pass: VIIRS NOAA-20, 24 Jan 2026 · darkening is illustrative',   // short line for the bottom-left credits
  },
  /* HOSTAGE · FLIGHT TO ZNPP + TITLE ────────────── */
  {
    id: 'hostage', chapter: '', name: 'Infrastructure: Instruments of Power', dur: 28,
    vo: 'Hidden in plain sight is the slow violence of infrastructural warfare as Ukraine’s energy facilities are being held hostage.',
    capUntil: 14,
    titleCard: { t0: 15, t1: 27.5 },
    layers: { lights: 0.85, s2021: 0.2, hillshade: 0.2, plant: 1, beacon: 1 },
    stamps: [[0, 'KYIV → ZAPORIZHZHIA NPP · 440 KM']],
    cam: [
      at(0, C.kyivEnd),
      { t: 16, c: [32.8, 49.0], z: 6.4, p: 40, b: 70, e: 'io' },
      at(28, C.hostageEnd, 'io'),
    ],
    callouts: [
      { t: 6, d: 9, ll: P.znpp, title: 'Zaporizhzhia NPP', sub: 'Occupied since March 2022', h: 70 },
    ],
    sources: 'Night lights: NASA Black Marble (2016, pre-war baseline)',
    credit: 'Night lights: NASA Black Marble 2016',   // short line for the bottom-left credits
  },
  /* 01 ─────────────────────────────────────────── */
  {
    id: 'lifeline', chapter: '01', name: 'Lifeline', dur: 30,
    stamp: 'PEACETIME · 1984–2022',
    vo: "During peace time, the Zaporizhzhia Nuclear Power Plant was Ukraine's energy lifeline, lighting cities and warming homes through residual heat.",
    layers: { s2021: 1, hillshade: 0.35, grid: 0.9, gridflow: 0.9, znpp: 1, particles: 1, plant: 1 },
    flow: 1,
    cam: [
      at(0, C.hostageEnd),
      { t: 9, c: [34.62, 47.53], z: 11.2, p: 62, b: 20, e: 'io' },
      { t: 22, c: P.znpp, z: 13.6, p: 68, b: 95, e: 'io' },
      at(30, C.lifelineEnd, 'io'),
    ],
    callouts: [
      { t: 8, d: 21, ll: P.znpp, title: 'Zaporizhzhia NPP', sub: '6 × VVER-1000 reactors · ~6 GW · largest in Europe', h: 120 },
      { t: 12, d: 17, ll: P.enerhodar, title: 'Enerhodar', sub: 'District heat from the plant', h: 80, side: 'r' },
      { t: 16, d: 13, ll: P.tpp, title: 'Zaporizhzhia thermal plant', sub: '330 kV switchyard', h: 50, side: 'l' },
      { t: 21, d: 8, ll: [34.58, 47.535], title: '750 kV / 330 kV export lines', sub: 'Roughly a fifth of national generation', h: 60, side: 'l' },
    ],
    sources: 'Lines: OpenStreetMap (power=line, ≥150 kV) · Imagery: Sentinel-2 cloudless 2021, EOX',
    credit: 'Lines: OpenStreetMap',   // short line for the bottom-left credits
  },
  /* 02 ─────────────────────────────────────────── */
  {
    id: 'occupation', chapter: '02', name: 'Occupation', dur: 26,
    stamp: '04 · 03 · 2022',
    vo: 'After the 2022 Russian occupation of the left bank of the Dnieper River, ZNPP became an instrument of coercion.',
    layers: { s2021: 1, hillshade: 0.35, reservoir: 0.6, frontline: 1, grid: 0.35, znpp: 0.6, plant: 1 },
    cam: [
      at(0, C.lifelineEnd),
      { t: 9, c: [34.5, 47.53], z: 10.2, p: 55, b: 200, e: 'io' },
      at(26, C.occEnd, 'io'),
    ],
    callouts: [
      { t: 5, d: 20, ll: P.znpp, title: 'Seized 4 March 2022', sub: 'Left (south) bank — under Russian occupation', h: 150, side: 'r' },
      { t: 9, d: 16, ll: P.nikopol, title: 'Nikopol', sub: 'Right bank — Ukrainian-held', h: 70, side: 'l' },
      { t: 11, d: 14, ll: P.marhanets, title: 'Marhanets', sub: 'Right bank — Ukrainian-held', h: 50, side: 'r' },
      { t: 14, d: 11, ll: [34.47, 47.535], title: 'Frontline', sub: 'Runs along the Dnipro / Kakhovka reservoir', h: 110, side: 'l' },
    ],
    sources: 'Reservoir outline: OSM, 2023-05-01 · Frontline drawn schematically along the river',
    credit: 'Reservoir: OSM · frontline schematic',   // short line for the bottom-left credits
  },
  /* 03 ─────────────────────────────────────────── */
  {
    id: 'draw', chapter: '03', name: 'It cannot be switched off', dur: 24,
    stamp: 'COLD SHUTDOWN · SINCE SEPT 2022',
    vo: 'Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor.',
    layers: { s2021: 1, hillshade: 0.3, plant: 1, znpp: 0.5, frontline: 0.4 },
    cam: [
      at(0, C.occEnd),
      { t: 9, c: [34.60, 47.505], z: 13.2, p: 60, b: 200, e: 'io' },
      at(24, C.drawEnd, 'lin'),
    ],
    callouts: [
      { t: 6, d: 17, ll: P.znpp, title: 'Energy', sub: 'No electricity generated since Sept 2022 · cooling never stops', h: 120 },
      { t: 10, d: 13, ll: P.spray, title: 'Water', sub: 'Spray ponds and cooling pond keep the cores cool', h: 60, side: 'l' },
      { t: 13, d: 10, ll: P.enerhodar, title: 'Labor', sub: 'Staff must live beside the reactors', h: 60, side: 'r' },
    ],
    sources: 'Imagery: Sentinel-2 cloudless 2021, EOX',
  },
  /* 04 ─────────────────────────────────────────── */
  {
    id: 'water', chapter: '04', name: 'Water', dur: 54,
    stamp: '2021',
    vo: 'Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP became reliant on newly drilled wells after the remaining water from the nearby Zaporizhzhia Thermal Power Plant’s canals depleted.',
    layers: { s2021: 1, hillshade: 0.35, plant: 0.6, water: 1, wells: 0 },
    imagerySeq: [[0, 's2021'], [13, 's2023'], [21, 's2024'], [29, 'esri'], [42, 's2025']],
    stamps: [[0, '2021 · RESERVOIR FULL'], [12, 'JUNE 2023 · DAM DESTROYED'], [21, '2024 · COOLING POND'], [29, 'SPRAY PONDS · WELLS SINCE AUG 2023'], [42, '2025 · POND AND CANALS']],
    wellsOn: [29, 42],
    cam: [
      at(0, C.drawEnd),
      { t: 7, c: [34.25, 47.42], z: 9.6, p: 56, b: 240, e: 'io' },
      { t: 13, c: [33.75, 47.1], z: 8.6, p: 52, b: 250, e: 'io' },
      { t: 21, c: [34.565, 47.51], z: 12.9, p: 58, b: 200, e: 'io' },
      { t: 30, c: [34.5916, 47.5102], z: 15.4, p: 55, b: 200, e: 'io' },
      { t: 41, c: [34.5916, 47.5102], z: 15.6, p: 58, b: 235, e: 'lin' },
      at(54, C.waterEnd, 'io'),
    ],
    callouts: [
      { t: 3, d: 8, ll: P.pond, title: 'Cooling pond', sub: 'Topped up from the Kakhovka reservoir', h: 90, side: 'l' },
      { t: 9, d: 9, ll: [33.95, 47.25], title: 'Kakhovka reservoir', sub: 'Drained after the dam was destroyed, 6 June 2023', h: 70 },
      { t: 22, d: 7, ll: P.pond, title: 'Cooling pond', sub: 'No longer refilled · ~1 cm a day lost (Aug 2023)', h: 120, side: 'r' },
      { t: 30.5, d: 6, ll: [34.5916, 47.5102], title: '11 groundwater wells · ~250 m³/h', sub: 'Feed the spray ponds that cool the six shut-down reactors (IAEA, Nov 2023)', h: 150 },
      { t: 36.5, d: 5.5, ll: [34.5965, 47.5075], title: 'Reported around the spray-pond perimeter', sub: 'Individual well sites not published or visible in available imagery', h: 60, side: 'r' },
      { t: 43, d: 11, ll: P.tppCanal, title: 'Thermal plant canals', sub: 'Pumped into the pond until depleted', h: 80, side: 'r' },
      { t: 45, d: 9, ll: [34.556, 47.502], title: 'Pond and channels: 9.60 → 8.66 km²', sub: 'July 2022 → August 2025 · dam built in intake channel, 2025', h: 70, side: 'l' },
    ],
    sources: 'Imagery: Sentinel-2 cloudless 2021–2025 (EOX), Esri World Imagery · Wells: IAEA via NEI (Aug–Nov 2023) · Pond area: McKenzie Intelligence / Greenpeace Ukraine (Dec 2025) · Water bodies: OSM',
    credit: 'Wells: IAEA via NEI · pond: McKenzie Intelligence / Greenpeace Ukraine · water: OSM',   // short line for the bottom-left credits
  },
  /* 05 ─────────────────────────────────────────── */
  {
    id: 'notyet', chapter: '05', name: 'Not so soon', dur: 15,
    stamp: 'INTENTION · NO DATE',
    vo: 'Eventually Russia wants to connect ZNPP to the national grid, but not so soon.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, grid: 0.25, frontline: 0.6, proposed: 1 },
    cam: [
      at(0, C.waterEnd),
      { t: 7, c: [34.6, 47.15], z: 8.2, p: 45, b: 120, e: 'io' },
      at(15, C.notyetEnd, 'lin'),
    ],
    callouts: [
      { t: 5, d: 10, ll: P.melitopol, title: 'Toward the Russian grid', sub: 'Stated intention · schematic, no route verified', h: 70 },
      { t: 6, d: 9, ll: P.znpp, title: 'ZNPP', sub: 'Disconnected · waiting', h: 70, side: 'l' },
    ],
    sources: 'Dashed arrow is schematic — no planned route is shown',
    credit: 'Arrow schematic: no planned route',   // short line for the bottom-left credits
  },
  /* 06 ─────────────────────────────────────────── */
  {
    id: 'repair', chapter: '06', name: 'Shelling and repair', dur: 64,
    stamp: '',   // driven by the timeline
    vo: 'In the meantime, Russia’s shelling of its facilities and powerline saw Ukrainian and Russian workers rushing to its repair, exerting pressure on local road networks and labor force.',
    layers: { s2024: 1, hillshade: 0.35, plant: 1, znpp: 1, particles: 0.9, zones: 1, frontline: 0.5, timeline: 1, log: 1, grid: 0.15, routes: 0.9 },
    routeKinds: ['crew-ua', 'crew-ru'],
    flow: 1,
    dates: [[0, '2022-03-04'], [3, '2022-03-04'], [21.3, '2025-06-01'], [61.2, '2026-11-24'], [64, '2026-11-24']],
    cam: [
      at(0, C.notyetEnd),
      { t: 5.7, c: [34.45, 47.72], z: 8.9, p: 48, b: 190, e: 'io' },
      { t: 21.3, c: [34.5, 47.68], z: 9.1, p: 52, b: 215, e: 'lin' },
      { t: 27, c: [34.60, 47.52], z: 12.6, p: 66, b: 200, e: 'io' },
      { t: 34.1, c: [34.60, 47.52], z: 12.8, p: 66, b: 175, e: 'lin' },
      { t: 39.1, c: P.crossing, z: 12.4, p: 72, b: 120, e: 'io' },
      { t: 47.6, c: P.crossing, z: 12.6, p: 72, b: 90, e: 'lin' },
      { t: 51.9, c: [34.5, 47.6], z: 11.0, p: 62, b: 150, e: 'io' },
      { t: 56.9, c: [34.52, 47.59], z: 11.1, p: 62, b: 170, e: 'lin' },
      { t: 60.4, c: P.tpp, z: 13.2, p: 64, b: 210, e: 'io' },
      at(64, C.repairEnd, 'lin'),
    ],
    callouts: [
      { t: 6.2, d: 14, ll: [34.6236, 47.8325], title: 'Dniprovska 750 kV', sub: 'Main line — north, ~130 km mapped', h: 60 },
      { t: 8.4, d: 12.4, ll: [34.42, 47.6], title: 'Ferosplavna-1 330 kV', sub: 'Backup line via the thermal plant switchyard', h: 60, side: 'l' },
      { t: 28.4, d: 6.2, ll: [34.598, 47.522], title: 'Z7 · ~1.5 km from the plant', sub: '23 Sep 2025 · 10th loss · one month on diesel', h: 70 },
      { t: 40, d: 8.4, ll: P.crossing, title: 'Z6 · span over the Dnipro', sub: 'The frontline · out since 24 Mar 2026', h: 90 },
      { t: 43.6, d: 4.9, ll: [34.655, 47.585], title: 'Repaired on pylons 100 m above water', sub: '6th ceasefire, June 2026', h: 40, side: 'r' },
      { t: 52.4, d: 5.8, ll: [34.48, 47.61], title: 'Z1 · north bank, 3.6 km from Nikopol', sub: 'Ukrainian crews · 20 Aug 2026 · 26th loss · 18 days', h: 70, side: 'l' },
      { t: 60.4, d: 3.6, ll: P.tpp, title: 'Z2 · switchyard', sub: 'Backup transformer destroyed again, Nov 2026', h: 70 },
    ],
    sources: 'Outages: IAEA updates via WNA (compiled 2026-11-19) · Damage zones: our reading of IAEA locations (approximate) · Crew routes: OSM shortest road distance',
    credit: 'Outages: IAEA via WNA · damage zones approximate · crew routes: OSM',   // short line for the bottom-left credits
  },
  /* 07 ─────────────────────────────────────────── */
  {
    id: 'dependency', chapter: '07', name: 'Sovereignty becomes dependency', dur: 32,
    stamp: 'POWER FLOWS IN',
    vo: 'Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians, now draws on electricity from the grid to prevent total meltdowns.',
    layers: { esri: 1, hillshade: 0.2, plant: 1, znpp: 1, particles: 1 },
    flow: -1,
    cam: [
      at(0, C.repairEnd),
      { t: 8, c: P.znpp, z: 14.6, p: 70, b: 270, e: 'io' },
      at(32, C.depEnd, 'lin'),
    ],
    callouts: [
      { t: 6, d: 24, ll: P.znpp, title: 'Power flows in, not out', sub: 'Cooling pumps run on grid electricity', h: 110 },
    ],
    sources: 'Imagery: Esri World Imagery',
  },
  /* 08 ─────────────────────────────────────────── */
  {
    id: 'supply', chapter: '08', name: 'Blackout and supply', dur: 40,
    stamp: 'COMPLETE BLACKOUTS · 2022–2024',
    vo: 'During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators, whose delivery was challenged by Russia’s shelling of roads and railways.',
    layers: { s2024: 0.8, hillshade: 0.35, plant: 1, roads: 1, routes: 1, trucks: 1, rail: 1, railDisused: 1, supplyEvents: 1, frontline: 0.6, counter: 1 },
    routeKinds: ['diesel'],
    counter: { n: 8, t0: 2.7, t1: 9.1, label: 'COMPLETE BLACKOUTS, 2022–2024 · ALL OFF-SITE POWER LOST', note: '27 by November 2026 · IAEA' },
    stamps: [[0, 'COMPLETE BLACKOUTS · 2022–2024'], [12.7, 'SUPPLY BY ROAD · OSM 2026']],
    cam: [
      at(0, C.depEnd),
      { t: 5.5, c: P.znpp, z: 13.6, p: 66, b: 10, e: 'io' },
      { t: 14.5, c: [35.0, 47.12], z: 8.3, p: 52, b: 340, e: 'io' },
      { t: 27.3, c: [34.95, 47.2], z: 8.5, p: 54, b: 352, e: 'lin' },
      at(40, C.supplyEnd, 'io'),
    ],
    callouts: [
      { t: 5.5, d: 8.2, ll: [34.584, 47.5135], title: '20 reserve diesel generators', sub: 'The only power during a blackout', h: 150, side: 'l' },
      { t: 15.5, d: 11.8, ll: P.melitopol, title: 'Melitopol → ZNPP · 126 km by road', sub: 'Fuel from the occupied hinterland · 229 km from Crimea', h: 80 },
      { t: 19.1, d: 10.9, ll: P.kakhovskeMore, title: 'Rail branch to Enerhodar', sub: 'Tagged disused in OpenStreetMap · last leg by road', h: 70, side: 'r' },
      { t: 23.6, d: 10, ll: P.vesele, title: '45 fatal events within 2 km of the route', sub: 'UCDP, Feb 2022 – Sep 2026 · 30 of them in Melitopol', h: 60, side: 'l' },
      { t: 30, d: 9.1, ll: [34.78, 47.42], title: 'Last 30 km within 20 km of the river front', sub: 'Shortest route, OSM network', h: 60, side: 'r' },
    ],
    sources: 'Blackouts: IAEA count · Roads & rail: OpenStreetMap, 24 Nov 2026 · Events: UCDP GED 26.1 + candidate 2026, fatal events only · Routes are shortest road distance, not observed convoys',
    credit: 'Blackouts: IAEA · roads & rail: OSM · events: UCDP GED · routes modelled, not observed',   // short line for the bottom-left credits
  },
  /* 09 ─────────────────────────────────────────── */
  {
    id: 'frontier', chapter: '09', name: 'Frontier', dur: 34,
    stamp: '',  // driven by event accumulation
    vo: 'Furthermore, trenches are carved into the soil surrounding ZNPP, and artillery positions turn the landscape into a military frontier from which Ukrainian towns across the river are targeted.',
    layers: { s2024: 1, hillshade: 0.4, plant: 1, ucdp: 1, frontline: 0.8, trenches: 1, artillery: 1 },
    dates: [[0, '2022-02-24'], [4.5, '2022-02-24'], [28.6, '2026-11-24'], [34, '2026-11-24']],
    cam: [
      at(0, C.supplyEnd),
      { t: 8.1, c: [34.53, 47.565], z: 10.9, p: 66, b: 335, e: 'io' },
      { t: 26.8, c: [34.51, 47.57], z: 10.6, p: 66, b: 310, e: 'lin' },
      at(34, C.frontierEnd, 'io'),
    ],
    callouts: [
      { t: 8.1, d: 24.2, ll: P.nikopol, title: 'Nikopol', sub: 'Most-recorded location on the right bank', h: 90 },
      { t: 10.7, d: 21.5, ll: P.marhanets, title: 'Marhanets', sub: 'Across the drained reservoir', h: 70, side: 'r' },
      { t: 14.3, d: 17.9, ll: P.znpp, title: 'ZNPP', sub: 'Fortified perimeter · trench lines to digitize', h: 60, side: 'l' },
    ],
    sources: 'Events: UCDP GED, fatal events with precise location (n = 829) · fatal events only, an undercount',
    credit: 'Events: UCDP GED (fatal only, an undercount)',   // short line for the bottom-left credits
  },
  /* 10 ─────────────────────────────────────────── */
  {
    id: 'winter', chapter: '10', name: 'Winter', dur: 25,
    stamp: 'WINTER 2026–27',
    vo: 'As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe.',
    layers: { lights: 1, s2024: 0.18, hillshade: 0.25, plant: 1, beacon: 1 },
    dim: { t0: 7, t1: 21, from: 1, to: 0.12 },
    cam: [
      at(0, C.frontierEnd),
      { t: 11, c: [32.0, 48.6], z: 5.4, p: 30, b: 350, e: 'io' },
      at(25, C.winterEnd, 'lin'),
    ],
    callouts: [
      { t: 11, d: 13, ll: P.kyiv, title: 'Kyiv', sub: '', h: 30 },
      { t: 12, d: 12, ll: P.kharkiv, title: 'Kharkiv', sub: '', h: 30 },
      { t: 13, d: 11, ll: P.odesa, title: 'Odesa', sub: '', h: 30 },
      { t: 14, d: 10, ll: P.dnipro, title: 'Dnipro', sub: '', h: 30 },
      { t: 15, d: 9, ll: P.znpp, title: 'ZNPP', sub: 'Suspended', h: 50, side: 'l' },
    ],
    sources: 'Lights dimmed for illustration — baseline NASA Black Marble 2016; not a measurement of 2026 outages',
    credit: 'Dimming illustrative · NASA Black Marble 2016',   // short line for the bottom-left credits
  },
  /* END ─────────────────────────────────────────── */
  {
    id: 'end', chapter: '', name: 'Infrastructure: Instruments of Power', dur: 14,
    stamp: '', vo: '', capUntil: 1,
    endCard: true,
    layers: { lights: 0.12, s2024: 0.18, plant: 1, beacon: 1 },
    cam: [
      at(0, C.winterEnd),
      { t: 14, c: [31.9, 48.55], z: 5.5, p: 38, b: 12, e: 'lin' },
    ],
    callouts: [],
    sources: '',
  },
  ],
};
