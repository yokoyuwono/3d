"""Sound design for ANDAI… Season 2 Episode 2 (Andai Bumi kehilangan oksigen 5 detik).
Needs build/s2e2_events.json:  node tools/render.mjs --page s2e2.html --events build/s2e2_events.json
Usage: python3 episodes/s2e2/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 's2e2')
EV = json.load(open(os.path.join(ROOT, 'build', 's2e2_events.json')))
m = Mix(EV['duration'], seed=23)
CH = EV['chapters']
C4, D4, E4, F4, G4, A4, B4, C5, D5, E5 = 261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3, 659.3

# ---------------------------------------------------------------- music: playful "fact-check" groove, darker for the doomsday part
m.music += m.pad([65.4, 98, 130.8], 1.7, EV['doom'], 0.07, att=1.5)
beat = 0.42
tt = 1.7
i = 0
while tt < EV['doom'] - 0.2:
    if not (EV['off'] <= tt < EV['on']):                        # the groove drops out while every flame is out
        if i % 2 == 0:
            m.place(m.music, m.tone(65.4, 0.25, 12) + m.tone(130.8, 0.25, 14) * 0.3, tt, 0.13)
        if i % 4 == 2:
            m.place(m.music, m.burst(1500, 9000, 0.06, 40), tt, 0.05)
        if i % 8 in (1, 3, 6):
            m.place(m.music, m.pluck([C5, E5, G4, A4, D5, C5, G4, E4][(i // 2) % 8], 0.4, 8), tt, 0.05)
    tt += beat; i += 1
m.music += m.pad([55, 58.3, 82.4, 110], EV['doom'] - 0.2, CH[4] + 0.4, 0.12, att=1.0)
for t0 in np.arange(EV['doom'] + 1, CH[4], 1.6):
    m.place(m.music, m.tone(41.2, 0.8, 4) + m.tone(82.4, 0.8, 5) * 0.4, t0, 0.15)
m.music += m.pad([C4 / 2, G4 / 2, C4, E4], CH[4] + 0.2, m.dur, 0.08, att=2, rel=2)       # relief
for j, t0 in enumerate(np.arange(CH[4] + 0.8, m.dur - 1, 0.42)):
    if j % 2 == 0:
        m.place(m.music, m.pluck([C5, E5, G4, A4, D5, C5, G4, E4][(j // 2) % 8], 0.4, 8), t0, 0.045)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.08)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.4)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.18)
for t0 in EV['ticks']:                                          # countdown ticks
    m.place(m.sfx, m.tone(1760, 0.08, 40) + m.tone(880, 0.08, 40) * 0.5, t0, 0.12)
for t0, txt in EV['stamps']:                                    # verdict stamps
    m.place(m.sfx, m.boom(80, 40, 0.3, 12), t0, 0.35)
    if txt == 'FAKTA':
        m.place(m.sfx, m.tone(1046.5, 0.5, 6) + m.tone(1568, 0.5, 6) * 0.7, t0 + 0.05, 0.14)
    elif txt == 'MITOS':
        m.place(m.sfx, m.tone(lambda t: 220 - 60 * t, 0.45, 3) + m.tone(lambda t: 233 - 60 * t, 0.45, 3), t0 + 0.05, 0.12)
    else:
        m.place(m.sfx, m.tone(659.3, 0.4, 6) + m.tone(622.3, 0.4, 6), t0 + 0.05, 0.1)
for t0 in EV['recap']:
    m.place(m.sfx, m.tone(1318.5, 0.2, 18), t0, 0.08)
# every flame goes out: a soft "fwump", engines cough, then silence; relight click + whoosh
m.place(m.sfx, m.burst(80, 1200, 0.5, 8), EV['off'], 0.4)
for k in range(3):
    m.place(m.sfx, m.burst(2000, 6000, 0.03, 80), EV['on'] + 0.15 * k, 0.1)
m.place(m.sfx, m.burst(150, 3000, 0.6, 5), EV['on'] + 0.5, 0.25)
# ears: pressure "pop" and ringing
m.place(m.sfx, m.boom(60, 20, 0.4, 10), EV['gone'], 0.4)
# doomsday: rumble, crumbling, escaping gas hiss
m.sfx += m.noise(20, 200, -1.0) * 0.28 * m.win(EV['doom2'], EV['doom2'] + 3.5, 0.3, 0.6)
for t0 in np.arange(EV['doom2'], EV['doom2'] + 3, 0.23):
    m.place(m.sfx, m.burst(200, 3000, 0.1, 25), t0, 0.08)
m.sfx += m.noise(2000, 9000, 0) * 0.07 * m.win(EV['gas'], EV['gas'] + 4, 0.4, 0.8)
# ringing ears (tinnitus-like tone) right after the pressure drop and in the 'ngiiing' shot
m.sfx += np.sin(2 * np.pi * 6200 * m.T) * 0.012 * (m.win(EV['gone'], EV['gone'] + 2.5, 0.05, 1.5) + m.win(EV['ring'][0], EV['ring'][1], 0.2, 0.6))

# environments
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'warung':
        m.sfx += m.noise(300, 3000, -0.4) * 0.025 * w                 # frying sizzle / chatter bed
        life.append([t0, t1, 'calm'])
    elif mode == 'reef':
        m.sfx += m.noise(80, 700, -0.7) * 0.1 * w
    elif mode in ('calm', 'dieng', 'sawah'):
        life.append([t0, t1, mode])
m.life(life)
# silence the warung sizzle while the flames are out
m.sfx *= 1 - 0.7 * m.win(EV['off'], EV['on'], 0.05, 0.4)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
