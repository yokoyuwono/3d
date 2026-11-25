OUT = 'k2.html'
TITLE = 'Kalau Kamu Tersambar Petir'
BRAND = 'KALAU KAMU… · EP 2'
END_A = 'KALAU KAMU… · EPISODE 2'
END_B = 'Tersambar Petir'
END_C = 'Berikutnya: Kalau kamu terjebak di dasar Palung Jawa'
BIG_S = 'Seri KALAU KAMU… · Episode 2'
SCRIPT = './episodes/k2/main.js'
TEASER = 'KALAU KAMU TERJEBAK DI DASAR PALUNG JAWA'
CSS = '''  #big { left: 0; right: 0; top: 330px; text-align: center; }
  #big .a { display: inline-block; font-weight: 900; font-size: 40px; letter-spacing: 2px; padding: 8px 22px; border-radius: 10px; background: #ffd400; color: #111; }
  #big .v { font-weight: 900; font-size: 160px; line-height: 1.02; margin-top: 10px; -webkit-text-stroke: 12px #000; paint-order: stroke fill; font-variant-numeric: tabular-nums; }
  #big .u { font-weight: 900; font-size: 44px; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
  #count { left: 60px; right: 60px; top: 320px; padding: 20px 26px; text-align: center; }
  #count .h { font-weight: 900; font-size: 36px; margin-bottom: 6px; }
  #count .v { font-weight: 900; font-size: 140px; line-height: 1.05; color: #ffe14d; font-variant-numeric: tabular-nums; }
  #count .u { font-weight: 800; font-size: 36px; }
  #ecg { left: 60px; right: 60px; top: 320px; padding: 18px 24px; }
  #ecg .h { display: flex; justify-content: space-between; font-weight: 900; font-size: 36px; margin-bottom: 8px; }
  #ecg .h b { color: #ff5a48; }
  #ecg svg { width: 100%; height: 240px; display: block; background: #08140c; border-radius: 12px; }
  #lich { left: 90px; right: 90px; top: 320px; padding: 22px; text-align: center; }
  #lich .h { font-weight: 900; font-size: 38px; margin-bottom: 12px; }
  #lich svg { width: 100%; height: 420px; display: block; border-radius: 16px; background: #c8906c; }
  #lich .s { font-weight: 700; font-size: 28px; margin-top: 10px; opacity: 0.9; }
  #safe { left: 60px; right: 60px; top: 320px; padding: 20px 28px; }
  #safe .r { display: flex; gap: 18px; align-items: center; font-weight: 900; font-size: 38px; padding: 11px 0; border-top: 2px solid rgba(255,255,255,0.15); }
  #safe .r:first-child { border-top: 0; }
  #safe .r i { font-style: normal; font-size: 50px; width: 70px; text-align: center; }
'''
import random
random.seed(5)
def fern(x, y, a, l, d):
    import math
    if d == 0 or l < 6: return ''
    x2, y2 = x + math.cos(a) * l, y + math.sin(a) * l
    s = f'<path d="M{x:.0f},{y:.0f} L{x2:.0f},{y2:.0f}" stroke="#8a2a20" stroke-width="{d * 1.6:.1f}" stroke-linecap="round" fill="none" opacity="0.85"/>'
    return s + fern(x2, y2, a + random.uniform(-0.5, -0.2), l * 0.72, d - 1) + fern(x2, y2, a + random.uniform(0.2, 0.5), l * 0.72, d - 1)
svg = ''.join(fern(450, 400, -1.57 + dx, 110, 7) for dx in (-0.5, 0, 0.5))
PANELS = '''<div class="ov" id="big"><div class="a" id="bA">SUHU PETIR</div><div class="v" id="bV">±27.000°C</div><div class="u" id="bU">±5× permukaan Matahari</div></div>
  <div class="ov panel" id="count"><div class="h">Hitung: kilat → guntur</div><div class="v" id="cV">0 detik</div><div class="u" id="cU">÷ 3 = jarak (km)</div></div>
  <div class="ov panel" id="ecg"><div class="h"><span>Detak jantung</span><b id="eM">normal</b></div><svg viewBox="0 0 900 240" preserveAspectRatio="none"><path id="eP" d="" fill="none" stroke="#3aff7a" stroke-width="4"/></svg></div>
  <div class="ov panel" id="lich"><div class="h">Figur Lichtenberg</div><svg viewBox="0 0 900 420">''' + svg + '''</svg><div class="s">pola di kulit akibat petir · biasanya memudar dalam beberapa hari</div></div>
  <div class="ov panel" id="safe"><div class="r" id="s1"><i>🏠</i><span>Masuk bangunan / mobil beratap logam</span></div><div class="r" id="s2"><i>🌳</i><span>Jauhi pohon tinggi, tiang & air</span></div><div class="r" id="s3"><i>⏱</i><span>Tunggu 30 menit setelah guntur terakhir</span></div><div class="r" id="s4"><i>❤️</i><span>Tolong korban: aman disentuh, pijat jantung</span></div></div>'''
