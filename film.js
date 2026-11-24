/* POWERLINES film engine. Deterministic: everything is a function of the master clock T,
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
  const svg = $('#timeline svg'); TW = Math.max(600, $('#timeline').clientWidth); svg.setAttribute('viewBox', `0 0 ${TW} 118`); let h = '';
  for (let y = 2022; y <= 2026; y++) { const x = tx(dnum(`${y}-01-01`)); if (x > 150) h += `<line x1="${x}" x2="${x}" y1="8" y2="112" stroke="rgba(255,255,255,.12)"/>`; h += `<text x="${Math.max(x, 150) + 4}" y="14" fill="#9aa5a0" font-size="9">${y}</text>`; }
  const lane = (y, label, col) => h += `<text x="0" y="${y + 4}" fill="${col}" font-size="9">${label}</text><line x1="150" x2="${TW - 20}" y1="${y}" y2="${y}" stroke="${col}" stroke-opacity=".35" stroke-width="5"/>`;
  lane(32, '750 kV DNIPROVSKA', '#ff4d3a'); lane(52, '330 kV FEROSPLAVNA-1', '#ffb648');
  h += `<text x="0" y="76" fill="#ff2d55" font-size="9">COMPLETE LOSS</text><text x="0" y="98" fill="#9dfcc4" font-size="9">CEASEFIRE REPAIR</text>`;
  PW.line_outages.forEach(e => { const y = e.line.startsWith('Dnip') ? 32 : 52, a = tx(dnum(e.start)), b = tx(e.end ? dnum(e.end) : dnum('2026-11-24'));
    h += `<rect x="${a}" y="${y - 5}" width="${Math.max(2, b - a)}" height="10" fill="#0b0d0e" stroke="${y === 32 ? '#ff4d3a' : '#ffb648'}" stroke-width=".8"/>`; });
  PW.loops.forEach(e => { const x = tx(dnum(e.start)); h += `<line x1="${x}" x2="${x}" y1="64" y2="82" stroke="#ff2d55" stroke-width="1.6"/>`; });
  PW.ceasefires.forEach(e => { const x = tx(dnum(e.start)); h += `<path d="M${x - 4} 102 L${x} 92 L${x + 4} 102Z" fill="#9dfcc4"/>`; });
  PW.context.forEach(e => { const x = tx(dnum(e.date)); h += `<line x1="${x}" x2="${x}" y1="20" y2="112" stroke="#5cc8ff" stroke-dasharray="2 2"/><text x="${x + 4}" y="112" fill="#5cc8ff" font-size="8">${e.label.toUpperCase()}</text>`; });
  h += `<text x="0" y="112" fill="#5d6763" font-size="7.5">Gap = no line outage dated · ${PW.gaps[0].split('.')[0]}</text>`;
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
let stampCache = '';
function setStamp(v, sub = '') { const k = v + '|' + sub; if (k === stampCache) return; stampCache = k; $('#stamp .v').textContent = v; $('#stamp .sub').textContent = sub; }
let capOn = !qs.has('nocap'), presenter = false, plantAlarm = 0;

/* ---------- scene management ---------- */
let cur = -1, T = 0, playing = false, lastNow = null, tweenFast = false;
function sceneAt(t) { for (let i = ST.scenes.length - 1; i >= 0; i--) if (t >= ST.scenes[i].start) return i; return 0; }
function enter(i, snap) {
  const sc = ST.scenes[i]; cur = i; logShown = -1; stampCache = '';
  Object.keys(L).forEach(k => { L[k].tgt = (sc.layers && sc.layers[k]) || 0; if (snap) { L[k].cur = L[k].tgt; L[k].set(L[k].cur); } });
  lineState = { 'Dniprovska 750 kV': 1, 'Ferosplavna-1 330 kV': 1 };
  D.zones.features.forEach(f => map.setFeatureState({ source: 'zones', id: f.properties.id }, { f: 0 }));
  $('#loss').classList.remove('on');
  buildCallouts(sc);
  $('#chap .n').textContent = sc.chapter ? `CHAPTER ${sc.chapter}` : ''; $('#chap .t').textContent = sc.chapter ? sc.name : '';
  $('#chap').style.opacity = sc.chapter ? 1 : 0;
  $('#card .n').textContent = sc.chapter; $('#card .t').textContent = sc.name;
  $('#src').textContent = sc.sources || '';
  setStamp(sc.stamp || '', sc.stamp ? 'ZAPORIZHZHIA NPP · 47.51°N 34.59°E' : '');
  $('#cap').textContent = sc.vo || '';
  $('#counter').style.opacity = 0; $('#ucdpCount').style.opacity = 0;
}
function render(dt) {
  const i = sceneAt(T);
  if (i !== cur) enter(i, !(playing && i === cur + 1));
  const sc = ST.scenes[i], tl = T - sc.start;
  const c = cam(sc, tl);
  // vertical exaggeration eases with altitude: dramatic when wide, near-true in close-ups
  const ex = Math.round(lerp(ST.exaggeration, ST.exaggerationClose, clamp((c.z - 8.5) / 4.5, 0, 1)) * 10) / 10;
  if (map.terrain && map.terrain.exaggeration !== ex) { map.terrain.exaggeration = ex; }
  map.jumpTo({ center: c.c, zoom: c.z, pitch: c.p, bearing: c.b });

  // scene-specific forcing
  if (sc.imagerySwap) { const s = sc.imagerySwap, u = clamp((tl - s.t0) / (s.t1 - s.t0), 0, 1); force(s.from, 1 - u); force(s.to, u); }
  if (sc.dim) { const u = ease.io(clamp((tl - sc.dim.t0) / (sc.dim.t1 - sc.dim.t0), 0, 1)); force('lights', lerp(sc.dim.from, sc.dim.to, u)); }
  if (sc.id === 'repair') updateRepair(sc, tl);
  if (sc.id === 'dependency') { const n = Math.round(27 * ease.out(clamp((tl - 3) / 7, 0, 1))); $('#counter .v').textContent = n; $('#counter').style.opacity = clamp((tl - 2) / 1.5, 0, 1) * clamp((sc.dur - tl) / 1.5, 0, 1); }
  if (sc.id === 'frontier') {
    const n = sc.dm.at(tl);
    map.setFilter('ucdp', ['<=', ['get', 'n'], n]); map.setFilter('ucdp-glow', ['<=', ['get', 'n'], n]);
    map.setPaintProperty('ucdp-glow', 'circle-opacity', ['*', L.ucdp.cur * 0.7, ['max', 0.12, ['-', 1, ['/', ['-', n, ['get', 'n']], 60]]]]);
    let cnt = 0;
    stacks.forEach(s => { let k = 0; while (k < s.ns.length && s.ns[k] <= n) k++; cnt += k; if (k !== s.shown) { s.shown = k; map.setFeatureState({ source: 'stacks', id: s.id }, { k }); } });
    $('#ucdpCount .v').textContent = cnt; $('#ucdpCount').style.opacity = clamp((tl - 4) / 1.5, 0, 1) * clamp((sc.dur - tl) / 1.5, 0, 1);
    setStamp(fmtD(n), 'UCDP GED · FATAL EVENTS, PRECISE LOCATION');
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
  // cards
  const chapterCard = sc.chapter && tl > 0.6 && tl < 5.2;
  $('#card').classList.toggle('on', !!chapterCard);
  $('#chap').style.opacity = sc.chapter && !chapterCard ? 1 : 0;
  const tOn = (sc.titleCard && tl > 3 && tl < 21) || (sc.endCard && tl > (sc.capUntil || 13));
  $('#title .cr').textContent = sc.endCard ? 'Sources · IAEA updates via World Nuclear Association · UCDP GED · OpenStreetMap · Sentinel-2 cloudless (EOX) · Esri World Imagery · NASA Black Marble · AWS Terrain Tiles' : 'GSAPP · Advanced V Studio · Fall 2026';
  $('#dimmer').style.opacity = sc.endCard && tl > (sc.capUntil || 13) ? 0.45 : 0;
  $('#title').classList.toggle('on', !!tOn);
  $('#title .st').textContent = sc.endCard ? 'Slow violence · energy · water · territory' : 'The militarization of energy infrastructure · Zaporizhzhia NPP';
  document.body.classList.toggle('tl', L.timeline.cur > 0.5);
  $('#cap').classList.toggle('on', capOn && !!sc.vo && tl > 1.5 && tl < (sc.capUntil || sc.dur - 0.4) && !chapterCard);
  $('#stamp').style.opacity = $('#stamp .v').textContent ? 1 : 0;
  $('#readout').innerHTML = `${c.c[1].toFixed(4)}°N  ${c.c[0].toFixed(4)}°E<br>ALT Z${c.z.toFixed(1)} · TILT ${c.p.toFixed(0)}° · HDG ${(((c.b % 360) + 360) % 360).toFixed(0).padStart(3, '0')}°<br>TERRAIN ×${ex} VERTICAL`;
  // controls
  $('#clock').textContent = `${fmtT(T)} / ${fmtT(TOTAL)}`;
  $('#scrub .fill').style.width = (T / TOTAL * 100) + '%';
}
function force(name, v) { const o = L[name]; if (!o) return; o.tgt = v; o.cur = v; o.set(v); }

function loop(now) {
  const dt = lastNow == null ? 0 : Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  if (playing) {
    const prev = T; T += dt;
    if (presenter) { const sc = ST.scenes[sceneAt(prev)], end = sc.start + sc.dur; if (prev < end && T >= end && sceneAt(prev) < ST.scenes.length - 1) { T = end - 0.001; setPlay(false); } }
    if (T >= TOTAL) { T = TOTAL - 0.001; setPlay(false); }
  }
  render(dt);
  requestAnimationFrame(loop);
}

/* ---------- controls ---------- */
function setPlay(v) { playing = v; $('#bPlay').textContent = v ? '❚❚ PAUSE' : '▶ PLAY'; }
function seek(t) { T = clamp(t, 0, TOTAL - 0.001); cur = -1; }
function chapter(d) { const i = clamp(sceneAt(T) + d, 0, ST.scenes.length - 1); seek(ST.scenes[i].start + 0.001); }
function buildScrub() {
  const s = $('#scrub');
  ST.scenes.forEach(sc => { const t = document.createElement('div'); t.className = 'tick'; t.style.left = (sc.start / TOTAL * 100) + '%'; t.innerHTML = `<span>${sc.chapter || ''} ${sc.chapter ? sc.name.split(' ')[0] : ''}</span>`; s.appendChild(t); });
  const go = e => { const r = s.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * TOTAL); };
  let drag = false; s.addEventListener('mousedown', e => { drag = true; go(e); }); addEventListener('mousemove', e => drag && go(e)); addEventListener('mouseup', () => drag = false);
}
const toggleRec = () => document.body.classList.toggle('rec');
$('#bPlay').onclick = () => { if (T >= TOTAL - 0.01) seek(0); setPlay(!playing); };
$('#bCap').onclick = () => { capOn = !capOn; $('#bCap').classList.toggle('act', capOn); };
$('#bPres').onclick = () => { presenter = !presenter; $('#bPres').classList.toggle('act', presenter); };
$('#bRec').onclick = toggleRec;
$('#bHelp').onclick = () => $('#help').classList.toggle('on');
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); $('#bPlay').click(); }
  else if (e.key === 'ArrowRight') chapter(1); else if (e.key === 'ArrowLeft') chapter(T - ST.scenes[sceneAt(T)].start < 2 ? -1 : 0);
  else if (e.key === 'Home' || e.key === '0') seek(0);
  else if (e.key === 'c' || e.key === 'C') $('#bCap').click(); else if (e.key === 'p' || e.key === 'P') $('#bPres').click();
  else if (e.key === 'r' || e.key === 'R') toggleRec(); else if (e.key === '?') $('#bHelp').click();
  else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
});
let idleT; addEventListener('mousemove', () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => playing && document.body.classList.add('idle'), 2500); });
if (!capOn) $('#bCap').classList.remove('act');
if (qs.has('rec')) document.body.classList.add('rec');

map.on('load', () => {
  buildLayers(); buildTimeline(); buildScrub(); addEventListener('resize', buildTimeline);
  $('#attrib').innerHTML = Object.values(map.getStyle().sources).map(s => s.attribution).filter(Boolean).join(' · ');
  if (qs.has('t')) seek(+qs.get('t'));
  if (qs.has('scene')) { const s = ST.scenes.find(s => s.id === qs.get('scene')); if (s) seek(s.start + 0.001); }
  const ld = $('#loading'); if (ld) ld.style.opacity = 0; setTimeout(() => $('#loading')?.remove(), 1000);
  requestAnimationFrame(loop);
});
// test hook: render a given time without playing
window.__film = { seek: t => { seek(t); }, get T() { return T; }, TOTAL, play: () => setPlay(true),
  step: (dt = 0.05) => { render(dt); map.redraw(); },
  // render frames leading up to t (for headless checks while the tab is in the background)
  shot: async (t, n = 40) => { seek(t - 2); const l = $('#loading'); if (l) l.remove();
    for (let i = 0; i < n; i++) { T += 2 / n; render(2 / n); map.redraw(); await new Promise(r => setTimeout(r, 80)); } return T; } };
})();
