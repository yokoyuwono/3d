"""Sound design for ANDAI… Episode 4 (Andai ada lubang tembus Bumi).
Needs build/ep4_events.json:  node tools/render.mjs --page ep4.html --events build/ep4_events.json
Optional backsound: episodes/ep4/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/ep4/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'ep4')
EV = json.load(open(os.path.join(ROOT, 'build', 'ep4_events.json')))
m = Mix(EV['duration'], seed=13)
CH = EV['chapters']
J, X = EV['jump'], EV['exit']
E3, G3, A3, B3, C4, D4, E4, G4, A4, B4 = 164.8, 196, 220, 246.9, 261.6, 293.7, 329.6, 392, 440, 493.9

# ---------------------------------------------------------------- music
# hook: adventurous, curious (E minor pluck ostinato)
for i, t0 in enumerate(np.arange(1.7, CH[0], 0.3)):
    m.place(m.music, m.pluck([E4, G4, B4, G4, A4, G4][i % 6], 0.6, 6), t0, 0.07)
m.music += m.pad([82.4, 123.5, E3, B3], 1.5, CH[0] + 0.4, 0.09, att=1)
# chapter 1: cold, industrial (low drone + metallic pings)
m.music += m.pad([55, 82.4, 110], CH[0] + 0.2, CH[1] + 0.3, 0.10, att=1.5)
for t0 in np.arange(CH[0] + 0.8, CH[1], 1.6):
    m.place(m.music, m.tone(1046.5, 1.2, 3) * 0.5 + m.tone(1046.5 * 2.76, 1.2, 6) * 0.15, t0, 0.05)
# chapter 2: the fall — rising, driving, heat (tempo follows speed)
u = np.clip((m.T - J) / (X - J), 0, 1)
speed = np.sin(np.pi * u) * ((m.T > J) & (m.T < X))
m.music += m.pad([82.4, 123.5, 164.8, 246.9], CH[1] + 0.2, X + 0.5, 0.10, att=2)
tt = J
while tt < X:
    sp = np.sin(np.pi * np.clip((tt - J) / (X - J), 0, 1))
    m.place(m.music, m.tone(55, 0.3, 9) + m.tone(110, 0.3, 11) * 0.4, tt, 0.16 + 0.12 * sp)
    tt += 0.75 - 0.45 * sp
# chapter 3: arrival — bright, warm (G major) with a little Latin-flavoured pluck
m.music += m.pad([98, 146.8, 196, 246.9, 293.7], X - 0.2, CH[3] + 0.4, 0.09, att=0.8)
for i, t0 in enumerate(np.arange(X, CH[3] - 0.2, 0.25)):
    if i % 8 in (0, 3, 6):
        m.place(m.music, m.pluck([G4, B4, D4 * 2, B4][i % 4], 0.5, 7), t0, 0.07)
# chapter 4: the catch — pendulum tick-tock, then tension
for i, t0 in enumerate(np.arange(CH[3] + 0.4, EV['wall'], 0.98)):
    m.place(m.music, m.tone(1760 if i % 2 else 1320, 0.15, 25), t0, 0.06)
m.music += m.pad([55, 58.3, 82.4], CH[3] + 0.2, CH[4] + 0.4, 0.11, att=1.5)
# chapter 5: night, the Moon — gentle, then mysterious as it fades
m.music += m.pad([E3, B3, E4, G4], CH[4] + 0.2, EV['moonFade'] + 0.5, 0.08, att=2)
for i, t0 in enumerate(np.arange(CH[4] + 0.6, EV['moonFade'], 0.9)):
    m.place(m.music, m.tone([B4, G4, E4, D4 * 2][i % 4], 2.0, 1.6) * 0.5 + m.tone([B4, G4, E4, D4 * 2][i % 4] * 2.76, 2.0, 4) * 0.1, t0, 0.08)
m.music += m.pad([55, 82.4, 116.5], EV['moonFade'], m.dur, 0.12, att=1.0, rel=1.2)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.10)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.45)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.2)
# digging scoops on the beach (hook + "imagination")
for t0, t1, mode in EV['life']:
    if mode == 'calm':
        for s in np.arange(t0 + 0.3, t1 - 0.2, 0.9):
            m.place(m.sfx, m.burst(400, 3000, 0.18, 18), s, 0.1)
# Kola: wind + machinery hum
for t0, t1, mode in EV['life']:
    if mode == 'kola':
        w = m.win(t0, t1, 0.3, 0.3)
        m.sfx += m.noise(300, 3500, -0.2) * 0.09 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * m.T)) * w
        m.sfx += (np.sin(2 * np.pi * 48 * m.T) * 0.5 + m.noise(40, 300, -0.6) * 0.5) * 0.06 * w
# the jump and the fall: rushing air that follows the speed, rumble of rock
m.place(m.sfx, m.tone(lambda t: 300 - 200 * t, 0.8, 2), J, 0.3)
air = m.noise(120, 5000, -0.4)
m.sfx += air * 0.45 * speed ** 1.2
m.sfx += m.noise(20, 200, -1.0) * 0.25 * speed
for t0, t1 in EV['pov']:
    m.sfx += m.noise(60, 900, -0.5) * 0.08 * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * m.T)) * m.win(t0, t1, 0.2, 0.2)  # molten bubbling
m.place(m.sfx, m.boom(40, 40, 1.5, 3), X, 0.3)
# "¡Hola!" bright chime, falling back in, the wall, burning
m.place(m.sfx, m.tone(1318.5, 0.5, 6) + m.tone(1760, 0.5, 6) * 0.6, EV['hola'], 0.12)
m.place(m.sfx, m.tone(lambda t: 600 - 450 * t, 0.9, 2.5), EV['fallback'], 0.25)
m.place(m.sfx, m.boom(50, 60, 1.2, 4), EV['wall'] + 1.0, 0.6)
m.place(m.sfx, m.burst(150, 6000, 0.6, 6), EV['wall'] + 1.0, 0.35)
m.sfx += m.noise(2000, 9000) * 0.08 * m.win(EV['burn'], EV['burn'] + 3, 0.2, 0.5)
# Andes countryside: birds; night town: crickets
m.life([[t0, t1, 'dieng'] for t0, t1, mode in EV['life'] if mode == 'andes'])
for t0, t1, mode in EV['life']:
    if mode == 'night-calm':
        cr = np.sin(2 * np.pi * 4300 * m.T) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * m.T))) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 1.1 * m.T)))
        m.sfx += cr * 0.012 * m.win(t0, t1, 0.4, 0.4)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
