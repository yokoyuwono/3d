# Simulasi 3D: Gempa → Tsunami → Banjir (2:40, 9:16)

Animasi 3D vertikal (1080×1920, 30 fps) untuk Shorts/Reels/TikTok, dibuat dengan Three.js
dan dirender offline di Chromium headless. Narasinya berbahasa Indonesia (Piper TTS offline),
dengan subtitle per kata, penanda bab, dan desain suara prosedural.

- **Versi panjang (2:40):** `output/gempa_tsunami_2m40_9x16.mp4`
- **Versi pendek (60 dtk):** `output/gempa_tsunami_9x16.mp4` (dari commit sebelumnya)
- **Prompt backsound Gemini:** `docs/gemini_music_prompt.md`

## Seri ANDAI… (web langsung, tiap episode halaman terpisah)

| Ep | Halaman | Kode & aset | Status |
|---|---|---|---|
| 1 | `ep1.html`: Andai Bumi berhenti berputar (2:50) | `episodes/ep1/` | selesai (web) |
| 2 | `ep2.html`: Andai Indonesia bersalju (2:58) | `episodes/ep2/` | selesai (web) |
| 3 | `ep3.html`: Andai semua es mencair (2:28) | `episodes/ep3/` | selesai (web) |
| 4 | `ep4.html`: Andai ada lubang tembus Bumi (2:37) | `episodes/ep4/` | selesai (web) |
| 5 | `ep5.html`: Andai Bulan menghilang (2:22) | `episodes/ep5/` | selesai (web) |

### Season 2 dan seri baru (satu per satu, tiap episode > 2 menit)

| # | Halaman | Kode & aset | Status |
|---|---|---|---|
| S2E1 | `s2e1.html`: Andai Gunung Toba meletus lagi (2:55) | `episodes/s2e1/` (medan asli Toba: `tools/dem_region.py`, `tools/toba_mask.py`) | selesai (web) |
| S2E2 | `s2e2.html`: Andai Bumi kehilangan oksigen 5 detik (3:05) | `episodes/s2e2/` | selesai (web) |
| S2E3 | `s2e3.html`: Andai semua orang Indonesia melompat bersamaan (3:04) | `episodes/s2e3/` | selesai (web) |
| S2E4 | `s2e4.html`: Andai Jakarta tenggelam 2050 (3:06) | `episodes/s2e4/` | selesai (web) |
| S2E5 | `s2e5.html`: Andai Matahari tiba-tiba padam (3:04) | `episodes/s2e5/` | selesai (web) |
| K1 | `k1.html`: Kalau kamu jatuh dari pesawat tanpa parasut (3:04) | `episodes/k1/` | selesai (web) |
| K2 | `k2.html`: Kalau kamu tersambar petir (3:06) | `episodes/k2/` | selesai (web) |
| K3 | `k3.html`: Kalau kamu terjebak di dasar Palung Jawa (2:56) | `episodes/k3/` | selesai (web) |
| SK1 | Skala yang bikin merinding | | berikutnya |

MP4 per episode: `EP=1 N=4 ./tools/render_ep.sh` (butuh `build/ep1_events.json`), hasil di `output/andai_ep1_9x16.mp4`.

Episode diputar langsung di browser (Three.js), jam animasinya mengikuti soundtrack. Bersama-sama memakai
`src/kit.js` (pemutar, subtitle, label), `src/globe.js` (bola Bumi, data daratan Natural Earth) dan
`tools/audiokit.py`. Membuat ulang audio Ep1: `node tools/render.mjs --page ep1.html --events build/ep1_events.json`
lalu `python3 episodes/ep1/audio.py`. Render ke MP4 nanti: `node tools/render.mjs --page ep1.html --from 0 --to 163 --out build/ep1.mp4`.

## Alur 7 bab

| Waktu | Bab | Visual | Inti penjelasan |
|---|---|---|---|
| 0:00–0:14 | Hook | Kilas-depan (dinding air, runtuh, banjir), kota tenang, papan jalur evakuasi | Satu tanda penyelamat + satu pulau yang selamat karena kisah turun-temurun |
| 0:14–0:31 | 1. Kenapa Indonesia? | Peta ilustrasi kepulauan, zona subduksi, panah lempeng | Indo-Australia menyusup ke bawah Eurasia ±5–7 cm/tahun |
| 0:31–0:47 | 2. Lempeng terkunci | Diorama lempeng + sisipan penggaris yang ditekan | Lempeng tersangkut, energi menumpuk ratusan tahun |
| 0:47–1:09 | 3. Gempa M 8,9 | Patahan, kota berguncang, kubus energi, ikon merunduk-berlindung-bertahan | Tiap +1 magnitudo ≈ 32× energi; M9 ≈ 1.000× M7 |
| 1:09–1:28 | 4. Lahirnya tsunami | Dasar laut terangkat (gerak lambat), potongan samudra | Di laut dalam ±1 m tapi ±700 km/jam |
| 1:28–1:49 | 5. Kenapa laut surut? | Gelombang melambat & meninggi, lembah datang duluan, laut surut | Pendangkalan gelombang; surut = tanda bahaya |
| 1:49–2:12 | 6. Hantaman | Dinding 30 m, skala orang & mobil, banjir | 15 cm air bergerak menjatuhkan orang dewasa, 30 cm menghanyutkan mobil kecil |
| 2:12–2:40 | 7. Kisah smong | Peta Simeulue, warga lari ke bukit, putar ulang tanda, titik kumpul | Simeulue 2004: hampir semua selamat berkat kisah smong (dari tsunami 1907) |

Sumber fakta: laju lempeng (USGS, Caltech Tectonics Observatory), ambang air bergerak 15/30 cm
(NWS "Turn Around Don't Drown"), Simeulue dan smong (catatan 2004 dan kajian akademis). Animasi
dan skala diilustrasikan dan dilebih-lebihkan untuk edukasi.

## Struktur

```
index.html          halaman + overlay (bab, subtitle, panel, label, ikon, kutipan)
src/timeline.js     "fisika" kota: medan, muka air, tsunami, suasana, guncangan (fungsi waktu dunia)
src/world.js        kota pesisir, laut (shader), perahu, orang, pengungsi, puing, debu, semburan
src/crust.js        diorama potongan lempeng subduksi (+ kelas Prism)
src/map.js          peta ilustrasi kepulauan, zona subduksi, Simeulue
src/ocean.js        potongan samudra: kecepatan & pendangkalan gelombang
src/extras.js       kubus energi, penggaris, adegan skala orang/mobil
src/main.js         daftar shot (mengikuti waktu kata narasi), overlay, renderAt(t), EVENTS
narration.json      naskah 20 segmen + jeda
assets/voice/       narasi per segmen, assets/timing.json waktu per kalimat
assets/soundtrack.* mix final (narasi + musik + efek, -14 LUFS)
tools/              tts.py, audio.py, render.mjs, render_all.sh, mux.sh, sheet.py
```

## Membangun ulang

```bash
npm install
pip install piper-tts numpy
# 1) narasi (sudah ada di assets/voice)
python3 tools/tts.py <id_ID-news_tts-medium.onnx> narration.json assets/voice 0.95 && mv assets/voice/timing.json assets/
# 2) event timeline untuk audio, lalu audio (taruh assets/music.mp3 untuk backsound sendiri)
node tools/render.mjs --events build/events.json
python3 tools/audio.py
# 3) video
DUR=160 ./tools/render_all.sh && ./tools/mux.sh
```

Pratinjau: jalankan server statis di folder ini lalu buka `index.html` (`?t=90` untuk mulai di detik 90;
klik untuk suara). `node tools/render.mjs --stills 5,60,120` merender frame tertentu ke `build/stills/`.

**Pesan keselamatan:** jika laut tiba-tiba surut setelah gempa, jangan mendekat. Segera lari ke tempat tinggi.
