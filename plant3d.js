/* Plant model — the Zaporizhzhia NPP massing model (models/znpp.glb) drawn in the map with three.js.
   Geometry and colours: frame-geo-evidence-pipeline's plant.py (solid, as photographed), exported by
   tools/export_plant_glb.py. Footprints © OpenStreetMap contributors; heights representative; turbine halls inferred.
   The film registers it as the logical layer 'plantModel' (0–1); it also fades out by itself when the camera is wide. */
(() => {
  if (!window.THREE || !THREE.GLTFLoader) { console.warn('plant model: three.js not loaded'); return; }
  const Z_IN = [11.8, 12.6];   // zoom range over which the model fades in (it's real scale: a few pixels when wider)
  let map, renderer, scene, camera, root = null, meta = null, mats = [], opacity = 0, shown = -1;
  // Each building sits on the terrain as the film draws it: the DEM levelled by flatten.js (PlantFlat), times the current
  // exaggeration. Per vertex, _flat = levelled ground − levelled ground at the origin (m); the GLB stores y with the
  // original ground (_GROUND) baked in, so the shader adds uEx·_flat − _ground.
  const uEx = { value: 1 };
  let base0 = null;            // levelled ground at the origin (m)

  const layer = {
    id: 'plant-model', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      map = m;
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      // soft daylight to sit with the satellite imagery: sky fill plus a low sun from the south-east (the imagery's shadows fall north-west)
      scene.add(new THREE.HemisphereLight(0xe8eef5, 0x4a4234, 0.8));
      const sun = new THREE.DirectionalLight(0xfff1dc, 0.95);
      sun.position.set(0.55, 0.75, 0.6);   // model frame: +x east, +y up, +z south
      scene.add(sun);
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      renderer.outputEncoding = THREE.sRGBEncoding;   // the GLB's colours are linear
      Promise.all([
        fetch('models/znpp.json').then(r => r.json()),
        new Promise((res, rej) => new THREE.GLTFLoader().load('models/znpp.glb', res, undefined, rej)),
      ]).then(([j, gltf]) => {
        meta = j; root = gltf.scene;
        return (window.PlantFlat ? PlantFlat.ready : Promise.resolve(null)).then(() => [j, gltf]);
      }).then(([j, gltf]) => {
        const o0 = j.origin_lnglat, b0 = j.base_elevation_m, H = (lng, lat, dem) => window.PlantFlat ? PlantFlat.height(lng, lat, dem) : dem;
        base0 = H(o0[0], o0[1], b0);
        const mc0 = maplibregl.MercatorCoordinate.fromLngLat(o0), s0 = mc0.meterInMercatorCoordinateUnits();
        root.traverse(o => { if (o.isMesh) {
          const pos = o.geometry.attributes.position, gr = o.geometry.attributes._ground, fl = new Float32Array(pos.count);
          for (let v = 0; v < pos.count; v++) {
            const ll = new maplibregl.MercatorCoordinate(mc0.x + pos.getX(v) * s0, mc0.y + pos.getZ(v) * s0, 0).toLngLat();
            fl[v] = H(ll.lng, ll.lat, b0 + gr.getX(v)) - base0;
          }
          o.geometry.setAttribute('_flat', new THREE.BufferAttribute(fl, 1));
          const mt = o.material; mt.roughness = 1; mt.metalness = 0; mt.envMapIntensity = 0;
          mt.onBeforeCompile = sh => {   // keep every building on the exaggerated terrain, not just the origin
            sh.uniforms.uEx = uEx;
            sh.vertexShader = 'attribute float _ground;\nattribute float _flat;\nuniform float uEx;\n' +
              sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y += uEx * _flat - _ground;');
          };
          mats.push(mt);
        } });
        scene.add(root); shown = -1; map.triggerRepaint();
        dispatchEvent(new Event('plantmodel'));   // the film refreshes its legend
      }).catch(e => console.warn('plant model: failed to load', e));
    },
    render(gl, matrix) {
      if (!root || !meta) return;
      const z = map.getZoom(), k = opacity * Math.min(1, Math.max(0, (z - Z_IN[0]) / (Z_IN[1] - Z_IN[0])));
      if (k < 0.01) return;
      if (Math.abs(k - shown) > 0.004) { // fade: transparent only while fading, solid (correct self-occlusion) at full strength
        shown = k; const t = k < 0.995;
        mats.forEach(mt => { if (mt.transparent !== t) { mt.transparent = t; mt.needsUpdate = true; } mt.opacity = k; mt.depthWrite = true; });
      }
      // sit on the terrain as the film draws it (elevation × the current exaggeration); fall back to the export's DEM height
      const o = meta.origin_lnglat, ex = map.terrain ? map.terrain.exaggeration : 0;
      // queryTerrainElevation is relative to the camera centre's ground (the frame custom layers are drawn in);
      // if the DEM tile under the plant isn't loaded yet it reads as sea level, so use the export's height instead
      const centre = (map.transform && map.transform.elevation) || 0;
      uEx.value = ex;
      let alt = map.terrain ? map.queryTerrainElevation(o) : 0;
      if (alt == null || !isFinite(alt) || (map.terrain && Math.abs(alt + centre) < 0.01)) alt = base0 * ex - centre;
      const mc = maplibregl.MercatorCoordinate.fromLngLat(o, alt), s = mc.meterInMercatorCoordinateUnits();
      const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));   // glTF y-up → map z-up
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  window.PlantModel = {
    layer,
    setOpacity(v) { opacity = v; if (map) map.triggerRepaint(); },
    get loaded() { return !!root; },
    get root() { return root; },   // inspection (tests)
  };
})();
