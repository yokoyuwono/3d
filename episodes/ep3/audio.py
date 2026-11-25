"""Sound design for ANDAI… Episode 3 (Andai semua es mencair).
Needs build/ep3_events.json:  node tools/render.mjs --page ep3.html --events build/ep3_events.json
Optional backsound: episodes/ep3/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/ep3/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'ep3')
EV = json.load(open(os.path.join(ROOT, 'build', 'ep3_events.json')))
m = Mix(EV['duration'], seed=11)
CH = EV['chapters']
D3, F3, A3, C4, D4, E4, F4, G4, A4, C5, D5 = 146.8, 174.6, 220, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3, 587.3

# ---------------------------------------------------------------- music
# hook: majestic but ominous (D minor), the sea rising around Monas
m.music += m.pad([73.4, 110, D3, A3, F4], 1.6, CH[0] + 0.4, 0.11, att=1.0)
rise = 110 * 2 ** (m.ss(EV['rise'], EV['rise'] + 4) * 1.0)
m.music += np.sin(2 * np.pi * np.cumsum(rise) / 48000) * 0.06 * m.win(EV['rise'], EV['rise'] + 4.5, 0.5, 0.5)
# chapter 1: icy, vast (high shimmer + slow pad)
m.music += m.pad([D3, A3, E4, A4], CH[0] + 0.2, CH[1] + 0.4, 0.08, att=2)
m.music += m.pad([1174.7, 1318.5, 1760], CH[0] + 0.5, CH[1], 0.025, att=2)
for i, t0 in enumerate(np.arange(CH[0] + 0.6, CH[1] - 0.3, 0.75)):
    m.place(m.music, m.tone([A4, E4, D5, C5][i % 4], 1.6, 2.2) * 0.5 + m.tone([A4, E4, D5, C5][i % 4] * 2.76, 1.6, 5) * 0.1, t0, 0.07)
# chapter 2: playful kitchen-science plucks (F major)
for i, t0 in enumerate(np.arange(CH[1] + 0.5, CH[2] - 0.3, 0.32)):
    m.place(m.music, m.pluck([F4, A4, C5, A4, G4, E4][i % 6], 0.7, 6), t0, 0.06)
m.music += m.pad([87.3, F3, A3, C4], CH[1] + 0.2, CH[2] + 0.3, 0.07)
# chapter 3: tension climbing with every metre (pulse speeds up)
m.music += m.pad([73.4, 110, 146.8, 174.6], CH[2] + 0.2, CH[3] + 0.4, 0.10, att=1.5)
for t0 in np.concatenate([np.arange(CH[2] + 0.5, EV['t25'], 0.7), np.arange(EV['t25'], EV['t70'], 0.5), np.arange(EV['t70'], CH[3], 0.36)]):
    m.place(m.music, m.tone(55, 0.35, 8) + m.tone(110, 0.35, 10) * 0.4, t0, 0.22)
m.music += m.pad([293.7, 349.2, 440, 587.3], EV['safe'], CH[3] + 0.4, 0.07, att=0.4)  # relief: safe cities
# chapter 4: melancholic piano over the flooded town
mel = [D4, F4, A4, G4, F4, E4, D4, A3]
for i, t0 in enumerate(np.arange(CH[3] + 0.4, CH[4] - 0.2, 0.85)):
    m.place(m.music, m.pluck(mel[i % 8], 2.2, 1.8), t0, 0.12)
m.music += m.pad([73.4, 110, 146.8, 220], CH[3] + 0.2, CH[4] + 0.4, 0.08, att=2)
# chapter 5: calmer (F major), then mysterious teaser (deep drone, digging)
m.music += m.pad([F3, A3, C4, F4], CH[4] + 0.2, EV['tunnel'] + 0.2, 0.08, att=1.5)
m.music += m.pad([55, 82.4, 110], EV['tunnel'], m.dur, 0.12, att=0.6, rel=1.2)
m.music += m.pad([880, 932.3], EV['tunnel'] + 1, m.dur, 0.025, att=1)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.11)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.45)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.2)
# rising water around Monas, flood ambience
m.sfx += m.noise(100, 1800, -0.5) * 0.16 * m.win(EV['rise'], EV['rise'] + 6, 0.5, 1)
# polar wind on ice shots
for t0, t1, mode in EV['life']:
    if mode == 'ice':
        m.sfx += m.noise(300, 4000, -0.2) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * m.T)) * m.win(t0, t1, 0.3, 0.3)
# calving: crack + thunderous fall + splash (main and "begun")
for t0 in (EV['calve'], EV['begun']):
    m.place(m.sfx, m.burst(800, 9000, 0.4, 12), t0, 0.45)
    m.place(m.sfx, m.boom(30, 40, 3.0, 1.0), t0 + 1.9, 0.7)
    m.place(m.sfx, m.burst(200, 6000, 2.0, 1.6, -0.3), t0 + 1.95, 0.5)
# glass clinks and drips
for t0 in (EV['glass'] - 4.5, EV['glass'] - 3.9):
    m.place(m.sfx, m.tone(2637, 0.8, 5) * 0.5 + m.tone(3951, 0.8, 7) * 0.2, t0, 0.08)
for t0 in np.arange(EV['drops'], EV['drops'] + 7, 0.42):
    m.place(m.sfx, m.tone(lambda t: 1500 + 1000 * np.exp(-t * 30), 0.12, 30), t0, 0.07)
# each level jump: deep water whoosh
for t0 in (EV['t10'], EV['t25'], EV['t70']):
    m.place(m.sfx, m.boom(35, 30, 2.5, 1.4), t0, 0.5)
    m.place(m.sfx, m.noise(80, 1500, -0.5, int(2.5 * 48000)) * np.sin(np.linspace(0, np.pi, int(2.5 * 48000))), t0, 0.25)
# digging scoops in the teaser
for t0 in np.arange(EV['dig'] + 0.3, EV['tunnel'], 0.9):
    m.place(m.sfx, m.burst(400, 3000, 0.18, 18), t0, 0.12)
m.place(m.sfx, m.tone(lambda t: 200 - 150 * t, 1.2, 1.2, 0.01), EV['tunnel'] + 0.3, 0.3)  # descending "drop" into the tunnel

# life: birds/ojek/crowd in calm town, boats & lapping water in the flood, penguins on the ice
m.life([w for w in EV['life'] if w[2] in ('calm', 'heat', 'snow', 'night')])
for t0, t1, mode in EV['life']:
    if mode == 'flood':
        tt = t0 + 0.2
        while tt < t1 - 0.3:  # oar splashes and lapping water
            m.place(m.sfx, m.burst(300, 2500, 0.25, 10, -0.2), tt, 0.06); tt += 0.9 + m.rng.random() * 0.5
        m.sfx += m.noise(100, 900, -0.4) * 0.06 * m.win(t0, t1, 0.2, 0.2)
    if mode == 'ice':
        tt = t0 + 0.3
        while tt < t1 - 0.3:  # penguin squawks
            m.place(m.sfx, m.tone(lambda t: 700 + 300 * np.sin(t * 60), 0.18, 8) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 30 * np.arange(int(0.18 * 48000)) / 48000))), tt, 0.035)
            tt += 0.6 + m.rng.random() * 1.2

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
