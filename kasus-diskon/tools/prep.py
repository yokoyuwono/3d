"""Trim the narration lines and build timeline.json (picture, score, mix and subtitles all read it).
Run from the project folder: $LIB/.venv/bin/python tools/prep.py"""
import json, os
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(HERE, 'voice')
LINES = json.load(open(os.path.join(V, 'narration.json')))
# seconds of picture before each line (room for the action that line needs), and the hold after the last line
GAP = {'l01': 0.15, 'l02': 0.3, 'l03a': 1.0, 'l03': 0.35, 'l04': 0.25, 'l05': 0.3, 'l06': 1.0, 'l07': 0.3, 'l08': 1.1, 'l09': 0.25, 'l10': 0.3, 'l11': 1.6, 'l12': 2.05, 'l13': 1.1}
TAIL = 2.7
TEMPO = 1.06   # pitch-preserving speed-up of the read (brisker short-form pace)
os.makedirs(os.path.join(V, 'trim'), exist_ok=True)
t = 0.0; out = []
for l in LINES:
    x, sr = sf.read(os.path.join(V, 'lines', l['id'] + '.wav'), dtype='float32')
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same'); on = np.where(20 * np.log10(np.maximum(env, 1e-6)) > -42)[0]
    a = max(0, on[0] - int(.03 * sr)); b = min(len(x), on[-1] + int(.06 * sr)); y = x[a:b].copy()
    f = int(.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    po = os.path.join(V, 'trim', l['id'] + '.wav'); sf.write(po, y, sr)
    if TEMPO != 1:
        import subprocess; tmp = po + '.tmp.wav'
        subprocess.run([os.environ.get('FFMPEG', '/root/lemo-tools/bin/ffmpeg'), '-loglevel', 'error', '-y', '-i', po, '-af', f'atempo={TEMPO}', tmp], check=True); os.replace(tmp, po)
        y, sr = sf.read(po, dtype='float32')
    t += GAP[l['id']]; d = len(y) / sr
    out.append({'id': l['id'], 't0': round(t, 3), 't1': round(t + d, 3), 'text': l['text'], 'sub': l.get('sub', l['text'])}); t += d
# subtitle cues: the on-screen text (sub, with numerals) is timed sentence by sentence against the spoken text
import re
SPL = lambda x: [p for p in re.split(r'(?<=[.?!:])\s+', x) if p]
cues = []
for v in out:
    sp, su = SPL(v['text']), SPL(v['sub'])
    if len(sp) != len(su): sp, su = [v['text']], [v['sub']]
    tot = sum(len(x) for x in sp); tt = v['t0']; parts = []
    for a, b in zip(sp, su):
        d = (v['t1'] - v['t0']) * len(a) / tot
        if len(b) > 50 and ', ' in b:          # long sentence: split at its comma, timed by length
            i = b.index(', ') + 1; f = i / len(b); parts += [[tt, tt + d * f, b[:i]], [tt + d * f, tt + d, b[i + 1:]]]
        else: parts.append([tt, tt + d, b])
        tt += d
    grp = []
    for p_ in parts:                            # merge short neighbours into one card
        if grp and len(grp[-1][2]) + 1 + len(p_[2]) <= 40: grp[-1] = [grp[-1][0], p_[1], grp[-1][2] + ' ' + p_[2]]
        else: grp.append(list(p_))
    cues += [{'t0': round(a, 3), 't1': round(b, 3), 'text': c} for a, b, c in grp]
for k, c in enumerate(cues):
    nx = cues[k + 1]['t0'] - .02 if k + 1 < len(cues) else 1e9
    c['t1'] = round(min(max(c['t1'] + .35, c['t0'] + 1.2), nx), 3)
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1, ensure_ascii=False)
json.dump({'end': round(t + TAIL, 3), 'voice': out, 'cues': cues}, open(os.path.join(HERE, 'timeline.json'), 'w'), indent=1, ensure_ascii=False)
for v in out: print(f"{v['id']} {v['t0']:6.2f} → {v['t1']:6.2f}  {v['text']}")
for c in cues: print(f"   {c['t0']:6.2f}–{c['t1']:6.2f} {c['text']}")
print('END', round(t + TAIL, 2))
