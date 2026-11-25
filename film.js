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

/* ---------- map ---------- */
const s2 = y => ({ type: 'raster', tileSize: 256, maxzoom: 15, attribution: `Sentinel-2 cloudless ${y} by <a href="https://s2maps.eu">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data ${y})`,
  tiles: [`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${y}_3857/default/g/{z}/{y}/{x}.jpg`] });
const dem = () => ({ type: 'raster-dem', encoding: 'terrarium', tileSize: 256, maxzoom: 14,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], attribution: 'Terrain: Mapzen / AWS Terrain Tiles' });
const grade = { 'raster-saturation': -0.35, 'raster-contrast': 0.12, 'raster-brightness-max': 0.9, 'raster-opacity': 0, 'raster-fade-duration': 0 };

const map = new maplibregl.Map({
  container: 'map', interactive: false, attributionControl: false, maxPitch: 85, fadeDuration: 0,
  center: ST.scenes[0].cam[0].c, zoom: ST.scenes[0].cam[0].z, pitch: ST.scenes[0].cam[0].p, bearing: ST.scenes[0].cam[0].b,
  style: {
    version: 8,
    sources: {
      s2021: s2(2021), s2024: s2(2024),
      esri: { type: 'raster', tileSize: 256, maxzoom: 18, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' },
      lights: { type: 'raster', tileSize: 256, maxzoom: 8, tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'], attribution: 'NASA Black Marble 2016 / GIBS' },
      dem: dem(), demhs: dem(),
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#07090a' } },
      { id: 's2021', type: 'raster', source: 's2021', paint: { ...grade } },
      { id: 's2024', type: 'raster', source: 's2024', paint: { ...grade } },
      { id: 'esri', type: 'raster', source: 'esri', paint: { ...grade, 'raster-saturation': -0.3, 'raster-brightness-max': 0.9 } },
      { id: 'hillshade', type: 'hillshade', source: 'demhs', paint: { 'hillshade-exaggeration': 0, 'hillshade-shadow-color': '#000', 'hillshade-highlight-color': '#fff', 'hillshade-accent-color': '#000', 'hillshade-illumination-direction': 315 } },
      { id: 'lights', type: 'raster', source: 'lights', paint: { 'raster-opacity': 0, 'raster-fade-duration': 0, 'raster-contrast': 0.2 } },
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

  reg('s2021', pp('s2021', 'raster-opacity')); reg('s2024', pp('s2024', 'raster-opacity')); reg('esri', pp('esri', 'raster-opacity'));
  reg('lights', pp('lights', 'raster-opacity')); reg('hillshade', pp('hillshade', 'hillshade-exaggeration'));
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
  reg('ucdp', pp('ucdp', 'circle-opacity', 0.9), pp('ucdp', 'circle-stroke-opacity', 0.9), pp('stacks', 'fill-extrusion-opacity', 0.85));
  reg('plant', pp('plant-ring', 'circle-stroke-opacity'), pp('plant-dot', 'circle-opacity'));
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
    return { c: [unX(x), unY(y)], z, p: lerp(a.p, b.p, u), b: lerp(a.b, b.b, u) };
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
    markers.push({ c, el, stem: el.querySelector('.stem'), on: false, mk });
  });
}
function updateCallouts(tl) {
  markers.forEach(m => { const on = tl >= m.c.t && tl < m.c.t + m.c.d; if (on !== m.on) { m.on = on; m.el.classList.toggle('on', on); m.stem.style.height = on ? m.stem.dataset.h + 'px' : '0px'; } });
}

/* ---------- timeline (scene 05) ---------- */
const PW = D.power;
const T0 = dnum('2022-03-01'), T1 = dnum('2026-11-30');
let TW = 1000; const tx = n => 150 + (n - T0) / (T1 - T0) * (TW - 170);
const events = [];
PW.context.forEach(e => events.push({ d: dnum(e.date), cls: 'ctx', t: e.label, s: '', zones: [] }));
PW.loops.forEach(e => events.push({ d: dnum(e.start), cls: 'loss', t: `Complete loss of off-site power${e.n ? ' #' + e.n : ''}`, s: e.note, zones: e.zones || [], loss: e }));
PW.line_outages.forEach(e => events.push({ d: dnum(e.start), cls: 'line', t: `${e.line} disconnected`, s: e.note.split(/[(.]/)[0], zones: e.zones || [] }));
PW.ceasefires.forEach(e => events.push({ d: dnum(e.start), cls: 'repair', t: `Ceasefire repair #${e.n}`, s: e.repaired, zones: e.zones || [] }));
PW.grid_damage.forEach(e => events.push({ d: dnum(e.date), cls: 'strike', t: e.label, s: e.line, zones: e.zones || [] }));
events.sort((a, b) => a.d - b.d);
function buildTimeline() {
  const svg = $('#timeline svg'); TW = Math.max(600, $('#timeline svg').clientWidth); svg.setAttribute('viewBox', `0 0 ${TW} 132`); let h = '';
  for (let y = 2022; y <= 2026; y++) { const x = tx(dnum(`${y}-01-01`)); if (x > 150) h += `<line x1="${x}" x2="${x}" y1="8" y2="112" stroke="rgba(255,255,255,.12)"/>`; h += `<text x="${Math.max(x, 150) + 4}" y="14" fill="#9aa5a0" font-size="9">${y}</text>`; }
  const lane = (y, label, col) => h += `<text x="0" y="${y + 4}" fill="${col}" font-size="9">${label}</text><line x1="150" x2="${TW - 20}" y1="${y}" y2="${y}" stroke="${col}" stroke-opacity=".35" stroke-width="5"/>`;
  lane(32, '750 kV DNIPROVSKA', '#ff4d3a'); lane(52, '330 kV FEROSPLAVNA-1', '#ffb648');
  h += `<text x="0" y="76" fill="#ff2d55" font-size="9">COMPLETE LOSS</text><text x="0" y="98" fill="#9dfcc4" font-size="9">CEASEFIRE REPAIR</text>`;
  PW.line_outages.forEach(e => { const y = e.line.startsWith('Dnip') ? 32 : 52, a = tx(dnum(e.start)), b = tx(e.end ? dnum(e.end) : dnum('2026-11-24'));
    h += `<rect x="${a}" y="${y - 5}" width="${Math.max(2, b - a)}" height="10" fill="#0b0d0e" stroke="${y === 32 ? '#ff4d3a' : '#ffb648'}" stroke-width=".8"/>`; });
  PW.loops.forEach(e => { const x = tx(dnum(e.start)); h += `<line x1="${x}" x2="${x}" y1="64" y2="82" stroke="#ff2d55" stroke-width="1.6"/>`; });
  PW.ceasefires.forEach(e => { const x = tx(dnum(e.start)); h += `<path d="M${x - 4} 102 L${x} 92 L${x + 4} 102Z" fill="#9dfcc4"/>`; });
  PW.context.forEach(e => { const x = tx(dnum(e.date)); h += `<line x1="${x}" x2="${x}" y1="20" y2="112" stroke="#5cc8ff" stroke-dasharray="2 2"/><text x="${x + 4}" y="112" fill="#5cc8ff" font-size="8">${e.label.toUpperCase()}</text>`; });
  h += `<text x="0" y="128" fill="#5d6763" font-size="8">Gap = no line outage dated · ${PW.gaps[0].split('.')[0]}</text>`;
  h += `<g id="ph"><line x1="0" x2="0" y1="6" y2="112" stroke="#fff" stroke-width="1.2"/><circle cx="0" cy="6" r="3" fill="#fff"/></g>`;
  svg.innerHTML = h;
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
const dashSeq = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],[0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];
let dashStep = -1;

/* ---------- HUD ---------- */
const N = ST.scenes.length;
const FIRST = ST.scenes[0].titleCard ? 1 : 0; // the title scene is the opening, not a slide
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
];
function buildLegend(sc) {
  $('#legend').innerHTML = LEGEND.filter(([k, , , ok]) => (sc.layers[k] || 0) >= 0.3 && (!ok || ok()))
    .map(([, s, l]) => `<div class="row"><span class="sw">${s}</span>${esc(l)}</div>`).join('');
}

/* ---------- story panel ---------- */
function slideHTML(sc, dir) {
  const cls = `slide${dir < 0 ? ' back' : ''}`;
  if (sc.titleCard) return `<div class="${cls}"><div class="hd"><h2>${esc(ST.title)}</h2></div></div>`;
  if (sc.endCard) return `<div class="${cls}"><div class="hd"><h2>${esc(ST.title)}</h2></div>
    <p class="lede">${esc(sc.vo)}</p><p class="src">${esc(CREDITS)}</p></div>`;
  return `<div class="${cls}"><div class="hd"><span class="num">${esc(sc.chapter)}</span><h2>${esc(sc.name)}</h2></div>
    <div id="dateline" class="dateline none"></div>
    <p class="lede">${esc(sc.vo)}</p>${sc.sources ? `<p class="src">${esc(sc.sources)}</p>` : ''}</div>`;
}
function renderPanel(sc, dir) {
  const pb = $('#pbody'); pb.innerHTML = slideHTML(sc, dir); pb.scrollTop = 0;
  $('#pg').textContent = `${Math.max(1, cur - FIRST + 1)} / ${N - FIRST}`;
  $('#bBack').disabled = cur <= FIRST;
  $('#menu').querySelectorAll('a').forEach(a => { const on = +a.dataset.i === cur; a.classList.toggle('cur', on); on ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'); });
}
function buildMenu() {
  $('#menu').innerHTML = ST.scenes.slice(FIRST).map((sc, k) =>
    `<a href="#${sc.id}" data-i="${k + FIRST}"><span class="n">${sc.chapter || '—'}</span>${esc(sc.endCard ? 'Closing' : sc.name)}</a>`).join('');
  $('#menu').querySelectorAll('a').forEach(a => a.onclick = e => { e.preventDefault(); go(+a.dataset.i); });
}
function toggleMenu(v) {
  const on = v ?? !$('#panel').classList.contains('menu');
  $('#panel').classList.toggle('menu', on); $('#bMenu').classList.toggle('on', on); $('#bMenu').setAttribute('aria-expanded', on);
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
    blend.dur = 1300 + 450 * blend.arc + 70 * Math.abs(c.z - a.z) + 4 * Math.abs(((c.b - a.b) % 360 + 540) % 360 - 180);
  }
  const u = clamp((performance.now() - blend.t0) / blend.dur, 0, 1);
  if (u >= 1) { blend = null; return c; }
  return mixPose(blend.from, c, ease.io(u), blend.arc);
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
  setTimeout(() => { intro = 0; document.body.classList.remove('intro'); go(FIRST); }, 1100);
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
  $('#card .n').textContent = sc.chapter; $('#card .t').textContent = sc.name;
  setStamp(sc.stamp || '');
  $('#cap').textContent = sc.vo || '';
  $('#counter').style.opacity = 0; $('#ucdpCount').style.opacity = 0;
  $('#counter').style.display = sc.id === 'dependency' ? '' : 'none';
  $('#ucdpCount').style.display = sc.id === 'frontier' ? '' : 'none';
  $('#log').style.display = sc.layers.log ? '' : 'none';
  if (location.hash.slice(1) !== sc.id) history.replaceState(null, '', location.pathname + location.search + '#' + sc.id);
}
function render(dt) {
  const i = sceneAt(T);
  if (i !== cur) { enter(i, first); first = false; }
  const sc = ST.scenes[i], tl = T - sc.start;
  const c = blended(cam(sc, tl));
  // vertical exaggeration eases with altitude: dramatic when wide, near-true in close-ups
  const ex = Math.round(lerp(ST.exaggeration, ST.exaggerationClose, clamp((c.z - 8.5) / 4.5, 0, 1)) * 10) / 10;
  if (map.terrain && map.terrain.exaggeration !== ex) { map.terrain.exaggeration = ex; }
  map.jumpTo({ center: c.c, zoom: c.z, pitch: c.p, bearing: c.b });

  // scene-specific forcing
  if (sc.imagerySwap) { const s = sc.imagerySwap, u = clamp((tl - s.t0) / (s.t1 - s.t0), 0, 1); force(s.from, 1 - u); force(s.to, u); }
  if (sc.dim) { const u = ease.io(clamp((tl - sc.dim.t0) / (sc.dim.t1 - sc.dim.t0), 0, 1)); force('lights', lerp(sc.dim.from, sc.dim.to, u)); }
  if (sc.id === 'repair') updateRepair(sc, tl);
  if (sc.id === 'dependency') { const n = Math.round(27 * ease.out(clamp((tl - 3) / 7, 0, 1))); $('#counter .v').textContent = n; $('#counter').style.opacity = clamp((tl - 2) / 1.5, 0, 1); }
  if (sc.id === 'frontier') {
    const n = sc.dm.at(tl);
    map.setFilter('ucdp', ['<=', ['get', 'n'], n]); map.setFilter('ucdp-glow', ['<=', ['get', 'n'], n]);
    map.setPaintProperty('ucdp-glow', 'circle-opacity', ['*', L.ucdp.cur * 0.7, ['max', 0.12, ['-', 1, ['/', ['-', n, ['get', 'n']], 60]]]]);
    let cnt = 0;
    stacks.forEach(s => { let k = 0; while (k < s.ns.length && s.ns[k] <= n) k++; cnt += k; if (k !== s.shown) { s.shown = k; map.setFeatureState({ source: 'stacks', id: s.id }, { k }); } });
    $('#ucdpCount .v').textContent = cnt; $('#ucdpCount').style.opacity = clamp((tl - 4) / 1.5, 0, 1);
    setStamp(fmtD(n));
  } else if (L.ucdp.cur < 0.01) { map.setPaintProperty('ucdp-glow', 'circle-opacity', 0); }

  // tween logical layers
  const k = 1 - Math.exp(-dt * 2.2);
  Object.values(L).forEach(o => { if (Math.abs(o.tgt - o.cur) > 0.003) { o.cur += (o.tgt - o.cur) * k; o.set(o.cur); } else if (o.cur !== o.tgt) { o.cur = o.tgt; o.set(o.cur); } });
  znppPaint();

  // animated details
  if (L.particles.cur > 0.01) updateParticles(dt, sc.flow || 1, c.z);
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
  const tOn = (sc.titleCard && tl > 3 && tl < 21) || (sc.endCard && tl > (sc.capUntil || 13));
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
// scene-driven values (imagery crossfade, dimming) snap during playback but ease in while the camera blends
function force(name, v) { const o = L[name]; if (!o) return; o.tgt = v; if (!blend) { o.cur = v; o.set(v); } }

function loop(now) {
  const dt = lastNow == null ? 0 : Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  if (playing) {
    const prev = T; T += dt;
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
};
function setPlay(v) {
  playing = v; if (v) held = false;
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
function seek(t) { T = clamp(t, 0, TOTAL - 0.001); cur = -1; first = true; } // hard cut (URL ?t= and test hook)
function togglePlay() { if (held) seekLocal(0, true); else setPlay(!playing); }
function setAuto(v) { auto = v; if (auto && held && cur < N - 1) next(); }
function toggleRec() { document.body.classList.toggle('rec'); setAuto(isRec()); updatePadding(); }

$('#bPlay').onclick = togglePlay;
$('#bBack').onclick = back; $('#bNext').onclick = next;
$('#bMenu').onclick = () => toggleMenu();
(() => { // per-slide scrubber along the top edge of the nav bar
  const s = $('#scrub'); let drag = false;
  const at = e => { const r = s.getBoundingClientRect(), sc = ST.scenes[cur]; if (sc) seekLocal(clamp((e.clientX - r.left) / r.width, 0, 1) * sc.dur); };
  s.addEventListener('pointerdown', e => { drag = true; s.setPointerCapture(e.pointerId); at(e); });
  s.addEventListener('pointermove', e => drag && at(e));
  s.addEventListener('pointerup', () => drag = false);
})();
addEventListener('pointerdown', () => { if (intro === 1) endIntro(); });
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
    case 'm': case 'M': toggleMenu(); break;
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
  buildLayers(); buildTimeline(); updatePadding();
  addEventListener('resize', () => { buildTimeline(); updatePadding(); });
  $('#attrib').innerHTML = 'Imagery <a href="https://s2maps.eu">Sentinel-2 cloudless, EOX</a> (modified Copernicus data 2021, 2024) · Esri, Maxar, Earthstar Geographics · NASA Black Marble / GIBS · Terrain: Mapzen / AWS · Lines: © OpenStreetMap';
  const hi = ST.scenes.findIndex(s => s.id === location.hash.slice(1));
  if (hi >= FIRST) seek(ST.scenes[hi].start + 0.001);
  if (qs.has('t')) seek(+qs.get('t'));
  if (qs.has('scene')) { const s = ST.scenes.find(s => s.id === qs.get('scene')); if (s) seek(s.start + 0.001); }
  const ld = $('#loading'); if (ld) ld.style.opacity = 0; setTimeout(() => $('#loading')?.remove(), 1000);
  if (!qs.has('paused')) setPlay(true);
  if (sceneAt(T) < FIRST && !isRec()) startIntro(); else document.body.classList.remove('intro');
  requestAnimationFrame(loop);
});
// test hook: render a given time without playing
window.__film = { seek: t => { seek(t); }, go, get T() { return T; }, TOTAL, play: () => setPlay(true), get intro() { return intro; },
  step: (dt = 0.05) => { render(dt); map.redraw(); },
  // render frames leading up to t (for headless checks while the tab is in the background)
  shot: async (t, n = 40) => { seek(t - 2); const l = $('#loading'); if (l) l.remove();
    for (let i = 0; i < n; i++) { T += 2 / n; render(2 / n); map.redraw(); await new Promise(r => setTimeout(r, 80)); } return T; } };
})();
