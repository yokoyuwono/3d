"""Sound design + narration mix for the 2:40 video (numpy only).

Reads build/events.json (dumped by `node tools/render.mjs --events build/events.json`),
narration.json (segment start times) and assets/voice/seg*.wav.

Backsound: if assets/music.(wav|mp3|m4a|ogg|flac) exists (e.g. a track made with
Gemini), it replaces the procedural music; the sound effects are kept. The track is
trimmed/faded to the video length and ducked under the narration.

Usage: python3 tools/audio.py [--music-gain-db -4]  ->  assets/soundtrack.wav + .m4a"""
import glob, json, os, subprocess, sys, tempfile, wave
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
EV = json.load(open(os.path.join(ROOT, 'build', 'events.json')))
SR = 48000
DUR = float(EV['duration'])
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(42)
MUSIC_GAIN_DB = float(sys.argv[sys.argv.index('--music-gain-db') + 1]) if '--music-gain-db' in sys.argv else -4.0
CH = EV['chapters']  # start of chapter cards 1..7
Q, IMP = EV['quake'], EV['impact']


def shaped_noise(lo, hi, slope=0.0, n=N):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    resp = np.where(f > 0, (np.maximum(f, 1) / 100.0) ** slope, 0)
    resp *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) * 1 / (1 + (f / hi) ** 4)
    y = np.fft.irfft(X * resp, n)
    return y / (np.abs(y).max() + 1e-9)


def ss(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def win(a, b, fi=0.5, fo=0.5):
    return ss(a, a + fi, T) * (1 - ss(b - fo, b, T))


def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    s0 = max(0, -i)
    j = min(len(buf), i + len(sig))
    buf[max(0, i):j] += sig[s0: j - i] * gain


def tone(freq, dur, decay=4.0, attack=0.005):
    t = np.arange(int(dur * SR)) / SR
    f = freq(t) if callable(freq) else np.full_like(t, freq)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / attack) * np.exp(-t * decay)


def pluck(freq, dur=1.2, decay=3.5):
    return sum(tone(freq * h, dur, decay * (1 + h * 0.6)) / h for h in (1, 2, 3)) * 0.6


def pad(freqs, a, b, gain, att=1.5, rel=1.5):
    e = ss(a, a + att, T) * (1 - ss(b - rel, b, T))
    m = (T >= a - 0.01) & (T <= b + 0.01)
    out = np.zeros(N)
    t = T[m]
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs)) / len(freqs)
    out[m] = s * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t))
    return out * e * gain


def burst(lo, hi, dur, decay, slope=0.0):
    n = int(dur * SR)
    return shaped_noise(lo, hi, slope, n) * np.exp(-np.arange(n) / SR * decay)


music = np.zeros(N)
sfx = np.zeros(N)
end_ch1, end_ch2 = CH[1], Q

# ================================================================= MUSIC (procedural)
A2, C3, E3, G3, A3, C4, D4, E4, G4, A4 = 110, 130.8, 164.8, 196, 220, 261.6, 293.7, 329.6, 392, 440
# hook + intro: uneasy A minor pad
music += pad([A2, E3, A3, C4, E4], 2.2, CH[0] + 0.5, 0.12, att=1.0)
music += pad([55, 82.4], 2.2, Q + 0.3, 0.13, att=2.0)
# chapter 1: documentary pulse (plucked arpeggio, 96 bpm eighths)
arp = [A3, C4, E4, A4, E4, C4, A3, E3]
step = 60 / 96 / 2
for i, t0 in enumerate(np.arange(CH[0] + 0.6, CH[1], step)):
    place(music, pluck(arp[i % len(arp)], 1.0, 4.5), t0, 0.16)
music += pad([A2, E3, A3], CH[0] + 0.5, CH[1] + 0.5, 0.07)
# chapter 2: tension riser into the rupture
rise = 160 * 2 ** (ss(CH[1], Q, T) * 2.0)
riser = np.sin(2 * np.pi * np.cumsum(rise) / SR) * 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rise * 1.5) / SR)
music += riser * 0.09 * ss(CH[1], Q, T) ** 1.6 * (T < Q)
music += shaped_noise(2000, 9000) * 0.05 * ss(Q - 5, Q, T) ** 2 * (T < Q)
for i, t0 in enumerate(np.arange(CH[1] + 0.5, Q, 60 / 96)):
    place(music, pluck(A2 if i % 2 == 0 else 116.5, 0.6, 6), t0, 0.14)  # semitone heartbeat
# chapter 3 (after the quake): low dark drone
music += pad([55, 58.3, 82.4], Q + 1.0, CH[3] + 0.5, 0.11, att=2.5)
# chapter 4: deep-ocean pulse (D minor), sonar pings
music += pad([73.4, 110, 146.8, 174.6], CH[3] + 0.3, CH[4] + 0.6, 0.09, att=2.0)
for t0 in np.arange(EV['ocean'][0], CH[4], 2.4):
    place(music, tone(1318.5, 1.6, 2.4) * 0.5 + tone(1975.5, 1.6, 3) * 0.2, t0, 0.07)
for i, t0 in enumerate(np.arange(CH[3] + 0.6, EV['retreat'][0][0], 60 / 104 / 2)):
    place(music, pluck([D4 / 2, A2, D4 / 2, C3][i % 4], 0.5, 7), t0, 0.10)
# chapter 5: retreat -> eerie high cluster + low drone
r0, r1 = EV['retreat'][0]
music += pad([880, 932.3], r0, r1 + 0.5, 0.05, att=1.5, rel=0.4)
music += pad([55, 58.3], r0 - 0.5, r1 + 0.4, 0.14, att=1.0, rel=0.3)
# chapter 6: dark ostinato building to the impact
ost = np.sin(2 * np.pi * 55 * T) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 2.0 * T)))
music += ost * 0.10 * ss(EV['roar'][0], EV['roar'][0] + 3, T) * (1 - ss(IMP - 0.4, IMP, T))
music += pad([73.4, 110, 146.8], EV['roar'][0], IMP + 0.1, 0.12, att=2.5, rel=0.2)
music += pad([87.3, 130.8, 174.6, 220, 261.6], IMP + 0.8, CH[6] + 0.8, 0.09, att=2.5)  # aftermath
# chapter 7: melancholic piano -> hopeful lift -> answer
mel = [E4, D4, C4, A3, C4, D4, E4, G4, E4, D4]
for i, t0 in enumerate(np.arange(CH[6] + 0.5, EV['retreat'][1][0], 0.75)):
    place(music, pluck(mel[i % len(mel)], 2.0, 2.2), t0, 0.13)
music += pad([A2, E3, A3, C4], CH[6] + 0.3, EV['retreat'][1][0] + 0.5, 0.08)
music += pad([65.4, 98, 130.8, 196, 261.6, 329.6], EV['retreat'][1][0], EV['rewind'] + 0.1, 0.10, att=1.5, rel=0.2)  # C major: they survive
music += pad([A2, E3, A3, C4, E4], EV['rewind'] + 0.4, EV['finalHit'], 0.10, att=1.0, rel=0.3)
music += pad([65.4, 98, 130.8, 196, 261.6, 329.6, 392], EV['finalHit'], DUR, 0.13, att=0.3, rel=1.5)

# ================================================================= SFX
# ocean ambience in the calm town
waves = shaped_noise(80, 3000, -0.6) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * T) ** 2)
sfx += waves * 0.09 * win(2.4, CH[0] + 0.6, 0.4, 0.6)
# montage hits
for c in (0.0, 0.8, 1.6):
    place(sfx, tone(lambda t: 45 + 60 * np.exp(-t * 6), 0.9, 3.5, 0.002), c, 0.6)
    place(sfx, burst(300, 8000, 0.25, 14), c, 0.25)
# whooshes on cuts + chapter cards
def whoosh(t0, dur=0.6, g=0.16):
    n = int(dur * SR)
    place(sfx, shaped_noise(300, 7000, n=n) * np.sin(np.linspace(0, np.pi, n)) ** 2, t0 - dur * 0.6, g)
for c in EV['shots'][4:]:
    whoosh(c)
for c in CH:
    place(sfx, tone(lambda t: 70 + 40 * np.exp(-t * 8), 1.2, 2.8, 0.003), c, 0.35)  # chapter "boom"
    place(sfx, tone(1760, 0.5, 9) * 0.3 + tone(2637, 0.5, 11) * 0.2, c + 0.02, 0.12)  # bright tick
# crust: creaks while stress builds
for t0 in np.linspace(CH[1] + 2, Q - 0.5, 9):
    place(sfx, burst(60, 400, 0.9, 3.5, -0.5), t0 + rng.random() * 0.6, 0.18 + 0.25 * (t0 - CH[1]) / (Q - CH[1]))
# rupture
place(sfx, tone(lambda t: 30 + 50 * np.exp(-t * 3), 3.0, 1.3, 0.003), Q, 0.95)
place(sfx, burst(200, 6000, 0.6, 7), Q, 0.6)
rumble = shaped_noise(18, 220, -1.0)
sfx += rumble * 0.55 * ss(Q, Q + 0.3, T) * (1 - ss(Q + 4.0, EV['cubes'][0] - 0.3, T))
sfx += rumble * 0.2 * win(EV['cubes'][0] + 9.5, CH[3], 0.5, 1.0)  # aftershock under "jangan lega dulu"
for k in range(9):
    place(sfx, burst(120, 5000, 1.2, 3.5, -0.3), Q + 1.2 + rng.random() * 3.5, 0.2 + rng.random() * 0.15)
# energy cubes
for i, c in enumerate(EV['cubes']):
    place(sfx, tone(lambda t: [90, 70, 45][i] + 30 * np.exp(-t * 10), 1.5, [5, 3, 1.6][i], 0.002), c, [0.4, 0.6, 0.9][i])
    if i == 2:
        place(sfx, burst(80, 3000, 1.6, 2.2, -0.6), c, 0.35)
# uplift (slow motion): deep swell
place(sfx, tone(lambda t: 38 + 10 * t, 4.0, 0.7, 0.4), EV['uplift'] - 0.3, 0.5)
place(sfx, shaped_noise(40, 600, -0.8, int(4.5 * SR)) * np.sin(np.linspace(0, np.pi, int(4.5 * SR))), EV['uplift'] - 0.3, 0.3)
# underwater bed during the ocean section
sfx += shaped_noise(30, 500, -0.8) * 0.12 * win(EV['ocean'][0] - 0.2, r0, 0.5, 0.3)
# heartbeat during the retreat (also in the flashback)
beat = tone(55, 0.25, 14) + tone(48, 0.25, 16) * 0.6
for (a, b) in EV['retreat']:
    for t0 in np.arange(a + 0.2, b, 0.85):
        place(sfx, beat, t0, 0.35)
        place(sfx, beat, t0 + 0.22, 0.22)
    sfx += shaped_noise(80, 900, -0.5) * 0.06 * win(a, b, 0.4, 0.3)
# roar -> impact -> rush
roar = shaped_noise(25, 1800, -0.8)
sfx += roar * 0.75 * ss(EV['roar'][0], IMP, T) ** 2.0 * (1 - ss(IMP + 0.2, IMP + 3, T))
place(sfx, tone(lambda t: 28 + 60 * np.exp(-t * 2), 4.0, 0.9, 0.002), IMP, 1.0)
place(sfx, burst(40, 9000, 3.0, 1.2, -0.4), IMP, 0.9)
rush = shaped_noise(150, 2500, -0.4) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * T + 1))
sfx += rush * 0.32 * win(IMP, EV['rush'][1], 0.6, 1.0)
sfx += shaped_noise(400, 3000, -0.2) * 0.14 * win(EV['fall'] - 2.5, EV['rush'][1] - 5, 0.3, 0.4)  # close splashy water
place(sfx, burst(200, 4000, 0.8, 5), EV['fall'] + 0.4, 0.3)  # body splash
place(sfx, tone(lambda t: 60 + 20 * np.exp(-t * 4), 1.0, 3, 0.002), EV['float'], 0.4)  # car lifts
place(sfx, tone(lambda t: 32 + 40 * np.exp(-t * 2.5), 2.5, 1.3, 0.003), EV['wave2'], 0.6)
# map pings for Simeulue
for t0 in np.arange(CH[6] + 1.2, EV['retreat'][1][0], 1.25):
    place(sfx, tone(880, 0.6, 6) * 0.6 + tone(1320, 0.6, 8) * 0.3, t0, 0.08)
# rewind effect
n = int(0.6 * SR)
tt = np.arange(n) / SR
rw = np.sin(2 * np.pi * np.cumsum(2000 * np.exp(-tt * 5) + 200) / SR) * 0.3 + shaped_noise(500, 8000, n=n) * 0.5
place(sfx, rw * np.sin(np.linspace(0, np.pi, n)), EV['rewind'], 0.35)
# final hit on "Sekarang."
place(sfx, tone(lambda t: 40 + 40 * np.exp(-t * 4), 2.5, 1.6, 0.002), EV['finalHit'], 0.7)
place(sfx, burst(100, 6000, 1.2, 4), EV['finalHit'], 0.35)

# ================================================================= external backsound
ext = sorted(glob.glob(os.path.join(ROOT, 'assets', 'music.*')))
if ext:
    with tempfile.TemporaryDirectory() as td:
        dst = os.path.join(td, 'm.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', ext[0], '-ac', '1', '-ar', str(SR), dst], check=True)
        with wave.open(dst) as w:
            m = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
    m = np.pad(m, (0, max(0, N - len(m))))[:N]
    m /= np.sqrt(np.mean(m ** 2)) + 1e-9
    music = m * 0.11 * 10 ** (MUSIC_GAIN_DB / 20)
    music *= 1 - ss(DUR - 2.0, DUR, T)
    print('using external backsound:', os.path.basename(ext[0]))

# ================================================================= narration + mix
voice = np.zeros(N)
with tempfile.TemporaryDirectory() as td:
    for s in json.load(open(os.path.join(ROOT, 'assets', 'timing.json'))):
        src = os.path.join(ROOT, 'assets', 'voice', f"seg{s['id']}.wav")
        dst = os.path.join(td, f"v{s['id']}.wav")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
                        'highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=3,equalizer=f=180:t=q:w=1:g=2,'
                        'acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=4',
                        '-ar', str(SR), '-ac', '1', dst], check=True)
        with wave.open(dst) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
        place(voice, x, s['start'])
voice /= np.abs(voice).max() + 1e-9

k = int(0.25 * SR)
cs = np.concatenate([[0], np.cumsum(np.abs(voice))])
idx = np.arange(N)
v_env = (cs[np.clip(idx + k // 2, 0, N)] - cs[np.clip(idx - k // 2, 0, N)]) / k
duck = 1 - 0.55 * np.clip(v_env / 0.06, 0, 1)

bg = (music * 0.9 + sfx) * duck
d = int(0.012 * SR)
L = bg + voice * 0.95
R = np.concatenate([np.zeros(d), bg[:-d]]) * 0.97 + voice * 0.95
st = np.stack([L, R], 1)
st *= (ss(0, 0.05, T) * (1 - ss(DUR - 0.6, DUR, T)))[:, None]
st /= np.abs(st).max() / 0.95
out = os.path.join(ROOT, 'build', 'mix_raw.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR),
                os.path.join(ROOT, 'assets', 'soundtrack.wav')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'assets', 'soundtrack.wav'), '-c:a', 'aac', '-b:a', '192k',
                os.path.join(ROOT, 'assets', 'soundtrack.m4a')], check=True)
print(f'wrote assets/soundtrack.wav + .m4a ({DUR:.0f} s)')
