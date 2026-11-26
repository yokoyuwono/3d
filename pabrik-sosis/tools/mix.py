"""Mix: voice (Gemini TTS lines) + score + ambience beds + foley from the picture's events → out/mix.wav (48 kHz stereo).
Run from the project folder: $LIB/.venv/bin/python tools/mix.py"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, brown, click, clack, whoosh, thump, step, ding, pop, compress, limit, add

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
SEC = {s['id']: s for s in TL['sections']}
END = TL['end']; N = int((END + .2) * SR)
rng = np.random.default_rng(5)
voice = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32)

# ---------- voice ----------
for v in TL['voice']:
    f = os.path.join(HERE, 'voice', 'trim', v['id'] + '.wav')
    if v['missing'] or not os.path.exists(f): continue
    x, sr = sf.read(f, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR)
    x = hp(x, 90)
    x = compress(x / (np.abs(x).max() + 1e-9) * .9, thr=.22, ratio=3.2)
    add(voice, x.astype(np.float32), v['t0'], .95, 0)
vr = np.sqrt(np.convolve(voice[:, 0] ** 2, np.ones(2400) / 2400, 'same'))
vr = vr / (vr.max() + 1e-9)

# ---------- ambience beds (crossfaded per section) ----------
def bed(kind, d):
    n = noise(d)
    if kind == 'kitchen': return lp(brown(d), 400) * .5 + bp(n, 2000, 5000) * .004
    if kind == 'farm':
        x = lp(brown(d), 600) * .7
        for i in range(int(d * 1.3)):                       # birds: short chirps
            t0 = rng.uniform(0, d - .3); tt = t_(.12); f0 = rng.uniform(2800, 4200)
            ch = np.sin(2 * np.pi * (f0 + 1800 * tt / .12) * tt) * np.sin(np.pi * tt / .12) * .06
            a = int(t0 * SR); x[a:a + len(ch)] += ch
        return x
    if kind == 'road': return lp(brown(d), 220) * 1.2 + np.sin(2 * np.pi * 48 * t_(d)) * .05
    if kind == 'factory': return lp(brown(d), 300) * .6 + np.sin(2 * np.pi * 55 * t_(d)) * .035 + np.sin(2 * np.pi * 110 * t_(d)) * .015 + bp(n, 800, 1600) * .006
    if kind == 'city': return lp(brown(d), 500) * .9 + bp(n, 300, 900) * .01
    return np.zeros(int(round(d * SR)))
BEDS = [('kitchen', 'plate'), ('farm', 'farm'), ('road', 'truck'), ('factory', 'gate'), ('factory', 'grind'), ('factory', 'mix'), ('factory', 'fill'), ('factory', 'oven'),
        ('factory', 'cool'), ('factory', 'pack'), ('city', 'dist'), ('city', 'home'), ('kitchen', 'end')]
for kind, sid in BEDS:
    s = SEC[sid]; a = max(0, s['t0'] - .4); d = s['t1'] - a + .8
    x = bed(kind, d); x = x / (np.abs(x).max() + 1e-9) * .16
    r = int(.6 * SR); w = np.ones(len(x)); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r)
    add(amb, (x * w).astype(np.float32), a, 1.0, 0)

# ---------- foley ----------
def layer(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def tone(f, d, tau=.08, v=.3): return np.sin(2 * np.pi * f * t_(d)) * env_exp(d, tau) * v
def F(e):
    t, k = e['t'], e['type']; d = e.get('dur', 1.0); soft = e.get('soft', 0)
    if k == 'whoosh': return whoosh(min(d, 1.2), .55), 0
    if k == 'land': return thump(.5, 80), 0
    if k == 'title': return pop(.5), .2
    if k == 'pop': return pop(.22 if soft else .45), .3 * np.sin(e.get('n', 0))
    if k == 'sizzle': x = bp(noise(d), 3000, 9000) * (rng.random(int(round(d * SR))) > .985) * .5 + bp(noise(d), 2000, 6000) * .02; return x * np.minimum(1, t_(d) / .3) * np.minimum(1, (d - t_(d)) / .4), 0
    if k == 'farm': return np.zeros(10), 0
    if k == 'engine': tt = t_(d); x = (np.sin(2 * np.pi * 42 * tt) + .5 * np.sin(2 * np.pi * 84 * tt)) * .12 + lp(noise(d), 300) * .05; return x * np.minimum(1, tt / .4) * np.minimum(1, (d - tt) / .5) * (.5 if soft else 1), -.2
    if k == 'brake': return hp(noise(.5), 3000) * env_exp(.5, .15) * .12, -.3
    if k == 'thud': return thump(.3 if soft else .55, 95), (e.get('n', 0) - 1) * .2
    if k == 'beep': return tone(1450, .16, .2, .14), .25
    if k == 'ding': return ding(.5), .1
    if k == 'buzz': tt = t_(.45); x = np.sign(np.sin(2 * np.pi * 140 * tt)) * .08 * np.minimum(1, (.45 - tt) / .05); return lp(x, 1800), -.2
    if k == 'drop': return whoosh(.6, .4)[::-1].copy(), 0
    if k == 'grinder': tt = t_(d); x = lp(noise(d), 1200) * .22 * (1 + .3 * np.sin(2 * np.pi * 9 * tt)) + np.sin(2 * np.pi * 92 * tt) * .07; return x * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .3), 0
    if k == 'mixer': tt = t_(d); x = bp(noise(d), 300, 1500) * .1 * (.6 + .4 * np.sin(2 * np.pi * .95 * tt)) ** 2; return x * np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .5), 0
    if k == 'pour': x = np.zeros(int(.5 * SR)); [x.__setitem__(slice(a, a + 200), x[a:a + 200] + hp(noise(200 / SR), 2000) * .15) for a in rng.integers(0, len(x) - 200, 40)]; return x, .3 * (e.get('n', 0) - 1.5)
    if k == 'piston': tt = t_(d); return hp(noise(d), 1500) * .025 * np.minimum(1, tt / .3) * np.minimum(1, (d - tt) / .3), .2
    if k == 'snap': return layer(click(1.3, .35), pop(.15)), .2 * np.sin(e.get('n', 0))
    if k == 'cut': return bp(noise(.35), 1500, 6000) * env_exp(.35, .1) * .25, 0
    if k == 'steam': tt = t_(d); return hp(noise(d), 2500) * .02 * (1 + .5 * np.sin(2 * np.pi * .4 * tt)) * np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .5), -.2
    if k == 'puff': return lp(noise(.6), 900) * env_exp(.6, .2) * .25, -.2
    if k == 'spray': tt = t_(d); return bp(noise(d), 1500, 5000) * .05 * (1 + .4 * np.sin(2 * np.pi * 13 * tt)) * np.minimum(1, tt / .3) * np.minimum(1, (d - tt) / .3), .1
    if k == 'conveyor': tt = t_(d); return (np.sin(2 * np.pi * 70 * tt) * .03 + bp(noise(d), 400, 1200) * .02) * np.minimum(1, tt / .4) * np.minimum(1, (d - tt) / .4), 0
    if k == 'chop': return clack(1.0, .45), .2
    if k == 'vacuum': tt = t_(.7); return lp(noise(.7), 600 + 0) * .2 * np.sin(np.pi * tt / .7), 0
    if k == 'stamp': return layer(thump(.55, 120), clack(.8, .4)), 0
    if k == 'city': return np.zeros(10), 0
    if k == 'steps':
        x = np.zeros(int(round(d * SR)))
        for i in range(int(d / .22)): a = int(i * .22 * SR); s1 = step(.25); x[a:a + len(s1)] += s1[:len(x) - a]
        return x, .1
    if k == 'plink': tt = t_(1.2); return (np.sin(2 * np.pi * 2350 * tt) + .6 * np.sin(2 * np.pi * 3720 * tt) + .3 * np.sin(2 * np.pi * 5910 * tt)) * env_exp(1.2, .25) * .08, .15
    if k == 'tick': return click(1.6, .18), (e.get('n', 0) / 11 - .5) * .6
    return np.zeros(10), 0
for e in EV:
    x, pan = F(e)
    if len(x) > 10: add(fx, np.asarray(x, np.float32), e['t'], 1.0, float(np.clip(pan, -1, 1)))

# ---------- music ----------
mus, sr = sf.read(os.path.join(HERE, 'out', 'score.wav'), dtype='float32')
music = np.zeros((N, 2), np.float32); n = min(N, len(mus)); music[:n] = mus[:n]

# ---------- balance + ducking ----------
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
act = vr > .05
vrms = rms(voice[act]) if act.any() else .1
music *= (vrms / rms(music)) * 10 ** (-12 / 20)
duck = 10 ** (-(8 * np.clip(vr * 3, 0, 1)) / 20)
k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
music *= duck[:, None]; amb *= (duck ** .9)[:, None] * .9
fx *= (vrms / (rms(fx[np.abs(fx).sum(1) > 1e-4]) + 1e-9)) * 10 ** (-9 / 20)
mix = voice + music + amb + fx
mix = limit(mix / (np.abs(mix).max() + 1e-9) * .95, .95)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix', round(len(mix) / SR, 2), 's', 'voice lines', sum(1 for v in TL['voice'] if not v['missing']), '/', len(TL['voice']))
