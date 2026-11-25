"""Shared sound-design helpers for the ANDAI… episodes (numpy only).
Usage from an episode script:
    from audiokit import Mix
    m = Mix(duration)
    m.music += m.pad([...], t0, t1, gain); m.place(m.sfx, m.boom(), t, 0.8) ...
    m.finish(timing_json, voice_dir, out_wav, external_music=None)"""
import json, os, subprocess, tempfile, wave
import numpy as np

SR = 48000


class Mix:
    def __init__(self, duration, seed=42):
        self.dur = float(duration)
        self.N = int(SR * self.dur)
        self.T = np.arange(self.N) / SR
        self.rng = np.random.default_rng(seed)
        self.music = np.zeros(self.N)
        self.sfx = np.zeros(self.N)

    # ---------------------------------------------------------------- building blocks
    def noise(self, lo, hi, slope=0.0, n=None):
        n = n or self.N
        X = np.fft.rfft(self.rng.standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / SR)
        resp = np.where(f > 0, (np.maximum(f, 1) / 100.0) ** slope, 0)
        resp *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) * 1 / (1 + (f / hi) ** 4)
        y = np.fft.irfft(X * resp, n)
        return y / (np.abs(y).max() + 1e-9)

    def ss(self, a, b, x=None):
        x = self.T if x is None else x
        k = np.clip((x - a) / (b - a), 0, 1)
        return k * k * (3 - 2 * k)

    def win(self, a, b, fi=0.5, fo=0.5):
        return self.ss(a, a + fi) * (1 - self.ss(b - fo, b))

    def place(self, buf, sig, t0, gain=1.0):
        i = int(t0 * SR)
        if i >= len(buf) or i + len(sig) <= 0:
            return
        s0 = max(0, -i)
        j = min(len(buf), i + len(sig))
        buf[max(0, i):j] += sig[s0: j - i] * gain

    @staticmethod
    def tone(freq, dur, decay=4.0, attack=0.005):
        t = np.arange(int(dur * SR)) / SR
        f = freq(t) if callable(freq) else np.full_like(t, freq)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / attack) * np.exp(-t * decay)

    def pluck(self, freq, dur=1.2, decay=3.5):
        return sum(self.tone(freq * h, dur, decay * (1 + h * 0.6)) / h for h in (1, 2, 3)) * 0.6

    def pad(self, freqs, a, b, gain, att=1.5, rel=1.5):
        e = self.ss(a, a + att) * (1 - self.ss(b - rel, b))
        m = (self.T >= a - 0.01) & (self.T <= b + 0.01)
        out = np.zeros(self.N)
        t = self.T[m]
        s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs)) / len(freqs)
        out[m] = s * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t))
        return out * e * gain

    def burst(self, lo, hi, dur, decay, slope=0.0):
        n = int(dur * SR)
        return self.noise(lo, hi, slope, n) * np.exp(-np.arange(n) / SR * decay)

    def boom(self, f0=30, f1=60, dur=3.0, decay=1.3):
        return self.tone(lambda t: f0 + f1 * np.exp(-t * 3), dur, decay, 0.003)

    def whoosh(self, t0, dur=0.6, g=0.16):
        n = int(dur * SR)
        self.place(self.sfx, self.noise(300, 7000, n=n) * np.sin(np.linspace(0, np.pi, n)) ** 2, t0 - dur * 0.6, g)

    def chapter_hit(self, t0):
        self.place(self.sfx, self.tone(lambda t: 70 + 40 * np.exp(-t * 8), 1.2, 2.8, 0.003), t0, 0.35)
        self.place(self.sfx, self.tone(1760, 0.5, 9) * 0.3 + self.tone(2637, 0.5, 11) * 0.2, t0 + 0.02, 0.12)

    # ---------------------------------------------------------------- signs of life
    def chirp(self, f0, f1, dur=0.12):
        t = np.arange(int(dur * SR)) / SR
        f = f0 + (f1 - f0) * (t / dur) + 300 * np.sin(2 * np.pi * 35 * t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2

    def motorbike(self, dur=3.0):
        t = np.arange(int(dur * SR)) / SR
        f = 95 + 25 * np.tanh((t - dur / 2) * 3) * -1  # doppler: higher approaching, lower leaving
        ph = np.cumsum(f) / SR
        saw = 2 * (ph % 1) - 1
        env = np.exp(-((t - dur / 2) / (dur / 4)) ** 2)
        return (saw * 0.6 + self.noise(200, 3000, n=len(t)) * 0.3) * env

    def life(self, windows):
        """windows: [[t0, t1, mode], ...] with mode calm|heat|snow|night|storm|none|sawah|dieng|bus"""
        R = self.rng
        murmur = self.noise(250, 1400, -0.3)
        for t0, t1, mode in windows:
            if mode in ('storm', 'none') or t1 - t0 < 0.2:
                continue
            w = self.win(t0, t1, 0.15, 0.15)
            if mode in ('calm', 'heat', 'bus', 'sawah', 'dieng'):
                rate = {'calm': 0.35, 'heat': 0.9, 'bus': 0.5, 'sawah': 0.3, 'dieng': 0.7}[mode]
                tt = t0 + R.random() * rate
                while tt < t1 - 0.2:
                    f = 2600 + R.random() * 2600
                    for j in range(1 + int(R.random() * 3)):
                        self.place(self.sfx, self.chirp(f, f * (1.2 + R.random() * 0.4)), tt + j * 0.14, 0.035)
                    tt += rate * (0.6 + R.random())
            if mode in ('calm', 'heat', 'snow'):
                self.sfx += murmur * (0.035 if mode != 'snow' else 0.02) * w
            if mode in ('calm', 'bus'):
                tt = t0 + 0.4 + R.random()
                while tt < t1 - 1.0:
                    self.place(self.sfx, self.motorbike(2.6), tt - 1.3, 0.05)
                    tt += 2.5 + R.random() * 2
            if mode == 'heat':
                self.sfx += self.noise(3000, 7000) * 0.03 * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 6.5 * self.T))) * w  # cicadas
            if mode == 'snow':
                tt = t0 + 0.3
                while tt < t1 - 0.3:  # playful kids: little rising "whee" chimes
                    f = 900 + R.random() * 600
                    self.place(self.sfx, self.tone(lambda x: f + 700 * x, 0.25, 6), tt, 0.03)
                    tt += 0.7 + R.random() * 1.2
            if mode == 'night':
                tt = t0
                while tt < t1:
                    self.place(self.sfx, self.burst(1500, 9000, 0.04, 90), tt, 0.06 + R.random() * 0.05)  # fire crackle
                    tt += 0.05 + R.random() * 0.25
                self.sfx += self.noise(60, 400, -0.6) * 0.06 * w
            if mode == 'sawah':
                tt = t0 + 0.2
                while tt < t1 - 0.3:  # frogs
                    croak = self.tone(420 + R.random() * 200, 0.09, 25) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 40 * np.arange(int(0.09 * SR)) / SR)))
                    self.place(self.sfx, croak, tt, 0.05)
                    tt += 0.18 + R.random() * 0.4
                self.place(self.sfx, self.tone(lambda x: 140 - 40 * x, 1.2, 1.5, 0.1) + self.tone(lambda x: 280 - 80 * x, 1.2, 2, 0.1) * 0.4, t0 + 0.5, 0.08)  # buffalo low

    # ---------------------------------------------------------------- final mix
    def finish(self, timing_json, voice_dir, out_wav, external_music=None, music_gain_db=-4.0, edit=None):
        N, T = self.N, self.T
        music = self.music
        if external_music and os.path.exists(external_music):
            with tempfile.TemporaryDirectory() as td:
                dst = os.path.join(td, 'm.wav')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', external_music, '-ac', '1', '-ar', str(SR), dst], check=True)
                with wave.open(dst) as w:
                    m = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
            if edit:
                xf = int(edit.get('crossfade', 0.1) * SR)
                out = np.zeros(0)
                for a, b in edit['segments']:
                    seg = m[int(a * SR): int(b * SR) + xf].copy()
                    if len(out) and xf:
                        r = np.linspace(0, np.pi / 2, xf)
                        seg[:xf] = seg[:xf] * np.sin(r) + out[-xf:] * np.cos(r)
                        out = out[:-xf]
                    out = np.concatenate([out, seg])
                m = out
                music_gain_db = edit.get('gain_db', music_gain_db)
            m = np.pad(m, (0, max(0, N - len(m))))[:N]
            m /= np.sqrt(np.mean(m ** 2)) + 1e-9
            music = m * 0.11 * 10 ** (music_gain_db / 20) * (1 - self.ss(self.dur - 1.5, self.dur))
        voice = np.zeros(N)
        with tempfile.TemporaryDirectory() as td:
            for s in json.load(open(timing_json)):
                src = os.path.join(voice_dir, f"seg{s['id']}.wav")
                dst = os.path.join(td, f"v{s['id']}.wav")
                # narrator polish: ~4% lower pitch (same speed) for a deeper documentary tone,
                # presence EQ, compression and a faint room so the free TTS voice sounds less flat
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
                                'aresample=22050,asetrate=21168,aresample=22050,atempo=1.0417,'
                                'highpass=f=80,equalizer=f=150:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=3,'
                                'acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=5,'
                                'aecho=0.85:0.6:35|62:0.10|0.06',
                                '-ar', str(SR), '-ac', '1', dst], check=True)
                with wave.open(dst) as w:
                    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
                self.place(voice, x, s['start'])
        voice /= np.abs(voice).max() + 1e-9
        k = int(0.25 * SR)
        cs = np.concatenate([[0], np.cumsum(np.abs(voice))])
        idx = np.arange(N)
        v_env = (cs[np.clip(idx + k // 2, 0, N)] - cs[np.clip(idx - k // 2, 0, N)]) / k
        duck = 1 - 0.58 * np.clip(v_env / 0.06, 0, 1)
        bg = (music * 0.9 + self.sfx) * duck
        d = int(0.012 * SR)
        st = np.stack([bg + voice * 0.95, np.concatenate([np.zeros(d), bg[:-d]]) * 0.97 + voice * 0.95], 1)
        st *= (self.ss(0, 0.05) * (1 - self.ss(self.dur - 0.6, self.dur)))[:, None]
        st /= np.abs(st).max() / 0.95
        raw = out_wav.replace('.wav', '_raw.wav')
        with wave.open(raw, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), out_wav], check=True)
        os.remove(raw)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out_wav, '-c:a', 'libmp3lame', '-b:a', '160k', out_wav.replace('.wav', '.mp3')], check=True)
        print('wrote', out_wav, 'and .mp3', f'({self.dur:.0f} s)')
