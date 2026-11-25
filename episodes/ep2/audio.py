"""Sound design for ANDAI… Episode 2 (Andai Indonesia bersalju).
Needs build/ep2_events.json:  node tools/render.mjs --page ep2.html --events build/ep2_events.json
Optional backsound: episodes/ep2/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/ep2/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'ep2')
EV = json.load(open(os.path.join(ROOT, 'build', 'ep2_events.json')))
m = Mix(EV['duration'], seed=7)
CH = EV['chapters']
C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, G5 = 261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3, 659.3, 784
bell = lambda f, d=1.4: m.tone(f, d, 3.5) * 0.6 + m.tone(f * 2.76, d, 6) * 0.15 + m.tone(f * 5.4, d, 9) * 0.05

# ---------------------------------------------------------------- music
# hook: magical winter (celesta-like bells over a soft C major pad)
m.music += m.pad([130.8, 196, C4, E4, G4], 1.5, EV['hidden'], 0.10, att=0.6, rel=0.4)
mel = [E5, G5, E5, D5, C5, D5, E5, C5]
for i, t0 in enumerate(np.arange(1.75, EV['hidden'] - 0.2, 0.42)):
    m.place(m.music, bell(mel[i % 8]), t0, 0.09)
# mystery (hidden location)
m.music += m.pad([110, 116.5, 164.8], EV['hidden'], CH[0] + 0.6, 0.11, att=0.5)
# chapter 1: curious science plucks (A minor -> F -> C -> G), 100 bpm
prog = [[110, 220, C4, E4], [87.3, F4 / 2, A4 / 2, C4], [130.8, 196, C4, E4], [98, 196, B4 / 2, D4]]
seg = (CH[1] - CH[0]) / 8
for i in range(8):
    a = CH[0] + i * seg
    m.music += m.pad(prog[i % 4], a, a + seg + 0.6, 0.07, att=0.6, rel=0.6)
arp = [A4, C5, E5, C5, A4, E4]
for i, t0 in enumerate(np.arange(CH[0] + 0.5, CH[1] - 0.3, 0.3)):
    m.place(m.music, m.pluck(arp[i % 6], 0.7, 6), t0, 0.06)
# chapter 2: winter arrives — sleigh-ish bells, then the playful poll
m.music += m.pad([130.8, 196, C4, E4, G4], CH[1] + 0.2, EV['back'] + 0.3, 0.09, att=1.5)
for i, t0 in enumerate(np.arange(EV['snow'], EV['back'], 0.5)):
    m.place(m.music, bell([C5, E5, G5, E5][i % 4], 1.0), t0, 0.06)
for t0 in np.arange(EV['snow'], EV['back'], 0.25):
    m.place(m.sfx, m.burst(5000, 12000, 0.06, 60), t0, 0.04)  # jingle shimmer
# chapter 3: ascent — rising, airy, mysterious
m.music += m.pad([146.8, 220, 293.7, 440], CH[2] + 0.2, EV['frost'] + 0.4, 0.08, att=2)
m.music += m.pad([1568, 1760, 2093], EV['frost'], EV['answer'], 0.03, att=0.6, rel=0.5)  # icy shimmer
m.music += m.pad([98, 146.8, 196, 293.7, 392], EV['answer'] - 0.1, CH[3] + 0.5, 0.12, att=0.3)  # reveal swell
# chapter 4: poignant — slow piano over E minor
pmel = [E4, G4, B4, A4, G4, E4, D4, E4]
for i, t0 in enumerate(np.arange(CH[3] + 0.4, EV['ven'], 0.9)):
    m.place(m.music, m.pluck(pmel[i % 8], 2.2, 1.8), t0, 0.13)
m.music += m.pad([82.4, 123.5, 164.8, 246.9], CH[3] + 0.2, EV['ven'] + 0.6, 0.08, att=2)
m.music += m.pad([73.4, 110, 146.8], EV['ven'], CH[4] + 0.4, 0.10, att=1)
# chapter 5: reflective, then ominous teaser
m.music += m.pad([130.8, 196, 261.6, 329.6], CH[4] + 0.3, EV['teaser'] + 0.2, 0.09, att=1.5)
for i, t0 in enumerate(np.arange(CH[4] + 0.6, EV['teaser'], 0.9)):
    m.place(m.music, m.pluck([E4, D4, C4, G4 / 2][i % 4], 2.0, 2), t0, 0.10)
m.music += m.pad([55, 58.3, 82.4], EV['teaser'], m.dur, 0.13, att=1.0, rel=1.2)
for t0 in np.arange(EV['teaser'] + 0.5, m.dur - 1, 0.86):
    m.place(m.music, m.tone(55, 0.4, 8) + m.tone(110, 0.4, 10) * 0.4, t0, 0.25)  # heartbeat-like pulse

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c, g=0.12)
for c in EV['chapters']:
    m.place(m.sfx, bell(1046.5, 1.6), c + 0.3, 0.06)
for c in EV['montage'][:3]:
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.45)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.2)
# winter wind in snowy shots, birds/insects in tropical shots
wind = m.noise(300, 3000, -0.3) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * m.T))
m.sfx += wind * 0.07 * (m.win(0, EV['hidden'], 0.2, 0.3) + m.win(EV['snow'], EV['back'], 1, 0.5))
m.sfx += m.noise(2500, 7000) * 0.025 * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * m.T))) * m.win(EV['montage'][3] + 3.8, EV['hidden'], 0.2, 0.2)  # cicadas
m.place(m.sfx, m.tone(lambda t: 900 - 500 * t, 0.6, 3), EV['shots'][4], 0.1)  # "Mustahil?" record-scratch-ish
# poll ding
m.place(m.sfx, bell(1318.5, 1.2) + bell(1568, 1.2) * 0.6, EV['poll'] + 0.1, 0.12)
# "tapi tunggu dulu": rewind sweep
n = int(0.6 * 48000)
tt = np.arange(n) / 48000
m.place(m.sfx, np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-tt * 5) + 200) / 48000) * np.sin(np.linspace(0, np.pi, n)) * 0.3, EV['back'], 0.3)
# frost crackle, mountain wind, reveal hit
for k in range(14):
    m.place(m.sfx, m.burst(3000, 10000, 0.05, 80), EV['frost'] + 0.2 + m.rng.random() * 2.5, 0.08)
m.sfx += m.noise(200, 2500, -0.4) * 0.09 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * m.T)) * m.win(EV['lapse'], EV['vanish'] + 6, 1, 1)
m.place(m.sfx, m.boom(40, 40, 2.0, 2.0), EV['answer'], 0.5)
# melting: water drips during the shrink time-lapse
for t0 in np.arange(EV['shrink'], EV['fields'], 0.37):
    m.place(m.sfx, m.tone(lambda t: 1400 + 900 * np.exp(-t * 30), 0.12, 30), t0 + m.rng.random() * 0.2, 0.08)
m.place(m.sfx, m.boom(35, 30, 2.2, 1.5), EV['indoNext'], 0.4)
# teaser: rising water
m.sfx += m.noise(100, 2000, -0.5) * 0.18 * m.win(EV['teaser'], m.dur, 1.0, 1.0)

m.life(EV['life'])  # birds, ojek, crowd, kids, fire, frogs: the town is alive

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
