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
    if k == 'key': x = layer(click(1.6 + rng.random() * .4, .22), hp(noise(.02), 3000) * .04); pan = rng.uniform(-.2, .2)
    elif k == 'enter': x = layer(clack(.9, .45), thump(.3, 90)); pan = 0
    elif k == 'hop': x = click(2.2, .18); pan = .1
    elif k == 'hash': x = tone(320, .25, .08, .12) + tone(240, .25, .1, .1); pan = 0
    elif k == 'ratchet': x = click(1.0, .3); pan = .2
    elif k == 'paint': x = tone(500 + 900 * e['n'] / 60, .07, .02, .07); pan = (e['n'] % 7 - 3) / 6
    elif k == 'save': x = tone(700 + 600 * e['n'] / 36, .07, .02, .08); pan = (e['n'] % 5 - 2) / 4
    elif k == 'whoosh': x = whoosh(min(e.get('dur', 1), 1.6), .5); pan = 0
    elif k in ('ding', 'win'): x = ding(.45); pan = .1
    elif k == 'pop': x = pop(.4); pan = 0
    elif k == 'card': x = layer(clack(.7, .3), pop(.3)); pan = 0
    else: continue
    add(fx, np.asarray(x, np.float32), t, 1.0, float(np.clip(pan, -1, 1)))
room = lp(brown(END + .2), 300) * .5 + np.sin(2 * np.pi * 120 * t_(END + .2)) * .01   # office room tone + fluorescent hum
room = room[:N] / (np.abs(room).max() + 1e-9) * .05; amb[:len(room)] += room[:, None]
mus, _ = sf.read(os.path.join(HERE, 'out', 'score.wav'), dtype='float32'); music = np.zeros((N, 2), np.float32); n = min(N, len(mus)); music[:n] = mus[:n]
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-12)
vrms = rms(voice[vr > .05]); music *= vrms / rms(music) * 10 ** (-10 / 20)
duck = 10 ** (-(8 * np.clip(vr * 3, 0, 1)) / 20); k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
music *= duck[:, None]
fx *= vrms / (rms(fx[np.abs(fx).sum(1) > 1e-4]) + 1e-9) * 10 ** (-12 / 20)
m = voice + music + fx + amb; m = limit(m / (np.abs(m).max() + 1e-9) * .95, .95)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), m.astype(np.float32), SR); print('mix ok')
