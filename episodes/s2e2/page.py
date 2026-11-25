OUT = 's2e2.html'
TITLE = 'Andai Bumi Kehilangan Oksigen 5 Detik'
BRAND = 'ANDAI… S2 · EP 2'
END_A = 'ANDAI… SEASON 2 · EPISODE 2'
END_B = 'Oksigen Hilang 5 Detik'
END_C = 'Berikutnya: Andai semua orang Indonesia melompat bersamaan'
BIG_S = 'ANDAI… Season 2 · Episode 2'
SCRIPT = './episodes/s2e2/main.js'
TEASER = 'ANDAI SEMUA ORANG INDONESIA MELOMPAT'
CSS = '''  #count { left: 0; right: 0; top: 300px; text-align: center; }
  #count .v { font-weight: 900; font-size: 300px; line-height: 1; color: #fff; -webkit-text-stroke: 16px #000; paint-order: stroke fill; text-shadow: 0 0 60px rgba(80,200,255,0.8); font-variant-numeric: tabular-nums; }
  #count .u { font-weight: 900; font-size: 50px; color: #8fd3ff; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
  #score { left: 50px; right: 50px; top: 300px; padding: 20px 26px; }
  #score .h { font-weight: 900; font-size: 36px; text-align: center; margin-bottom: 10px; color: #ffd400; }
  #score .r { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 36px; padding: 10px 4px; border-top: 2px solid rgba(255,255,255,0.15); }
  #score .r b { font-weight: 900; font-size: 30px; padding: 4px 14px; border-radius: 10px; background: rgba(255,255,255,0.15); min-width: 150px; text-align: center; }
  #score .r b.m { background: #e5281b; } #score .r b.f { background: #0d9b4a; } #score .r b.s { background: #ff8a00; color: #111; }
  #score .r.on { background: rgba(255,212,0,0.15); border-radius: 10px; }
  #stamp { left: 0; right: 0; top: 760px; text-align: center; }
  #stamp div { display: inline-block; font-weight: 900; font-size: 130px; letter-spacing: 6px; padding: 6px 40px; border: 14px solid currentColor; border-radius: 26px; transform: rotate(-8deg); background: rgba(0,0,0,0.35); text-shadow: 0 6px 20px rgba(0,0,0,0.5); }
  #press { left: 60px; right: 60px; top: 320px; padding: 22px 28px; text-align: center; }
  #press .h { font-weight: 900; font-size: 38px; margin-bottom: 12px; }
  #press .row { display: flex; gap: 20px; justify-content: center; align-items: flex-end; }
  #press .c { flex: 1; }
  #press .c .bar { margin: 0 auto; width: 140px; border-radius: 12px 12px 0 0; background: linear-gradient(#8fd3ff, #1f6fd1); }
  #press .c .v { font-weight: 900; font-size: 54px; } #press .c .l { font-weight: 800; font-size: 28px; opacity: 0.9; }
  #uv { left: 60px; right: 60px; top: 330px; display: flex; gap: 24px; }
  #uv .c { flex: 1; text-align: center; padding: 20px 10px; border-radius: 22px; background: rgba(10,12,16,0.8); border: 3px solid rgba(255,255,255,0.25); }
  #uv .c .v { font-weight: 900; font-size: 96px; line-height: 1.05; } #uv .c .l { font-weight: 800; font-size: 30px; }
  #donut { left: 40px; right: 40px; top: 320px; display: flex; gap: 18px; justify-content: center; }
  #donut .c { width: 310px; text-align: center; background: rgba(10,12,16,0.8); border-radius: 22px; padding: 18px 8px; border: 3px solid rgba(255,255,255,0.25); }
  #donut .p { width: 200px; height: 200px; margin: 0 auto; border-radius: 50%; display: grid; place-items: center; }
  #donut .p span { width: 120px; height: 120px; border-radius: 50%; background: #111; display: grid; place-items: center; font-weight: 900; font-size: 44px; }
  #donut .l { font-weight: 900; font-size: 32px; margin-top: 12px; }
'''
rows = [('Langit gelap', 'm', 'MITOS'), ('Kulit terbakar', 'm', 'MITOS'), ('Telinga pecah', 's', 'SETENGAH'), ('Semua api padam', 'f', 'FAKTA'), ('Gedung runtuh', 'm', 'MITOS*')]
PANELS = '<div class="ov" id="count"><div class="v" id="cV">5</div><div class="u">DETIK TANPA OKSIGEN</div></div>\n  ' + \
  '<div class="ov panel" id="score"><div class="h">MITOS ATAU FAKTA?</div>' + ''.join(f'<div class="r" id="r{i}"><span>{n}</span><b class="{c}" data-v="{v}">?</b></div>' for i, (n, c, v) in enumerate(rows)) + '</div>\n  ' + \
  '<div class="ov" id="stamp"><div id="stV">MITOS</div></div>\n  ' + \
  '<div class="ov panel" id="press"><div class="h">Tekanan udara</div><div class="row"><div class="c"><div class="bar" style="height:300px"></div><div class="v">100%</div><div class="l">Pantai, normal</div></div><div class="c"><div class="bar" id="pB" style="height:237px"></div><div class="v">±79%</div><div class="l">Tanpa oksigen ≈ Dieng ±2.000 m</div></div></div></div>\n  ' + \
  '<div class="ov" id="uv"><div class="c"><div class="v" style="color:#ff8a00">±10 mnt</div><div class="l">kulit mulai terbakar<br>(siang terik)</div></div><div class="c"><div class="v" style="color:#8fd3ff">5 dtk</div><div class="l">oksigen hilang</div></div></div>\n  ' + \
  '<div class="ov" id="donut">' + ''.join(f'<div class="c"><div class="p" style="background:conic-gradient(#ff5a48 0 {p}%, rgba(255,255,255,0.18) {p}% 100%)"><span>{p}%</span></div><div class="l">{n}</div></div>' for n, p in [('Kerak Bumi', 46), ('Air', 89), ('Tubuh kita', 65)]) + '</div>'
