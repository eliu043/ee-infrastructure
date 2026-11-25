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
