"""Score for "Gaji Habis Tanggal 20": light and pitched (mbira handshakes, glockenspiel nodes, marimba, plucked bass, vibraphone verdict). 104 BPM.
Reads timeline.json + events.json → out/score.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, thump
TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
CUE = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; END = TL['end']; N = int((END + 3) * SR)
B = 60 / 104; E8 = B / 2; BAR = 4 * B; S.seed(5); mix = np.zeros((N, 2), np.float32)
def put(x, t, g=1., pan=0.):
    if 0 <= t < END + 2: add(mix, x.astype(np.float32), t, g, pan)
def note(inst, p, t, v=.5, d=.5, pan=0., g=1.): put(S.note(inst, p, d, vel=v), t, g, pan)
def hit(inst, var, t, v=.5, pan=0., g=1.): put(S.hit(inst, var, vel=v), t, g, pan)
CH = {'D': ['D3', 'F#3', 'A3', 'D4'], 'Bm': ['B2', 'D3', 'F#3', 'B3'], 'G': ['G2', 'B2', 'D3', 'G3'], 'A': ['A2', 'C#3', 'E3', 'A3'], 'Em': ['E3', 'G3', 'B3', 'E4']}
ROOT = {'D': 'D2', 'Bm': 'B1', 'G': 'G1', 'A': 'A1', 'Em': 'E2'}
SAD = ['Bm', 'G', 'Em', 'A']; HAPPY = ['D', 'A', 'Bm', 'G']
SIL = (CUE['silence'], CUE['silence'] + .9); TURN = CUE['turn']; BROW = CUE['b']; LIFT = CUE['lift']
def prog(t): return (HAPPY if t >= BROW else SAD)[int(t // BAR) % 4]
grid = lambda a, b, s: [i * s for i in range(int(np.ceil(a / s)), int(np.floor(b / s)))]
# groove: marimba eighths + plucked bass; sparse in the hook, silent before "Kamu sendiri?", thin at the turn, full on row B
for t in grid(.0, END - 2.2, E8):
    if SIL[0] <= t < SIL[1]: continue
    i = int(round(t / E8)); beat = (i // 2) % 4; on = i % 2 == 0; c = prog(t)
    lvl = .55 if t < CUE['silence'] else (.4 if t < BROW else .8)
    if TURN - .6 <= t < BROW: lvl = .3
    if on and beat in (0, 2): note('jazz_bass', ROOT[c], t, .5 * lvl + .1, .35)
    if t < 3.0 and not on: continue
    pat = [0, 2, 1, 3, 2, 1, 3, 2]; note('marimba', CH[c][pat[i % 8]], t, (.36 if i % 8 in (0, 3, 6) else .26) * lvl + .05, .4, -.2)
    if t >= BROW and on and beat in (1, 3): hit('shaker', 'down', t, .25, .35, .5)
# handshakes: mbira, rising with each clasp; nodes: glockenspiel
scale = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5']
for e in EV:
    if e['type'] == 'clasp': note('mbira', scale[min(7, e['k'])], e['t'], .55, .8, e.get('pan', 0) * .6, .9)
    if e['type'] == 'node': note('glockenspiel', scale[min(7, e['k'])].replace('4', '5').replace('5', '6') if e['row'] == 'B' else scale[min(7, e['k'])].replace('4', '5'), e['t'], .4, .9, e.get('pan', 0) * .6, .6)
    if e['type'] == 'slam':
        for p in ['B2', 'F#3', 'B3', 'D4']: note('marimba', p, e['t'], .6, 1.2, 0)
        put(thump(.7, 60), e['t'], 1.0)
    if e['type'] == 'zero': note('vibraphone', 'B3', e['t'], .5, 1.8, 0, .7); note('vibraphone', 'D4', e['t'], .4, 1.8, 0, .7)
    if e['type'] == 'save':
        for p in ['D4', 'F#4', 'A4', 'D5']: note('vibraphone', p, e['t'], .5, 1.8, 0, .7)
    if e['type'] == 'lift':
        for q, p in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6']): note('glockenspiel', p, e['t'] + q * .06, .4, 1.2, (q - 3) / 4, .6)
tend = END - 2.0
for p in ['D3', 'A3', 'D4', 'F#4', 'A4']: note('vibraphone', p, tend, .5, 2.6, 0, .8)
note('jazz_bass', 'D2', tend, .55, 2.0); note('mbira', 'D5', tend, .5, 2.0, .3)
mix = S.room(mix, size=.3, mix=.12); mix = mix / (np.abs(mix).max() + 1e-9) * .8
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'score.wav'), mix[:int((END + .1) * SR)], SR); print('score ok')
