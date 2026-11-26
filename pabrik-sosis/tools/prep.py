"""Trim the narration lines and build timeline.json: the single source of truth for picture, score, mix and subtitles.
Run: $LIB/.venv/bin/python tools/prep.py   (from the project folder)
Lines that have no WAV yet get an estimated length and "missing": true (subtitle only, no voice)."""
import json, os, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(HERE, 'voice')
LINES = {l['id']: l for l in json.load(open(os.path.join(V, 'narration.json')))}
EST = {'a10_1': 7.0, 'a11_1': 3.2, 'a11_2': 5.6}          # seconds, for lines still to be generated

BPM = 112; BEAT = 60 / BPM; EIGHTH = BEAT / 2
# sections: id, lines, lead (s before the first line), tail (hold after the last line), gap between lines
SECTIONS = [
    ('plate', ['a01_1', 'a01_2'], 0.9, 0.6),
    ('farm', ['a02_1', 'a02_2'], 0.5, 0.3),
    ('truck', ['a02_3'], 0.3, 0.5),
    ('gate', ['a03_1', 'a03_2'], 0.3, 0.6),
    ('grind', ['a04_1'], 1.2, 0.5),          # longer lead: the camera drops to the first floor
    ('mix', ['a05_1'], 0.8, 0.6),
    ('fill', ['a06_1'], 0.8, 0.8),
    ('oven', ['a07_1'], 0.8, 0.6),
    ('cool', ['a08_1'], 0.8, 0.4),
    ('pack', ['a09_1', 'a09_2'], 0.8, 0.6),
    ('dist', ['a10_1'], 0.9, 0.6),
    ('home', ['a11_1'], 0.5, 0.4),
    ('end', ['a11_2'], 1.4, 3.2),          # the pull-out starts, then the legend holds
]
GAP = 0.32

os.makedirs(os.path.join(V, 'trim'), exist_ok=True)
lines = {}
for lid, ln in LINES.items():
    src = os.path.join(V, 'lines', lid + '.wav')
    if not os.path.exists(src):
        lines[lid] = {'dur': EST[lid], 'missing': True}; continue
    x, sr = sf.read(src, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same')
    on = np.where(20 * np.log10(np.maximum(env, 1e-6)) > -42)[0]
    a = max(0, on[0] - int(.03 * sr)); b = min(len(x), on[-1] + int(.06 * sr))
    y = x[a:b].copy(); f = int(.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    sf.write(os.path.join(V, 'trim', lid + '.wav'), y, sr)
    lines[lid] = {'dur': round(len(y) / sr, 3), 'missing': False}

def snap(t): return round(round(t / EIGHTH) * EIGHTH, 4)
t = 0.0; secs = []; voice = []
for sid, ids, lead, tail in SECTIONS:
    t0 = snap(t); tv = t0 + lead
    for i, lid in enumerate(ids):
        d = lines[lid]['dur']
        voice.append({'id': lid, 'sec': sid, 't0': round(tv, 3), 't1': round(tv + d, 3), 'dur': d,
                      'missing': lines[lid]['missing'], 'text': LINES[lid]['text']})
        tv += d + (GAP if i < len(ids) - 1 else 0)
    secs.append({'id': sid, 't0': t0, 'v0': round(t0 + lead, 3), 'v1': round(tv, 3)})
    t = tv + tail
END = snap(t)
for i, s in enumerate(secs): s['t1'] = secs[i + 1]['t0'] if i + 1 < len(secs) else END
out = {'bpm': BPM, 'beat': BEAT, 'end': END, 'sections': secs, 'voice': voice}
json.dump(out, open(os.path.join(HERE, 'timeline.json'), 'w'), indent=1, ensure_ascii=False)
print(f'END {END:.2f}s  sections {len(secs)}  missing {[v["id"] for v in voice if v["missing"]]}')
for s in secs: print(f"  {s['id']:6s} {s['t0']:7.2f} → {s['t1']:7.2f}")
