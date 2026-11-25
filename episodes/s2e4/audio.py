"""Sound design for ANDAI… Season 2 Episode 4 (Andai Jakarta tenggelam 2050).
Needs build/s2e4_events.json:  node tools/render.mjs --page s2e4.html --events build/s2e4_events.json
Usage: python3 episodes/s2e4/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 's2e4')
EV = json.load(open(os.path.join(ROOT, 'build', 's2e4_events.json')))
m = Mix(EV['duration'], seed=31)
CH = EV['chapters']
A3, C4, D4, E4, F4, G4, A4, C5, D5, E5 = 220, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3, 587.3, 659.3

def piano(f, t0, g):
    m.place(m.music, m.tone(f, 2.5, 1.8) * 0.7 + m.tone(f * 2, 2.5, 3) * 0.2 + m.tone(f * 3, 2.5, 5) * 0.08, t0, g)

# ---------------------------------------------------------------- music: melancholic piano over water, hopeful turn at Tokyo
m.music += m.pad([110, 164.8, A3, C4], 1.7, CH[3], 0.07, att=2)
seq = [A4, E4, C5, E4, G4, E4, A4, D4]
for i, t0 in enumerate(np.arange(1.8, CH[3] - 0.5, 0.75)):
    if i % 8 != 7:
        piano(seq[i % 8], t0, 0.05)
# chapter 3 (2050): heavier, low pulses under the piano
m.music += m.pad([55, 82.4, 110], CH[2] - 0.2, CH[3] + 0.3, 0.1, att=1.0)
for t0 in np.arange(CH[2] + 0.4, CH[3], 1.5):
    m.place(m.music, m.tone(55, 0.9, 3) + m.tone(110, 0.9, 4) * 0.3, t0, 0.13)
# chapter 4/5: hope (C major), brighter piano
m.music += m.pad([130.8, 196, 261.6, 329.6], CH[3] - 0.2, m.dur, 0.08, att=2.5, rel=2)
seq2 = [C5, G4, E5, G4, D5, G4, C5, E4]
for i, t0 in enumerate(np.arange(CH[3] + 0.6, m.dur - 1.5, 0.6)):
    if i % 8 != 7:
        piano(seq2[i % 8], t0, 0.05)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.07)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.35)
m.place(m.sfx, m.tone(lambda t: 1600 - 800 * t, 1.0, 2), EV['before'], 0.08)              # rewind to "before"
for k in range(26):                                                                          # year ticks 2025 -> 2050
    m.place(m.sfx, m.tone(1500, 0.05, 50), EV['year'][0] + (EV['year'][1] - EV['year'][0]) * k / 25, 0.06)
m.sfx += m.noise(300, 2500, -0.3) * 0.05 * m.win(EV['squeeze'][0], EV['squeeze'][1], 0.2, 0.3)   # sponge squish
for t0 in np.arange(EV['squeeze'][0], EV['squeeze'][1], 0.18):
    m.place(m.sfx, m.tone(lambda t: 900 - 300 * t, 0.07, 30), t0, 0.04)                     # drips
m.sfx += m.noise(2500, 9000, 0) * 0.05 * m.win(EV['leak'][0], EV['leak'][1], 0.2, 0.5)        # leaking hiss
for t0 in EV['fix']:
    m.place(m.sfx, m.tone(1318.5, 0.25, 12), t0, 0.08)
m.place(m.sfx, m.tone(880, 0.6, 5) + m.tone(1318.5, 0.6, 5) * 0.6, EV['answer'], 0.13)
pump = (np.sin(2 * np.pi * 50 * m.T) * 0.5 + m.noise(60, 400, -0.6) * 0.5) * (0.7 + 0.3 * np.sin(2 * np.pi * 2 * m.T))
waves = m.noise(150, 1800, -0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * m.T) ** 2)
life = []
for t0, t1, mode in EV['life']:
    w = m.win(t0, t1, 0.3, 0.3)
    if mode == 'flood':
        m.sfx += waves * 0.08 * w
        life.append([t0, t1, 'calm'])
    elif mode == 'ground':
        m.sfx += pump * 0.04 * w
    elif mode == 'calm':
        m.sfx += waves * 0.025 * w
        life.append([t0, t1, 'calm'])
m.life(life)

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
