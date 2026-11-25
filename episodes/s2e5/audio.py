"""Sound design for ANDAI… Season 2 Episode 5 (Andai Matahari tiba-tiba padam).
Needs build/s2e5_events.json:  node tools/render.mjs --page s2e5.html --events build/s2e5_events.json
Usage: python3 episodes/s2e5/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 's2e5')
EV = json.load(open(os.path.join(ROOT, 'build', 's2e5_events.json')))
m = Mix(EV['duration'], seed=37)
CH = EV['chapters']
D4, E4, Fs4, A4, B4, D5, E5, Fs5, A5 = 293.7, 329.6, 370, 440, 493.9, 587.3, 659.3, 740, 880

def bell(f, t0, g, d=1.6):
    m.place(m.music, m.tone(f, 2.0, d) * 0.6 + m.tone(f * 2.76, 2.0, d * 3) * 0.12, t0, g)

# ---------------------------------------------------------------- music
# warm daylight theme until darkness, then cold space drones; a warm geothermal pulse; sunrise in D major
for i, t0 in enumerate(np.arange(1.8, EV['dark'] - 0.2, 0.5)):
    bell([D5, A4, Fs5, A4, E5, D5, A4, B4][i % 8], t0, 0.05)
m.music += m.pad([146.8, 220, 293.7, 370], 1.7, EV['dark'] + 0.3, 0.07, att=1.5, rel=0.3)
m.music += m.pad([36.7, 55, 73.4], EV['dark'], CH[3] + 0.3, 0.11, att=0.4)
for t0 in np.arange(CH[0] + 0.5, CH[2], 2.3):
    bell([A5, E5, B4 * 2][int(t0) % 3], t0, 0.035, 0.8)                                  # distant glassy stars
m.music += m.pad([41.2, 61.7, 82.4, 98], CH[2] - 0.2, CH[3] + 0.3, 0.1, att=1.5)        # deep sea
m.music += m.pad([110, 164.8, 220, 277.2], CH[3] - 0.2, CH[4] + 0.3, 0.08, att=1.5)     # geothermal: warmer
for t0 in np.arange(CH[3] + 0.4, CH[4], 0.9):
    m.place(m.music, m.tone(55, 0.5, 6) + m.tone(110, 0.5, 8) * 0.3, t0, 0.12)
m.music += m.pad([146.8, 220, 293.7, 370], CH[4] - 0.2, m.dur, 0.08, att=2.5, rel=2)      # sunrise
for i, t0 in enumerate(np.arange(EV['sunrise'], m.dur - 1.5, 0.5)):
    bell([D5, A4, Fs5, A4, E5, D5, A4, B4][i % 8], t0, 0.05)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.07)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(40, 50, 1.0, 3.0), c, 0.35)
m.place(m.sfx, m.tone(lambda t: 900 - 700 * t, 1.2, 1.5), EV['dark'], 0.18)            # the light switching off
m.place(m.sfx, m.boom(30, 30, 2.0, 1.5), EV['dark'], 0.5)
for k in range(10):                                                                     # countdown ticks of the 8:20 timer
    m.place(m.sfx, m.tone(1500, 0.05, 50), EV['timer'][0] + (EV['timer'][1] - EV['timer'][0]) * k / 10, 0.06)
m.place(m.sfx, m.whoosh_buf(1.5) if hasattr(m, 'whoosh_buf') else m.burst(200, 3000, 1.2, 2), EV['fly'], 0.2)
m.place(m.sfx, m.tone(lambda t: 600 - 400 * t, 0.8, 2), EV['moonOff'], 0.08)
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.13)
wind = m.noise(200, 3000, -0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * m.T) ** 2)
deep = m.noise(30, 300, -1.0)
machine = np.sin(2 * np.pi * 50 * m.T) * 0.5 + m.noise(80, 600, -0.6) * 0.5
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'calm':
        life.append([t0, t1, 'calm'])
    elif mode == 'night':
        m.sfx += wind * 0.02 * w
    elif mode == 'wind':
        m.sfx += wind * 0.08 * w
    elif mode == 'deep':
        m.sfx += deep * 0.12 * w
    elif mode == 'machine':
        m.sfx += machine * 0.035 * w + wind * 0.03 * w
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
