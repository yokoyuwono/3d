"""Procedural sound design + narration mix for the 60 s video (numpy only).
Usage: python3 tools/audio.py  -> assets/soundtrack.wav
Reads narration.json (start times) and assets/voice/seg*.wav."""
import json, os, subprocess, tempfile, wave
import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(42)
ROOT = os.path.join(os.path.dirname(__file__), '..')
T_QUAKE, T_IMPACT = 16.55, 40.8


def shaped_noise(lo, hi, slope=0.0, n=N):
    """noise with a band-pass [lo, hi] Hz and spectral tilt f^slope (done in the FFT domain)."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    resp = np.where(f > 0, (np.maximum(f, 1) / 100.0) ** slope, 0)
    resp *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) * 1 / (1 + (f / hi) ** 4)
    y = np.fft.irfft(X * resp, n)
    return y / (np.abs(y).max() + 1e-9)


def env(points):
    """piecewise-linear envelope from [(t, v), ...]"""
    ts, vs = zip(*points)
    return np.interp(T, ts, vs)


def ss(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def tone(freq, dur, decay=4.0, attack=0.005):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq if callable(freq) is False else freq(t), t.shape)) / SR
    return np.sin(ph) * np.minimum(1, t / attack) * np.exp(-t * decay)


music = np.zeros(N)
sfx = np.zeros(N)

# ---------------------------------------------------------------- ocean ambience
waves = shaped_noise(80, 3000, -0.6)
waves *= 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * T) ** 2
sfx += waves * 0.10 * env([(0, 0), (0.4, 1), (16, 1), (17.3, 0.6), (23.3, 0.5), (26, 0.12), (30.75, 0.08), (32, 0.2)]) * (T < 33)

# ---------------------------------------------------------------- music: drones + pads
def pad(freqs, t0, t1, gain, att=1.5, rel=1.5):
    t = T
    e = ss(t0, t0 + att, t) * (1 - ss(t1 - rel, t1, t))
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs))
    trem = 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    return s / len(freqs) * e * gain * trem

music += pad([110, 164.8, 220, 261.6, 329.6], 0, 9, 0.12, att=0.8)  # A minor, calm but uneasy
music += pad([55, 82.4], 0.2, 16.6, 0.16, att=2)  # low drone
# tension riser through the crust scene
rise_f = 180 * 2 ** (ss(8.4, T_QUAKE, T) * 2.0)
riser = np.sin(2 * np.pi * np.cumsum(rise_f) / SR) * 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rise_f * 1.5) / SR)
music += riser * 0.09 * ss(8.4, T_QUAKE, T) ** 1.5 * (T < T_QUAKE)
music += shaped_noise(2000, 9000) * 0.05 * ss(12, T_QUAKE, T) ** 2 * (T < T_QUAKE)  # hiss swell
# eerie high tone while the sea retreats
music += pad([880, 932.3], 23.3, 31, 0.05, att=2, rel=0.5)
music += pad([55, 58.3], 23.0, 31.2, 0.14, att=1.5, rel=0.4)
# tsunami: dark pulsing ostinato
ost = np.sin(2 * np.pi * 55 * T) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 2.0 * T)))
music += ost * 0.10 * ss(31, 36, T) * (1 - ss(40.4, 40.8, T))
music += pad([73.4, 110, 146.8], 31, 40.9, 0.12, att=3, rel=0.2)
# aftermath / resolution
music += pad([87.3, 130.8, 174.6, 220, 261.6], 41.5, 50.5, 0.10, att=2.5, rel=1.5)  # F major-ish
music += pad([110, 164.8, 220, 261.6, 329.6, 440], 49.5, 60, 0.11, att=2.0, rel=1.2)  # A minor
music += pad([65.4, 98, 130.8, 196, 261.6, 329.6], 57.3, 60, 0.13, att=0.4, rel=1.0)  # C major lift at the end

# ---------------------------------------------------------------- countdown ticks (every second)
tick = shaped_noise(1500, 8000, n=int(0.03 * SR)) * np.exp(-np.arange(int(0.03 * SR)) / SR * 180)
for s in range(1, 59):
    g = 0.10 if s < 30.75 else 0.20
    if 8.4 <= s < T_QUAKE + 1 or 41 <= s < 49:
        g *= 0.5
    place(sfx, tick, s, g)

# heartbeat while people walk to the sea
beat = tone(55, 0.25, 14) + tone(48, 0.25, 16) * 0.6
for k, t0 in enumerate(np.arange(23.6, 30.75, 0.85)):
    place(sfx, beat, t0, 0.35)
    place(sfx, beat, t0 + 0.22, 0.22)

# ---------------------------------------------------------------- quake
boom = tone(lambda t: 30 + 50 * np.exp(-t * 3), 3.0, 1.3, 0.003)
place(sfx, boom, T_QUAKE, 0.9)
crack = shaped_noise(200, 6000, n=int(0.6 * SR)) * np.exp(-np.arange(int(0.6 * SR)) / SR * 7)
place(sfx, crack, T_QUAKE, 0.6)
rumble = shaped_noise(18, 220, -1.0)
rumble_env = ss(T_QUAKE, T_QUAKE + 0.3, T) * (1 - ss(19.5, 23.3, T)) + 0.35 * ss(T_QUAKE - 0.3, T_QUAKE, T) * (T < 17.3)
sfx += rumble * 0.55 * rumble_env * (1 + 0.3 * np.sin(2 * np.pi * 3.1 * T))
# collapses / debris crashes
for k in range(9):
    t0 = 17.4 + rng.random() * 4.0
    n = int(1.2 * SR)
    c = shaped_noise(120, 5000, -0.3, n) * np.exp(-np.arange(n) / SR * 3.5)
    place(sfx, c, t0, 0.22 + rng.random() * 0.15)

# ---------------------------------------------------------------- whooshes on cuts
def whoosh(t0, dur=0.6, g=0.18):
    n = int(dur * SR)
    w = shaped_noise(300, 7000, n=n) * np.sin(np.linspace(0, np.pi, n)) ** 2
    place(sfx, w, t0 - dur * 0.6, g)

for c in [8.4, 23.3, 26.6, 30.75, 36.0, 39.4, 41.35, 45.6, 48.95, 55.65]:
    whoosh(c)

# ---------------------------------------------------------------- tsunami roar, impact, flood
roar = shaped_noise(25, 1800, -0.8)
sfx += roar * 0.75 * ss(32, T_IMPACT, T) ** 2.2 * (1 - ss(T_IMPACT + 0.2, T_IMPACT + 3, T))
place(sfx, tone(lambda t: 28 + 60 * np.exp(-t * 2), 4.0, 0.9, 0.002), T_IMPACT, 1.0)
imp = shaped_noise(40, 9000, -0.4, int(3 * SR)) * np.exp(-np.arange(int(3 * SR)) / SR * 1.2)
place(sfx, imp, T_IMPACT, 0.9)
rush = shaped_noise(150, 2500, -0.4)
rush *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * T + 1)
sfx += rush * 0.35 * ss(T_IMPACT, T_IMPACT + 0.6, T) * env([(0, 1), (45, 1), (49, 0.55), (51.3, 0.5), (55.6, 0.5), (58, 0.3), (60, 0)])
gurgle = shaped_noise(400, 1200)
sfx += gurgle * 0.08 * ss(45.6, 46.2, T) * (1 - ss(48.5, 49, T))

# rewind effect in the flashback
n = int(0.55 * SR)
tt = np.arange(n) / SR
rw = np.sin(2 * np.pi * np.cumsum(2000 * np.exp(-tt * 5) + 200) / SR) * 0.3 + shaped_noise(500, 8000, n=n) * 0.5
place(sfx, rw * np.sin(np.linspace(0, np.pi, n)), 51.3, 0.35)
# replay of the retreat ambience during the flashback (muffled)
sfx += shaped_noise(80, 900, -0.5) * 0.08 * ss(51.8, 52.3, T) * (1 - ss(55.3, 55.65, T))
# final hit on "Sekarang."
place(sfx, tone(lambda t: 40 + 40 * np.exp(-t * 4), 2.5, 1.6, 0.002), 57.25, 0.7)
place(sfx, shaped_noise(100, 6000, n=int(1.2 * SR)) * np.exp(-np.arange(int(1.2 * SR)) / SR * 4), 57.25, 0.35)

# ---------------------------------------------------------------- narration
voice = np.zeros(N)
segs = json.load(open(os.path.join(ROOT, 'narration.json')))
with tempfile.TemporaryDirectory() as td:
    for s in segs:
        src = os.path.join(ROOT, 'assets', 'voice', f"seg{s['id']}.wav")
        dst = os.path.join(td, f"v{s['id']}.wav")
        # resample + gentle voice polish (high-pass, presence, compression)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
                        'highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=3,equalizer=f=180:t=q:w=1:g=2,'
                        'acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=4',
                        '-ar', str(SR), '-ac', '1', dst], check=True)
        with wave.open(dst) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
        place(voice, x, s['start'])
voice /= np.abs(voice).max() + 1e-9

# ducking: music & sfx dip under the voice
v_env = np.abs(voice)
k = int(0.25 * SR)
cs = np.concatenate([[0], np.cumsum(v_env)])
v_env = np.interp(np.arange(N), np.arange(N) , (cs[np.clip(np.arange(N) + k // 2, 0, N)] - cs[np.clip(np.arange(N) - k // 2, 0, N)]) / k)
duck = 1 - 0.55 * np.clip(v_env / 0.06, 0, 1)

mix_mono_bg = (music * 0.9 + sfx) * duck
# stereo: widen background a little with a tiny delay, voice centred
d = int(0.012 * SR)
L = mix_mono_bg + voice * 0.95
R = np.concatenate([np.zeros(d), mix_mono_bg[:-d]]) * 0.97 + voice * 0.95
st = np.stack([L, R], 1)
st *= env([(0, 0), (0.15, 1), (59.4, 1), (60, 0)])[:, None]
st /= np.abs(st).max() / 0.95
out = os.path.join(ROOT, 'build', 'mix_raw.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
# loudness normalise for social platforms (-14 LUFS)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR),
                os.path.join(ROOT, 'assets', 'soundtrack.wav')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'assets', 'soundtrack.wav'), '-c:a', 'aac', '-b:a', '192k',
                os.path.join(ROOT, 'assets', 'soundtrack.m4a')], check=True)
print('wrote assets/soundtrack.wav + .m4a')
