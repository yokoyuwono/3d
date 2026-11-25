"""Sound design for ANDAI… Season 2 Episode 1 (Andai Gunung Toba meletus lagi).
Needs build/s2e1_events.json:  node tools/render.mjs --page s2e1.html --events build/s2e1_events.json
Optional backsound: episodes/s2e1/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/s2e1/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 's2e1')
EV = json.load(open(os.path.join(ROOT, 'build', 's2e1_events.json')))
m = Mix(EV['duration'], seed=21)
CH = EV['chapters']
D3, A3, C4, D4, E4, F4, G4, A4, C5, D5 = 146.8, 220, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3, 587.3

# ---------------------------------------------------------------- music
# hook: serene lake (gentle pentatonic pluck, a nod to Batak gondang/hasapi colour), then an ominous drop
for i, t0 in enumerate(np.arange(1.8, CH[0], 0.32)):
    if i % 5 != 4:
        m.place(m.music, m.pluck([D5, A4, G4, E4, G4, A4, C5, A4][i % 8], 0.5, 7), t0, 0.06)
m.music += m.pad([D3, A3, D4], 1.7, CH[0] + 0.4, 0.07, att=1.5)
m.music += m.pad([36.7, 55, 73.4], 8.6, CH[0] + 0.4, 0.09, att=1.0)
# chapter 1: the ancient eruption — deep drums and a dark pad, then awe at the scale
m.music += m.pad([36.7, 55, 73.4, 110], CH[0] + 0.2, CH[1] + 0.4, 0.11, att=1.5)
for t0 in np.arange(EV['boom'], CH[1], 1.2):
    m.place(m.music, m.tone(55, 0.5, 6) + m.tone(82.4, 0.5, 8) * 0.4, t0, 0.15)
# chapter 2: today — urgency, driving pulse
m.music += m.pad([41.2, 61.7, 82.4, 123.5], CH[1] + 0.2, CH[2] + 0.4, 0.11, att=1.0)
tt = EV['now']
while tt < CH[2]:
    m.place(m.music, m.tone(41.2, 0.3, 9) + m.tone(82.4, 0.3, 11) * 0.5, tt, 0.17)
    tt += 0.5
# chapter 3: the world cools — cold, sparse, wide
m.music += m.pad([A3, C4, E4, 493.9], CH[2] + 0.2, CH[3] + 0.4, 0.08, att=2)
for i, t0 in enumerate(np.arange(CH[2] + 0.8, CH[3], 1.3)):
    m.place(m.music, m.tone([E4 * 2, C5, A4][i % 3], 2.0, 1.4) * 0.5, t0, 0.05)
# chapter 4: human survival — warm, hopeful, light hand percussion
m.music += m.pad([D3, A3, D4, 370], CH[3] + 0.2, CH[4] + 0.4, 0.09, att=1.5)
for i, t0 in enumerate(np.arange(CH[3] + 0.5, CH[4], 0.3)):
    if i % 4 in (0, 3):
        m.place(m.sfx, m.burst(150, 1200, 0.08, 30), t0, 0.06)
# chapter 5: calm reassurance, back to the lake melody, then the teaser sting
m.music += m.pad([D3, A3, D4, F4 * 1.06], CH[4] + 0.2, EV['teaser'], 0.08, att=2)
for i, t0 in enumerate(np.arange(CH[4] + 1, EV['teaser'], 0.32)):
    if i % 5 != 4:
        m.place(m.music, m.pluck([D5, A4, G4, E4, G4, A4, C5, A4][i % 8], 0.5, 7), t0, 0.05)
m.music += m.pad([55, 58.3, 82.4], EV['teaser'], m.dur, 0.12, att=0.6, rel=1.2)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.09)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(40, 50, 1.0, 3.0), c, 0.45)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.18)
for t0 in (EV['boom'], EV['now']):
    m.place(m.sfx, m.boom(28, 40, 3.5, 1.2), t0, 0.9)
    m.place(m.sfx, m.burst(80, 6000, 1.5, 2.5), t0, 0.35)
m.sfx += m.noise(20, 160, -1.0) * 0.22 * m.win(EV['rumble'], EV['now'], 1.0, 0.1)          # ground rumbling before
m.sfx += m.noise(30, 400, -0.8) * 0.18 * m.win(EV['collapse'][0], EV['collapse'][1] + 1, 0.5, 1.0)  # the caldera collapsing
m.sfx += m.noise(100, 3000, -0.5) * 0.12 * m.win(EV['flow'], EV['flow'] + 8, 0.5, 1.0)     # pyroclastic flow roar
for k in range(17):                                                                          # buckets dropping in
    m.place(m.sfx, m.tone(lambda t: 900 - 400 * t, 0.12, 25) + m.burst(200, 2500, 0.12, 40), EV['cubes'] + 2.4 * k / 16, 0.07)
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.14)
# environments
waves = m.noise(150, 1800, -0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * m.T) ** 2)
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'lake':
        m.sfx += waves * 0.05 * w
        life.append([t0, t1, 'sawah'])
    elif mode == 'ash':
        m.sfx += m.noise(200, 4000, -0.3) * 0.06 * w + m.noise(20, 150, -1) * 0.12 * w
    elif mode == 'erupt':
        m.sfx += m.noise(15, 120, -1.2) * 0.3 * w
    elif mode == 'savanna':
        life.append([t0, t1, 'dieng'])
    elif mode in ('sawah', 'calm'):
        life.append([t0, t1, mode])
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
