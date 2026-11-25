"""Sound design for KALAU KAMU… Episode 3 (Kalau kamu terjebak di dasar Palung Jawa).
Needs build/k3_events.json:  node tools/render.mjs --page k3.html --events build/k3_events.json
Usage: python3 episodes/k3/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'k3')
EV = json.load(open(os.path.join(ROOT, 'build', 'k3_events.json')))
m = Mix(EV['duration'], seed=47)
CH = EV['chapters']
C4, Eb4, G4, Bb4, D5, F4, A4, C5 = 261.6, 311.1, 392, 466.2, 587.3, 349.2, 440, 523.3

def bell(f, t0, g, d=1.4):
    m.place(m.music, m.tone(f, 2.4, d) * 0.6 + m.tone(f * 2.76, 2.4, d * 3) * 0.1, t0, g)

# ---------------------------------------------------------------- music: abyssal drones, glassy wonder, a steady survival pulse
m.music += m.pad([32.7, 49, 65.4], 1.7, m.dur, 0.12, att=2, rel=2)
for j, t0 in enumerate(np.arange(1.8, CH[3] - 0.3, 1.8)):
    bell([C5, G4, Eb4 * 2, Bb4][j % 4], t0, 0.035)
m.music += m.pad([130.8, 196, 261.6, 311.1], CH[2] - 0.2, CH[3] + 0.3, 0.06, att=2)     # life in the dark: wonder
for t0 in np.arange(CH[3] + 0.3, CH[4], 0.75):                                          # survival plan: steady pulse
    m.place(m.music, m.tone(49, 0.4, 7) + m.tone(98, 0.4, 9) * 0.3, t0, 0.13)
m.music += m.pad([174.6, 261.6, 349.2, 440], CH[4] - 0.2, EV['teaser'], 0.07, att=2)     # neighbours: warm F major
for j, t0 in enumerate(np.arange(CH[4] + 0.4, EV['teaser'], 0.9)):
    bell([F4 * 2, C5, A4, C5][j % 4], t0, 0.035)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.05)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(35, 50, 1.0, 3.0), c, 0.3)
for t0 in np.arange(1.9, m.dur - 2, 4.3):                                                # sonar pings
    m.place(m.sfx, m.tone(1180, 1.6, 2.5) * 0.6 + m.tone(1180 * 1.5, 1.6, 4) * 0.15, t0, 0.05)
for t0 in np.arange(5, m.dur - 2, 9.7):                                                  # hull creaks
    m.place(m.sfx, m.tone(lambda t: 140 - 40 * t, 0.9, 3) + m.noise(100, 900, -0.5)[: int(0.9 * 48000)] * 0.0, t0, 0.06)
m.place(m.sfx, m.burst(300, 6000, 0.25, 14) + m.boom(90, 40, 0.25, 14), EV['can'], 0.4)   # can crushed
m.place(m.sfx, m.boom(50, 40, 0.8, 4), EV['drop'], 0.4)                                  # weights released
for t0, t1 in EV['dives']:
    m.sfx += m.noise(80, 900, -0.5) * 0.07 * m.win(t0, t1, 0.4, 0.4)                     # descent rush
bub = m.noise(400, 4000, -0.2) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * m.T)))
m.sfx += bub * 0.035 * m.win(EV['rise'][0], EV['rise'][1], 0.4, 0.4)                      # bubbles rising
m.sfx += np.sin(2 * np.pi * 60 * m.T) * 0.05 * m.win(EV['rov'][0], EV['rov'][1], 0.5, 0.5)   # ROV thrusters
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.12)
deepw = m.noise(20, 250, -1.0)
for t0, t1, kind in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if kind == 'deep':
        m.sfx += deepw * 0.12 * w
    elif kind == 'inside':
        m.sfx += (np.sin(2 * np.pi * 120 * m.T) * 0.3 + m.noise(200, 1500, -0.6) * 0.7) * 0.03 * w   # life support hum

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
