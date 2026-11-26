/* Infrastructure: Instruments of Power — scene script (v3: Kyiv cold open → ZNPP → supply → frontier → winter).
   Edit freely: durations (s), camera keyframes, callouts, captions.
   Camera keyframe: {t: seconds into scene, c:[lng,lat], z: zoom, p: pitch, b: bearing, e: 'io'|'lin'|'out'|'in'}
   Callout: {t, d (duration), ll:[lng,lat], title, sub, h (stem px), side: 'c'|'l'|'r'}
   layers: target opacity per named layer for the scene (anything omitted fades to 0).
   plantModel: the plant's 3D massing model (models/znpp.glb); it also fades out by itself below zoom ~12.
   imagerySeq: [[t, layer], ...] crossfades base imagery (2 s) — s2021, s2023, s2024, s2025, esri, dnb20260124 (VIIRS night, 24 Jan 2026).
   more: [[t, text], ...] further narration lines, t = seconds into the scene (spoken and captioned).
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
  // Earth Engine night lights (research/night-lights/gee_nightlights.py): VIIRS monthly, Sep–Nov 2021 median, EPSG:3857
  nightLights: { url: 'nightlights/viirs-2021-autumn.jpg', bounds: [21.5, 43.5, 41.5, 53.5] },
  scenes: [
  /* COLD OPEN · KYIV ────────────────────────────── */
  {
    id: 'kyiv', chapter: '', name: 'Kyiv', dur: 28,
    vo: 'For a few hours on the last day of January this year, virtually all of Kyiv was submerged in darkness.',
    more: [[10, "A week earlier, from orbit, the capital still glowed."], [16.5, "In midwinter, a blackout is more than darkness. Heat, water and lifts for three million people all run on the same grid."]],
    layers: { dnb20260124: 1 },
    dim: { layer: 'dnb20260124', t0: 12.5, t1: 18.5, from: 1, to: 0.05 },
    stamps: [[0, 'KYIV · 24 JAN 2026 · SATELLITE'], [12.5, 'KYIV · 31 JAN 2026 · ILLUSTRATION']],
    cam: [
      { t: 0, c: [30.52, 50.45], z: 8.9, p: 30, b: -20 },
      { t: 28, ...C.kyivEnd, e: 'io' },
    ],
    callouts: [
      { t: 3.5, d: 8.5, ll: P.kyiv, title: 'Kyiv', sub: 'Night satellite pass · 24 January 2026', h: 90 },
      { t: 14.5, d: 13, ll: P.kyiv, title: 'Kyiv · 31 January 2026', sub: 'Blackout for a few hours', h: 90 },
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
    more: [[16, "Six reactors, six gigawatts, comprising roughly a fifth of the country’s electricity. All of which was carried away on seven-hundred-fifty and three-hundred-thirty kilovolt lines."]],
    layers: { s2021: 1, hillshade: 0.35, grid: 0.9, gridflow: 0.9, znpp: 1, particles: 1, plant: 1, plantModel: 1 },
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
    id: 'occupation', chapter: '02', name: 'Occupation', dur: 27,
    stamp: '04 · 03 · 2022',
    vo: "After the 2022 Russian occupation of the left bank of the Dnipro River, ZNPP became an instrument of coercion.",
    more: [[15.8, "The river became the new front line. Across it, Nikopol and Marhanets remained under Ukrainian control, within sight of the reactors."]],
    layers: { s2021: 1, hillshade: 0.35, reservoir: 0.6, frontline: 1, grid: 0.35, znpp: 0.6, plant: 1, plantModel: 1 },
    cam: [
      at(0, C.lifelineEnd),
      { t: 9, c: [34.5, 47.53], z: 10.2, p: 55, b: 200, e: 'io' },
      at(27, C.occEnd, 'io'),
    ],
    callouts: [
      { t: 5, d: 21, ll: P.znpp, title: 'Seized 4 March 2022', sub: 'Left (south) bank — under Russian occupation', h: 150, side: 'r' },
      { t: 9, d: 17, ll: P.nikopol, title: 'Nikopol', sub: 'Right bank — Ukrainian-held', h: 70, side: 'l' },
      { t: 11, d: 15, ll: P.marhanets, title: 'Marhanets', sub: 'Right bank — Ukrainian-held', h: 50, side: 'r' },
      { t: 14, d: 12, ll: [34.47, 47.535], title: 'Frontline', sub: 'Runs along the Dnipro / Kakhovka reservoir', h: 110, side: 'l' },
    ],
    sources: 'Reservoir outline: OSM, 2023-05-01 · Frontline drawn schematically along the river',
    credit: 'Reservoir: OSM · frontline schematic',   // short line for the bottom-left credits
  },
  /* 03 ─────────────────────────────────────────── */
  {
    id: 'draw', chapter: '03', name: 'It cannot be switched off', dur: 24,
    stamp: 'COLD SHUTDOWN · SINCE SEPT 2022',
    vo: 'Though ZNPP has ceased to generate electricity, it cannot simply be switched off, continuing to draw on energy, water and labor.',
    more: [[15.8, "Although the six reactors have been shut down, the need for cooling at every hour of the day remains."]],
    layers: { s2021: 1, hillshade: 0.3, plant: 1, znpp: 0.5, frontline: 0.4, plantModel: 1 },
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
    id: 'water', chapter: '04', name: 'Water', dur: 60,
    stamp: '2021',
    vo: "Following the 2023 draining of Kakhovka Reservoir that once replenished the cooling pond, ZNPP has come to rely on newly drilled wells, as the remaining water in the nearby Zaporizhzhia Thermal Power Plant’s canals ran down.",
    more: [[23.5, "Beyond its old shores, the land is drying, the irrigated fields of the south bank most of all."], [30.2, "And the cooling pond itself has shrunk by about a third since 2023."], [38, "Eleven wells now stand between six reactors and the heat they still produce."], [50, "In 2025, a dam was built across the intake channel, holding what water remains in a smaller pond."]],
    layers: { s2021: 1, hillshade: 0.35, plant: 0.6, water: 1, wells: 0, plantModel: 1 },
    imagerySeq: [[0, 's2021'], [12, 's2023'], [27, 's2024'], [35, 'esri'], [48, 's2025']],
    overlaySeq: [[0, null], [15.5, 'ndvi-2021'], [19.5, 'ndvi-2025'], [23.5, 'ndmi-change'], [28, null]],
    stamps: [[0, '2021 · RESERVOIR FULL'], [11.5, 'JUNE 2023 · DAM DESTROYED'], [15.5, 'VEGETATION · 2021'], [19.5, 'VEGETATION · 2025'], [23.5, 'DRYING · 2024–26 vs 2019–22'],
             [27.5, '2024 · COOLING POND'], [35, 'SPRAY PONDS · WELLS SINCE AUG 2023'], [48, '2025 · POND AND CANALS']],
    chart: { series: 'pond', t0: 28, t1: 35, draw: 4, title: 'COOLING POND + CHANNELS · WATER AREA', note: 'Sentinel-2 monthly (GEE), pond + channels within 250 m, MNDWI > 0' },
    wellsOn: [35, 48],
    cam: [
      at(0, C.drawEnd),
      { t: 7, c: [34.25, 47.42], z: 9.6, p: 56, b: 290, e: 'io' },
      { t: 14, c: [34.3, 47.27], z: 8.35, p: 38, b: 350, e: 'io' },
      { t: 27, c: [34.33, 47.29], z: 8.45, p: 42, b: 362, e: 'lin' },
      { t: 34, c: [34.565, 47.51], z: 12.9, p: 58, b: 200, e: 'io' },
      { t: 37, c: [34.5916, 47.5102], z: 15.4, p: 55, b: 200, e: 'io' },
      { t: 47, c: [34.5916, 47.5102], z: 15.6, p: 58, b: 235, e: 'lin' },
      at(60, C.waterEnd, 'io'),
    ],
    callouts: [
      { t: 3, d: 8, ll: P.pond, title: 'Cooling pond', sub: 'Topped up from the Kakhovka reservoir', h: 90, side: 'l' },
      { t: 9, d: 6, ll: [33.95, 47.25], title: 'Kakhovka reservoir', sub: '~2,040 km² of water each summer, 2019–22', h: 70 },
      { t: 20, d: 7, ll: [33.95, 47.25], title: 'The bed turns green', sub: 'Water 2,040 → 120 km²; 1,360 km² vegetated by summer 2025', h: 70 },
      { t: 24, d: 4, ll: [34.45, 47.05], title: 'The land dries', sub: 'Moisture index down 0.10–0.12 on both banks · irrigated fields most', h: 60, side: 'r' },
      { t: 28, d: 6, ll: P.pond, title: 'Cooling pond', sub: 'No longer refilled · ~1 cm a day lost (Aug 2023)', h: 120, side: 'r' },
      { t: 36.5, d: 6, ll: [34.5916, 47.5102], title: '11 groundwater wells · ~250 m³/h', sub: 'Feed the spray ponds that cool the six shut-down reactors (IAEA, Nov 2023)', h: 150 },
      { t: 42.5, d: 5.5, ll: [34.5965, 47.5075], title: 'Reported around the spray-pond perimeter', sub: 'Individual well sites not published or visible in available imagery', h: 60, side: 'r' },
      { t: 49, d: 11, ll: P.tppCanal, title: 'Thermal plant canals', sub: 'Pumped into the pond until depleted', h: 80, side: 'r' },
      { t: 51, d: 9, ll: [34.556, 47.502], title: 'Pond water down about a third since 2023', sub: 'Sentinel-2, to Oct 2026 · McKenzie: 9.60 → 8.66 km², 2022–25 · intake dam, 2025', h: 70, side: 'l' },
    ],
    sources: 'Sentinel-2 (Google Earth Engine): late-summer NDVI / NDMI composites, monthly water area · Imagery: Sentinel-2 cloudless (EOX), Esri · Wells: IAEA via NEI (2023) · Pond area 2022–25: McKenzie Intelligence / Greenpeace Ukraine',
    credit: 'Sentinel-2 via Google Earth Engine · wells: IAEA via NEI · pond 2022–25: McKenzie Intelligence / Greenpeace Ukraine',   // short line for the bottom-left credits
  },
  /* 05 ─────────────────────────────────────────── */
  {
    id: 'notyet', chapter: '05', name: 'Not so soon', dur: 15,
    stamp: 'INTENTION · NO DATE',
    vo: "Eventually, Russia wants to connect ZNPP to its own grid, but not so soon.",
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
    vo: "In the meantime, shelling of the plant’s facilities and power lines saw Ukrainian and Russian workers rushing to repair them, exerting pressure on local road networks and labor force.",
    more: [[19, "Repairs now need local ceasefires, brokered by the IAEA, to enable crews to carry them out."], [26.8, "In September 2025, damage about one and a half kilometres from the plant cut its last remaining power line, forcing it to run on diesel for a month."], [40.3, "The line crossing the river inevitably crosses the front. Crews have repaired it on pylons a hundred metres above the drained reservoir."], [52.2, "On the north bank, Ukrainian crews work in the Nikopol area. By August 2026, the plant had lost off-site power twenty-six times."]],
    layers: { s2024: 1, hillshade: 0.35, plant: 1, znpp: 1, particles: 0.9, zones: 1, frontline: 0.5, timeline: 1, log: 1, grid: 0.15, routes: 0.9, plantModel: 1 },
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
    vo: "Energy sovereignty becomes dependency – what was once a source of light and heat for Ukrainians now draws on electricity from the grid to keep its reactors cool.",
    more: [[19, "The plant that once sent power out across Ukraine now draws it in, through the same lines that are shelled and repaired."]],
    layers: { esri: 1, hillshade: 0.2, plant: 1, znpp: 1, particles: 1, plantModel: 1 },
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
    vo: "During the heaviest attacks between 2022 and 2024, ZNPP sank into a state of complete blackout eight times, losing all off-site power and being forced to rely on 20 reserve diesel generators, whose fuel arrives by road, through a war zone.",
    more: [[26.5, "Forty-five deadly events have been recorded within two kilometres of the route. Its final thirty kilometres run within twenty of the front."]],
    layers: { s2024: 0.8, hillshade: 0.35, plant: 1, roads: 1, routes: 1, trucks: 1, rail: 1, railDisused: 1, supplyEvents: 1, frontline: 0.6, counter: 1, plantModel: 1 },
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
    stamp: '',  // driven by event accumulation after t=12
    stamps: [[0, 'FORTIFICATIONS · JUNE–OCTOBER 2025']],
    vo: "Furthermore, trenches are carved into the soil surrounding ZNPP, and fighting positions turn the landscape into a military frontier, from which Ukrainian towns across the river are shelled.",
    more: [[20.5, "Across the drained reservoir, Nikopol has recorded more deadly strikes than any other town near the plant."], [28, "Marhanets, too, lies within range."]],
    layers: { s2024: 1, hillshade: 0.4, plant: 1, fort: 1, ucdp: 1, frontline: 0.8, trenches: 1, artillery: 1 },
    dates: [[0, '2022-02-24'], [13, '2022-02-24'], [30, '2026-11-24'], [34, '2026-11-24']],
    datesFrom: 13,
    imagerySeq: [[0, 's2024'], [2.5, 'esri'], [15, 's2024']],
    cam: [
      at(0, C.supplyEnd),
      { t: 5, c: [34.5265, 47.5188], z: 15.2, p: 52, b: 20, e: 'io' },
      { t: 8.5, c: [34.5415, 47.5275], z: 15.0, p: 52, b: 50, e: 'io' },
      { t: 12, c: [34.587, 47.511], z: 14.4, p: 52, b: 100, e: 'io' },
      { t: 20, c: [34.53, 47.565], z: 10.9, p: 66, b: 335, e: 'io' },
      { t: 30, c: [34.51, 47.57], z: 10.6, p: 66, b: 310, e: 'lin' },
      at(34, C.frontierEnd, 'io'),
    ],
    callouts: [
      { t: 4, d: 4.5, ll: [34.5258, 47.5186], title: 'Zig-zag fighting trenches · west bank', sub: 'Extended and linked into one trench, June 2025', h: 80 },
      { t: 8, d: 4, ll: [34.5418, 47.527], title: 'Checkpoint, vehicle scrapes, ammunition store?', sub: 'North-west bank of the cooling pond', h: 70, side: 'r' },
      { t: 11.5, d: 5, ll: [34.5862, 47.5172], title: '11 sangars on the plant perimeter', sub: 'Raised guard posts, most in anti-drone cages, June 2025', h: 90, side: 'l' },
      { t: 19, d: 13, ll: P.nikopol, title: 'Nikopol', sub: 'Most deadly events of any town near the plant · UCDP', h: 90 },
      { t: 21, d: 11, ll: P.marhanets, title: 'Marhanets', sub: 'Across the drained reservoir', h: 70, side: 'r' },
    ],
    sources: 'Fortifications: traced from McKenzie Intelligence / Greenpeace Ukraine (Pléiades Neo, Jun–Oct 2025), approximate · Events: UCDP GED, fatal events only (n = 829)',
    credit: 'Fortifications traced from McKenzie Intelligence / Greenpeace Ukraine · events: UCDP GED (fatal only)',   // short line for the bottom-left credits
  },
  /* 10 ─────────────────────────────────────────── */
  {
    id: 'winter', chapter: '10', name: 'Winter', dur: 25,
    stamp: 'WINTER 2026–27',
    vo: 'As winter approaches, more cities across Ukraine are bracing for long dark months while ZNPP remains suspended between occupation, disrepair, and the threat of nuclear catastrophe.',
    layers: { eeLights: 1, lights: 1, s2024: 0.18, hillshade: 0.25, plant: 1, beacon: 1 },
    imagerySwap: { from: 'eeLights', to: 'lights', t0: 5, t1: 8 },   // measured pre-war lights (Earth Engine) → Black Marble
    dim: { t0: 9, t1: 21, from: 1, to: 0.12 },                        // …then the illustrative fade
    stamps: [[0, 'NIGHT LIGHTS · SEP–NOV 2021 · VIIRS (EARTH ENGINE)'], [6.5, 'NIGHT LIGHTS · NASA BLACK MARBLE · PRE-WAR'], [9.5, 'WINTER 2026–27 · DIMMING ILLUSTRATIVE']],
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
    sources: 'Night lights: NOAA VIIRS DNB monthly (VCMSLCFG), Sep–Nov 2021 median, via Google Earth Engine (studio EE_VIIRS method) · then NASA Black Marble 2016 · lights dimmed for illustration, not a measurement of 2026 outages',
    credit: 'VIIRS monthly 2021 via Earth Engine · NASA Black Marble 2016 · dimming illustrative',   // short line for the bottom-left credits
  },
  /* END ─────────────────────────────────────────── */
  {
    id: 'end', chapter: '', name: 'Infrastructure: Instruments of Power', dur: 55,
    stamp: 'ZAPORIZHZHIA NPP · NOVEMBER 2026',
    // closing follows the Center for Spatial Technologies' method (crimea-heritage.spatialtech.info):
    // the conduct, the law it engages, back to the landscape, then how the work was made
    vo: 'Power lines, roads, reservoirs and canals once carried everyday life. At Zaporizhzhia, each has been turned into an instrument of power: cut, drained, fortified, held hostage. This is slow violence, and it is written into the land itself.',
    more: [[21.5, "International humanitarian law sets dams and nuclear power stations apart as works containing dangerous forces. They must not be attacked, and military positions should not be placed near them."],
           [36.8, "Here, the dam has been destroyed, and the plant's grounds have been fortified. This film documents what remains."]],
    capUntil: 46,                // conclusion first; the title and credits follow
    endCard: true,
    layers: { s2024: 0.9, hillshade: 0.35, plant: 1, grid: 0.8, gridflow: 0.6, roads: 0.7, routes: 0.8, rail: 0.6,
      reservoir: 0.5, water: 1, fort: 1, frontline: 0.7, ucdp: 0.5 },
    routeKinds: ['diesel', 'crew-ua', 'crew-ru'],
    cam: [
      at(0, C.winterEnd),
      { t: 9, c: [34.55, 47.52], z: 10.2, p: 60, b: 330, e: 'io' },
      { t: 20, c: [34.56, 47.52], z: 10.6, p: 62, b: 30, e: 'lin' },
      { t: 28, c: [33.98, 47.18], z: 8.1, p: 48, b: 15, e: 'io' },     // dam and plant in one view
      { t: 44, c: [34.1, 47.25], z: 8.4, p: 52, b: 35, e: 'lin' },
      { t: 55, c: [32.6, 48.4], z: 6, p: 38, b: 10, e: 'io' },
    ],
    callouts: [
      { t: 11.5, d: 9.5, ll: P.crossing, title: 'Cut', sub: 'Power lines', h: 70, side: 'r' },
      { t: 12.5, d: 8.5, ll: [34.33, 47.45], title: 'Drained', sub: 'Kakhovka reservoir', h: 60, side: 'l' },
      { t: 13.5, d: 7.5, ll: [34.5258, 47.5186], title: 'Fortified', sub: 'Trenches and positions', h: 110, side: 'l' },
      { t: 14.5, d: 6.5, ll: P.znpp, title: 'Held hostage', sub: 'Zaporizhzhia NPP', h: 150 },
      { t: 26, d: 18, ll: [33.37, 46.778], title: 'Kakhovka dam', sub: 'Destroyed 6 June 2023 · AP I Art. 56', h: 90, side: 'l' },
      { t: 27, d: 17, ll: P.znpp, title: 'Zaporizhzhia NPP', sub: 'Fortified grounds · AP I Art. 56(5)', h: 110, side: 'r' },
    ],
    legal: [
      'Additional Protocol I to the Geneva Conventions (1977), Art. 56 — works and installations containing dangerous forces (dams, nuclear electrical generating stations): not to be made the object of attack; Art. 56(5): parties shall endeavour to avoid locating military objectives in their vicinity',
      'Additional Protocol I, Art. 54 — objects indispensable to the survival of the civilian population, including drinking-water installations and irrigation works',
      'IAEA five concrete principles for the Zaporizhzhia NPP (UN Security Council, 30 May 2023) — no attack from or against the plant; no heavy weapons or military personnel based there; off-site power not put at risk',
      'Rome Statute of the International Criminal Court, Art. 8(2)(b)(iv) — attacks causing widespread, long-term and severe damage to the natural environment',
    ],
    method: 'Based on spatial analysis of satellite imagery (Sentinel-2 and VIIRS via Google Earth Engine; Esri; EOX), OpenStreetMap infrastructure, UCDP GED conflict events, IAEA reporting and the McKenzie Intelligence / Greenpeace Ukraine fortification survey, by the GSAPP Advanced V Studio, Fall 2026. Narrative method after the Center for Spatial Technologies, “Russia is Destroying the Crimean Heritage” (2026).',
    sources: '',
  },
  ],
};
