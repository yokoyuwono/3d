# Prompt backsound untuk Gemini (musik AI)

Video: 2:40, sinematik dokumenter, ada narasi di atasnya, jadi musiknya harus **instrumental tanpa vokal**
dan tidak terlalu ramai di frekuensi suara manusia.

Tempel salah satu prompt di bawah ini ke Gemini. Prompt berbahasa Inggris biasanya memberi hasil paling
konsisten. Kalau Gemini hanya bisa membuat klip pendek (sekitar 30 detik), pakai **Opsi B** (prompt per
bagian), lalu kirim semua klipnya ke saya untuk disambung dan diselaraskan dengan video.

Setelah jadi, simpan file musiknya sebagai `assets/music.mp3` (atau .wav/.m4a), lalu jalankan
`python3 tools/audio.py`. Musik otomatis dipotong ke 2:40, di-fade di akhir, dan volumenya dikecilkan
saat narasi berbicara. Efek suara (gempa, gemuruh, hantaman) tetap dipertahankan.

---

## Opsi A: satu prompt untuk seluruh 2:40

```
Instrumental cinematic documentary score, 2 minutes 40 seconds, no vocals, no choir words.
Purpose: background music under an Indonesian voice-over about an earthquake that causes a tsunami.
Leave room for narration: keep the mid-range (300 Hz to 3 kHz) uncluttered, no busy lead melody
while the narrator talks, gentle dynamics, no sudden loud drops except the marked hits.
Key: A minor. Tempo: about 96 BPM, steady.
Instruments: low strings, soft felt piano, warm synth pads, sub-bass drones, light taiko and
cinematic low hits, subtle ticking percussion, a faint gamelan or metallophone color in the intro
and outro for an Indonesian feel.

Structure (timestamps):
0:00-0:03  three heavy cinematic impact hits, short and dark (flash-forward montage).
0:03-0:14  calm but uneasy: soft piano notes over a warm pad, a faint metallophone motif, sense of mystery.
0:14-0:31  curious documentary pulse: plucked arpeggio in A minor, light ticking, steady and informative.
0:31-0:47  rising tension: string ostinato and a slow riser that builds pressure, heartbeat-like low pulse,
           ends in near silence right before 0:47.
0:47-0:50  massive low boom and rumble (the earthquake), then dark sustained drone.
0:50-1:09  dark, heavy atmosphere: low strings and drones, sparse low hits, ominous.
1:09-1:28  deep ocean feeling: slow pulsing synth bass, distant sonar-like bell tones, vast and cold.
1:28-1:49  eerie suspense: high thin string cluster, quiet heartbeat percussion, unsettling stillness
           (the sea is pulling back).
1:49-1:56  huge build: taiko drums and low brass crescendo, faster and louder.
1:56       biggest impact hit of the track, then a short wash of reverb.
1:56-2:12  aftermath: mournful strings over a low pad, slower, heavy sadness.
2:12-2:27  reflective and tender: solo piano melody with soft pad, a faint metallophone answer,
           human and hopeful (a story about people who survived).
2:27-2:36  emotional rise to a warm major-key resolution (C major), uplifting but serious.
2:36-2:40  final resolving chord with a soft low hit, then fade out.
Mood arc: mystery, tension, catastrophe, grief, hope. Clean mix, no clipping.
```

## Opsi B: prompt per bagian (kalau maksimal sekitar 30 detik per klip)

Gaya dasar untuk setiap klip (tempel di awal tiap prompt):

```
Instrumental cinematic documentary score, no vocals, key of A minor, around 96 BPM,
low strings, felt piano, warm pads, sub-bass drones, light taiko, subtle metallophone color.
Leave room for a voice-over: uncluttered mid-range, no busy lead melody.
```

1. **Pembuka & bab 1 (0:00–0:31), 31 detik**
   ```
   Starts with three short dark cinematic impact hits, then calm but uneasy soft piano and warm pad
   with a faint metallophone motif, then evolves into a curious documentary pulse with a plucked
   A minor arpeggio and light ticking. Mysterious, informative.
   ```
2. **Bab 2 (0:31–0:47), 16 detik**
   ```
   Rising tension: string ostinato and a slow riser building pressure, low heartbeat pulse,
   ends abruptly in near silence.
   ```
3. **Bab 3 (0:47–1:09), 22 detik**
   ```
   Opens with a massive low boom and rumble like an earthquake, then a dark heavy drone with
   low strings and sparse low hits. Ominous.
   ```
4. **Bab 4 (1:09–1:28), 19 detik**
   ```
   Deep ocean atmosphere: slow pulsing synth bass, distant sonar-like bell tones, vast and cold.
   ```
5. **Bab 5 (1:28–1:49), 21 detik**
   ```
   Eerie suspense: high thin string cluster, quiet heartbeat percussion, unsettling stillness.
   ```
6. **Bab 6 (1:49–2:12), 23 detik**
   ```
   Fast crescendo with taiko drums and low brass for 7 seconds, one huge impact hit,
   then mournful strings over a low pad, heavy sadness.
   ```
7. **Bab 7 & penutup (2:12–2:40), 28 detik**
   ```
   Reflective solo piano melody with soft pad and faint metallophone, human and hopeful,
   rising to a warm C major resolution, ending on a soft final chord and fade out.
   ```

Tips: kalau hasilnya terlalu ramai, tambahkan "minimal, sparse arrangement". Kalau terlalu datar,
tambahkan "more dynamic contrast, bigger cinematic hits".
