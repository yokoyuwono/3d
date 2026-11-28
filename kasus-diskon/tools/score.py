"""Score for "Kasus: Diskon yang Menipu Mata": synth pop-print toolkit (synth kick/snare/clap/hat, square-ish 8th bass,
triangle pad, marimba-like pluck = fundamental + ~4x partial, pizzicato sneak, music-box bell tag). A minor, 100 BPM.
Silence before the verdict stamp. Reads timeline.json + events.json → out/score.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, t_, env_exp, noise, bp, lp, hp
TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
CUE = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; END = TL['end']; N = int((END + 3) * SR)
VO = {v['id']: v for v in TL['voice']}
B = 60 / 100; E8 = B / 2; BAR = 4 * B; mix = np.zeros((N, 2), np.float32); rng = np.random.default_rng(9)
def put(x, t, g=1., pan=0.):
    if 0 <= t < END + 2.5: add(mix, np.asarray(x, np.float32), t, g, pan)
def hz(n):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    return 440 * 2 ** ((names[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)
def kick(v=1.):
    d = .35; tt = t_(d); f = 48 + 110 * np.exp(-tt / .035); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * env_exp(d, .11) + bp(noise(d), 1500, 5000) * env_exp(d, .004) * .25) * v
def snare(v=1.):
    d = .25; return (bp(noise(d), 900, 7000) * env_exp(d, .06) * .7 + np.sin(2 * np.pi * 190 * t_(d)) * env_exp(d, .05) * .5) * v
def clap(v=1.):
    d = .22; x = np.zeros(int(d * SR))
    for k, o in enumerate([0, .011, .022]): n = bp(noise(d - o), 900, 3200) * env_exp(d - o, .012 if k < 2 else .07); x[int(o * SR):] += n[:len(x) - int(o * SR)]
    return x * .8 * v
def hat(v=1., open_=False):
    d = .2 if open_ else .05; return hp(noise(d), 7000) * env_exp(d, .07 if open_ else .012) * .5 * v
def sq_bass(n, d, v=1.):
    tt = t_(d); f = hz(n); x = np.sign(np.sin(2 * np.pi * f * tt)) * .55 + np.sin(2 * np.pi * f * tt) * .6
    return lp(x, 900) * np.minimum(1, tt / .005) * env_exp(d, d * .6) * v
def pluck(n, v=1., d=.45):
    tt = t_(d); f = hz(n); return (np.sin(2 * np.pi * f * tt) * env_exp(d, .16) + .45 * np.sin(2 * np.pi * f * 4 * tt) * env_exp(d, .025)) * np.minimum(1, tt / .002) * v
def pizz(n, v=1.):
    d = .3; tt = t_(d); f = hz(n); x = sum(np.sin(2 * np.pi * f * k * tt) / k ** 1.4 for k in range(1, 6)); return lp(x, 2500) * env_exp(d, .07) * v
def bell(n, v=1., d=1.6):
    tt = t_(d); f = hz(n); return (np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.76 * tt) * env_exp(d, .25) + .2 * np.sin(2 * np.pi * f * 5.4 * tt) * env_exp(d, .1)) * env_exp(d, .5) * v
def pad(notes, d, v=1.):
    tt = t_(d); x = sum(2 / np.pi * np.arcsin(np.sin(2 * np.pi * hz(n) * tt * (1 + .002 * k))) for k, n in enumerate(notes))
    a = np.minimum(1, tt / .35) * np.minimum(1, (d - tt) / .4); return lp(x, 1600) * a * v / len(notes)
def snap(v=1.):
    d = .08; return bp(noise(d), 1800, 6000) * env_exp(d, .008) * v
CH = [('A', ['A3', 'C4', 'E4']), ('F', ['F3', 'A3', 'C4']), ('G', ['G3', 'B3', 'D4']), ('E', ['E3', 'G#3', 'B3'])]
ROOT = {'A': 'A1', 'F': 'F1', 'G': 'G1', 'E': 'E1'}
SIL0, STAMP, OUT = CUE['silence'], CUE['stamp'], CUE['outro']
S2 = VO['l03a']['t0'] - .3     # first exhibit: the full groove starts
grid = lambda a, b, s: [i * s for i in range(int(np.ceil(a / s - 1e-6)), int(np.floor(b / s)))]
chord = lambda t: CH[int(t // BAR) % 4]
# --- groove ---
MEL = [0, None, 2, 1, None, 2, 0, 1]      # pluck pattern over chord tones (index), None = rest
for t in grid(0, END - 3.4, E8):
    if SIL0 - .05 <= t < STAMP + .55: continue
    i = int(round(t / E8)); beat = (i // 2) % 4; on = i % 2 == 0; nm, tones = chord(t)
    hook = t < S2; outro = t >= OUT
    if hook:            # hook + title: kick on 1, pizz sneak, hats
        if on and beat == 0: put(kick(.9), t)
        if on: put(pizz(tones[(i // 2) % 3].replace('3', '2').replace('4', '3'), .5), t, 1, -.2)
        put(hat(.35 + .2 * (not on)), t, 1, .3)
        continue
    lv = .7 if outro else 1.
    if on and beat in (0, 2) and not outro: put(kick(1.), t)
    if on and beat in (1, 3): put((clap(.8) if outro else snare(.8)), t)
    put(hat(.45 if on else .3, open_=(i % 8 == 7)), t, lv, .3)
    if not outro: put(sq_bass(ROOT[nm] if on else ROOT[nm].replace('1', '2'), E8 * .9, .55), t)
    m = MEL[i % 8]
    if m is not None: put(pluck(tones[m].replace('3', '4').replace('4', '5') if (i // 8) % 2 else tones[m], .45 * lv), t, 1, -.25)
    if outro and on and beat in (1, 3): put(snap(.5), t, 1, .2)
# pads under each bar of the exhibits
for t in grid(S2, SIL0 - .1, BAR): put(pad(chord(t)[1], BAR, .32), t, 1, 0)
# --- snare roll + riser into the first exhibit ---
r0 = S2 - 1.2
for k in range(24): tt = r0 + k * .05; put(snare(.15 + .5 * k / 24), tt, 1, 0)
d = 1.2; tt = t_(d); put(bp(noise(d), 600, 6000) * (tt / d) ** 2 * .35, r0)
# --- the stamp: lands alone, then a held minor pad and a bell tag ---
put(pad(['A2', 'E3', 'A3', 'C4'], 2.4, .55), STAMP + .05)
for k, n in enumerate(['A4', 'C5', 'E5', 'A5']): put(bell(n, .35), STAMP + .6 + k * .15, 1, -.3 + .2 * k)
# --- ending tag ---
te = END - 3.0
put(pad(['A2', 'E3', 'A3', 'C4', 'E4'], 3.0, .5), te)
for k, n in enumerate(['E5', 'C5', 'A4', 'E5', 'A5']): put(bell(n, .3), te + .1 + k * .18, 1, .3 - .15 * k)
put(kick(1.), te); put(clap(.7), te)
m = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'score.wav'), m, SR); print('score ok', round(len(m) / SR, 2), 's')
