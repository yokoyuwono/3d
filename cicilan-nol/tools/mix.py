"""Voice + score + flat-pack foley (carton, flaps, paper slides, parts landing, coins, click, snap, rubber stamp) → out/mix.wav"""
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
def stampfx(big):
    d = 1.0 if big else .5; tt = t_(d); f = (90 if big else 140) * np.exp(-tt / .25) + 35
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .22 if big else .1)
    x = layer(boom * (1.2 if big else .8), clack(.7, .9), bp(noise(.06), 1500, 6000) * env_exp(.06, .01) * .6)
    if big: x = layer(x, bp(noise(.8), 300, 4000) * env_exp(.8, .2) * rng.random(int(round(.8 * SR))) * .5)
    return x
def printer(n=10):
    o = np.zeros(int(n * .045 * SR) + 2400)
    for k in range(n): c = bp(noise(.02), 2500, 7000) * env_exp(.02, .004) * (.5 + .5 * rng.random()); i = int(k * .045 * SR); o[i:i + len(c)] += c
    return o
for e in EV:
    t, k = e['t'], e['type']; pan = 0
    if k == 'thud': x = layer(thump(.9, 65), bp(noise(.12), 300, 2000) * env_exp(.12, .03) * .3)
    elif k == 'slam': x = layer(thump(1.0, 55), clack(.6, .5))
    elif k == 'flap': x = bp(noise(.22), 300, 3500) * env_exp(.22, .06) * .6; pan = rng.uniform(-.3, .3)
    elif k == 'slide': x = bp(noise(.4), 500, 5000) * np.sin(np.linspace(0, np.pi, int(round(.4 * SR)))) * .35
    elif k == 'whoosh': x = whoosh(.35, .45); pan = (e.get('i', 1) - 1.5) * .3
    elif k == 'land': x = layer(clack(1.2, .5), thump(.3, 140)); pan = (e.get('i', 1) - 1.5) * .3
    elif k == 'coin': x = layer(tone(2600 + 80 * e.get('i', 0), .12, .03, .12), tone(4100, .08, .02, .06)); pan = .1
    elif k == 'slidebox': x = bp(noise(.5), 200, 2500) * env_exp(.5, .25) * .4
    elif k == 'click': x = click(1.0, .9)
    elif k == 'snap': x = layer(clack(.8, 1.0), thump(.6, 90), bp(noise(.08), 2000, 8000) * env_exp(.08, .01) * .5)
    elif k == 'paper': x = bp(noise(.35), 800, 6000) * env_exp(.35, .12) * .45; pan = .4
    elif k == 'stamp': x = layer(thump(1.0, 60), clack(.7, .8))
    elif k == 'pop': x = tone(720, .08, .025, .12)
    elif k == 'tickok': x = layer(tone(880, .15, .06, .1), tone(1320, .2, .08, .08))
    else: continue
    add(fx, np.asarray(x, np.float32), t, 1.0, float(np.clip(pan, -1, 1)))
room = lp(brown(END + .2), 250) * .5   # quiet room tone
room = room[:N] / (np.abs(room).max() + 1e-9) * .05; amb[:len(room)] += room[:, None]
mus, _ = sf.read(os.path.join(HERE, 'out', 'score.wav'), dtype='float32'); music = np.zeros((N, 2), np.float32); n = min(N, len(mus)); music[:n] = mus[:n]
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-12)
vrms = rms(voice[vr > .05]); music *= vrms / rms(music) * 10 ** (-11 / 20)
duck = 10 ** (-(8 * np.clip(vr * 3, 0, 1)) / 20); k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
music *= duck[:, None]
fx *= vrms / (rms(fx[np.abs(fx).sum(1) > 1e-4]) + 1e-9) * 10 ** (-10 / 20)
m = voice + music + fx + amb; m = limit(m / (np.abs(m).max() + 1e-9) * .95, .95)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), m.astype(np.float32), SR); print('mix ok')
