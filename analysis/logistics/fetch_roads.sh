#!/bin/zsh
# Fetch OSM major roads for the ZNPP logistics analysis, retrying across Overpass mirrors.
cd "${0:A:h}/raw"
Q='[out:json][timeout:240];(way["highway"~"^(motorway|trunk|primary|secondary)(_link)?$"](45.95,33.3,48.55,36.2);way["highway"="tertiary"](47.3,34.2,47.75,34.95););out tags geom qt;'
for i in 1 2 3 4 5 6; do
  for ep in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; do
    curl -s -m 280 -A "osm-research-client/1.0" -H "Accept: application/json" "$ep" --data-urlencode "data=$Q" -o roads.tmp
    if python3 -c "import json,sys;d=json.load(open('roads.tmp'));sys.exit(0 if len(d['elements'])>100 else 1)" 2>/dev/null; then mv roads.tmp roads.json; echo "ok $ep"; exit 0; fi
    echo "fail $ep: $(head -c 80 roads.tmp)"; sleep 20
  done
done
exit 1
