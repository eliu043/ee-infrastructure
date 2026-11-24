/* Hand-digitized layers — fill these in, they appear automatically in scene 07 (Frontier).
   Draw in QGIS or geojson.io (WGS84 lon/lat), export GeoJSON, paste the FeatureCollection here.
   Keep a "source" property on each feature (imagery name + date) so the film can credit it.
   trenches: LineString / MultiLineString      artillery: Point (optional "label" property) */
window.PL_EXTRA = {
  trenches: { type: 'FeatureCollection', features: [] },
  artillery: { type: 'FeatureCollection', features: [] },
};
