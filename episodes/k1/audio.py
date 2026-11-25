"""Sound design for KALAU KAMU… Episode 1 (Kalau kamu jatuh dari pesawat tanpa parasut).
Needs build/k1_events.json:  node tools/render.mjs --page k1.html --events build/k1_events.json
Usage: python3 episodes/k1/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'k1')
EV = json.load(open(os.path.join(ROOT, 'build', 'k1_events.json')))
m = Mix(EV['duration'], seed=41)
CH = EV['chapters']
E3, G3, A3, B3, D4, E4, G4, A4, B4, D5 = 164.8, 196, 220, 246.9, 293.7, 329.6, 392, 440, 493.9, 587.3

# ---------------------------------------------------------------- music: tense survival thriller -> awe -> warm reassurance
m.music += m.pad([41.2, 61.7, 82.4], 1.7, CH[3] + 0.3, 0.1, att=1.0)
tt, i = EV['exit'], 0
while tt < CH[3] - 0.3:
    if not (EV['faint'][0] <= tt < EV['faint'][1]):
        m.place(m.music, m.tone(41.2, 0.3, 10) + m.tone(82.4, 0.3, 12) * 0.4, tt, 0.14)
        if i % 4 == 2:
            m.place(m.music, m.pluck([E4, G4, B4, A4][(i // 4) % 4], 0.4, 7), tt, 0.045)
    tt += 0.5; i += 1
m.music += m.pad([E3, B3, E4, G4], CH[3] - 0.2, CH[4] + 0.3, 0.08, att=2)          # true stories: awe
for j, t0 in enumerate(np.arange(CH[3] + 0.5, CH[4], 0.75)):
    m.place(m.music, m.tone([E4, B4, G4, D5][j % 4], 2.0, 1.6) * 0.5, t0, 0.05)
m.music += m.pad([G3, D4, G4, B4], CH[4] - 0.2, EV['teaser'], 0.08, att=2)          # reassurance: G major
for j, t0 in enumerate(np.arange(CH[4] + 0.5, EV['teaser'], 0.5)):
    if j % 2 == 0:
        m.place(m.music, m.pluck([G4, B4, D5, B4][(j // 2) % 4], 0.4, 7), t0, 0.045)
m.music += m.pad([55, 58.3, 82.4], EV['teaser'], m.dur, 0.12, att=0.4, rel=1)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.07)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.35)
m.place(m.sfx, m.boom(50, 60, 1.0, 3), EV['exit'], 0.5)                              # door blowing out
m.place(m.sfx, m.burst(200, 8000, 1.0, 3), EV['exit'], 0.35)
# rushing wind follows the fall speed (silenced while unconscious)
speed = np.clip((m.T - EV['exit']) / 7, 0, 1) * (m.T < EV['land'])
faint = ((m.T > EV['faint'][0]) & (m.T < EV['faint'][1])).astype(float)
wind = m.noise(150, 6000, -0.3)
m.sfx += wind * (0.05 + 0.25 * speed) * (1 - 0.8 * faint) * (m.T > EV['exit'])
for t0 in np.arange(EV['faint'][0], EV['faint'][1], 0.85):                           # heartbeat in the blackout
    m.place(m.sfx, m.boom(55, 30, 0.15, 18), t0, 0.35); m.place(m.sfx, m.boom(50, 30, 0.12, 20), t0 + 0.25, 0.25)
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.13)
jet = np.sin(2 * np.pi * 95 * m.T) * 0.3 + m.noise(80, 1200, -0.5) * 0.7
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'cabin':
        m.sfx += jet * 0.1 * w
    elif mode == 'snow':
        m.sfx += m.noise(300, 3000, -0.4) * 0.05 * w
    elif mode == 'jungle':
        life.append([t0, t1, 'sawah'])
        m.sfx += m.noise(150, 1500, -0.6) * 0.03 * w
    elif mode == 'storm':
        m.sfx += m.noise(30, 300, -0.9) * 0.2 * w
    elif mode == 'calm':
        life.append([t0, t1, 'calm'])
m.life(life)
for t0 in np.arange(EV['teaser'], m.dur, 1.7):
    m.place(m.sfx, m.boom(35, 40, 1.4, 2.5), t0 + 0.3, 0.4)                          # thunder

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
