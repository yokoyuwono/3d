"""Trim the narration lines and build timeline.json (picture, score, mix and subtitles all read it).
Run from the project folder: $LIB/.venv/bin/python tools/prep.py"""
import json, os
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(HERE, 'voice')
LINES = json.load(open(os.path.join(V, 'narration.json')))
# seconds of picture before each line (room for the action that line needs), and the hold after the last line
GAP = {'l01': 1.0, 'l02': 0.45, 'l03': 0.35, 'l04': 1.0, 'l05': 0.5, 'l06': 0.55, 'l07': 0.45, 'l08': 1.6, 'l09': 0.45, 'l10': 1.0}
TAIL = 2.6
os.makedirs(os.path.join(V, 'trim'), exist_ok=True)
t = 0.0; out = []
for l in LINES:
    x, sr = sf.read(os.path.join(V, 'lines', l['id'] + '.wav'), dtype='float32')
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same'); on = np.where(20 * np.log10(np.maximum(env, 1e-6)) > -42)[0]
    a = max(0, on[0] - int(.03 * sr)); b = min(len(x), on[-1] + int(.06 * sr)); y = x[a:b].copy()
    f = int(.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    sf.write(os.path.join(V, 'trim', l['id'] + '.wav'), y, sr)
    t += GAP[l['id']]; d = len(y) / sr
    out.append({'id': l['id'], 't0': round(t, 3), 't1': round(t + d, 3), 'text': l['text']}); t += d
json.dump({'end': round(t + TAIL, 3), 'voice': out}, open(os.path.join(HERE, 'timeline.json'), 'w'), indent=1, ensure_ascii=False)
for v in out: print(f"{v['id']} {v['t0']:6.2f} → {v['t1']:6.2f}  {v['text']}")
print('END', round(t + TAIL, 2))
