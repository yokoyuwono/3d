"""Original score for "Dari Peternakan ke Piring": light acoustic groove (marimba, glockenspiel, hand percussion, bass), 112 BPM.
Run from the project folder: $LIB/.venv/bin/python tools/score.py  → out/score.wav (48 kHz stereo) + out/score.json (cue keys)
Reads timeline.json (sections, voice) and events.json (picture events) so the music lands on the picture."""
import os, sys, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
SEC = {s['id']: s for s in TL['sections']}; VO = {v['id']: v for v in TL['voice']}
END = TL['end']; N = int((END + 4) * SR)
B = 60 / 112; E8 = B / 2; BAR = 4 * B
S.seed(11)
stems = {k: np.zeros((N, 2), np.float32) for k in ['mar', 'glock', 'perc', 'bass']}
keys = {}
def put(stem, x, t, g=1.0, pan=0.0):
    if 0 <= t < END + 3: add(stems[stem], x.astype(np.float32), t, g, pan)
def mar(p, t, v=.55, d=.6, pan=-.15, g=1.0): put('mar', S.note('marimba', p, d, vel=v), t, g, pan)
def glk(p, t, v=.45, d=1.2, pan=.3, g=.7): put('glock', S.note('glockenspiel', p, d, vel=v), t, g, pan)
def bas(p, t, v=.6, d=.45, g=1.0): put('bass', S.note('jazz_bass', p, d, vel=v), t, g, 0)
def hit(inst, var, t, v=.6, pan=0., g=1.0): put('perc', S.hit(inst, var, vel=v), t, g, pan)

# G major: G – D – Em – C, one chord per bar
CH = {'G': ['G3', 'B3', 'D4', 'G4'], 'D': ['D3', 'F#3', 'A3', 'D4'], 'Em': ['E3', 'G3', 'B3', 'E4'], 'C': ['C3', 'E3', 'G3', 'C4']}
ROOT = {'G': 'G1', 'D': 'D2', 'Em': 'E2', 'C': 'C2'}
FIFTH = {'G': 'D2', 'D': 'A1', 'Em': 'B1', 'C': 'G1'}
PROG = ['G', 'D', 'Em', 'C']
chord = lambda t: PROG[int(t // BAR) % 4]
s = lambda i: SEC[i]

def section(a, b): return [(i * E8) for i in range(int(np.ceil(a / E8)), int(np.floor(b / E8)))]

# --- silence windows: the gate verdict (a beat of near-silence before "Lolos") ---
SIL = (VO['a03_2']['t0'] - .85, VO['a03_2']['t0'])
def silent(t): return SIL[0] <= t < SIL[1]

# --- A: plate, motif alone ---
motif = ['B4', 'D5', 'G5', 'F#5', 'D5', 'E5']
for i, p in enumerate(motif): mar(p, .9 + i * E8 * 1.5, .42, .8, .1)
for i, p in enumerate(['G4', 'B4', 'D5', 'E5']): mar(p, VO['a01_2']['t0'] + i * E8, .36, .7, .2)
keys['title'] = [e['t'] for e in EV if e['type'] == 'title']
for t, p in zip(keys['title'], ['D6', 'G6']): glk(p, t, .5)
mar('G3', s('plate')['t1'] - BAR / 2, .4, 2.0, -.1); mar('D4', s('plate')['t1'] - BAR / 2 + B, .35, 1.6)

# --- grooves ---
def groove(a, b, level=1.0, bass=True, conga=True, cajon=True, shaker=True, ost=True, wood=True):
    for t in section(a, b):
        if silent(t): continue
        i = int(round(t / E8)); beat = (i // 2) % 4; on = i % 2 == 0; ch = chord(t)
        if shaker: hit('shaker', 'down' if on else 'up', t, (.38 if on else .26) * level, .35, .55)
        if cajon and on and beat in (0, 2): hit('cajon', 'bass', t, .55 * level, 0, .8)
        if cajon and on and beat in (1, 3): hit('cajon', 'slap', t, .42 * level, 0, .6)
        if wood and on and beat in (1, 3): hit('woodblock', 'a', t, .3 * level, -.4, .45)
        if conga and not on and beat in (1, 3): hit('conga', 'conga', t, .32 * level, -.3, .55)
        if bass and on and beat in (0, 2): bas(ROOT[ch] if beat == 0 else FIFTH[ch], t, .55 * level)
        if bass and not on and beat == 3: bas(ROOT[ch], t, .35 * level, .25)
        if ost:   # marimba ostinato: chord tones in eighths, 3-3-2 accent
            c = CH[ch]; pat = [0, 2, 1, 3, 2, 1, 3, 2]; k = i % 8
            mar(c[pat[k]] if k else c[0], t, (.5 if k in (0, 3, 6) else .34) * level, .5, -.15)

groove(s('farm')['t0'], s('truck')['t1'], .85, conga=False)
groove(s('gate')['t0'], s('gate')['t1'], .7, ost=False, conga=False)
groove(s('grind')['t0'], s('dist')['t1'], 1.0)
groove(s('home')['t0'], s('home')['t1'], .55, cajon=False, conga=False, wood=False, bass=False)
keys['silence'] = list(SIL)

# fill: shaker 16ths accelerate with the links (extra layer)
f = s('fill')
for t in np.arange(f['v0'], f['t1'], E8 / 2): hit('shaker', 'up', t, .22, .45, .5)
# floor arrivals: a glockenspiel tick on each landing
keys['land'] = [e['t'] for e in EV if e['type'] == 'land']
for i, t in enumerate(keys['land']): glk(['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'A6', 'B6'][i % 8], t, .4, 1.0)
# isotype pops: one marimba note per icon (24 in 1.6 s)
pops = [e['t'] for e in EV if e['type'] == 'pop' and e.get('soft')]
for i, t in enumerate(pops): mar(['G5', 'A5', 'B5', 'D6'][i % 4], t, .22, .25, .35, .7)
# the 72 °C ding and the gate ding get a chord under them
for e in EV:
    if e['type'] == 'ding': glk('B5', e['t'], .55, 1.6); glk('G5', e['t'], .4, 1.6); mar(CH[chord(e['t'])][0], e['t'], .5, 1.0)
# distribution: rising bass walk under the fan-out
d = s('dist')
walk = ['G1', 'A1', 'B1', 'C2', 'D2', 'E2', 'F#2', 'G2']
for i, t in enumerate(np.arange(d['v0'], d['t1'] - .2, B)): bas(walk[min(i, 7)] if i < 8 else 'G2', t, .45 + i * .02, .4)
# home: warm marimba arpeggio
h = s('home')
for i, t in enumerate(np.arange(h['t0'], h['t1'], E8)): mar(['G4', 'B4', 'D5', 'G5', 'D5', 'B4'][i % 6], t, .3, .6, .2)
# end: one glock note per station, chord stabs on the stamps, final chord
st = [e['t'] for e in EV if e['type'] == 'tick']
scale = ['G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'D7', 'G7']
for i, t in enumerate(st): glk(scale[i % 12], t, .35, .8, (i / 11 - .5) * .8)
stamps = [e['t'] for e in EV if e['type'] == 'stamp' and e['t'] > s('end')['t0']]
for i, t in enumerate(stamps):
    for p in CH[['G', 'C', 'D'][i]]: mar(p, t, .55, 1.0, 0)
    hit('cajon', 'bass', t, .6, 0, .8); bas(ROOT[['G', 'C', 'D'][i]], t, .6, .6)
tend = stamps[-1] + B * 2 if stamps else END - 2
for p in ['G2', 'D3', 'G3', 'B3', 'D4', 'G4']: mar(p, tend, .5, 3.0, 0)
glk('G6', tend, .45, 3.0); glk('D6', tend + E8, .35, 2.5); bas('G1', tend, .6, 2.5)
keys['final'] = tend

# cool: low-pass the whole music for the breath
mix = sum(stems.values())
c = s('cool'); a, b = int(c['t0'] * SR), int(c['t1'] * SR)
lpf = sosfilt(butter(2, 900, 'low', fs=SR, output='sos'), mix[a:b], axis=0)
w = np.ones(b - a); r = int(.3 * SR); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r)
mix[a:b] = mix[a:b] * (1 - w[:, None]) + lpf * w[:, None]
mix = S.room(mix, size=.35, mix=.14)
pk = np.abs(mix).max(); mix = mix / pk * .8 if pk > 0 else mix
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'score.wav'), mix[:int((END + .1) * SR)], SR)
json.dump(keys, open(os.path.join(HERE, 'out', 'score.json'), 'w'), indent=1)
print('score', round(END, 2), 's · instruments: marimba, glockenspiel, shaker, cajon, conga, woodblock, jazz_bass')
