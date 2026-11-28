"""Voice + score + sheet foley (keys, enter, hops, ratchet, cell blips, whoosh, ding) → out/mix.wav"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, brown, click, clack, whoosh, thump, ding, pop, compress, limit, add
TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
END = TL['end']; N = int((END + .2) * SR)
voice = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
for v in TL['voice']:
    x, sr = sf.read(os.path.join(HERE, 'voice', 'trim', v['id'] + '.wav'), dtype='float32')
    x = hp(soxr.resample(x, sr, SR), 90); x = compress(x / (np.abs(x).max() + 1e-9) * .9, thr=.22, ratio=3.2)
    add(voice, x.astype(np.float32), v['t0'], .95, 0)
vr = np.sqrt(np.convolve(voice[:, 0] ** 2, np.ones(2400) / 2400, 'same')); vr /= vr.max() + 1e-9
rng = np.random.default_rng(4)
def tone(f, d, tau, v): return np.sin(2 * np.pi * f * t_(d)) * env_exp(d, tau) * v
def layer(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
for e in EV:
    t, k = e['t'], e['type']
    if k == 'pop': x = tone(500 + 300 * rng.random(), .09, .03, .06) * np.linspace(.6, 1.2, int(round(.09 * SR))); pan = e.get('pan', 0)
    elif k == 'reach': x = bp(noise(.18), 600, 2500) * env_exp(.18, .07) * .05; pan = 0
    elif k == 'clasp': x = layer(thump(.28, 180), bp(noise(.05), 800, 3000) * env_exp(.05, .015) * .12); pan = e.get('pan', 0)
    elif k == 'node': x = bp(noise(.25), 1500, 6000) * env_exp(.25, .08) * .03; pan = e.get('pan', 0)
    elif k == 'slam': x = layer(thump(.8, 55), clack(.6, .3)); pan = 0
    elif k == 'zero': x = tone(180, .6, .25, .12); pan = 0
    elif k == 'slump': x = thump(.35, 70); pan = -.3
    elif k == 'turn': x = whoosh(.5, .3); pan = 0
    elif k == 'save': x = ding(.4); pan = .1
    elif k == 'lift': x = whoosh(.6, .25); pan = 0
    elif k == 'share': x = pop(.35); pan = 0
    else: continue
    add(fx, np.asarray(x, np.float32), t, 1.0, float(np.clip(pan, -1, 1)))
room = lp(brown(END + .2), 250) * .5   # quiet room tone
room = room[:N] / (np.abs(room).max() + 1e-9) * .05; amb[:len(room)] += room[:, None]
mus, _ = sf.read(os.path.join(HERE, 'out', 'score.wav'), dtype='float32'); music = np.zeros((N, 2), np.float32); n = min(N, len(mus)); music[:n] = mus[:n]
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-12)
vrms = rms(voice[vr > .05]); music *= vrms / rms(music) * 10 ** (-10 / 20)
duck = 10 ** (-(8 * np.clip(vr * 3, 0, 1)) / 20); k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
music *= duck[:, None]
fx *= vrms / (rms(fx[np.abs(fx).sum(1) > 1e-4]) + 1e-9) * 10 ** (-12 / 20)
m = voice + music + fx + amb; m = limit(m / (np.abs(m).max() + 1e-9) * .95, .95)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), m.astype(np.float32), SR); print('mix ok')
