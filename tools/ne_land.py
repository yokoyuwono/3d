"""Convert Natural Earth land GeoJSON into a compact JSON list of rings [[lon,lat],...].
Usage: python3 -I tools/ne_land.py <in.geojson> <out.json>  (data: Natural Earth, public domain)"""
import json, sys
g = json.load(open(sys.argv[1]))
rings = []
for f in g['features']:
    geom = f['geometry']
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    for poly in polys:
        ring = poly[0]
        if len(ring) >= 4:
            rings.append([[round(x, 2), round(y, 2)] for x, y in ring])
json.dump(rings, open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(rings), 'rings,', sum(len(r) for r in rings), 'points')
