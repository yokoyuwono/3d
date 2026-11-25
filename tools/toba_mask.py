"""Mark Lake Toba and Samosir in the Toba DEM's blue channel (in place).
B = 255: Samosir island; 1..254: lake, value grows with distance from shore (for fake bathymetry); 0: land.
Usage: python3 -I tools/toba_mask.py episodes/s2e1/assets/dem.png"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

p = sys.argv[1]
a = np.asarray(Image.open(p).convert('RGB')).astype(np.int32)
E = a[..., 0] * 256 + a[..., 1] - 32768
flat = (E >= 899) & (E <= 907)                      # the lake surface is ~903 m and perfectly flat
lab, n = nd.label(flat)
lake = lab == (1 + int(np.argmax(nd.sum(flat, lab, range(1, n + 1)))))
gap = np.zeros_like(lake)                           # the narrow channel at Pangururan joins Samosir to the shore
for y in range(108, 152):
    for x in np.argsort(E[y, 90:115])[:4] + 90:
        gap[y, x] = True
gap = nd.binary_dilation(gap, iterations=1)
lab2, _ = nd.label((E > 906) & ~gap & ~lake)
sam = lab2 == lab2[125, 140]
lake = nd.binary_closing((lake | gap) & ~sam, iterations=1) & ~sam
d = nd.distance_transform_edt(lake)
B = np.zeros(E.shape, np.uint8)
B[sam] = 255
B[lake] = np.clip(1 + d[lake] * 8, 1, 254).astype(np.uint8)
img = a.astype(np.uint8).copy()
img[..., 2] = B
Image.fromarray(img, 'RGB').save(p, optimize=True)
print('lake px', int(lake.sum()), 'samosir px', int(sam.sum()))
