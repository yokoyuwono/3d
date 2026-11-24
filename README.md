# Simulasi 3D: Gempa → Tsunami → Banjir (60 detik, 9:16)

Animasi 3D vertikal (1080×1920, 30 fps, 60 detik) untuk Shorts/Reels/TikTok, dibuat
dengan Three.js dan dirender offline di Chromium headless. Narasinya berbahasa
Indonesia, dengan subtitle gaya TikTok (kata yang sedang diucapkan disorot).

**Hasil akhir:** `output/gempa_tsunami_9x16.mp4`

## Alur cerita & teknik retensi

| Detik | Adegan | Narasi | "Hook" penahan penonton |
|---|---|---|---|
| 0–8 | Kota pesisir tenang, kamera drone | *"Kota ini cuma punya enam puluh detik. Dan ada satu tanda yang bisa menyelamatkan semua orang. Perhatikan baik-baik."* | Hitung mundur 00:60 dan misi "CARI 1 TANDA PENYELAMAT SEBELUM 00:00" (open loop) |
| 8–17 | Potongan 3D lempeng bumi, zona terkunci berdenyut | *"Sepuluh kilometer di bawah laut, dua lempeng bumi saling mengunci…"* | Meter "TEKANAN LEMPENG" naik ke 100% |
| 16,5 | Lempeng patah, gelombang seismik | *"Sampai akhirnya, patah!"* | Kilatan, guncangan, "M 8,9" |
| 17–23 | Gedung bergoyang dan runtuh, tanah retak, debu | *"…guncangan ini, belum bagian terburuk."* | Janji bahwa yang lebih buruk masih akan datang |
| 23–31 | Laut surut ratusan meter, perahu kandas, orang mendekat | *"Lihat lautnya. Airnya justru mundur…"* | Tanda "AIR MUNDUR 174 m" (tanda penyelamatnya terlihat, tetapi belum disebut) |
| 31–41 | Garis putih di cakrawala menjadi dinding air 30 m | *"Itu kesalahan fatal…"* | Panel jarak/tinggi/waktu tiba dihitung mundur |
| 41–49 | Banjir: jalan jadi sungai, air naik lantai demi lantai | *"Lantai satu, lantai dua, atap."* | Pengukur ketinggian air, label "TERENDAM" |
| 49–56 | Putar ulang (sepia) ke momen laut surut | *"Tanda yang kujanjikan tadi? Kamu sudah melihatnya."* | Jawaban dari open loop di awal |
| 56–60 | Warga selamat di bukit evakuasi, kartu penutup | *"Lari ke tempat tinggi. Sekarang."* | Ajakan untuk membagikan video |

## Struktur

```
index.html          halaman + overlay (timer, subtitle, panel, label)
src/timeline.js     "fisika" cerita: medan, muka air, tsunami, suasana, guncangan (fungsi waktu)
src/world.js        kota pesisir, laut (shader), perahu, orang, puing, debu, semburan
src/crust.js        diorama potongan lempeng subduksi
src/main.js         shot kamera, overlay, subtitle, renderAt(t)
narration.json      naskah narasi + waktu mulai tiap segmen
assets/voice/       rekaman narasi per segmen (TTS Piper offline, suara id_ID)
assets/timing.json  waktu tiap kalimat (untuk subtitle)
assets/soundtrack.* mix final (narasi + musik + efek suara prosedural, -14 LUFS)
tools/              tts.py, audio.py, render.mjs, render_all.sh, mux.sh
```

## Membangun ulang

```bash
npm install                                   # three.js
pip install piper-tts numpy                   # TTS opsional
# 1) narasi (opsional, sudah ada di assets/voice)
python3 tools/tts.py <id_ID-news_tts-medium.onnx> narration.json assets/voice 0.93
cp assets/voice/timing.json assets/
# 2) audio
python3 tools/audio.py
# 3) video (Playwright + Chromium + ffmpeg)
./tools/render_all.sh && ./tools/mux.sh
```

Pratinjau langsung: jalankan server statis di folder ini (misalnya `npx serve`) lalu buka
`index.html`. Klik untuk memutar dari awal dengan suara; `?t=30` untuk mulai dari detik 30.
`node tools/render.mjs --stills 5,20,40` merender frame tertentu ke `build/stills/`.

Catatan: animasi ini dibuat dramatis untuk edukasi (deformasi lempeng dan kecepatan gelombang
dilebih-lebihkan). Pesan keselamatannya nyata: **jika laut tiba-tiba surut setelah gempa,
jangan mendekat. Segera lari ke tempat tinggi.**
