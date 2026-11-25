"""Build an equirectangular elevation raster of any region from AWS Terrain Tiles
(terrarium encoding, open data: Mapzen/Tilezen, derived from SRTM, GMTED, ETOPO1 etc.).
Usage: python3 -I tools/dem_region.py <tile_dir> <out.png> <zoom> <lon0> <lon1> <lat0(top)> <lat1(bottom)> <deg/px> [--fetch]
Output PNG: R*256+G = elevation + 32768 (metres)."""
import math, os, sys, subprocess
import numpy as np
from PIL import Image

tile_dir, out = sys.argv[1], sys.argv[2]
Z = int(sys.argv[3])
LON0, LON1, LAT0, LAT1, RES = map(float, sys.argv[4:9])

def tile_xy(lon, lat):
    n = 2 ** Z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y

x0, y0 = tile_xy(LON0, LAT0); x1, y1 = tile_xy(LON1, LAT1)
tiles = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
if '--fetch' in sys.argv:
    for x, y in tiles:
        p = os.path.join(tile_dir, f'{x}_{y}.png')
        if not os.path.exists(p):
            subprocess.run(['curl', '-s', '-m', '60', '-o', p, f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'], check=True)
cache = {}
def elev(lon, lat):
    x, y = tile_xy(lon, lat)
    tx, ty = int(x), int(y)
    if (tx, ty) not in cache:
        a = np.asarray(Image.open(os.path.join(tile_dir, f'{tx}_{ty}.png')).convert('RGB')).astype(np.float64)
        cache[(tx, ty)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    a = cache[(tx, ty)]
    return a[min(255, int((y - ty) * 256)), min(255, int((x - tx) * 256))]

W = int(round((LON1 - LON0) / RES)); H = int(round((LAT0 - LAT1) / RES))
E = np.zeros((H, W))
for j in range(H):
    lat = LAT0 - (j + 0.5) * RES
    for i in range(W):
        E[j, i] = elev(LON0 + (i + 0.5) * RES, lat)
v = np.clip(np.round(E) + 32768, 0, 65535).astype(np.uint32)
img = np.zeros((H, W, 3), np.uint8); img[..., 0] = v >> 8; img[..., 1] = v & 255
Image.fromarray(img, 'RGB').save(out, optimize=True)
np.save(out.replace('.png', '.npy'), E.astype(np.float32))
print('wrote', out, W, 'x', H, 'tiles', len(tiles))
