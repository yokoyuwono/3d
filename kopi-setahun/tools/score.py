"""Office-pop score for "Kopi 25 Ribu Sehari" (marimba, xylophone, glockenspiel, hand kit, bass), 112 BPM.
Reads timeline.json + events.json (cues: silence, drop, half, groove). → out/score.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, thump
TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
CUE = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; END = TL['end']; N = int((END + 3) * SR)
B = 60 / 112; E8 = B / 2; BAR = 4 * B; S.seed(3)
mix = np.zeros((N, 2), np.float32)
def put(x, t, g=1., pan=0.):
    if 0 <= t < END + 2: add(mix, x.astype(np.float32), t, g, pan)
def note(inst, p, t, v=.5, d=.5, pan=0., g=1.): put(S.note(inst, p, d, vel=v), t, g, pan)
def hit(inst, var, t, v=.5, pan=0., g=1.): put(S.hit(inst, var, vel=v), t, g, pan)
def kick(t, v=.6): put(thump(v, 58), t, 1.0, 0)
CH = {'C': ['C4', 'E4', 'G4', 'C5'], 'Am': ['A3', 'C4', 'E4', 'A4'], 'F': ['F3', 'A3', 'C4', 'F4'], 'G': ['G3', 'B3', 'D4', 'G4']}
ROOT = {'C': 'C2', 'Am': 'A1', 'F': 'F1', 'G': 'G1'}; PROG = ['C', 'Am', 'F', 'G']
ch = lambda t: PROG[int(t // BAR) % 4]
grid = lambda a, b, step: [i * step for i in range(int(np.ceil(a / step)), int(np.floor(b / step)))]
SIL = (CUE['silence'], CUE['drop']); HALF = CUE['half']; GROOVE = CUE['groove']
def quiet(t): return SIL[0] <= t < SIL[1]
# intro: marimba motif + closed hats (sparse), groove from the #### (enter 3) on
en = sorted(e['t'] for e in EV if e['type'] == 'enter'); groove0 = en[2]
HK = {e['type']: e for e in EV if e['type'] in ('slam', 'rewind')}
SLAM = HK['slam']['t']; RW = HK['rewind']
# hook: rising xylophone during the count-up, a full stab on the slam, a falling marimba run on the Ctrl+Z
for e in EV:
    if e['type'] == 'count': note('xylophone', ['C5','D5','E5','G5','A5','C6','D6','E6','G6','A6','C7','D7','E7','G7'][e['n']], e['t'], .3 + .02 * e['n'], .2, .2, .7)
for p_ in ['C3', 'G3', 'C4', 'E4', 'G4', 'C5']: note('marimba', p_, SLAM, .75, 1.6, 0)
kick(SLAM, .9); hit('snare2', 'on', SLAM, .7, 0, .8); hit('claps', 'group', SLAM, .6, 0, .6); note('glockenspiel', 'C7', SLAM, .6, 2.0, .2, .8); note('jazz_bass', 'C2', SLAM, .7, 1.2)
for q, p_ in enumerate(['C6','A5','G5','E5','D5','C5','A4','G4','E4','D4','C4']): note('marimba', p_, RW['t'] + q * RW['dur'] / 11, .45, .25, -.2)
for t in grid(0, END - 2.2, E8):
    if quiet(t) or t < SLAM + .1 or RW['t'] <= t < RW['t'] + RW['dur']: continue
    i = int(round(t / E8)); beat = (i // 2) % 4; on = i % 2 == 0; c = ch(t)
    half = HALF <= t < GROOVE
    full = t >= groove0 and not half
    if t < groove0 or half:
        if on: hit('hihat', 'closed', t, .25, .3, .5)
        if on and beat == 0: note('marimba', CH[c][0], t, .45, .6, -.2)
        if on and beat == 2: note('marimba', CH[c][2], t, .35, .6, -.2)
        if half and on and beat == 0: note('jazz_bass', ROOT[c], t, .45, 1.0)
        continue
    hit('hihat', 'closed', t, .32 if on else .22, .3, .6)
    if on and beat in (0, 2): kick(t, .55)
    if on and beat in (1, 3): hit('snare2', 'on', t, .4, -.05, .55); hit('claps', 'group', t, .3, .1, .4)
    if on: note('jazz_bass', ROOT[c] if beat in (0, 2) else ROOT[c][:-1] + str(int(ROOT[c][-1]) + 1), t, .5, .4)
    pat = [0, 2, 1, 3, 2, 1, 3, 2]; note('marimba', CH[c][pat[i % 8]], t, .42 if i % 8 in (0, 3, 6) else .3, .4, -.2)
    if t >= GROOVE and i % 2: note('xylophone', CH[c][pat[(i + 3) % 8]] [:-1] + '5', t, .25, .25, .35, .6)
# stingers
for e in EV:
    if e['type'] == 'enter': note('glockenspiel', ['G5', 'A5', 'C6', 'D6', 'E6', 'G6'][e['n'] % 6], e['t'], .4, .8, .3, .6)
    if e['type'] == 'ding':
        for p in ['C5', 'E5', 'G5', 'C6']: note('marimba', p, e['t'], .55, 1.2, 0)
        kick(e['t'], .7); note('glockenspiel', 'C7', e['t'], .5, 1.5, .2, .7)
    if e['type'] == 'win':
        for p in ['G4', 'B4', 'D5', 'G5']: note('marimba', p, e['t'], .55, 1.2, 0)
        note('glockenspiel', 'G6', e['t'], .5, 1.5, .2, .7)
tend = END - 2.1
for p in ['C3', 'G3', 'C4', 'E4', 'G4', 'C5']: note('marimba', p, tend, .5, 2.5, 0)
note('glockenspiel', 'C6', tend, .45, 2.5, .2, .7); note('jazz_bass', 'C2', tend, .55, 2.0); kick(tend, .6)
mix = S.room(mix, size=.25, mix=.1); pk = np.abs(mix).max(); mix = mix / pk * .8
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'score.wav'), mix[:int((END + .1) * SR)], SR)
print('score ok', round(END, 2))
