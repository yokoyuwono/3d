"""Voice + score + print foley (glyph pops, stamps, slashes, receipt printer, shutters, paper, wipes) → out/mix.wav"""
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
    if k == 'pop': x = tone(700 + 200 * rng.random(), .08, .025, .12)
    elif k == 'pops':
        n = e.get('n', 6); x = np.zeros(int((n * .03 + .1) * SR))
        for j in range(n): p = tone(600 + 500 * rng.random(), .06, .018, .07); i = int(j * .03 * SR); x[i:i + len(p)] += p
        pan = rng.uniform(-.3, .3)
    elif k in ('hit', 'slam'): x = layer(thump(1.0, 52), clack(.6, .6), bp(noise(.3), 200, 3000) * env_exp(.3, .06) * .4)
    elif k == 'wipe': x = whoosh(.45, .5)
    elif k in ('flap', 'tear'): x = bp(noise(.25), 400, 4000) * env_exp(.25, .06) * .5
    elif k == 'blink': x = tone(1200, .07, .02, .05)
    elif k == 'slash': x = bp(noise(.22), 2000, 9000) * np.linspace(.2, 1, int(round(.22 * SR))) * env_exp(.22, .2) * .5; pan = .2
    elif k == 'drop': x = tone(220, .3, .08, .25) * np.linspace(1, .6, int(round(.3 * SR))); pan = .3
    elif k == 'stamp': x = stampfx(False)
    elif k == 'bigstamp': x = stampfx(True)
    elif k == 'plop': x = tone(260 + 80 * e.get('i', 0), .12, .04, .3); pan = (e.get('i', 1) - 1) * .5
    elif k == 'boing':
        d = .35; tt = t_(d); f = (300 + 90 * e.get('i', 0)) * (1 + .3 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt / .12)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .1) * .25; pan = (e.get('i', 1) - 1) * .5
    elif k == 'ding': x = ding(.5); pan = .4
    elif k == 'scribble': x = bp(noise(.5), 1500, 5000) * (0.5 + .5 * np.sign(np.sin(2 * np.pi * 9 * t_(.5)))) * env_exp(.5, .3) * .35
    elif k == 'print': x = printer(12); pan = .1
    elif k == 'whoosh': x = whoosh(.5, .6)
    elif k == 'shutter': x = layer(click(1.3, .7), bp(noise(.05), 1500, 6000) * env_exp(.05, .01) * .4)
    elif k == 'share': x = pop(.4)
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
