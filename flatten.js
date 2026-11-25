/* Terrain levelling under the plant model. The film's DEM (AWS Terrain Tiles) is a coarse surface model: around the
   plant the halls, cooling towers and spoil heaps show as lumps up to ~50 m, and the 3D buildings sat on them oddly.
   models/flatten.json (tools/build_flatten.py) holds a 40 m grid over the plant: w (1 under the model, easing to 0 over
   ~380 m) and t (a smooth terrace height: the DEM's low percentile, averaged). The DEM tiles go through the
   `flatdem://z/x/y` protocol below, which blends each pixel toward t by w, for every zoom, so the terrain and the
   hillshade agree and tiles meet without seams; plant3d.js sets the buildings on the same surface (PlantFlat.height).
   Tiles away from the plant pass straight through; levelled ones are cached. If the grid fails to load, nothing is
   levelled. */
(() => {
  const DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  let G = null;
  const b64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
  const ready = fetch('models/flatten.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => {
    G = { ...j, w: b64(j.w, Uint8Array), t: b64(j.t, Uint16Array) };
    G.east = G.west + (G.nx - 1) * G.dlng; G.south = G.north - (G.ny - 1) * G.dlat;
    return G;
  }).catch(e => { console.warn('terrain levelling off:', e); return null; });

  // bilinear w (0–1) and t (m) at a point; w = 0 outside the grid
  function sample(lng, lat) {
    if (!G) return { w: 0, t: 0 };
    const gx = (lng - G.west) / G.dlng, gy = (G.north - lat) / G.dlat;
    if (gx < 0 || gy < 0 || gx > G.nx - 1 || gy > G.ny - 1) return { w: 0, t: 0 };
    const x0 = Math.min(G.nx - 2, Math.floor(gx)), y0 = Math.min(G.ny - 2, Math.floor(gy)), fx = gx - x0, fy = gy - y0;
    const i = y0 * G.nx + x0, a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
    const W = G.w, T = G.t, n = G.nx;
    return { w: (W[i] * a + W[i + 1] * b + W[i + n] * c + W[i + n + 1] * d) / 255,
             t: (T[i] * a + T[i + 1] * b + T[i + n] * c + T[i + n + 1] * d) / 10 - 1000 };
  }
  const height = (lng, lat, dem) => { const s = sample(lng, lat); return dem + s.w * (s.t - dem); };

  async function get(url, tries = 3) { // a failed tile is retried rather than left as a hole in the terrain
    for (let k = 0; ; k++) {
      try { const r = await fetch(url, { credentials: 'omit' }); if (r.ok) return r.arrayBuffer(); if (r.status < 500 || k >= tries - 1) throw new Error(`HTTP ${r.status}`); }
      catch (e) { if (k >= tries - 1) throw e; }
      await new Promise(res => setTimeout(res, 300 * (k + 1)));
    }
  }
  const tileLng = (x, z) => x / 2 ** z * 360 - 180;
  const tileLat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
  async function level(buf, z, x, y) {
    const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const S = bmp.width, cv = new OffscreenCanvas(S, S), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0); bmp.close && bmp.close();
    const img = cx.getImageData(0, 0, S, S), p = img.data;
    const lngs = new Float64Array(S), lats = new Float64Array(S);
    for (let i = 0; i < S; i++) { lngs[i] = tileLng(x + (i + 0.5) / S, z); lats[i] = tileLat(y + (i + 0.5) / S, z); }
    let changed = 0;
    for (let j = 0; j < S; j++) {
      if (lats[j] > G.north + G.dlat || lats[j] < G.south - G.dlat) continue;
      for (let i = 0; i < S; i++) {
        const s = sample(lngs[i], lats[j]); if (s.w <= 0) continue;
        const o = (j * S + i) * 4, h = p[o] * 256 + p[o + 1] + p[o + 2] / 256 - 32768;
        const v = Math.max(0, Math.min(65535.99, h + s.w * (s.t - h) + 32768));
        p[o] = Math.floor(v / 256); p[o + 1] = Math.floor(v) % 256; p[o + 2] = Math.floor((v - Math.floor(v)) * 256); changed++;
      }
    }
    if (!changed) return buf;
    cx.putImageData(img, 0, 0);
    return (await cv.convertToBlob({ type: 'image/png' })).arrayBuffer();
  }
  const cache = new Map(); // 'z/x/y' → Promise<ArrayBuffer>; shared by the terrain and hillshade sources
  function tile(z, x, y) {
    const k = `${z}/${x}/${y}`; if (cache.has(k)) { const v = cache.get(k); cache.delete(k); cache.set(k, v); return v; }
    const pr = (async () => {
      const buf = await get(DEM_URL(z, x, y)); const g = await ready;
      if (!g) return buf;
      const w = tileLng(x, z), e = tileLng(x + 1, z), n = tileLat(y, z), s = tileLat(y + 1, z);
      if (e < g.west || w > g.east || s > g.north || n < g.south) return buf; // nowhere near the plant
      return level(buf, z, x, y);
    })();
    pr.catch(() => cache.delete(k));
    cache.set(k, pr); if (cache.size > 500) cache.delete(cache.keys().next().value);
    return pr;
  }
  if (window.maplibregl) maplibregl.addProtocol('flatdem', async params => {
    const [z, x, y] = params.url.replace('flatdem://', '').split('/').map(Number);
    const data = await tile(z, x, y); return { data: data.slice(0) }; // a copy: MapLibre transfers the buffer to a worker
  });

  window.PlantFlat = { ready, sample, height, tile, tileUrl: 'flatdem://{z}/{x}/{y}' };
})();
