"""Sound design for SKALA Episode 1 (Skala yang bikin merinding).
Needs build/sk1_events.json:  node tools/render.mjs --page sk1.html --events build/sk1_events.json
Usage: python3 episodes/sk1/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'sk1')
EV = json.load(open(os.path.join(ROOT, 'build', 'sk1_events.json')))
m = Mix(EV['duration'], seed=53)
RK = EV['ranks']
A3, C4, D4, E4, G4, A4, C5, D5, E5 = 220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3

def bell(f, t0, g, d=1.5):
    m.place(m.music, m.tone(f, 2.2, d) * 0.6 + m.tone(f * 2.76, 2.2, d * 3) * 0.1, t0, g)

# ---------------------------------------------------------------- music: each rank adds a layer; #1 is a huge swell; warm ending
m.music += m.pad([55, 82.4, 110], 1.7, EV['one'], 0.08, att=2)
for i in range(7):
    a = RK[i]; b = RK[i + 1] if i < 6 else EV['one'] + 0.1
    if i == 6: break
    tempo = 0.62 - i * 0.05
    for j, t0 in enumerate(np.arange(a + 0.3, b - 0.2, tempo)):
        m.place(m.music, m.tone(55 * (1 + i * 0.06), 0.3, 9) * 0.8, t0, 0.1 + 0.01 * i)
        if j % 2 == 0:
            bell([A4, C5, E5, D5, C5, G4][(j // 2 + i) % 6], t0, 0.035 + 0.004 * i)
    m.music += m.pad([110 * (1 + i * 0.03), 165 * (1 + i * 0.03), 220 * (1 + i * 0.03)], a, b, 0.03 + 0.008 * i, att=1)
m.music += m.pad([27.5, 41.2, 55, 82.4, 110, 164.8], EV['one'] - 0.5, EV['one'] + 37, 0.14, att=1.5, rel=3)   # #1: vast
m.music += m.pad([130.8, 196, 261.6, 329.6], EV['one'] + 36, m.dur, 0.08, att=3, rel=2)                         # home: C major
for j, t0 in enumerate(np.arange(EV['one'] + 37, m.dur - 1.5, 0.75)):
    bell([C5, G4, E5, G4, D5, G4, C5, E4][j % 8], t0, 0.04)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.07)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(40, 50, 1.0, 3.0), c, 0.35)
for i, t0 in enumerate(RK):                                                                 # rank hits, bigger each time
    m.place(m.sfx, m.boom(45 - i * 2, 40, 1.2, 3), t0, 0.35 + 0.05 * i)
    m.place(m.sfx, m.burst(400, 8000, 0.2, 14), t0, 0.12)
m.place(m.sfx, m.boom(28, 30, 4.0, 0.8), EV['reveal'], 0.8)
m.place(m.sfx, m.tone(lambda t: 80 + 40 * t, 3.0, 0.6), EV['reveal'], 0.15)
life = []
for t0, t1, kind in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if kind == 'world':
        life.append([t0, t1, 'calm'])
    elif kind == 'tsu':
        m.sfx += m.noise(100, 2500, -0.5) * 0.12 * w
    elif kind == 'space':
        m.sfx += m.noise(20, 200, -1.0) * 0.05 * w
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
