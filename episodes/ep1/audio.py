"""Sound design for ANDAI… Episode 1 (Andai Bumi berhenti berputar).
Needs build/ep1_events.json:  node tools/render.mjs --page ep1.html --events build/ep1_events.json
Optional backsound: episodes/ep1/assets/music.(mp3|wav|m4a) + music_edit.json
Usage: python3 episodes/ep1/audio.py"""
import glob, json, os, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from audiokit import Mix, SR  # noqa: E402

EP = os.path.join(ROOT, 'episodes', 'ep1')
EV = json.load(open(os.path.join(ROOT, 'build', 'ep1_events.json')))
m = Mix(EV['duration'])
CH = EV['chapters']
D3, F3, A3, C4, D4, E4, F4, G4, A4, C5 = 146.8, 174.6, 220, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3

# ---------------------------------------------------------------- music
# hook: spacey D minor with a rising "rotation" hum while the speed counter climbs
m.music += m.pad([73.4, 110, D3, A3, E4], 1.5, EV['stop1'] + 0.05, 0.11, att=0.8, rel=0.05)
hum_f = 60 + 180 * m.ss(2.0, 6.6)
m.music += np.sin(2 * np.pi * np.cumsum(hum_f) / SR) * 0.06 * m.win(1.5, EV['stop1'] + 0.05, 0.5, 0.05)
arp = [D4, F4, A4, C5, A4, F4]
for i, t0 in enumerate(np.arange(1.6, EV['stop1'], 60 / 90 / 2)):
    m.place(m.music, m.pluck(arp[i % 6], 0.9, 5), t0, 0.10)
m.music += m.pad([73.4, 77.8], EV['stop1'] + 1.2, CH[0] + 0.4, 0.12, att=0.6)  # unease after the stop
# chapter 1: wonder (F maj7 -> C -> Dm), steady plucks
prog = [[F3, A3, C4, E4], [130.8, G4 / 2, C4, E4], [D3, F3, A3, D4]]
seg = (CH[1] - CH[0]) / 6
for i in range(6):
    a = CH[0] + i * seg
    m.music += m.pad(prog[i % 3], a, a + seg + 0.8, 0.08, att=0.8, rel=0.8)
for i, t0 in enumerate(np.arange(CH[0] + 0.6, CH[1] - 0.4, 60 / 90 / 2)):
    m.place(m.music, m.pluck([F4, A4, C5, A4][i % 4] if (i // 16) % 2 == 0 else [D4, F4, A4, F4][i % 4], 0.8, 5.5), t0, 0.08)
# chapter 2: tension riser to the stop, then chaos drone
rise = 140 * 2 ** (m.ss(EV['brake'] + 3, EV['stop2']) * 1.5)
m.music += np.sin(2 * np.pi * np.cumsum(rise) / SR) * 0.07 * m.win(EV['brake'] + 3, EV['stop2'] + 0.02, 1, 0.02)
m.music += m.pad([55, 58.3, 82.4], EV['stop2'] + 0.8, CH[2] + 0.3, 0.12, att=1.5)
# chapter 3: frozen stillness; heat shimmer then icy cluster
m.music += m.pad([73.4, 110, 146.8], CH[2] + 0.2, CH[3] + 0.4, 0.09, att=2)
m.music += m.pad([1174.7, 1244.5], EV['heat'], EV['frost'] + 0.3, 0.03, att=1, rel=0.3)
m.music += m.pad([1568, 1661, 2093], EV['frost'], CH[3] + 0.2, 0.025, att=0.8, rel=0.5)
# chapter 4: mysterious A minor pulse, swell into the megacontinent
for i, t0 in enumerate(np.arange(CH[3] + 0.5, EV['mega'], 60 / 90)):
    m.place(m.music, m.pluck([110, 110, 130.8, 98][i % 4], 0.7, 5), t0, 0.12)
m.music += m.pad([110, 164.8, 220, 261.6], CH[3] + 0.3, EV['mega'] + 0.5, 0.08, att=2)
m.music += m.pad([87.3, 130.8, 174.6, 220, 261.6], EV['mega'], CH[4] + 0.6, 0.11, att=1.2)
# chapter 5: calm resolution (F major), then playful teaser bells
m.music += m.pad([F3, A3, C4, F4], CH[4] + 0.3, EV['teaser'] + 0.2, 0.09, att=2)
for i, t0 in enumerate(np.arange(CH[4] + 1.0, EV['teaser'], 60 / 90 * 2)):
    m.place(m.music, m.pluck([C5, A4, F4, G4][i % 4], 1.6, 2.5), t0, 0.07)
bells = [1046.5, 1318.5, 1568, 2093, 1568, 1318.5]
for i, t0 in enumerate(np.arange(EV['teaser'] + 0.1, m.dur - 0.5, 0.32)):
    m.place(m.music, m.tone(bells[i % 6], 1.0, 4) * 0.6 + m.tone(bells[i % 6] * 2.01, 1.0, 7) * 0.2, t0, 0.06)
m.music += m.pad([F3, A3, C4, E4, G4], EV['teaser'], m.dur, 0.09, att=0.6, rel=1.5)

# ---------------------------------------------------------------- sfx
for c in EV['shots'][1:]:
    m.whoosh(c)
for c in CH:
    m.chapter_hit(c)
# space ambience on globe shots (whole piece, low)
m.sfx += m.noise(40, 400, -0.8) * 0.04
# the stops: screech + boom + debris
def stop(t, big=1.0):
    sc_f = 2600 - 1400 * np.clip(np.arange(int(0.9 * SR)) / SR / 0.9, 0, 1)
    screech = np.sin(2 * np.pi * np.cumsum(sc_f) / SR) * 0.4 + m.noise(1500, 5000, n=int(0.9 * SR)) * 0.6
    m.place(m.sfx, screech * np.exp(-np.arange(int(0.9 * SR)) / SR * 2), t - 0.75, 0.25 * big)
    m.place(m.sfx, m.boom(28, 70, 3.0, 1.2), t, 0.9 * big)
    m.place(m.sfx, m.burst(80, 7000, 1.5, 2.5, -0.4), t, 0.5 * big)
stop(EV['stop1'])
stop(EV['stop2'], 1.1)
for c in EV['montage']:  # flash-forward hits
    m.place(m.sfx, m.boom(45, 50, 0.9, 3.5), c, 0.55)
    m.place(m.sfx, m.burst(300, 8000, 0.25, 14), c, 0.22)
# open-loop sting on "Dan itu baru permulaan"
m.place(m.sfx, m.tone(lambda t: 55 + 20 * np.exp(-t * 3), 2.0, 1.5, 0.01), EV['tease'], 0.35)
# time-lapse whoosh for the fast-spinning young Earth
m.sfx += m.noise(200, 4000, -0.3) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * m.T)) * m.win(EV['fast'], EV['clock2'], 0.3, 0.3)
# bus: engine, screech, thud
b = EV['brake']
eng = (np.sin(2 * np.pi * 52 * m.T) * 0.5 + m.noise(40, 300, -0.6) * 0.5) * m.win(CH[1] + 0.2, b + 0.3, 0.4, 0.2)
m.sfx += eng * 0.18
sc = m.noise(1800, 4500, n=int(0.8 * SR)) * np.exp(-np.arange(int(0.8 * SR)) / SR * 2.5)
m.place(m.sfx, sc, b - 0.1, 0.35)
m.place(m.sfx, m.boom(60, 40, 0.8, 5), b + 0.45, 0.4)
# wind storm
gust = 0.7 + 0.3 * np.sin(2 * np.pi * 0.6 * m.T) * np.sin(2 * np.pi * 0.17 * m.T + 1)
m.sfx += m.noise(150, 3500, -0.3) * 0.55 * gust * m.win(EV['wind'] - 0.2, CH[2] + 0.2, 0.5, 0.6)
m.sfx += m.noise(20, 200, -1.0) * 0.45 * m.win(EV['wind'], CH[2] + 0.2, 0.5, 0.6)
for k in range(10):
    m.place(m.sfx, m.burst(150, 5000, 0.8, 4, -0.3), EV['wind'] + 1 + m.rng.random() * 12, 0.18)
# the wall of water
m.sfx += m.noise(25, 1800, -0.8) * 0.6 * m.ss(EV['wave'] - 0.3, CH[2] - 0.2) ** 1.5 * (1 - m.ss(CH[2] - 0.2, CH[2] + 0.5))
m.place(m.sfx, m.boom(28, 60, 3.5, 1.0), CH[2] - 0.35, 0.8)
# heat sizzle, icy wind
m.sfx += m.noise(3000, 12000) * 0.06 * m.win(EV['heat'], EV['frost'], 0.6, 0.3)
m.sfx += m.noise(400, 2500, -0.2) * 0.12 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * m.T)) * m.win(EV['frost'], CH[3] + 0.3, 0.6, 0.5)
# oceans draining: flowing water + deep groan
m.sfx += m.noise(200, 2500, -0.4) * 0.16 * m.win(EV['drain'] + 0.5, EV['mega'], 1.0, 1.0)
m.place(m.sfx, m.tone(lambda t: 38 + 6 * t, 5.0, 0.5, 0.8), EV['drain'], 0.35)
m.sfx += m.noise(1500, 9000) * 0.06 * m.win(EV['indo'] + 1, EV['mega'], 0.6, 0.6)  # sand hiss
# clock ticks during the day-length comparison
for t0 in np.arange(CH[4] + 9.0, EV['clock2'] + 5.0, 0.5):
    m.place(m.sfx, m.burst(2000, 8000, 0.03, 160), t0, 0.12)
# teaser: soft wind with snow
m.sfx += m.noise(300, 3000, -0.3) * 0.07 * m.win(EV['teaser'], m.dur, 0.5, 1.0)

m.life(EV['life'])  # birds, ojek, crowd, kids, fire, frogs: the town is alive

ext = sorted(glob.glob(os.path.join(EP, 'assets', 'music.*')))
edit_p = os.path.join(EP, 'assets', 'music_edit.json')
m.finish(os.path.join(EP, 'assets', 'timing.json'), os.path.join(EP, 'assets', 'voice'), os.path.join(EP, 'assets', 'soundtrack.wav'),
         external_music=ext[0] if ext else None, edit=json.load(open(edit_p)) if os.path.exists(edit_p) else None)
