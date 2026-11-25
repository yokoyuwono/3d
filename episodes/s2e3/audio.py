"""Sound design for ANDAI… Season 2 Episode 3 (Andai semua orang Indonesia melompat bersamaan).
Needs build/s2e3_events.json:  node tools/render.mjs --page s2e3.html --events build/s2e3_events.json
Usage: python3 episodes/s2e3/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 's2e3')
EV = json.load(open(os.path.join(ROOT, 'build', 's2e3_events.json')))
m = Mix(EV['duration'], seed=29)
CH = EV['chapters']
G3, C4, D4, E4, G4, A4, C5, D5, E5, G5 = 196, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784

# ---------------------------------------------------------------- music: upbeat, communal (drum line + bright plucks)
m.music += m.pad([98, 146.8, 196, 246.9], 1.7, m.dur, 0.06, att=2, rel=2)
beat = 60 / 112
tt, i = 1.7, 0
quiet = [(EV['counts'][0] - 0.3, EV['jump'] + 0.6), (EV['slow'][0], EV['slow'][1]), (CH[3] - 0.2, CH[3] + 6)]
while tt < m.dur - 1:
    if not any(a <= tt < b for a, b in quiet):
        if i % 2 == 0:
            m.place(m.music, m.tone(55, 0.28, 10) + m.tone(110, 0.28, 12) * 0.3, tt, 0.14)      # kick
        if i % 4 == 2:
            m.place(m.music, m.burst(800, 6000, 0.1, 25), tt, 0.07)                             # snare/clap
        m.place(m.music, m.burst(6000, 12000, 0.03, 60), tt + beat / 2, 0.025)                  # hats
        if i % 2 == 1:
            m.place(m.music, m.pluck([G4, A4, C5, D5, E5, D5, C5, A4][(i // 2) % 8], 0.35, 8), tt, 0.045)
    tt += beat; i += 1
# the danger chapter: tense, pulsing low strings (the bridge)
m.music += m.pad([55, 82.4, 110, 116.5], CH[3] - 0.2, CH[4] + 0.4, 0.1, att=1.0)
# slow-motion: a long rising swell
m.music += m.pad([G3, D4, G4, D5], EV['slow'][0], EV['slow'][1], 0.08, att=0.8, rel=0.8)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.07)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(50, 50, 0.7, 4), c, 0.35)
for k, t0 in enumerate(EV['counts']):
    f = 1760 if k == 3 else 880
    m.place(m.sfx, m.tone(f, 0.25 if k < 3 else 0.6, 8 if k < 3 else 3), t0, 0.16)
m.place(m.sfx, m.boom(40, 40, 1.2, 3), EV['jump'] + 0.63, 0.7)                                # the big landing
m.place(m.sfx, m.burst(100, 3000, 0.4, 8), EV['jump'] + 0.63, 0.35)
for t0 in EV['landings']:
    m.place(m.sfx, m.boom(60, 40, 0.25, 12), t0, 0.22)
m.place(m.sfx, m.tone(lambda t: 600 - 400 * t, 1.2, 1.5), EV['slow'][0], 0.08)                 # slow-motion drop
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.13)
crowd = m.noise(300, 3500, -0.3) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 1.1 * m.T)))
creak = np.sin(2 * np.pi * (90 + 20 * np.sin(2 * np.pi * 1.0 * m.T)) * m.T) * 0.5 + m.noise(100, 600, -0.6) * 0.5
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'crowd':
        m.sfx += crowd * 0.09 * w
    elif mode == 'bridge':
        s = 1.0 if EV['sway'][0] <= t0 < EV['sway'][1] else 0.3
        m.sfx += creak * 0.05 * s * w
        life.append([t0, t1, 'calm'])
    elif mode == 'warung':
        m.sfx += m.noise(300, 3000, -0.4) * 0.02 * w
        life.append([t0, t1, 'calm'])
    elif mode in ('calm', 'dieng'):
        life.append([t0, t1, mode])
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
