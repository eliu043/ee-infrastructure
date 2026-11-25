# Plant model

`znpp.glb` is the Zaporizhzhia NPP massing model: the six units (red-brown containments and domes), their white vent stacks with a red band at the top, the red-and-white special chimneys, the two rust-brown cooling towers, the site's buildings, the 750 kV switchyard and the thermal plant with its 320 m chimneys. Enerhodar's housing is left out.

- **Source:** frame-geo-evidence-pipeline, `src/image_evidence/satellite/scene3d/plant.py` (`plant.build`). This is the solid, as-photographed version, not the ghosted shot with the IAEA's red marks.
- **Data:** footprints and places © OpenStreetMap contributors (ODbL), from the pipeline's saved reply. Heights come from OSM tags or published figures, otherwise from storeys or a representative height. The turbine halls are not in OSM; they were placed from imagery and photographs. Massing, not a survey.
- **Frame:** glTF Y-up (+x east, +y up, +z south), in metres about the origin in `znpp.json`. `_GROUND` is each vertex's terrain height relative to the origin; the film lifts vertices by (exaggeration − 1) × `_GROUND` so buildings stay on the exaggerated terrain.
- **Drawn by:** `plant3d.js` (three.js r147 custom layer). In the film it is the layer `plantModel`, and it fades out on its own below zoom ~12.

Regenerate:

```
PIPE=/path/to/frame-geo-evidence-pipeline
$PIPE/.venv/bin/python tools/export_plant_glb.py --pipeline $PIPE
```

## Levelled ground (`flatten.json`)

The terrain under the model is levelled so the buildings don't sit on the DEM's lumps (it's a surface model: halls, towers and spoil heaps show as bumps of up to ~50 m). `flatten.json` is a 40 m grid over the plant: `w` (1 within 90 m of the model's footprint, easing to 0 over 380 m) and `t`, a smooth terrace height (the DEM's 25th percentile within 320 m, averaged over 320 m), so the site keeps its real levels (the units' platform, the lower thermal plant) without the bumps. `flatten.js` applies it to every terrain tile through the `flatdem://` protocol (terrain and hillshade alike), and `plant3d.js` sets each vertex on the same surface. Rebuild after re-exporting the model:

```
$PIPE/.venv/bin/python tools/build_flatten.py
```
