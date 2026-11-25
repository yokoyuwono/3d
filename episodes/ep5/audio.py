"""Sound design for ANDAI… Episode 5 (Andai Bulan menghilang), the series finale.
Needs build/ep5_events.json:  node tools/render.mjs --page ep5.html --events build/ep5_events.json
Optional backsound: episodes/ep5/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/ep5/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'ep5')
EV = json.load(open(os.path.join(ROOT, 'build', 'ep5_events.json')))
m = Mix(EV['duration'], seed=17)
CH = EV['chapters']
D3, F3, A3, C4, D4, E4, F4, G4, A4, C5, D5, E5 = 146.8, 174.6, 220, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3, 587.3, 659.3

def bell(f, t0, g, decay=1.6):
    m.place(m.music, m.tone(f, 2.0, decay) * 0.6 + m.tone(f * 2.76, 2.0, decay * 3) * 0.12, t0, g)

# ---------------------------------------------------------------- music
# hook: night, a lonely music-box figure that stops when the Moon disappears
for i, t0 in enumerate(np.arange(1.8, EV['moonGone'] + 1.0, 0.45)):
    bell([A4, E5, D5, C5, E5, A4][i % 6], t0, 0.07)
m.music += m.pad([55, 82.4, 110], EV['moonGone'], CH[0] + 0.4, 0.10, att=1.5)
m.music += m.pad([D3, A3, D4, F4], 12.3, CH[0] + 0.4, 0.07, att=1.0)           # "Lebaran" — warm hint
# chapter 1: tides — slow rolling arpeggio, like waves
m.music += m.pad([D3, A3, D4], CH[0] + 0.2, CH[1] + 0.4, 0.08, att=1.5)
for i, t0 in enumerate(np.arange(CH[0] + 0.5, CH[1], 0.4)):
    m.place(m.music, m.pluck([D4, F4, A4, C5, A4, F4, E4, A3][i % 8], 0.8, 5), t0, 0.05 + 0.02 * np.sin(i * 0.4))
# chapter 2: dark nights, hatchlings, coral — celesta over a low pad, darker when the light goes
m.music += m.pad([F3, C4, A3, E4], CH[1] + 0.2, CH[2] + 0.4, 0.08, att=1.5)
for i, t0 in enumerate(np.arange(CH[1] + 0.6, CH[2], 0.6)):
    bell([F4, A4, C5, E5, C5, A4][i % 6], t0, 0.05)
# chapter 3: the tilt — tension that grows with the wobble
m.music += m.pad([55, 58.3, 82.4], CH[2] + 0.2, CH[3] + 0.4, 0.11, att=2)
tt = EV['tilt']
while tt < CH[3]:
    m.place(m.music, m.tone(55, 0.35, 8) + m.tone(110, 0.35, 10) * 0.4, tt, 0.14)
    tt += 0.9 - 0.4 * np.clip((tt - EV['tilt']) / 10, 0, 1)
# chapter 4: Lebaran — warm D dorian, gentle pentatonic melody; hollow when the hilal is gone
m.music += m.pad([D3, A3, D4, F4], CH[3] + 0.2, EV['hilalFade'] + 0.6, 0.09, att=1.5)
for i, t0 in enumerate(np.arange(CH[3] + 0.6, EV['hilalFade'], 0.55)):
    if i % 4 != 3:
        m.place(m.music, m.pluck([D5, C5, A4, G4, A4, C5, D5, E5][i % 8], 0.7, 4), t0, 0.06)
m.music += m.pad([73.4, 77.8, 110], EV['hilalFade'], CH[4] + 0.4, 0.11, att=1.0)
# chapter 5: relief, wonder, then a hopeful ending (D major)
m.music += m.pad([D3, A3, D4, 370], CH[4] + 0.2, m.dur, 0.09, att=2, rel=2)
for i, t0 in enumerate(np.arange(CH[4] + 0.8, EV['end'] + 1.5, 0.5)):
    bell([D5, A4, 370 * 2, A4, E5, D5, A4, 370 * 2][i % 8], t0, 0.05 + 0.02 * (t0 > EV['cta']))

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.09)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.4)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.18)
# the Moon fading: a soft descending shimmer
m.place(m.sfx, m.tone(lambda t: 1800 - 900 * t, 1.6, 1.2) * 0.5, EV['moonGone'], 0.12)
m.place(m.sfx, m.tone(lambda t: 1800 - 900 * t, 1.6, 1.2) * 0.5, EV['hilalFade'], 0.12)
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.14)   # "TERJAWAB"
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['far'], 0.12)
# eclipse: deep hum + the "ring" appearing
m.sfx += (np.sin(2 * np.pi * 41 * m.T) * 0.6 + m.noise(30, 200, -0.8) * 0.4) * 0.07 * m.win(EV['eclipse'], EV['eclipse'] + 7.5, 0.5, 0.8)
m.place(m.sfx, m.tone(1046.5, 2.0, 1.2) + m.tone(1568, 2.0, 1.5) * 0.5, EV['annular'], 0.08)
# environments: waves, underwater, birds, crickets, town life
waves = m.noise(150, 2500, -0.5) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.12 * m.T) ** 2)
bubbles = m.noise(80, 700, -0.7) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * m.T))
cr = np.sin(2 * np.pi * 4300 * m.T) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * m.T))) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 1.1 * m.T)))
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode in ('calm', 'beach', 'night', 'mangrove'):
        m.sfx += waves * (0.10 if mode != 'night' else 0.05) * w
    if mode in ('night', 'beach'):
        m.sfx += cr * 0.012 * w
    if mode == 'reef':
        m.sfx += bubbles * 0.12 * w
        for s in np.arange(t0 + 0.2, t1, 0.37):
            m.place(m.sfx, m.tone(lambda t: 600 + 900 * t, 0.12, 20), s + 0.1 * np.sin(s * 7), 0.03)
    if mode in ('calm', 'heat', 'snow'):
        life.append([t0, t1, mode])
    if mode in ('dusk', 'mangrove'):
        life.append([t0, t1, 'dieng' if mode == 'dusk' else 'sawah'])
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
