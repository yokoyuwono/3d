"""Sound design for KALAU KAMU… Episode 2 (Kalau kamu tersambar petir).
Needs build/k2_events.json:  node tools/render.mjs --page k2.html --events build/k2_events.json
Usage: python3 episodes/k2/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'k2')
EV = json.load(open(os.path.join(ROOT, 'build', 'k2_events.json')))
m = Mix(EV['duration'], seed=43)
CH = EV['chapters']
D4, F4, G4, A4, C5, D5, E4, B3 = 293.7, 349.2, 392, 440, 523.3, 587.3, 329.6, 246.9

# ---------------------------------------------------------------- music: electric tension, calm help section, hopeful end
m.music += m.pad([36.7, 55, 73.4], 1.7, CH[3] + 0.3, 0.1, att=1)
tt, i = 1.7, 0
while tt < CH[3] - 0.3:
    m.place(m.music, m.tone(36.7, 0.25, 12) + m.tone(73.4, 0.25, 14) * 0.4, tt, 0.13)
    if i % 4 == 3:
        m.place(m.music, m.tone(lambda t: 2000 + 3000 * t, 0.15, 20), tt, 0.025)          # electric zaps
    if i % 8 in (2, 5):
        m.place(m.music, m.pluck([D4, F4, A4, C5][(i // 8) % 4], 0.4, 7), tt, 0.04)
    tt += 0.45; i += 1
m.music += m.pad([146.8, 220, 293.7, 349.2], CH[3] - 0.2, CH[4] + 0.3, 0.08, att=1.5)      # what to do: steady
for j, t0 in enumerate(np.arange(CH[3] + 0.5, CH[4], 0.6)):
    m.place(m.music, m.pluck([D5, A4, F4, A4][j % 4], 0.4, 6), t0, 0.04)
m.music += m.pad([146.8, 220, 293.7, 370], CH[4] - 0.2, EV['teaser'], 0.08, att=2)          # hope: D major
m.music += m.pad([41.2, 43.7, 61.7], EV['teaser'], m.dur, 0.12, att=0.5, rel=1)              # deep sea teaser

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.06)
for t0 in EV['strikes']:                                                                     # crack + rolling thunder
    m.place(m.sfx, m.burst(1500, 12000, 0.12, 25), t0, 0.5)
    m.place(m.sfx, m.boom(40, 35, 2.2, 1.6), t0 + 0.08, 0.7)
    m.place(m.sfx, m.noise(30, 400, -0.9)[: int(2.5 * m.sr)] * np.exp(-np.linspace(0, 4, int(2.5 * m.sr))), t0 + 0.2, 0.25) if hasattr(m, 'sr') else None
for k in range(10):                                                                          # counting seconds to the thunder
    m.place(m.sfx, m.tone(1500, 0.05, 50), EV['count'][0] + 0.2 + k / 3, 0.05)
m.place(m.sfx, m.boom(40, 35, 2.2, 1.6), EV['count'][0] + 3.2, 0.6)
m.sfx += np.sin(2 * np.pi * 1000 * m.T) * 0.03 * ((m.T > EV['flat']) & (m.T < EV['flat'] + 4)).astype(float)   # flatline beep
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.12)
for t0 in np.arange(EV['cprBack'], EV['cprBack'] + 4, 0.83):
    m.place(m.sfx, m.tone(1000, 0.08, 30), t0, 0.06)                                         # heart monitor beeps again
rain = m.noise(1500, 9000, -0.2) * 0.6 + m.noise(200, 1500, -0.5) * 0.4
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'storm':
        m.sfx += rain * 0.09 * w
    elif mode == 'calm':
        life.append([t0, t1, 'calm'])
    elif mode == 'deep':
        m.sfx += m.noise(30, 300, -1.0) * 0.12 * w
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
