/* Infrastructure: Instruments of Power — film engine. Deterministic: everything is a function of the master clock T,
   so scrubbing / re-recording always gives the same shot. Content lives in story.js. */
(() => {
const D = window.PL_DATA, X = window.PL_EXTRA || {}, ST = window.STORY, P = ST.places;
const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);

/* ---------- time helpers ---------- */
const DAY = 86400000;
const dnum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY;
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtD = n => { const d = new Date(n * DAY); return `${String(d.getUTCDate()).padStart(2,'0')} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmtT = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = { io: u => u < .5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2, lin: u => u, out: u => 1 - Math.pow(1 - u, 3), in: u => u*u*u };
function dateMap(keys) { // [[t, 'YYYY-MM-DD'], ...] → {at(t)→day, inv(day)→t}
  const k = keys.map(([t, s]) => [t, dnum(s)]);
  return {
    at(t) { if (t <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i-1][1], k[i][1], (t - k[i-1][0]) / (k[i][0] - k[i-1][0] || 1)); return k[k.length-1][1]; },
    inv(n) { for (let i = 1; i < k.length; i++) if (n <= k[i][1] && k[i][1] > k[i-1][1]) return lerp(k[i-1][0], k[i][0], (n - k[i-1][1]) / (k[i][1] - k[i-1][1])); return n <= k[0][1] ? k[0][0] : k[k.length-1][0]; },
  };
}

/* ---------- scenes timing ---------- */
let acc = 0;
ST.scenes.forEach(s => { s.start = acc; acc += s.dur; if (s.dates) s.dm = dateMap(s.dates); });
const TOTAL = acc;

/* ---------- tile loading ----------
   Imagery tiles go through `tile://<source>/z/x/y`: one in-memory cache shared by MapLibre and the prefetcher below
   (the tile servers' HTTP caching doesn't reliably serve a second request, so warming the browser cache doesn't help).
   A tile MapLibre gives up on mid-flight (the camera moved on) still lands in the cache for the next pass; failed
   tiles are retried. Terrain tiles have the same treatment in flatten.js. */
const TPL = {};   // source id → real URL template
const TILES = (() => {
  const cache = new Map(), MAX = 1400;   // url → Promise<ArrayBuffer> (≈ 40 MB of JPEG/PNG at most)
  async function load(url) {
    for (let k = 0; ; k++) {
      try { const r = await fetch(url, { credentials: 'omit' }); if (r.ok) return r.arrayBuffer(); if (r.status < 500 || k >= 2) throw new Error(`HTTP ${r.status}`); }
      catch (e) { if (k >= 2) throw e; }
      await new Promise(res => setTimeout(res, 400 * (k + 1)));
    }
  }
  function get(url) {
    let p = cache.get(url);
    if (p) { cache.delete(url); cache.set(url, p); return p; }
    p = load(url); cache.set(url, p); p.catch(() => cache.delete(url));
    if (cache.size > MAX) cache.delete(cache.keys().next().value);
    return p;
  }
  maplibregl.addProtocol('tile', async params => {
    const [id, z, x, y] = params.url.slice(7).split('/');
    const data = await get(TPL[id].replace('{z}', z).replace('{x}', x).replace('{y}', y));
    return { data: data.slice(0) };
  });
  return { get, has: url => cache.has(url) };
})();
const cached = (id, src) => { TPL[id] = src.tiles[0]; return { ...src, tiles: [`tile://${id}/{z}/{x}/{y}`] }; };

/* ---------- map ---------- */
const s2 = y => ({ type: 'raster', tileSize: 256, maxzoom: 15, attribution: `Sentinel-2 cloudless ${y} by <a href="https://s2maps.eu">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data ${y})`,
  tiles: [`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${y}_3857/default/g/{z}/{y}/{x}.jpg`] });
// terrain tiles go through flatten.js, which levels the ground under the plant model (and retries failed tiles)
// the hillshade copy asks at 512 px: the same tiles the terrain uses (it requests a zoom level lower), so they're shared
const dem = (size = 256) => ({ type: 'raster-dem', encoding: 'terrarium', tileSize: size, maxzoom: 14,
  tiles: [window.PlantFlat ? PlantFlat.tileUrl : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], attribution: 'Terrain: Mapzen / AWS Terrain Tiles' });
const grade = { 'raster-saturation': -0.35, 'raster-contrast': 0.12, 'raster-brightness-max': 0.9, 'raster-opacity': 0, 'raster-fade-duration': 200 }; // late tiles ease in rather than pop

const map = new maplibregl.Map({
  container: 'map', interactive: false, attributionControl: false, maxPitch: 85, fadeDuration: 0, refreshExpiredTiles: false, maxTileCacheZoomLevels: 8,
  center: ST.scenes[0].cam[0].c, zoom: ST.scenes[0].cam[0].z, pitch: ST.scenes[0].cam[0].p, bearing: ST.scenes[0].cam[0].b,
  style: {
    version: 8,
    sources: {
      s2021: cached('s2021', s2(2021)), s2023: cached('s2023', s2(2023)), s2024: cached('s2024', s2(2024)), s2025: cached('s2025', s2(2025)),
      esri: cached('esri', { type: 'raster', tileSize: 256, maxzoom: 18, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }),
      lights: cached('lights', { type: 'raster', tileSize: 256, maxzoom: 8, tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'], attribution: 'NASA Black Marble 2016 / GIBS' }),
      dem: dem(), demhs: dem(512),
      ...Object.fromEntries(['2026-01-24'].map(d => ['dnb' + d.replace(/-/g, ''), cached('dnb' + d.replace(/-/g, ''), { type: 'raster', tileSize: 256, maxzoom: 8,
        tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance/default/${d}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`],
        attribution: 'VIIRS Day/Night Band, NOAA-20, NASA GIBS' })])),
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#07090a' } },
      { id: 's2021', type: 'raster', source: 's2021', layout: { visibility: 'none' }, paint: { ...grade } },
      { id: 's2023', type: 'raster', source: 's2023', layout: { visibility: 'none' }, paint: { ...grade } },
      { id: 's2024', type: 'raster', source: 's2024', layout: { visibility: 'none' }, paint: { ...grade } },
      { id: 's2025', type: 'raster', source: 's2025', layout: { visibility: 'none' }, paint: { ...grade } },
      { id: 'esri', type: 'raster', source: 'esri', layout: { visibility: 'none' }, paint: { ...grade, 'raster-saturation': -0.3, 'raster-brightness-max': 0.9 } },
      { id: 'hillshade', type: 'hillshade', source: 'demhs', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0, 'hillshade-shadow-color': '#000', 'hillshade-highlight-color': '#fff', 'hillshade-accent-color': '#000', 'hillshade-illumination-direction': 315 } },
      { id: 'dnb20260124', type: 'raster', source: 'dnb20260124', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0, 'raster-contrast': 0.55, 'raster-saturation': -1 } },
      { id: 'lights', type: 'raster', source: 'lights', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0, 'raster-contrast': 0.2 } },
    ],
  },
});
window.__map = map;

/* ---------- geometry helpers ---------- */
const km = (a, b) => { const dx = (b[0] - a[0]) * 111.32 * Math.cos(a[1] * Math.PI / 180), dy = (b[1] - a[1]) * 110.57; return Math.hypot(dx, dy); };
function parts(g) { return g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []; }
// ZNPP line parts oriented outward from the plant, with cumulative distance
const flowParts = [];
D.znpp.features.forEach(f => parts(f.geometry).forEach(c => {
  if (c.length < 2) return;
  let pts = c.slice(); if (km(pts[pts.length - 1], P.znpp) < km(pts[0], P.znpp)) pts.reverse();
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + km(pts[i - 1], pts[i]));
  if (cum[cum.length - 1] > 0.3) flowParts.push({ line: f.properties.line, pts, cum, len: cum[cum.length - 1] });
}));
const routeParts = [];
(D.routes ? D.routes.features : []).forEach(f => { const pts = f.geometry.coordinates; if (pts.length < 2) return;
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + km(pts[i - 1], pts[i]));
  routeParts.push({ kind: f.properties.kind, pts, cum, len: cum[cum.length - 1] }); });
function along(fp, d) { let i = 1; while (i < fp.cum.length - 1 && fp.cum[i] < d) i++; const u = (d - fp.cum[i - 1]) / ((fp.cum[i] - fp.cum[i - 1]) || 1);
  return [lerp(fp.pts[i - 1][0], fp.pts[i][0], u), lerp(fp.pts[i - 1][1], fp.pts[i][1], u)]; }
const FC = f => ({ type: 'FeatureCollection', features: f });
const proposedLine = FC([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [P.znpp, [34.78, 47.30], [35.05, 47.06], [35.30, 46.90]] } },]);
const arrowHead = (() => { const tip = [35.36, 46.86], a = [35.24, 46.92], b = [35.30, 46.97]; return FC([{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[tip, a, b, tip]] } }]); })();
D.ucdp.features.forEach(f => f.properties.n = dnum(f.properties.d));
// UCDP stacks many events on one coordinate (town / raion centroid) → one column per location
const stacks = (() => { const g = new Map();
  D.ucdp.features.forEach(f => { const k = f.geometry.coordinates.join(','); if (!g.has(k)) g.set(k, { c: f.geometry.coordinates, w: f.properties.w, ns: [] }); g.get(k).ns.push(f.properties.n); });
  return [...g.values()].map((s, i) => { s.id = i; s.ns.sort((a, b) => a - b); s.shown = -1; return s; }); })();
const colPoly = (c, r) => { const pts = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * 2 * Math.PI; pts.push([c[0] + r * Math.cos(a) / (111.32 * Math.cos(c[1] * Math.PI / 180)), c[1] + r * Math.sin(a) / 110.57]); } return [pts]; };
const stackFC = FC(stacks.map(s => ({ type: 'Feature', id: s.id, properties: { w: s.w }, geometry: { type: 'Polygon', coordinates: colPoly(s.c, 0.42) } })));

/* ---------- logical layers (opacity tweened) ---------- */
let lineState = { 'Dniprovska 750 kV': 1, 'Ferosplavna-1 330 kV': 1 };
const L = {}; // name → {cur, tgt, set(v)}
const pp = (id, prop, k = 1) => v => map.setPaintProperty(id, prop, v * k);
function reg(name, ...setters) { L[name] = { cur: 0, tgt: 0, set: v => setters.forEach(s => s(v)) }; }
function znppPaint() {
  const v = L.znpp ? L.znpp.cur : 0;
  const m = k => ['match', ['get', 'line'], 'Dniprovska 750 kV', lineState['Dniprovska 750 kV'] * v * k, lineState['Ferosplavna-1 330 kV'] * v * k];
  map.setPaintProperty('znpp-glow', 'line-opacity', m(0.35)); map.setPaintProperty('znpp-core', 'line-opacity', m(1));
  map.setPaintProperty('znpp-dead', 'line-opacity', ['match', ['get', 'line'], 'Dniprovska 750 kV', (1 - lineState['Dniprovska 750 kV']) * v, (1 - lineState['Ferosplavna-1 330 kV']) * v]);
}
function domOp(sel) { const el = $(sel); return v => { el.style.opacity = v; }; }

function buildLayers() {
  map.setTerrain({ source: 'dem', exaggeration: ST.exaggeration });
  try { map.setSky({ 'sky-color': '#0a0e13', 'horizon-color': '#1a232c', 'fog-color': '#07090a', 'sky-horizon-blend': 0.7, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6, 'atmosphere-blend': 0 }); } catch (e) {}

  map.addSource('reservoir', { type: 'geojson', data: D.reservoir });
  map.addSource('grid', { type: 'geojson', data: D.grid });
  map.addSource('znpp', { type: 'geojson', data: D.znpp });
  map.addSource('zones', { type: 'geojson', data: D.zones, promoteId: 'id' });
  map.addSource('canals', { type: 'geojson', data: D.canals });
  map.addSource('ucdp', { type: 'geojson', data: D.ucdp });
  map.addSource('stacks', { type: 'geojson', data: stackFC });
  map.addSource('particles', { type: 'geojson', data: FC([]) });
  map.addSource('plant', { type: 'geojson', data: FC([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: P.znpp } }]) });
  map.addSource('proposed', { type: 'geojson', data: proposedLine });
  map.addSource('roads', { type: 'geojson', data: D.roads || FC([]) });
  map.addSource('routes', { type: 'geojson', data: D.routes || FC([]) });
  map.addSource('trucks', { type: 'geojson', data: FC([]) });
  map.addSource('water', { type: 'geojson', data: D.water || FC([]) });
  map.addSource('railMain', { type: 'geojson', data: D.railMain || FC([]) });
  map.addSource('railDisused', { type: 'geojson', data: D.railDisused || FC([]) });
  map.addSource('wells', { type: 'geojson', data: D.wells || FC([]) });
  map.addSource('wellCand', { type: 'geojson', data: D.wellCandidates || FC([]) });
  const LC = D.landchange;
  if (LC) {
    const b = LC.bounds, coords = [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]];
    ['ndvi-2021', 'ndvi-2025', 'ndvi-change', 'ndmi-change'].forEach(k => {
      map.addSource('lc-' + k, { type: 'image', url: `landchange/${k}.jpg`, coordinates: coords });
    });
  }
  map.addSource('fort', { type: 'geojson', data: D.fort || FC([]) });
  map.addSource('supplyEvents', { type: 'geojson', data: D.supplyEvents || FC([]) });
  map.addSource('arrow', { type: 'geojson', data: arrowHead });
  map.addSource('trenches', { type: 'geojson', data: X.trenches || FC([]) });
  map.addSource('artillery', { type: 'geojson', data: X.artillery || FC([]) });

  const add = l => map.addLayer(l);
  add({ id: 'res-fill', type: 'fill', source: 'reservoir', paint: { 'fill-color': '#5cc8ff', 'fill-opacity': 0 } });
  add({ id: 'front-fill', type: 'fill', source: 'reservoir', paint: { 'fill-color': '#ff2d55', 'fill-opacity': 0 } });
  add({ id: 'front-line', type: 'line', source: 'reservoir', paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-dasharray': [3, 3], 'line-opacity': 0 } });
  add({ id: 'canals', type: 'line', source: 'canals', paint: { 'line-color': '#5cc8ff', 'line-width': 1.6, 'line-opacity': 0 } });
  const kvc = ['match', ['get', 'kv'], 750, '#ff4d3a', 330, '#ffb648', '#e7d27c'];
  const kvw = ['match', ['get', 'kv'], 750, 2.4, 330, 1.8, 1.0];
  add({ id: 'grid-glow', type: 'line', source: 'grid', layout: { 'line-cap': 'round' }, paint: { 'line-color': kvc, 'line-width': ['*', kvw, 5], 'line-blur': 6, 'line-opacity': 0 } });
  add({ id: 'grid-core', type: 'line', source: 'grid', paint: { 'line-color': kvc, 'line-width': kvw, 'line-opacity': 0 } });
  add({ id: 'grid-flow', type: 'line', source: 'grid', paint: { 'line-color': '#fff', 'line-width': ['*', kvw, 1.1], 'line-dasharray': [0, 4, 3], 'line-opacity': 0 } });
  add({ id: 'trenches', type: 'line', source: 'trenches', paint: { 'line-color': '#ffdf6b', 'line-width': 1.5, 'line-opacity': 0 } });
  add({ id: 'zones-fill', type: 'fill', source: 'zones', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ff2d55', 'fill-opacity': ['*', 0.35, ['coalesce', ['feature-state', 'f'], 0]] } });
  add({ id: 'zones-line', type: 'line', source: 'zones', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ff2d55', 'line-width': ['+', 4, ['*', 10, ['coalesce', ['feature-state', 'f'], 0]]], 'line-blur': 3, 'line-opacity': ['*', 0.9, ['min', 1, ['coalesce', ['feature-state', 'f'], 0]]] } });
  add({ id: 'znpp-glow', type: 'line', source: 'znpp', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'line'], 'Dniprovska 750 kV', '#ff4d3a', '#ffb648'], 'line-width': 14, 'line-blur': 10, 'line-opacity': 0 } });
  add({ id: 'znpp-core', type: 'line', source: 'znpp', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'line'], 'Dniprovska 750 kV', '#ff6a55', '#ffc56a'], 'line-width': 2.6, 'line-opacity': 0 } });
  add({ id: 'znpp-dead', type: 'line', source: 'znpp', paint: { 'line-color': '#7b8682', 'line-width': 1.4, 'line-dasharray': [1, 2], 'line-opacity': 0 } });
  add({ id: 'particles', type: 'circle', source: 'particles', paint: { 'circle-radius': 2.6, 'circle-blur': 0.4, 'circle-color': ['match', ['get', 'line'], 'Dniprovska 750 kV', '#ffd1c8', '#fff1cf'], 'circle-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'water-fill', type: 'fill', source: 'water', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#5cc8ff', 'fill-opacity': 0 } });
  add({ id: 'water-line', type: 'line', source: 'water', paint: { 'line-color': '#8fdcff', 'line-width': ['match', ['get', 'k'], 'pond', 2.2, 1.6], 'line-opacity': 0 } });
  add({ id: 'roads', type: 'line', source: 'roads', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#e8ece9', 'line-width': ['match', ['get', 'hw'], 'motorway', 1.4, 'trunk', 1.2, 0.7], 'line-opacity': 0 } });
  const rc = ['match', ['get', 'kind'], 'diesel', '#ffd166', 'crew-ua', '#9dfcc4', 'crew-ru', '#ff8a7a', '#ffffff'];
  add({ id: 'routes-glow', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': rc, 'line-width': 12, 'line-blur': 8, 'line-opacity': 0 } });
  add({ id: 'routes', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': rc, 'line-width': 2.6, 'line-opacity': 0 } });
  add({ id: 'trucks', type: 'circle', source: 'trucks', paint: { 'circle-radius': 3.2, 'circle-color': '#fff', 'circle-stroke-width': 1.5, 'circle-stroke-color': rc, 'circle-opacity': 0, 'circle-stroke-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'rail-main', type: 'line', source: 'railMain', paint: { 'line-color': '#c9d1cd', 'line-width': ['match', ['get', 'u'], 'main', 1.6, 1.0], 'line-dasharray': [1, 1], 'line-opacity': 0 } });
  add({ id: 'rail-disused', type: 'line', source: 'railDisused', paint: { 'line-color': '#ff6b5a', 'line-width': 2, 'line-dasharray': [1.5, 2], 'line-opacity': 0 } });
  add({ id: 'wells-zone', type: 'fill', source: 'wells', filter: ['==', ['get', 'kind'], 'well-zone'], paint: { 'fill-color': '#5cc8ff', 'fill-opacity': 0 } });
  add({ id: 'wells-zone-line', type: 'line', source: 'wells', filter: ['==', ['get', 'kind'], 'well-zone'], paint: { 'line-color': '#bfeaff', 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': 0 } });
  add({ id: 'spray-ponds', type: 'fill', source: 'wells', filter: ['==', ['get', 'kind'], 'spray-ponds'], paint: { 'fill-color': '#5cc8ff', 'fill-opacity': 0 } });
  add({ id: 'well-cand', type: 'circle', source: 'wellCand', paint: { 'circle-radius': 6, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#5cc8ff', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'well-cand-dot', type: 'circle', source: 'wellCand', paint: { 'circle-radius': 2, 'circle-color': '#e6f7ff', 'circle-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'fort-line-glow', type: 'line', source: 'fort', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffdf6b', 'line-width': 9, 'line-blur': 6, 'line-opacity': 0 } });
  add({ id: 'fort-line', type: 'line', source: 'fort', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffe9a0', 'line-width': 2.4, 'line-opacity': 0 } });
  const fc_ = ['match', ['get', 'kind'], 'sangar', '#ff2d55', 'checkpoint', '#ff8a00', 'bunker', '#ff4dff', 'storage', '#00e5ff', 'burnt', '#8a8a8a', '#ffffff'];
  add({ id: 'fort-pt', type: 'circle', source: 'fort', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 7], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': fc_, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'fort-pt-dot', type: 'circle', source: 'fort', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 2.5], 'circle-color': fc_, 'circle-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'supply-events', type: 'circle', source: 'supplyEvents', paint: { 'circle-color': '#ff3b2f', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 12, 7], 'circle-blur': 0.2, 'circle-opacity': 0, 'circle-stroke-width': 1, 'circle-stroke-color': '#ffd0c8', 'circle-stroke-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'proposed', type: 'line', source: 'proposed', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2.5], 'line-opacity': 0 } });
  add({ id: 'arrow', type: 'fill', source: 'arrow', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0 } });
  add({ id: 'ucdp-glow', type: 'circle', source: 'ucdp', paint: { 'circle-color': '#ff5a45', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 22], 'circle-blur': 1, 'circle-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'ucdp', type: 'circle', source: 'ucdp', paint: { 'circle-color': '#ffb3a6', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 12, 6], 'circle-opacity': 0, 'circle-stroke-width': 1, 'circle-stroke-opacity': 0, 'circle-stroke-color': '#ff3b2f', 'circle-pitch-alignment': 'map' } });
  add({ id: 'stacks', type: 'fill-extrusion', source: 'stacks', paint: {
    'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['feature-state', 'k'], 0], 1, '#ff9a7a', 20, '#ff3b2f', 80, '#ff0f4f'],
    'fill-extrusion-height': ['*', 38, ['coalesce', ['feature-state', 'k'], 0]], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0, 'fill-extrusion-vertical-gradient': true } });
  add({ id: 'artillery', type: 'circle', source: 'artillery', paint: { 'circle-color': '#ffdf6b', 'circle-radius': 4, 'circle-opacity': 0 } });
  add({ id: 'plant-ring', type: 'circle', source: 'plant', paint: { 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.4, 'circle-radius': 12, 'circle-stroke-opacity': 0, 'circle-pitch-alignment': 'map' } });
  add({ id: 'plant-dot', type: 'circle', source: 'plant', paint: { 'circle-color': '#fff', 'circle-radius': 4, 'circle-blur': 0.3, 'circle-opacity': 0 } });

  if (D.landchange) ['ndvi-2021', 'ndvi-2025', 'ndvi-change', 'ndmi-change'].forEach(k =>   // above imagery, below vectors
    map.addLayer({ id: 'lc-' + k, type: 'raster', source: 'lc-' + k, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'res-fill'));
  reg('s2021', pp('s2021', 'raster-opacity')); reg('s2024', pp('s2024', 'raster-opacity')); reg('s2023', pp('s2023', 'raster-opacity')); reg('s2025', pp('s2025', 'raster-opacity')); reg('esri', pp('esri', 'raster-opacity'));
  reg('lights', pp('lights', 'raster-opacity')); reg('dnb20260124', pp('dnb20260124', 'raster-opacity')); reg('hillshade', pp('hillshade', 'hillshade-exaggeration'));
  reg('reservoir', pp('res-fill', 'fill-opacity', 0.35));
  reg('frontline', pp('front-fill', 'fill-opacity', 0.12), pp('front-line', 'line-opacity', 0.75));
  reg('canals', pp('canals', 'line-opacity'));
  reg('grid', pp('grid-glow', 'line-opacity', 0.35), pp('grid-core', 'line-opacity', 0.9));
  reg('gridflow', pp('grid-flow', 'line-opacity', 0.75));
  reg('znpp', znppPaint);
  reg('particles', pp('particles', 'circle-opacity'));
  reg('zones', pp('zones-line', 'line-opacity', 1), pp('zones-fill', 'fill-opacity', 1));
  L.zones.set = v => { map.setPaintProperty('zones-line', 'line-opacity', ['*', 0.9 * v, ['min', 1, ['coalesce', ['feature-state', 'f'], 0]]]); map.setPaintProperty('zones-fill', 'fill-opacity', ['*', 0.35 * v, ['coalesce', ['feature-state', 'f'], 0]]); };
  reg('proposed', pp('proposed', 'line-opacity'), pp('arrow', 'fill-opacity'));
  reg('rail', pp('rail-main', 'line-opacity', 0.7));
  reg('railDisused', pp('rail-disused', 'line-opacity'));
  reg('supplyEvents', pp('supply-events', 'circle-opacity', 0.9), pp('supply-events', 'circle-stroke-opacity', 0.9));
  reg('fort', pp('fort-line-glow', 'line-opacity', 0.5), pp('fort-line', 'line-opacity'), pp('fort-pt', 'circle-stroke-opacity'), pp('fort-pt-dot', 'circle-opacity'));
  ['ndvi-2021', 'ndvi-2025', 'ndvi-change', 'ndmi-change'].forEach(k => reg('lc:' + k, v => map.getLayer('lc-' + k) && map.setPaintProperty('lc-' + k, 'raster-opacity', v * 0.92)));
  reg('lclegend', domOp('#lclegend')); reg('chart', domOp('#chart'));
  reg('wells', pp('wells-zone', 'fill-opacity', 0.35), pp('wells-zone-line', 'line-opacity', 0.9), pp('spray-ponds', 'fill-opacity', 0.45),
    pp('well-cand', 'circle-stroke-opacity'), pp('well-cand-dot', 'circle-opacity'));
  reg('water', pp('water-fill', 'fill-opacity', 0.22), pp('water-line', 'line-opacity', 0.9));
  reg('roads', pp('roads', 'line-opacity', 0.65));
  reg('routes', pp('routes-glow', 'line-opacity', 0.45), pp('routes', 'line-opacity', 1));
  reg('trucks', pp('trucks', 'circle-opacity'), pp('trucks', 'circle-stroke-opacity'));
  reg('ucdp', pp('ucdp', 'circle-opacity', 0.9), pp('ucdp', 'circle-stroke-opacity', 0.9), pp('stacks', 'fill-extrusion-opacity', 0.85));
  reg('plant', pp('plant-ring', 'circle-stroke-opacity'), pp('plant-dot', 'circle-opacity'));
  // the plant's massing model (plant3d.js: three.js custom layer, models/znpp.glb); fades out by itself when wide
  if (window.PlantModel) map.addLayer(PlantModel.layer);
  reg('plantModel', v => window.PlantModel && PlantModel.setOpacity(v));
  addEventListener('plantmodel', () => { if (ST.scenes[cur]) buildLegend(ST.scenes[cur]); });
  reg('beacon', () => {});
  reg('trenches', pp('trenches', 'line-opacity')); reg('artillery', pp('artillery', 'circle-opacity'));
  reg('timeline', domOp('#timeline')); reg('log', domOp('#log')); reg('counter', domOp('#counter')); reg('ucdpcount', domOp('#ucdpCount'));
}

/* ---------- camera ---------- */
const mercX = l => (l + 180) / 360, mercY = la => { const s = Math.sin(la * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
const unX = x => x * 360 - 180, unY = y => (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90;
function cam(sc, t) {
  const k = sc.cam;
  if (t <= k[0].t) return k[0];
  for (let i = 1; i < k.length; i++) if (t <= k[i].t) {
    const a = k[i - 1], b = k[i], u = (ease[b.e || 'io'])((t - a.t) / (b.t - a.t || 1));
    const z = lerp(a.z, b.z, u);
    // keep screen-space travel even when zooming (center moves while wide)
    const w0 = Math.pow(2, -a.z), w1 = Math.pow(2, -b.z), w = Math.pow(2, -z);
    const s = Math.abs(w1 - w0) < 1e-9 ? u : (w - w0) / (w1 - w0);
    const x = lerp(mercX(a.c[0]), mercX(b.c[0]), s), y = lerp(mercY(a.c[1]), mercY(b.c[1]), s);
    const db = ((b.b - a.b) % 360 + 540) % 360 - 180; // shortest turn, so 350° → 10° doesn't spin round
    return { c: [unX(x), unY(y)], z, p: lerp(a.p, b.p, u), b: a.b + db * u };
  }
  return k[k.length - 1];
}

/* ---------- callouts ---------- */
let markers = [];
function buildCallouts(sc) {
  markers.forEach(m => m.mk.remove()); markers = [];
  (sc.callouts || []).forEach((c, i) => {
    const el = document.createElement('div'); el.className = `co ${c.side || 'c'}`;
    el.innerHTML = `<div class="stem" data-h="${c.h || 60}"></div><div class="dot"></div><div class="lab" style="bottom:${c.h || 60}px"><span class="i">${String(i + 1).padStart(2, '0')}</span><b>${c.title}</b>${c.sub ? `<small>${c.sub}</small>` : ''}</div>`;
    const mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(c.ll).addTo(map);
    markers.push({ c, el, stem: el.querySelector('.stem'), lab: el.querySelector('.lab'), dot: el.querySelector('.dot'), on: false, dim: false, mk });
  });
}
const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
function updateCallouts(tl) {
  markers.forEach(m => { const on = tl >= m.c.t && tl < m.c.t + m.c.d; if (on !== m.on) { m.on = on; m.el.classList.toggle('on', on); m.stem.style.height = on ? m.stem.dataset.h + 'px' : '0px'; } });
  // declutter: when labels collide as the camera moves, the newest stays solid and older ones fade back
  const vis = markers.filter(m => m.on).sort((a, b) => b.c.t - a.c.t)
    .map(m => ({ m, lab: m.lab.getBoundingClientRect(), dot: m.dot.getBoundingClientRect() }));
  vis.forEach((a, i) => { const d = vis.slice(0, i).some(b => hit(a.lab, b.lab) || hit(a.lab, b.dot)); if (d !== a.m.dim) { a.m.dim = d; a.m.el.classList.toggle('dim', d); } });
  markers.forEach(m => { if (!m.on && m.dim) { m.dim = false; m.el.classList.remove('dim'); } });
}

/* ---------- timeline (scene 05) ---------- */
const PW = D.power;
const T0 = dnum('2022-03-01'), T1 = dnum('2026-11-30');
// broken axis: nothing is dated between the end of the Mar–Jul 2023 Ferosplavna outage and May 2025,
// so that stretch is squeezed into a narrow zigzag and the busy years get the width
const B0 = dnum('2023-07-15'), B1 = dnum('2025-04-15');
let TW = 1000, TX0 = 150, TX1 = 980, GAP = 16;
const tx = n => { const k = (TX1 - TX0 - GAP) / ((B0 - T0) + (T1 - B1));
  if (n <= B0) return TX0 + (n - T0) * k;
  if (n >= B1) return TX0 + (B0 - T0) * k + GAP + (n - B1) * k;
  return TX0 + (B0 - T0) * k + (n - B0) / (B1 - B0) * GAP; };
const events = [];
PW.context.forEach(e => events.push({ d: dnum(e.date), cls: 'ctx', t: e.label, s: '', zones: [] }));
PW.loops.forEach(e => events.push({ d: dnum(e.start), cls: 'loss', t: `Complete loss of off-site power${e.n ? ' #' + e.n : ''}`, s: e.note, zones: e.zones || [], loss: e }));
PW.line_outages.forEach(e => events.push({ d: dnum(e.start), cls: 'line', t: `${e.line} disconnected`, s: e.note.split(/[(.]/)[0], zones: e.zones || [] }));
PW.ceasefires.forEach(e => events.push({ d: dnum(e.start), cls: 'repair', t: `Ceasefire repair #${e.n}`, s: e.repaired, zones: e.zones || [] }));
PW.grid_damage.forEach(e => events.push({ d: dnum(e.date), cls: 'strike', t: e.label, s: e.line, zones: e.zones || [] }));
events.sort((a, b) => a.d - b.d);
function buildTimeline() {
  const svg = $('#timeline svg'), w = Math.round(svg.getBoundingClientRect().width);
  if (!w) return; // hidden: rebuilt when its slide shows it
  TW = w; const c = TW < 560; // compact = inside the story panel (labels above each lane)
  TX0 = c ? 1 : 150; TX1 = TW - (c ? 5 : 20);
  const Y = c ? { h: 120, yr: 9, top: 3, l1: [19, 27], l2: [41, 49], lo: [63, 67, 79], re: [91, 95, 103], ctx: [12, 106, 117], lx: TX0, fs: 8 }
              : { h: 118, yr: 14, top: 6, l1: [36, 32], l2: [56, 52], lo: [76, 64, 82], re: [98, 92, 102], ctx: [20, 112, 112], lx: 0, fs: 9 };
  svg.setAttribute('viewBox', `0 0 ${TW} ${Y.h}`); svg.style.height = Y.h + 'px';
  GAP = c ? 16 : 22; const g0 = tx(B0), g1 = tx(B1);
  const segs = (a, b) => b <= g0 || a >= g1 ? [[a, b]] : [[a, Math.min(b, g0)], [Math.max(a, g1), b]].filter(([p, q]) => q > p); // split across the break
  let h = '';
  for (let y = 2022; y <= 2026; y++) { const d = dnum(`${y}-01-01`); if (d > B0 && d < B1) continue; const x = tx(d);
    if (x > TX0) h += `<line x1="${x}" x2="${x}" y1="${Y.top}" y2="${Y.ctx[1]}" stroke="rgba(255,255,255,.12)"/>`; h += `<text x="${Math.max(x, TX0) + 3}" y="${Y.yr}" fill="#9aa5a0" font-size="${Y.fs}">${y}</text>`; }
  h += `<text x="${g1 + 3}" y="${Y.yr}" fill="#9aa5a0" font-size="${Y.fs}">2025</text>`;
  const label = (y, t, col) => h += `<text x="${Y.lx}" y="${y}" fill="${col}" font-size="${Y.fs}">${t}</text>`;
  const lane = (l, t, col) => { label(l[0], t, col); segs(TX0, TX1).forEach(([p, q]) => h += `<line x1="${p}" x2="${q}" y1="${l[1]}" y2="${l[1]}" stroke="${col}" stroke-opacity=".35" stroke-width="${c ? 4 : 5}"/>`); };
  lane(Y.l1, '750 kV DNIPROVSKA', '#ff4d3a'); lane(Y.l2, '330 kV FEROSPLAVNA-1', '#ffb648');
  label(Y.lo[0], 'COMPLETE LOSS', '#ff2d55'); label(Y.re[0], 'CEASEFIRE REPAIR', '#9dfcc4');
  const bh = c ? 8 : 10;
  PW.line_outages.forEach(e => { const dn = e.line.startsWith('Dnip'), y = dn ? Y.l1[1] : Y.l2[1], col = dn ? '#ff4d3a' : '#ffb648';
    segs(tx(dnum(e.start)), tx(e.end ? dnum(e.end) : dnum('2026-11-24'))).forEach(([a, b]) =>
      h += `<rect x="${a}" y="${y - bh / 2}" width="${Math.max(2, b - a)}" height="${bh}" fill="#0b0d0e" stroke="${col}" stroke-width=".8"/>`); });
  PW.loops.forEach(e => { const x = tx(dnum(e.start)); h += `<line x1="${x}" x2="${x}" y1="${Y.lo[1]}" y2="${Y.lo[2]}" stroke="#ff2d55" stroke-width="${c ? 1.3 : 1.6}"/>`; });
  PW.ceasefires.forEach(e => { const x = tx(dnum(e.start)), k = c ? 3.5 : 4; h += `<path d="M${x - k} ${Y.re[2]} L${x} ${Y.re[1]} L${x + k} ${Y.re[2]}Z" fill="#9dfcc4"/>`; });
  // the break: two parallel zigzags across every lane
  const zig = x => { let d = `M${x} ${Y.top}`; for (let y = Y.top, i = 0; y < Y.ctx[1]; y += 4, i++) d += ` L${x + (i % 2 ? -2 : 2)} ${Math.min(y + 4, Y.ctx[1])}`; return d; };
  h += `<path d="${zig(g0 + 4)}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".9"/><path d="${zig(g1 - 4)}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".9"/>`;
  PW.context.forEach(e => { const x = tx(dnum(e.date)), t = e.label.toUpperCase(), right = x + 4 + t.length * Y.fs * 0.6 > TW;
    h += `<line x1="${x}" x2="${x}" y1="${Y.ctx[0]}" y2="${Y.ctx[1]}" stroke="#5cc8ff" stroke-dasharray="2 2"/><text x="${right ? x - 4 : x + 4}" y="${Y.ctx[2]}" text-anchor="${right ? 'end' : 'start'}" fill="#5cc8ff" font-size="${Y.fs}">${t}</text>`; });
  h += `<g id="ph"><line x1="0" x2="0" y1="${Y.top}" y2="${Y.ctx[1]}" stroke="#fff" stroke-width="1.2"/><circle cx="0" cy="${Y.top}" r="${c ? 2.5 : 3}" fill="#fff"/></g>`;
  svg.innerHTML = h;
  const total = (PW.gaps[0].match(/reaches (\d+)/) || [])[1];
  $('#timeline .tnote').textContent = `Jul 2023 – Apr 2025 compressed${total ? ` · ${PW.loops.length} of ${total} losses dated` : ''}`;
}
const isOut = (line, n) => PW.line_outages.some(e => e.line === line && n >= dnum(e.start) && n <= (e.end ? dnum(e.end) + 0.99 : Infinity));
const lossAt = n => PW.loops.find(e => n >= dnum(e.start) && n <= dnum(e.end) + 0.99);
let logShown = -1;
function updateRepair(sc, tl) {
  const n = sc.dm.at(tl);
  setStamp(fmtD(n), 'OFF-SITE POWER LINES · IAEA / WNA');
  $('#ph').setAttribute('transform', `translate(${tx(n)},0)`);
  const loss = lossAt(n);
  lineState['Dniprovska 750 kV'] = (isOut('Dniprovska 750 kV', n) || loss) ? 0 : 1;
  lineState['Ferosplavna-1 330 kV'] = (isOut('Ferosplavna-1 330 kV', n) || loss) ? 0 : 1;
  // zones: flash at each event, then hold faintly
  const zf = {};
  events.forEach(e => { if (!e.zones.length) return; const te = sc.dm.inv(e.d); if (tl < te) return; const f = 0.3 + 1.4 * Math.exp(-(tl - te) / 1.6); e.zones.forEach(z => zf[z] = Math.max(zf[z] || 0, f)); });
  D.zones.features.forEach(f => map.setFeatureState({ source: 'zones', id: f.properties.id }, { f: zf[f.properties.id] || 0 }));
  // loss banner (held 1.8 s of film time so one-day losses are readable)
  let ban = null; PW.loops.forEach(e => { const te = sc.dm.inv(dnum(e.start)); if (tl >= te && tl < te + 1.8) ban = e; });
  $('#loss').classList.toggle('on', !!ban);
  if (ban) { $('#loss .v').textContent = ban.n ? `#${ban.n} · ${fmtD(dnum(ban.start))}` : fmtD(dnum(ban.start)); $('#loss .s').textContent = ban.note; }
  plantAlarm = ban ? 1 : 0;
  // event log
  const passed = events.filter(e => sc.dm.inv(e.d) <= tl);
  if (passed.length !== logShown) {
    logShown = passed.length;
    $('#log .list').innerHTML = passed.slice(-5).reverse().map((e, i) => `<div class="e ${e.cls} ${i === 0 && tl - sc.dm.inv(e.d) < 2 ? 'new' : ''}"><b>${fmtD(e.d)}</b> — ${e.t}<br><span>${(e.s || '').slice(0, 110)}</span></div>`).join('');
  }
}

/* ---------- particles ---------- */
let phase = 0;
function updateParticles(dt, dir, zoom) {
  const spacing = 1.4, speed = 2.2 * Math.pow(2, 9 - zoom); // km per second, zoom-relative
  phase = (phase + dir * speed * dt) % spacing; if (phase < 0) phase += spacing;
  const f = [];
  flowParts.forEach(fp => { if (!lineState[fp.line]) return; for (let d = phase; d < fp.len; d += spacing) f.push({ type: 'Feature', properties: { line: fp.line }, geometry: { type: 'Point', coordinates: along(fp, d) } }); });
  map.getSource('particles').setData(FC(f));
}
let tphase = 0, routeFilter = null;
function updateTrucks(dt, zoom) {
  const spacing = 6, speed = 6 * Math.pow(2, 8.5 - zoom); // km between trucks, km/s of film time (zoom-relative)
  tphase = (tphase + speed * dt) % spacing;
  const f = [];
  routeParts.forEach(r => { if (routeFilter && !routeFilter.includes(r.kind)) return; const sp = Math.min(spacing, Math.max(0.6, r.len / 3)); for (let d = tphase % sp; d < r.len; d += sp) f.push({ type: 'Feature', properties: { kind: r.kind }, geometry: { type: 'Point', coordinates: along(r, d) } }); });
  map.getSource('trucks').setData(FC(f));
}
const dashSeq = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],[0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];
let dashStep = -1;

/* ---------- legend + chart (land change) ---------- */
const LEG = {
  'ndvi-2021': ['NDVI · LATE SUMMER 2021', 'bare / water', 'dense green', 'linear-gradient(90deg,#3b2a1a,#7a5a2e,#b59b5a,#d9d38a,#9fcf6a,#4caf50,#1b7a34)'],
  'ndvi-2025': ['NDVI · LATE SUMMER 2025', 'bare / water', 'dense green', 'linear-gradient(90deg,#3b2a1a,#7a5a2e,#b59b5a,#d9d38a,#9fcf6a,#4caf50,#1b7a34)'],
  'ndvi-change': ['VEGETATION CHANGE · 2024–26 vs 2019–22', 'less green', 'greener', 'linear-gradient(90deg,#8c2d04,#ec7014,#fdae61,#f7f7f7,#a6d96a,#41ab5d,#00441b)'],
  'ndmi-change': ['MOISTURE (NDMI) CHANGE · 2024–26 vs 2019–22 · bed: water became land', 'drier', 'wetter', 'linear-gradient(90deg,#8c2d04,#ec7014,#fdae61,#f7f7f7,#a6d96a,#41ab5d,#00441b)'],
};
let legKey = '';
function setLegend(k) { if (k === legKey) return; legKey = k; const l = LEG[k]; $('#lclegend .t').textContent = l[0]; $('#lclegend .a').textContent = l[1]; $('#lclegend .b').textContent = l[2]; $('#lclegend .bar').style.background = l[3]; }
let chartDrawn = '';
function drawChart(c, tl) {
  const s = (D.landchange && D.landchange[c.series]) || []; if (!s.length) return;
  const key = c.series + Math.floor(tl * 4); if (key === chartDrawn) return; chartDrawn = key;
  const W = 420, H = 150, x0 = 36, y0 = 18, w = W - 50, h = H - 46;
  const vs = s.map(d => d[1]), lo = Math.min(...vs) * 0.98, hi = Math.max(...vs) * 1.01;
  const X = i => x0 + i / (s.length - 1) * w, Y = v => y0 + (1 - (v - lo) / (hi - lo)) * h;
  const upto = Math.max(2, Math.round(clamp((tl - c.t0) / (c.draw || 4), 0, 1) * s.length));
  let p = s.slice(0, upto).map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(d[1]).toFixed(1)}`).join('');
  let yrs = ''; s.forEach((d, i) => { if (d[0].endsWith('-01')) yrs += `<line x1="${X(i)}" x2="${X(i)}" y1="${y0}" y2="${y0 + h}" stroke="rgba(255,255,255,.12)"/><text x="${X(i) + 3}" y="${y0 + h + 12}" fill="#9aa5a0" font-size="9">${d[0].slice(0, 4)}</text>`; });
  const last = s[upto - 1];
  $('#chart svg').innerHTML = `<text x="0" y="10" fill="#eef1ee" font-size="10" letter-spacing="2">${c.title}</text>${yrs}
    <text x="0" y="${Y(hi) + 4}" fill="#9aa5a0" font-size="9">${hi.toFixed(1)}</text><text x="0" y="${Y(lo)}" fill="#9aa5a0" font-size="9">${lo.toFixed(1)}</text>
    <path d="${p}" fill="none" stroke="#5cc8ff" stroke-width="1.8"/><circle cx="${X(upto - 1)}" cy="${Y(last[1])}" r="3" fill="#5cc8ff"/>
    <text x="${X(upto - 1) - 6}" y="${Y(last[1]) - 8}" text-anchor="end" fill="#bfeaff" font-size="10">${last[1].toFixed(2)} km² · ${last[0]}</text>
    <text x="0" y="${H - 2}" fill="#5d6763" font-size="8">${c.note || ''}</text>`;
}

/* ---------- HUD ---------- */
const N = ST.scenes.length;
const FIRST = ST.scenes[0].titleCard && !ST.scenes[0].vo ? 1 : 0; // a silent title scene is the opening, not a slide
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isRec = () => document.body.classList.contains('rec');
const CREDITS = 'IAEA updates via World Nuclear Association · UCDP GED · OpenStreetMap · Sentinel-2 cloudless (EOX) · Esri World Imagery · NASA Black Marble · AWS Terrain Tiles';
const ttlHTML = (() => { const [a, ...b] = ST.title.split(':'); return b.length ? `<span class="a">${esc(a)}:</span><span class="b">${esc(b.join(':').trim())}</span>` : `<span class="a">${esc(a)}</span>`; })();
$('#intro .ttl').innerHTML = ttlHTML; $('#title .ttl').innerHTML = ttlHTML;

let stampCache = '';
function setStamp(v) {
  if (v === stampCache) return; stampCache = v;
  const el = $('#dateline'); if (!el) return;
  el.classList.toggle('none', !v); el.textContent = v;
}
let capOn = !qs.has('nocap'), auto = false, plantAlarm = 0;

/* ---------- legend (from the layers each slide turns on) ---------- */
const sw = {
  line: (c, w = 2, st = 'solid', glow) => `<i style="display:block;width:20px;border-top:${w}px ${st} ${c};${glow ? `box-shadow:0 0 6px ${c}` : ''}"></i>`,
  fill: (bg, bd = '1px solid transparent') => `<i style="display:block;width:18px;height:10px;background:${bg};border:${bd}"></i>`,
  dot: (c, r = 8, ring) => `<i style="display:block;width:${r}px;height:${r}px;border-radius:50%;${ring ? `border:1.5px solid ${c}` : `background:${c};box-shadow:0 0 6px ${c}`}"></i>`,
  kv: () => `<i style="display:grid;gap:2px;width:20px"><b style="border-top:2.4px solid #ff4d3a"></b><b style="border-top:1.8px solid #ffb648"></b><b style="border-top:1px solid #e7d27c"></b></i>`,
};
const has = fc => fc && fc.features && fc.features.length > 0;
const LEGEND = [
  ['plant', sw.dot('#fff', 10, true), 'Zaporizhzhia NPP'],
  ['plantModel', sw.fill('linear-gradient(90deg,#5a1a12 0 40%,#8d8a80 40%)'), 'Plant model · OSM footprints, heights representative', () => !!(window.PlantModel && PlantModel.loaded)],
  ['znpp', sw.line('#ff6a55', 3, 'solid', 1), '750 kV Dniprovska line'],
  ['znpp', sw.line('#ffc56a', 3, 'solid', 1), '330 kV Ferosplavna-1 line'],
  ['particles', sw.dot('#ffd1c8', 6), 'Power flow'],
  ['grid', sw.kv(), 'Grid · 750 / 330 / 150 kV'],
  ['zones', sw.fill('rgba(255,45,85,.4)', '1px solid #ff2d55'), 'Damage zone (approx.)'],
  ['frontline', sw.fill('rgba(255,45,85,.14)', '1px dashed rgba(255,255,255,.8)'), 'Frontline (schematic)'],
  ['reservoir', sw.fill('rgba(92,200,255,.4)'), 'Kakhovka reservoir, 2023'],
  ['proposed', sw.line('#fff', 2, 'dashed'), 'Russian grid link (schematic)'],
  ['ucdp', sw.fill('linear-gradient(#ff0f4f,#ff9a7a)'), 'UCDP fatal events'],
  ['trenches', sw.line('#ffdf6b', 1.5), 'Trenches', () => has(X.trenches)],
  ['artillery', sw.dot('#ffdf6b', 7), 'Artillery', () => has(X.artillery)],
  ['lights', sw.fill('linear-gradient(90deg,#0b0d10,#ffe9a8)'), 'Night lights, 2016'],
  ['dnb20260124', sw.fill('linear-gradient(90deg,#0b0d10,#f2f2f2)'), 'Night lights, 24 Jan 2026 (VIIRS)'],
  ['water', sw.fill('rgba(92,200,255,.3)', '1px solid #8fdcff'), 'Cooling water'],
  ['water', sw.fill('rgba(92,200,255,.35)', '1px dashed #bfeaff'), 'Reported well zone', sc => !!sc.wellsOn],
  ['routes', sw.line('#ffd166', 3), 'Diesel route (shortest by road)', sc => !sc.routeKinds || sc.routeKinds.includes('diesel')],
  ['routes', sw.line('#9dfcc4', 3), 'Repair crew route · Ukrainian side', sc => !sc.routeKinds || sc.routeKinds.includes('crew-ua')],
  ['routes', sw.line('#ff8a7a', 3), 'Repair crew route · Russian side', sc => !sc.routeKinds || sc.routeKinds.includes('crew-ru')],
  ['trucks', sw.dot('#fff', 6), 'Convoys (illustrative)'],
  ['roads', sw.line('#e8ece9', 1), 'Main roads'],
  ['rail', sw.line('#c9d1cd', 1.5, 'dashed'), 'Railway'],
  ['railDisused', sw.line('#ff6b5a', 2, 'dashed'), 'Disused branch to Enerhodar'],
  ['supplyEvents', sw.dot('#ff3b2f', 8), 'Fatal events near the route (UCDP)'],
  ['fort', sw.line('#ffe9a0', 2.4, 'solid', 1), 'Trenches · traced, McKenzie / Greenpeace 2025'],
  ['fort', sw.dot('#ff2d55', 8, true), 'Sangars · caged guard posts'],
  ['fort', sw.dot('#ff8a00', 8, true), 'Checkpoints'],
  ['fort', sw.dot('#ffffff', 8, true), 'Positions · bunker · store (approx.)'],
];
function buildLegend(sc) {
  $('#legend').innerHTML = LEGEND.filter(([k, , , ok]) => (sc.layers[k] || 0) >= 0.3 && (!ok || ok(sc)))
    .map(([, s, l]) => `<div class="row"><span class="sw">${s}</span>${esc(l)}</div>`).join('');
}

/* ---------- bottom-left credits: this slide's data source, then the base map ---------- */
const BASE_CREDIT = 'Imagery <a href="https://s2maps.eu">Sentinel-2 cloudless, EOX</a> (modified Copernicus data 2021–2025) · Esri, Maxar, Earthstar Geographics · NASA Black Marble, VIIRS NOAA-20 / GIBS · Terrain: Mapzen / AWS · Lines: © OpenStreetMap';
// fallback when a scene has no short credit: source names only, without parentheses or notes
const condense = s => (s || '').split('·').map(p => p.replace(/\([^)]*\)/g, '').replace(/,\s*\d{4}.*$/, '').trim()).filter(p => p && !/^imagery/i.test(p)).slice(0, 3).join(' · ');
function setAttrib(sc) {
  const d = sc.endCard ? '' : (sc.credit != null ? sc.credit : condense(sc.sources));
  const el = $('#attrib'); el.innerHTML = (d ? `<b>${esc(d)}</b> · ` : '') + BASE_CREDIT; el.title = el.textContent;
}

/* ---------- story panel ---------- */
function slideHTML(sc, dir) {
  const cls = `slide${dir < 0 ? ' back' : ''}`;
  if (sc.titleCard) return `<div class="${cls}"><div class="hd"><h2>${esc(ST.title)}</h2></div>${sc.vo ? `
    <div id="dateline" class="dateline none"></div><p class="lede">${esc(sc.vo)}</p>` : ''}</div>`;
  if (sc.endCard) return `<div class="${cls}"><div class="hd"><h2>${esc(ST.title)}</h2></div>
    <p class="lede">${esc(sc.vo)}</p><p class="src">Sources · ${esc(CREDITS)}</p></div>`;
  return `<div class="${cls}"><div class="hd"><h2>${esc(sc.name)}</h2></div>
    <div id="dateline" class="dateline none"></div>
    <p class="lede">${esc(sc.vo)}</p></div>`;
}
function renderPanel(sc, dir) {
  const pb = $('#pbody'); pb.innerHTML = slideHTML(sc, dir); pb.scrollTop = 0;
  setAttrib(sc);
  $('#pg').textContent = `${Math.max(1, cur - FIRST + 1)} / ${N - FIRST}`;
  $('#bBack').disabled = cur <= FIRST;
  $('#menu').querySelectorAll('a').forEach(a => { const on = +a.dataset.i === cur; a.classList.toggle('cur', on); on ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'); });
}
function buildMenu() {
  $('#menu').innerHTML = ST.scenes.slice(FIRST).map((sc, k) =>
    `<a href="#${sc.id}" data-i="${k + FIRST}"><span class="n">${sc.chapter || '—'}</span>${esc(sc.endCard ? 'Closing' : sc.titleCard ? ST.title : sc.name)}</a>`).join('');
  $('#menu').querySelectorAll('a').forEach(a => a.onclick = e => { e.preventDefault(); go(+a.dataset.i); });
}
function toggleMenu(v) {
  const on = v ?? !$('#panel').classList.contains('menu');
  $('#panel').classList.toggle('menu', on); $('#bMenu').classList.toggle('on', on); $('#bMenu').setAttribute('aria-expanded', on);
}

/* ---------- data widgets: inside the story panel, or on the map in record mode ---------- */
function placeData() {
  if (isRec()) { $('#rightcol').append($('#counter'), $('#ucdpCount'), $('#log'), $('#lclegend'), $('#chart')); document.body.insertBefore($('#timeline'), $('#readout')); }
  else $('#pdata').append($('#counter'), $('#ucdpCount'), $('#timeline'), $('#log'), $('#lclegend'), $('#chart'));
  buildTimeline();
}

/* ---------- map padding: frame the story beside the panel (constant, so it never jumps) ---------- */
function updatePadding() {
  const p = { top: 0, bottom: 0, left: 0, right: 0 };
  if (!isRec()) {
    if (innerWidth <= 900 && innerHeight > 520) p.bottom = Math.round(innerHeight * 0.4);
    else { const pn = $('#panel'); p.left = pn.offsetLeft + pn.offsetWidth; }
  }
  map.setPadding(p);
}

/* ---------- camera blend: every jump eases from wherever the camera is ---------- */
let blend = null;
function startBlend() { const c = map.getCenter(); blend = { from: { c: [c.lng, c.lat], z: map.getZoom(), p: map.getPitch(), b: map.getBearing() }, t0: performance.now(), arc: null, dur: 0 }; }
function mixPose(a, b, u, arc) {
  const zl = lerp(a.z, b.z, u);
  const w0 = Math.pow(2, -a.z), w1 = Math.pow(2, -b.z), w = Math.pow(2, -zl);
  const s = Math.abs(w1 - w0) < 1e-9 ? u : (w - w0) / (w1 - w0);
  const db = ((b.b - a.b) % 360 + 540) % 360 - 180;
  return { c: [unX(lerp(mercX(a.c[0]), mercX(b.c[0]), s)), unY(lerp(mercY(a.c[1]), mercY(b.c[1]), s))], z: zl - arc * Math.sin(Math.PI * u), p: lerp(a.p, b.p, u), b: a.b + db * u };
}
function blended(c) {
  if (!blend) return c;
  if (blend.arc == null) { // far jumps pull back a little (fly-to), near ones just glide
    const a = blend.from, d = Math.hypot(mercX(c.c[0]) - mercX(a.c[0]), mercY(c.c[1]) - mercY(a.c[1])) * 512 * Math.pow(2, Math.min(a.z, c.z));
    blend.arc = clamp(Math.log2(1 + d / innerWidth) * 1.1, 0, 3);
    blend.dur = Math.min(3800, 1400 + 500 * blend.arc + 90 * Math.abs(c.z - a.z) + 9 * Math.abs(((c.b - a.b) % 360 + 540) % 360 - 180));
  }
  const u = clamp((performance.now() - blend.t0) / blend.dur, 0, 1);
  if (u >= 1) { blend = null; return c; }
  return mixPose(blend.from, c, 0.5 - Math.cos(Math.PI * u) / 2, blend.arc); // sine ease: half the peak speed of a cubic
}

/* ---------- opening: centred title, then the panel ---------- */
let intro = 0, introTimer; // 0 off · 1 title showing · 2 fading out
function startIntro() {
  intro = 1; document.body.classList.add('intro');
  setTimeout(() => intro === 1 && $('#intro').classList.add('on'), 500);
  introTimer = setTimeout(endIntro, 4200);
}
function endIntro() {
  if (intro !== 1) return; intro = 2; clearTimeout(introTimer);
  $('#intro').classList.remove('on');
  setTimeout(() => { intro = 0; document.body.classList.remove('intro'); if (cur === FIRST) syncSound(); else go(FIRST); }, 1100);
}

/* ---------- which imagery loads, and prefetching ----------
   MapLibre fetches tiles for every visible layer even at opacity 0, so the five imagery layers (and the hillshade's
   copy of the terrain) all loaded all the time. A layer is now only visible while its slide uses it or it is still
   fading. Meanwhile the prefetcher fills the tile cache along the rest of the current slide's camera path, then the
   next slide's, then the previous one's, so Next and Back land on loaded tiles. */
const RASTERS = ['s2021', 's2023', 's2024', 's2025', 'esri', 'lights', 'dnb20260124', 'hillshade'];
function needs(sc) {
  const n = new Set(RASTERS.filter(id => (sc.layers[id] || 0) > 0));
  (sc.imagerySeq || []).forEach(([, l]) => n.add(l));
  if (sc.imagerySwap) { n.add(sc.imagerySwap.from); n.add(sc.imagerySwap.to); }
  if (sc.dim) n.add(sc.dim.layer || 'lights');
  return n;
}
const visState = {};
function updateVisibility(sc) {
  const n = needs(sc);
  RASTERS.forEach(id => { const o = L[id], v = n.has(id) || (o && (o.cur > 0.002 || o.tgt > 0.002));
    if (visState[id] !== v) { visState[id] = v; map.setLayoutProperty(id, 'visibility', v ? 'visible' : 'none'); } });
}
const PF = { queue: [], active: 0, gen: 0, timer: 0, fetched: 0, last: 0, ms: 0 };
// camera poses to warm, each with how soon it's likely to be needed (s): this slide from now on, then the next slide
// from its start (the reader may press Next any time), then the previous one
function poses(i, tNow) {
  const out = [], add = (k, from, lead) => { const sc = ST.scenes[k]; if (!sc) return;
    const ts = new Set([from, sc.dur]); sc.cam.forEach(c => c.t >= from && ts.add(c.t));
    for (let t = Math.ceil(from / 2.5) * 2.5; t < sc.dur; t += 2.5) ts.add(t);
    ts.forEach(t => out.push({ sc, t, due: lead + (t - from) })); };
  add(i, tNow, 0); add(i + 1, 0, 3); add(i - 1, 0, 12);
  return out.sort((a, b) => a.due - b.due);
}
// tiles a camera pose needs, for each imagery source its slide uses and the terrain (MapLibre's own coverage maths)
function poseTiles({ sc, t }, tr, seen, out) {
  const c = cam(sc, t); tr.center = new maplibregl.LngLat(c.c[0], c.c[1]); tr.zoom = c.z; tr.pitch = c.p; tr.bearing = c.b;
  const add = (tpl, size, maxz) => tr.coveringTiles({ tileSize: size, minzoom: 0, maxzoom: maxz, roundZoom: true, terrain: map.terrain }).forEach(id => {
    const { z, x, y } = id.canonical, u = tpl === 'dem' ? `dem/${z}/${x}/${y}` : tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    if (!seen.has(u)) { seen.add(u); out.push(u); } });
  needs(sc).forEach(id => { if (TPL[id]) add(TPL[id], 256, map.getSource(id).maxzoom); });
  add('dem', 512, 14);   // the terrain asks for its tiles a zoom level below the imagery
}
function pumpPrefetch() {
  const g = PF.gen, limit = map.areTilesLoaded() ? 8 : 4;   // fewer while the screen itself is still loading
  while (PF.active < limit && PF.queue.length) {
    const u = PF.queue.shift(); if (!u.startsWith('dem/') && TILES.has(u)) continue; PF.active++; PF.fetched++;
    const p = u.startsWith('dem/') ? (window.PlantFlat && PlantFlat.tile ? PlantFlat.tile(...u.slice(4).split('/').map(Number)) : Promise.resolve())
                                   : TILES.get(u);
    p.catch(() => {}).finally(() => { PF.active--; if (g === PF.gen) pumpPrefetch(); });
  }
  if (PF.queue.length && PF.active >= limit) { clearTimeout(PF.timer); PF.timer = setTimeout(pumpPrefetch, 250); }
}
const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 400 }) : f => setTimeout(() => f({ timeRemaining: () => 8 }), 50);
function schedulePrefetch(i) {
  if (!map.transform || !map.transform.coveringTiles) return;
  PF.gen++; PF.queue = []; clearTimeout(PF.timer); PF.last = performance.now();
  const g = PF.gen, list = poses(i, clamp(T - ST.scenes[i].start, 0, ST.scenes[i].dur)), seen = new Set(), tr = map.transform.clone();
  let k = 0;
  // worked out a few poses at a time in idle moments, so the camera never hitches for it
  const step = dl => { if (g !== PF.gen) return;
    const t0 = performance.now();
    try { do { poseTiles(list[k++], tr, seen, PF.queue); } while (k < list.length && dl.timeRemaining() > 3); }
    catch (e) { console.warn('prefetch skipped:', e.message); return; }
    PF.ms = Math.max(PF.ms, performance.now() - t0);
    pumpPrefetch();
    if (k < list.length) idle(step);
  };
  PF.timer = setTimeout(() => idle(step), 600);   // let the slide's own first tiles go first
}

/* ---------- scene management ---------- */
let cur = -1, T = 0, playing = false, lastNow = null, first = true, dir = 1, held = false;
function sceneAt(t) { for (let i = ST.scenes.length - 1; i >= 0; i--) if (t >= ST.scenes[i].start) return i; return 0; }
function enter(i, snap) {
  const sc = ST.scenes[i]; cur = i; logShown = -1; stampCache = '';
  if (snap) blend = null;
  Object.keys(L).forEach(k => { L[k].tgt = (sc.layers && sc.layers[k]) || 0; if (snap) { L[k].cur = L[k].tgt; L[k].set(L[k].cur); } });
  lineState = { 'Dniprovska 750 kV': 1, 'Ferosplavna-1 330 kV': 1 };
  D.zones.features.forEach(f => map.setFeatureState({ source: 'zones', id: f.properties.id }, { f: 0 }));
  $('#loss').classList.remove('on');
  buildCallouts(sc);
  renderPanel(sc, dir);
  buildLegend(sc);
  const rf = sc.routeKinds ? ['in', ['get', 'kind'], ['literal', sc.routeKinds]] : null;
  ['routes', 'routes-glow', 'trucks'].forEach(id => map.getLayer(id) && map.setFilter(id, rf));
  routeFilter = sc.routeKinds || null;
  $('#card .n').textContent = sc.chapter; $('#card .t').textContent = sc.name;
  setStamp(sc.stamp || '');
  $('#cap').textContent = sc.vo || '';
  $('#counter').style.opacity = 0; $('#ucdpCount').style.opacity = 0;
  const show = { counter: !!sc.counter, ucdpCount: sc.id === 'frontier', timeline: !!sc.layers.timeline, log: !!sc.layers.log,
    lclegend: !!sc.overlaySeq, chart: !!sc.chart };
  Object.entries(show).forEach(([id, v]) => { $('#' + id).style.display = v ? '' : 'none'; });
  $('#pdata').classList.toggle('on', Object.values(show).some(Boolean));
  if (show.timeline) buildTimeline();
  if (location.hash.slice(1) !== sc.id) history.replaceState(null, '', location.pathname + location.search + '#' + sc.id);
  schedulePrefetch(i);
}
function render(dt) {
  const i = sceneAt(T);
  if (i !== cur) { enter(i, first); first = false; }
  else if (!blend && performance.now() - PF.last > 6000) schedulePrefetch(cur);   // keep the queue ahead of the camera
  const sc = ST.scenes[i], tl = T - sc.start;
  const c = blended(cam(sc, tl));
  // vertical exaggeration eases with altitude: dramatic when wide, near-true in close-ups
  const ex = Math.round(lerp(ST.exaggeration, ST.exaggerationClose, clamp((c.z - 8.5) / 4.5, 0, 1)) * 10) / 10;
  if (map.terrain && map.terrain.exaggeration !== ex) { map.terrain.exaggeration = ex; }
  map.jumpTo({ center: c.c, zoom: c.z, pitch: c.p, bearing: c.b });

  // scene-specific forcing
  if (sc.imagerySeq) { const q = sc.imagerySeq; const w = {}; q.forEach(([, l]) => w[l] = 0);
    for (let k = 0; k < q.length; k++) { const u = k === 0 ? 1 : clamp((tl - q[k][0]) / 2, 0, 1); if (u > 0) { Object.keys(w).forEach(l => w[l] *= (1 - u)); w[q[k][1]] = u; } }
    Object.entries(w).forEach(([l, v]) => force(l, v)); }
  if (sc.overlaySeq) { const q = sc.overlaySeq, w = {};
    ['ndvi-2021', 'ndvi-2025', 'ndvi-change', 'ndmi-change'].forEach(k => w[k] = 0);
    for (let i = 0; i < q.length; i++) { const u = clamp((tl - q[i][0]) / 1.5, 0, 1); if (u > 0) { Object.keys(w).forEach(k => w[k] *= (1 - u)); if (q[i][1]) w[q[i][1]] = u; } }
    Object.entries(w).forEach(([k, v]) => force('lc:' + k, v));
    const cur = [...q].reverse().find(x => tl >= x[0]); const key = cur && cur[1];
    force('lclegend', key ? 1 : 0); if (key) setLegend(key); }
  if (sc.chart) { const c = sc.chart; force('chart', clamp((tl - c.t0) / 1, 0, 1) * clamp((c.t1 - tl) / 1, 0, 1)); drawChart(c, tl); }
  if (sc.wellsOn) { const [a, b] = sc.wellsOn; force('wells', clamp((tl - a) / 1.5, 0, 1) * clamp((b - tl) / 1.5, 0, 1)); }
  if (sc.stamps) { let s = sc.stamps[0][1]; sc.stamps.forEach(([t, v]) => { if (tl >= t) s = v; }); setStamp(s, 'ZAPORIZHZHIA NPP · 47.51°N 34.59°E'); }
  if (sc.imagerySwap) { const s = sc.imagerySwap, u = clamp((tl - s.t0) / (s.t1 - s.t0), 0, 1); force(s.from, 1 - u); force(s.to, u); }
  if (sc.dim) { const u = ease.io(clamp((tl - sc.dim.t0) / (sc.dim.t1 - sc.dim.t0), 0, 1)); force(sc.dim.layer || 'lights', lerp(sc.dim.from, sc.dim.to, u)); }
  if (sc.id === 'repair') updateRepair(sc, tl);
  if (sc.counter) { const k = sc.counter, n = Math.round(k.n * ease.out(clamp((tl - k.t0) / (k.t1 - k.t0), 0, 1))); $('#counter .v').textContent = n; $('#counter .k').textContent = k.label; $('#counter .note').textContent = k.note || '';
    $('#counter').style.opacity = clamp((tl - k.t0 + 1) / 1.5, 0, 1) * (isRec() ? clamp((sc.dur - tl) / 1.5, 0, 1) : 1); } // slides hold at the end, so no fade-out
  if (sc.id === 'frontier') {
    const n = sc.dm.at(tl);
    map.setFilter('ucdp', ['<=', ['get', 'n'], n]); map.setFilter('ucdp-glow', ['<=', ['get', 'n'], n]);
    map.setPaintProperty('ucdp-glow', 'circle-opacity', ['*', L.ucdp.cur * 0.7, ['max', 0.12, ['-', 1, ['/', ['-', n, ['get', 'n']], 60]]]]);
    let cnt = 0;
    stacks.forEach(s => { let k = 0; while (k < s.ns.length && s.ns[k] <= n) k++; cnt += k; if (k !== s.shown) { s.shown = k; map.setFeatureState({ source: 'stacks', id: s.id }, { k }); } });
    const t0 = sc.datesFrom || 0;
    $('#ucdpCount .v').textContent = cnt; $('#ucdpCount').style.opacity = clamp((tl - t0 - 4) / 1.5, 0, 1);
    if (tl >= t0) setStamp(fmtD(n));
  } else if (L.ucdp.cur < 0.01) { map.setPaintProperty('ucdp-glow', 'circle-opacity', 0); }

  // tween logical layers
  const k = 1 - Math.exp(-dt * 2.2);
  Object.values(L).forEach(o => { if (Math.abs(o.tgt - o.cur) > 0.003) { o.cur += (o.tgt - o.cur) * k; o.set(o.cur); } else if (o.cur !== o.tgt) { o.cur = o.tgt; o.set(o.cur); } });
  znppPaint();
  updateVisibility(sc);

  // animated details
  if (L.particles.cur > 0.01) updateParticles(dt, sc.flow || 1, c.z);
  if (L.trucks.cur > 0.01) updateTrucks(dt, c.z);
  if (L.gridflow.cur > 0.01) { const s = Math.floor(performance.now() / 70) % dashSeq.length; if (s !== dashStep) { dashStep = s; map.setPaintProperty('grid-flow', 'line-dasharray', dashSeq[s]); } }
  const pulse = (performance.now() / 1000) % 2 / 2;
  const big = sc.layers.beacon ? 3 : 1;
  map.setPaintProperty('plant-ring', 'circle-radius', (8 + 26 * pulse) * big);
  map.setPaintProperty('plant-ring', 'circle-stroke-opacity', L.plant.cur * (1 - pulse));
  map.setPaintProperty('plant-ring', 'circle-stroke-color', plantAlarm ? '#ff2d55' : '#ffffff');
  map.setPaintProperty('plant-dot', 'circle-color', plantAlarm || sc.id === 'winter' || sc.id === 'dependency' ? '#ff2d55' : '#ffffff');
  if (sc.id !== 'repair') plantAlarm = 0;

  updateCallouts(tl);
  // record-mode overlays (hidden by CSS otherwise)
  const chapterCard = sc.chapter && tl > 0.6 && tl < 5.2;
  $('#card').classList.toggle('on', !!chapterCard);
  const tc = sc.titleCard === true ? { t0: 3, t1: 21 } : sc.titleCard;
  const tOn = (tc && tl > tc.t0 && tl < tc.t1) || (sc.endCard && tl > (sc.capUntil || 13));
  $('#title .cr').textContent = sc.endCard ? 'Sources · ' + CREDITS : 'GSAPP · Advanced V Studio · Fall 2026';
  $('#dimmer').style.opacity = isRec() && sc.endCard && tl > (sc.capUntil || 13) ? 0.45 : 0;
  $('#title').classList.toggle('on', !!tOn);
  $('#title .st').textContent = sc.endCard ? 'Slow violence · energy · water · territory' : 'The militarization of energy infrastructure · Zaporizhzhia NPP';
  document.body.classList.toggle('tl', L.timeline.cur > 0.5);
  $('#cap').classList.toggle('on', capOn && !!sc.vo && tl > 1.5 && tl < (sc.capUntil || sc.dur - 0.4) && !chapterCard);
  if (isRec()) $('#readout').innerHTML = `${c.c[1].toFixed(4)}°N  ${c.c[0].toFixed(4)}°E<br>ALT Z${c.z.toFixed(1)} · TILT ${c.p.toFixed(0)}° · HDG ${(((c.b % 360) + 360) % 360).toFixed(0).padStart(3, '0')}°<br>TERRAIN ×${ex} VERTICAL`;
  $('#scrub .fill').style.width = (clamp(tl / sc.dur, 0, 1) * 100) + '%';
  $('#bNext').classList.toggle('ready', held);
}
// scene-driven values (imagery crossfade, dimming) follow the clock exactly once the layer is there,
// but a big jump (entering a slide, or while the camera blends) eases in instead of popping
function force(name, v) { const o = L[name]; if (!o) return; o.tgt = v; if (!blend && Math.abs(v - o.cur) < 0.05) { o.cur = v; o.set(v); } }

function loop(now) {
  const dt = lastNow == null ? 0 : Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  if (playing && !intro) { // the clock waits while the opening title shows, so narration starts from the top
    const prev = T;
    if (soundOn && !snd.paused && snd.readyState >= 2 && Math.abs(snd.currentTime - (T + dt)) < 0.5) T = snd.currentTime; // the soundtrack is the clock
    else { T += dt; if (soundOn && !snd.paused && Math.abs(snd.currentTime - T) > 0.3 && snd.readyState >= 1) snd.currentTime = T; }
    const si = sceneAt(prev), end = ST.scenes[si].start + ST.scenes[si].dur;
    if (prev < end && T >= end && (!auto || si === N - 1)) { T = end - 0.001; held = true; setPlay(false); }
    else if (T >= end) dir = 1;
  }
  render(dt);
  requestAnimationFrame(loop);
}

/* ---------- navigation ---------- */
const ICON = {
  play: '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z"/></svg>',
  pause: '<svg viewBox="0 0 12 12"><path d="M2.5 1.5H5v9H2.5zM7 1.5h2.5v9H7z"/></svg>',
  replay: '<svg class="r" viewBox="0 0 12 12"><path d="M2.2 4.6A4 4 0 1 1 2 7"/><path d="M1.6 1.8v3h3"/></svg>',
  snd: '<svg viewBox="0 0 12 12"><path class="f" d="M1.5 4.5h2l3-2.5v8l-3-2.5h-2z"/><path d="M8.3 4.2a2.6 2.6 0 0 1 0 3.6M9.8 2.8a4.6 4.6 0 0 1 0 6.4"/></svg>',
  mute: '<svg viewBox="0 0 12 12"><path class="f" d="M1.5 4.5h2l3-2.5v8l-3-2.5h-2z"/><path d="M8 4.3l3 3.4M11 4.3l-3 3.4"/></svg>',
};
/* soundtrack: narration + drone, kept in step with the film clock */
const snd = $('#snd'); let soundOn = !qs.has('mute');
// load it into memory so it can seek on any server (python's http.server has no byte ranges)
// (started a couple of seconds after the map loads, at low priority, so the first slide's tiles go first)
const loadSound = () => fetch(snd.getAttribute('src'), { priority: 'low' }).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { const t = snd.currentTime; snd.src = URL.createObjectURL(b); snd.addEventListener('loadedmetadata', () => { try { snd.currentTime = T || t; } catch (e) {} if (playing && soundOn) snd.play().catch(() => {}); }, { once: true }); }).catch(() => {});
function syncSound() { if (!soundOn || intro) { snd.pause(); return; } try { snd.currentTime = T; } catch (e) {} if (playing) snd.play().catch(() => {}); else snd.pause(); }
function setSound(v) { soundOn = v; $('#bSnd').innerHTML = ICON[v ? 'snd' : 'mute']; $('#bSnd').setAttribute('aria-label', v ? 'Mute narration' : 'Unmute narration'); $('#bSnd').classList.toggle('off', !v); syncSound(); }
function setPlay(v) {
  playing = v; if (v) held = false; syncSound();
  const k = v ? 'pause' : held ? 'replay' : 'play';
  $('#bPlay').innerHTML = ICON[k]; $('#bPlay').setAttribute('aria-label', k === 'replay' ? 'Replay this slide' : k === 'pause' ? 'Pause' : 'Play');
}
function go(i) {
  if (intro === 1) { endIntro(); return; }
  i = clamp(i, FIRST, N - 1); toggleMenu(false);
  if (i === cur) return;
  dir = i > cur ? 1 : -1;
  startBlend();
  T = ST.scenes[i].start + 0.001; setPlay(true);
}
// after the last slide, Next loops back to the opening title
function restart() { toggleMenu(false); dir = 1; startBlend(); T = 0.001; setPlay(true); if (!isRec()) startIntro(); }
const next = () => cur >= N - 1 ? restart() : go(cur + 1), back = () => go(cur - 1);
function seekLocal(t, play) { // within the current slide
  const sc = ST.scenes[cur]; if (!sc) return;
  if (Math.abs(T - (sc.start + t)) > 1.5) startBlend();
  T = sc.start + clamp(t, 0.001, sc.dur - 0.001); logShown = -1; held = false;
  setPlay(play || playing);
}
function seek(t) { T = clamp(t, 0, TOTAL - 0.001); cur = -1; first = true; syncSound(); } // hard cut (URL ?t= and test hook)
function togglePlay() { if (held) seekLocal(0, true); else setPlay(!playing); }
function setAuto(v) { auto = v; if (auto && held && cur < N - 1) next(); }
function toggleRec() { document.body.classList.toggle('rec'); setAuto(isRec()); placeData(); updatePadding(); }

$('#bPlay').onclick = togglePlay;
$('#bBack').onclick = back; $('#bNext').onclick = next;
$('#bMenu').onclick = () => toggleMenu();
$('#bSnd').onclick = () => setSound(!soundOn);
(() => { // per-slide scrubber along the top edge of the nav bar
  const s = $('#scrub'); let drag = false;
  const at = e => { const r = s.getBoundingClientRect(), sc = ST.scenes[cur]; if (sc) seekLocal(clamp((e.clientX - r.left) / r.width, 0, 1) * sc.dur); };
  s.addEventListener('pointerdown', e => { drag = true; s.setPointerCapture(e.pointerId); at(e); });
  s.addEventListener('pointermove', e => drag && at(e));
  s.addEventListener('pointerup', () => drag = false);
})();
addEventListener('pointerdown', () => { if (intro === 1) endIntro(); else if (playing && soundOn && snd.paused) syncSound(); }); // browsers only allow sound after a click
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (intro) { if (intro === 1 && !['r', 'R', 'f', 'F'].includes(e.key)) { e.preventDefault(); endIntro(); return; } if (intro === 2) return; }
  const onBtn = e.target.closest && e.target.closest('button,a');
  if (onBtn && (e.key === 'Enter' || e.key === ' ')) return; // focused controls activate normally
  switch (e.key) {
    case ' ': e.preventDefault(); held ? next() : togglePlay(); break;
    case 'ArrowRight': case 'PageDown': e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'PageUp': e.preventDefault(); back(); break;
    case 'Home': go(FIRST); break;
    case 'End': go(N - 1); break;
    case 'Escape': toggleMenu(false); break;
    case 'm': case 'M': setSound(!soundOn); break;
    case 'l': case 'L': toggleMenu(); break;
    case 'a': case 'A': setAuto(!auto); break;
    case 'c': case 'C': capOn = !capOn; break;
    case 'r': case 'R': toggleRec(); break;
    case 'f': case 'F': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); break;
  }
});
addEventListener('hashchange', () => { const i = ST.scenes.findIndex(s => s.id === location.hash.slice(1)); if (i >= FIRST) go(i); });
if (qs.has('rec')) { document.body.classList.add('rec'); setAuto(true); }
buildMenu(); setPlay(false);

map.on('load', () => {
  buildLayers(); placeData(); updatePadding();
  addEventListener('resize', () => { buildTimeline(); updatePadding(); });
  const hi = ST.scenes.findIndex(s => s.id === location.hash.slice(1));
  if (hi >= FIRST) seek(ST.scenes[hi].start + 0.001);
  if (qs.has('t')) seek(+qs.get('t'));
  if (qs.has('scene')) { const s = ST.scenes.find(s => s.id === qs.get('scene')); if (s) seek(s.start + 0.001); }
  const ld = $('#loading'); if (ld) ld.style.opacity = 0; setTimeout(() => $('#loading')?.remove(), 1000);
  if (!qs.has('paused')) setPlay(true);
  const deep = hi >= FIRST || qs.has('t') || qs.has('scene');
  if (!deep && !isRec()) startIntro(); else document.body.classList.remove('intro');
  setSound(soundOn);
  setTimeout(loadSound, 2500);
  requestAnimationFrame(loop);
});
// test hook: render a given time without playing
window.__film = { seek: t => { seek(t); }, go, get prefetch() { return { queued: PF.queue.length, active: PF.active, fetched: PF.fetched, buildMs: Math.round(PF.ms) }; }, get T() { return T; }, TOTAL, play: () => setPlay(true), get intro() { return intro; },
  step: (dt = 0.05) => { render(dt); map.redraw(); },
  tick: (dt = 1 / 30) => { T = clamp(T + dt, 0, TOTAL - 0.001); render(dt); }, // advance the clock by hand (continuity tests)
  get blending() { return !!blend; }, get scene() { return ST.scenes[cur] && ST.scenes[cur].id; },
  // render frames leading up to t (for headless checks while the tab is in the background)
  shot: async (t, n = 40) => { seek(t - 2); const l = $('#loading'); if (l) l.remove();
    for (let i = 0; i < n; i++) { T += 2 / n; render(2 / n); map.redraw(); await new Promise(r => setTimeout(r, 80)); } return T; } };
})();
