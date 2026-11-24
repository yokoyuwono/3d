"""Contact sheet of rendered stills: python3 tools/sheet.py <dir> <out.jpg> [cols]"""
import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob(sys.argv[1] + '/t*.jpg')); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
w, h = 330, 587
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows))
for i, f in enumerate(fs):
    im = Image.open(f).resize((w, h)); ImageDraw.Draw(im).text((8, 8), f.split('/')[-1], fill=(255, 0, 255))
    S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(sys.argv[2], quality=85)
