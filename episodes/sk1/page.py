OUT = 'sk1.html'
TITLE = 'Skala yang Bikin Merinding'
BRAND = 'SKALA · EP 1'
END_A = 'SKALA YANG BIKIN MERINDING'
END_B = 'Kita kecil, tapi kita bisa memahaminya'
END_C = 'Tulis ide video berikutnya di komentar 👇'
BIG_S = 'Seri SKALA · Episode 1'
SCRIPT = './episodes/sk1/main.js'
TEASER = ''
CSS = '''  #rank { left: 0; right: 0; top: 300px; text-align: center; }
  #rank .v { display: inline-block; font-weight: 900; font-size: 170px; line-height: 1; padding: 10px 40px; border-radius: 30px; background: #ffd400; color: #111; box-shadow: 0 16px 50px rgba(0,0,0,0.5); }
  #rank .u { font-weight: 900; font-size: 56px; margin-top: 18px; -webkit-text-stroke: 9px #000; paint-order: stroke fill; }
  #big { left: 0; right: 0; top: 330px; text-align: center; }
  #big .a { display: inline-block; font-weight: 900; font-size: 40px; letter-spacing: 2px; padding: 8px 22px; border-radius: 10px; background: #ff8a00; color: #111; }
  #big .v { font-weight: 900; font-size: 140px; line-height: 1.02; margin-top: 10px; -webkit-text-stroke: 12px #000; paint-order: stroke fill; font-variant-numeric: tabular-nums; }
  #big .u { font-weight: 900; font-size: 44px; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
  #ladder { right: 40px; top: 420px; width: 120px; display: flex; flex-direction: column; gap: 10px; }
  #ladder i { font-style: normal; display: block; text-align: center; font-weight: 900; font-size: 34px; padding: 6px 0; border-radius: 12px; background: rgba(10,12,16,0.7); border: 3px solid rgba(255,255,255,0.25); opacity: 0.5; }
  #ladder i.on { background: #ffd400; color: #111; opacity: 1; transform: scale(1.12); }
  #ladder i.done { opacity: 0.25; }
'''
PANELS = '''<div class="ov" id="rank"><div class="v" id="rV">#7</div><div class="u" id="rU">TSUNAMI ACEH</div></div>
  <div class="ov" id="big"><div class="a" id="bA">TSUNAMI ACEH 2004</div><div class="v" id="bV">&gt;30 m</div><div class="u" id="bU">≈ gedung 10 lantai</div></div>
  <div class="ov" id="ladder">''' + ''.join(f'<i id="L{n}">#{n}</i>' for n in range(7, 0, -1)) + '</div>'
