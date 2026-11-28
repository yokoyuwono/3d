"""Cut the full narration take at given times (snapped to the nearest pause) and transcribe each line to verify.
Usage: cut_at.py <full_take.wav> t1 t2 ... (n-1 cut times)"""
import sys, json, base64, urllib.request, os
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]; cuts = [float(a) for a in sys.argv[2:]]
L = json.load(open(os.path.join(HERE, 'voice', 'narration.json')))
x, sr = sf.read(src, dtype='float32')
env = np.convolve(np.abs(x), np.ones(480) / 480, 'same'); q = 20 * np.log10(np.maximum(env, 1e-6)) < -40
gaps = []; i = 0
while i < len(q):
    if q[i]:
        j = i
        while j < len(q) and q[j]: j += 1
        if (j - i) / sr >= .1: gaps.append((i + j) / 2 / sr)
        i = j
    else: i += 1
snap = [min(gaps, key=lambda g: abs(g - c)) for c in cuts]
edges = [0] + [int(s * sr) for s in snap] + [len(x)]
import time
only = set(os.environ.get('VERIFY', '').split(',')) - {''}
for k, l in enumerate(L):
    y = x[edges[k]:edges[k + 1]]; p = os.path.join(HERE, 'voice', 'lines', l['id'] + '.wav'); sf.write(p, y, sr, subtype='PCM_16')
    if only and l['id'] not in only: print(f"{l['id']} {len(y)/sr:5.2f}s | (cut)"); continue
    time.sleep(7)
    b = base64.b64encode(open(p, 'rb').read()).decode()
    body = {"contents": [{"parts": [{"inline_data": {"mime_type": "audio/wav", "data": b}}, {"text": "Transcribe this Indonesian audio verbatim. Output only the words."}]}]}
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=60))
    print(f"{l['id']} {len(y)/sr:5.2f}s | {r['candidates'][0]['content']['parts'][0]['text'].strip()}")
