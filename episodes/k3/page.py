OUT = 'k3.html'
TITLE = 'Kalau Kamu Terjebak di Dasar Palung Jawa'
BRAND = 'KALAU KAMU… · EP 3'
END_A = 'KALAU KAMU… · EPISODE 3'
END_B = 'Terjebak di Palung Jawa'
END_C = 'Berikutnya: Skala yang bikin merinding'
BIG_S = 'Seri KALAU KAMU… · Episode 3'
SCRIPT = './episodes/k3/main.js'
TEASER = 'SKALA YANG BIKIN MERINDING'
CSS = '''  #gauge { left: 50px; right: 50px; top: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  #gauge div { background: rgba(10,12,16,0.78); border: 3px solid rgba(255,255,255,0.22); border-radius: 18px; padding: 12px 18px; }
  #gauge small { display: block; font-weight: 800; font-size: 26px; opacity: 0.8; letter-spacing: 1px; }
  #gauge b { font-weight: 900; font-size: 56px; font-variant-numeric: tabular-nums; color: #8fd3ff; }
  #cmp { left: 70px; right: 70px; top: 300px; padding: 18px 22px; }
  #cmp .h { font-weight: 900; font-size: 34px; text-align: center; margin-bottom: 8px; }
  #cmp svg { width: 100%; height: 560px; display: block; }
  #big { left: 0; right: 0; top: 330px; text-align: center; }
  #big .a { display: inline-block; font-weight: 900; font-size: 40px; letter-spacing: 2px; padding: 8px 22px; border-radius: 10px; background: #ffd400; color: #111; }
  #big .v { font-weight: 900; font-size: 150px; line-height: 1.02; margin-top: 10px; -webkit-text-stroke: 12px #000; paint-order: stroke fill; font-variant-numeric: tabular-nums; }
  #big .u { font-weight: 900; font-size: 44px; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
  #plan { left: 60px; right: 60px; top: 320px; padding: 20px 28px; }
  #plan .r { display: flex; gap: 18px; align-items: center; font-weight: 900; font-size: 40px; padding: 11px 0; border-top: 2px solid rgba(255,255,255,0.15); }
  #plan .r:first-child { border-top: 0; }
  #plan .r i { font-style: normal; font-size: 50px; width: 70px; text-align: center; }
'''
# depth comparison drawing: 0 m at y=40, 7192 m at y=540 (scale 500/7192)
sc = 500 / 7192
yj = 540 - 4884 * sc
PANELS = f'''<div class="ov" id="gauge"><div><small>KEDALAMAN</small><b id="gD">0 m</b></div><div><small>TEKANAN</small><b id="gP">1 atm</b></div><div><small>SUHU AIR</small><b id="gT">28°C</b></div><div><small>CAHAYA MATAHARI</small><b id="gL">ada</b></div></div>
  <div class="ov panel" id="cmp"><div class="h">Puncak Jaya di dasar Palung Jawa</div><svg viewBox="0 0 900 560">
    <rect x="0" y="40" width="900" height="500" fill="#0b2a44"/><rect x="0" y="0" width="900" height="40" fill="#9cd0f0"/>
    <line x1="0" y1="40" x2="900" y2="40" stroke="#fff" stroke-width="4"/><text x="16" y="30" fill="#111" font-size="26" font-weight="900">permukaan laut</text>
    <polygon points="230,540 450,{yj:.0f} 670,540" fill="#7a6a58" stroke="#fff" stroke-width="3"/><polygon points="420,{yj+36:.0f} 450,{yj:.0f} 480,{yj+36:.0f}" fill="#fff"/>
    <text x="450" y="{yj+90:.0f}" text-anchor="middle" fill="#fff" font-size="30" font-weight="900">Puncak Jaya 4.884 m</text>
    <line x1="800" y1="44" x2="800" y2="{yj:.0f}" stroke="#ffd400" stroke-width="6"/><text x="780" y="{(44+yj)/2:.0f}" text-anchor="end" fill="#ffd400" font-size="34" font-weight="900">± 2,3 km air</text>
    <text x="16" y="530" fill="#8fd3ff" font-size="28" font-weight="900">dasar: 7.192 m</text></svg></div>
  <div class="ov" id="big"><div class="a" id="bA">TEKANAN DI DASAR</div><div class="v" id="bV">±700×</div><div class="u" id="bU">tekanan di permukaan</div></div>
  <div class="ov panel" id="plan"><div class="r" id="p1"><i>🧘</i><span>Jangan panik: hemat oksigen</span></div><div class="r" id="p2"><i>⚓</i><span>Lepas pemberat → naik perlahan</span></div><div class="r" id="p3"><i>⏳</i><span>Naik berjam-jam</span></div><div class="r" id="p4"><i>🤖</i><span>Robot bawah laut dari permukaan</span></div></div>'''
