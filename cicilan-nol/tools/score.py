"""Score for "Kasus #2: Cicilan 0%": a small tidy ensemble that counts steps (pizzicato, marimba, glockenspiel, felt piano), 116 BPM.
One bright note per part landing, rising through the chord; the music stops dead before the ✗; near silence at the end, one chime.
Reads timeline.json + events.json → out/score.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add
TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
CUE = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; END = TL['end']; N = int((END + 3) * SR)
B = 60 / 116; E8 = B / 2; BAR = 4 * B; S.seed(3); mix = np.zeros((N, 2), np.float32)
def put(x, t, g=1., pan=0.):
    if 0 <= t < END + 2: add(mix, x.astype(np.float32), t, g, pan)
def inst(*names):
    for n in names:
        try: S.note(n, 'C4', .2); return n
        except Exception as e: print('skip', n, str(e)[:60])
    raise SystemExit('no instrument')
PIZZ = inst('violins_pizz', 'violin_pizz', 'harp', 'marimba'); BASS = inst('contrabass_pizz', 'cellos_pizz', 'jazz_bass')
print('using', PIZZ, BASS)
def note(i, p, t, v=.5, d=.4, pan=0., g=1.): put(S.note(i, p, d, vel=v), t, g, pan)
# C major, tidy: C – Am – F – G
CH = [('C', ['C4', 'E4', 'G4', 'C5']), ('Am', ['A3', 'C4', 'E4', 'A4']), ('F', ['F3', 'A3', 'C4', 'F4']), ('G', ['G3', 'B3', 'D4', 'G4'])]
ROOT = {'C': 'C2', 'Am': 'A1', 'F': 'F2', 'G': 'G1'}
SIL, VER, OUT = CUE['silence'], CUE['verdict'], CUE['outro']
grid = lambda a, b, s: [i * s for i in range(int(np.ceil(a / s - 1e-6)), int(np.floor(b / s)))]
chord = lambda t: CH[int(t // BAR) % 4]
PAT = [0, 2, 1, 3, 2, 1, 3, 2]
for t in grid(0, END - 2.6, E8):
    if SIL <= t < VER + .9: continue
    i = int(round(t / E8)); beat = (i // 2) % 4; on = i % 2 == 0; nm, tones = chord(t)
    lv = .55 if t < 3.2 else (.75 if t < OUT else .5)
    if on and beat in (0, 2): note(BASS, ROOT[nm], t, .55 * lv + .1, .5)
    note(PIZZ, tones[PAT[i % 8]], t, (.42 if i % 8 in (0, 3, 6) else .3) * lv, .3, -.25)
    if t >= 3.2 and t < OUT and not on and beat == 3: note('marimba', tones[3], t, .3 * lv, .3, .3)
# one bright note per part landing, rising through the scale
scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7']
for e in EV:
    if e['type'] == 'land': note('glockenspiel', scale[[0, 2, 3, 5][e.get('i', 0)]], e['t'], .5, 1.0, .2)
    if e['type'] == 'coin': note('glockenspiel', scale[min(11, e['i'])], e['t'], .3, .5, .15, .6)
    if e['type'] == 'ding': [note('piano', p, e['t'], .45, 1.4, 0) for p in (['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'])[e['k'] - 1]]
    if e['type'] == 'sting': note('vibraphone', 'D#4', e['t'], .5, 1.2, 0); note('vibraphone', 'A3', e['t'], .4, 1.2, 0)
# after the ✗: a low held piano chord; the ending: near silence, then one chime
note('piano', 'A2', VER + .05, .5, 2.5, 0); note('piano', 'E3', VER + .05, .4, 2.5, 0)
note('tubular_bells' if True else 'glockenspiel', 'C5', END - 1.6, .5, 3.0, 0, .8)
m = mix / (np.abs(mix).max() + 1e-9) * .9
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'score.wav'), m, SR); print('score ok', round(len(m) / SR, 1))
