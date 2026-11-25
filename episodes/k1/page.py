OUT = 'k1.html'
TITLE = 'Kalau Kamu Jatuh dari Pesawat Tanpa Parasut'
BRAND = 'KALAU KAMU… · EP 1'
END_A = 'KALAU KAMU… · EPISODE 1'
END_B = 'Jatuh dari Pesawat'
END_C = 'Berikutnya: Kalau kamu tersambar petir'
BIG_S = 'Seri KALAU KAMU… · Episode 1'
SCRIPT = './episodes/k1/main.js'
TEASER = 'KALAU KAMU TERSAMBAR PETIR'
CSS = '''  #alt { left: 50px; right: 50px; top: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  #alt div { background: rgba(10,12,16,0.78); border: 3px solid rgba(255,255,255,0.22); border-radius: 18px; padding: 12px 18px; }
  #alt small { display: block; font-weight: 800; font-size: 26px; opacity: 0.8; letter-spacing: 1px; }
  #alt b { font-weight: 900; font-size: 56px; font-variant-numeric: tabular-nums; color: #ffe14d; }
  #land { left: 60px; right: 60px; top: 320px; padding: 20px 28px; }
  #land .h { font-weight: 900; font-size: 38px; margin-bottom: 8px; color: #ffd400; }
  #land .r { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 42px; padding: 10px 0; border-top: 2px solid rgba(255,255,255,0.15); }
  #land .r i { font-style: normal; font-size: 52px; }
  #rec { left: 0; right: 0; top: 320px; text-align: center; }
  #rec .a { display: inline-block; font-weight: 900; font-size: 38px; letter-spacing: 2px; padding: 8px 22px; border-radius: 10px; background: #ffd400; color: #111; }
  #rec .v { font-weight: 900; font-size: 160px; line-height: 1.02; margin-top: 8px; -webkit-text-stroke: 12px #000; paint-order: stroke fill; font-variant-numeric: tabular-nums; }
  #rec .u { font-weight: 900; font-size: 44px; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
'''
PANELS = '''<div class="ov" id="alt"><div><small>KETINGGIAN</small><b id="aH">10.000 m</b></div><div><small>KECEPATAN</small><b id="aV">0 km/jam</b></div><div><small>SUHU UDARA</small><b id="aT">−50°C</b></div><div><small>SISA WAKTU</small><b id="aW">03:00</b></div></div>
  <div class="ov panel" id="land"><div class="h">MENDARAT DI MANA?</div><div class="r" id="l1"><span>Air / laut</span><i>❌</i></div><div class="r" id="l2"><span>Lereng bersalju</span><i>✅</i></div><div class="r" id="l3"><span>Rawa · semak lebat</span><i>✅</i></div><div class="r" id="l4"><span>Pohon (dahan meredam)</span><i>✅</i></div></div>
  <div class="ov" id="rec"><div class="a" id="rA">REKOR GUINNESS · 1972</div><div class="v" id="rV">10.160 m</div><div class="u" id="rU">jatuh tertinggi tanpa parasut</div></div>'''
