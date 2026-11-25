OUT = 's2e3.html'
TITLE = 'Andai Semua Orang Indonesia Melompat Bersamaan'
BRAND = 'ANDAI… S2 · EP 3'
END_A = 'ANDAI… SEASON 2 · EPISODE 3'
END_B = 'Semua Melompat Bersamaan'
END_C = 'Berikutnya: Andai Jakarta tenggelam tahun 2050'
BIG_S = 'ANDAI… Season 2 · Episode 3'
SCRIPT = './episodes/s2e3/main.js'
TEASER = 'ANDAI JAKARTA TENGGELAM 2050'
CSS = '''  #count { left: 0; right: 0; top: 330px; text-align: center; }
  #count .v { font-weight: 900; font-size: 280px; line-height: 1; color: #ffe14d; -webkit-text-stroke: 16px #000; paint-order: stroke fill; text-shadow: 0 0 60px rgba(255,200,40,0.7); }
  #zones { left: 40px; right: 40px; top: 320px; display: flex; gap: 16px; }
  #zones .c { flex: 1; text-align: center; background: rgba(10,12,16,0.82); border: 3px solid rgba(255,255,255,0.25); border-radius: 22px; padding: 16px 6px; }
  #zones .c b { display: block; font-weight: 900; font-size: 84px; font-variant-numeric: tabular-nums; }
  #zones .c span { font-weight: 900; font-size: 34px; padding: 4px 14px; border-radius: 10px; }
  #zones .c small { display: block; font-weight: 700; font-size: 24px; margin-top: 6px; opacity: 0.85; }
  #big { left: 0; right: 0; top: 330px; text-align: center; }
  #big .a { display: inline-block; font-weight: 900; font-size: 40px; letter-spacing: 2px; padding: 8px 22px; border-radius: 10px; background: #ffd400; color: #111; }
  #big .v { font-weight: 900; font-size: 150px; line-height: 1.02; margin-top: 10px; -webkit-text-stroke: 12px #000; paint-order: stroke fill; font-variant-numeric: tabular-nums; }
  #big .u { font-weight: 900; font-size: 46px; -webkit-text-stroke: 8px #000; paint-order: stroke fill; }
  #seis { left: 50px; right: 50px; top: 320px; padding: 18px 24px; }
  #seis .h { display: flex; justify-content: space-between; font-weight: 900; font-size: 34px; margin-bottom: 8px; }
  #seis .h b { color: #ffe14d; }
  #seis svg { width: 100%; height: 260px; display: block; background: #f4efe2; border-radius: 12px; }
  #seis .f { font-weight: 700; font-size: 24px; opacity: 0.85; margin-top: 8px; }
  #energy { left: 60px; right: 60px; top: 320px; padding: 22px 28px; }
  #energy .h { font-weight: 900; font-size: 36px; margin-bottom: 14px; }
  #energy .row { margin: 8px 0 18px; }
  #energy .l { display: flex; justify-content: space-between; font-weight: 800; font-size: 32px; margin-bottom: 8px; }
  #energy .b { height: 44px; border-radius: 10px; background: rgba(255,255,255,0.12); overflow: hidden; }
  #energy .f { height: 100%; width: 0; border-radius: 10px; }
  #verdict { left: 60px; right: 60px; top: 320px; padding: 22px 30px; }
  #verdict .r { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 44px; padding: 14px 0; border-top: 2px solid rgba(255,255,255,0.15); }
  #verdict .r:first-child { border-top: 0; }
  #verdict .r i { font-style: normal; font-size: 56px; }
'''
PANELS = '''<div class="ov" id="count"><div class="v" id="cV">3</div></div>
  <div class="ov" id="zones"><div class="c"><span style="background:#1f6fd1">WIB</span><b id="z1">12.00</b><small>Sumatra · Jawa · Kalbar/Kalteng</small></div><div class="c"><span style="background:#0d9b4a">WITA</span><b id="z2">13.00</b><small>Bali · NTT · Sulawesi · Kalsel/Kaltim</small></div><div class="c"><span style="background:#e5281b">WIT</span><b id="z3">14.00</b><small>Maluku · Papua</small></div></div>
  <div class="ov" id="big"><div class="a" id="bA">MELAYANG DI UDARA</div><div class="v" id="bV">±14 juta ton</div><div class="u" id="bU">285 juta orang × ±50 kg</div></div>
  <div class="ov panel" id="seis"><div class="h"><span>Alat pencatat gempa</span><b id="sM">tenang</b></div><svg viewBox="0 0 900 260" preserveAspectRatio="none"><path id="sP" d="" fill="none" stroke="#c0281b" stroke-width="3"/></svg><div class="f" id="sF">Konser di Seattle, Juli 2023 · tercatat ≈ M 2,3</div></div>
  <div class="ov panel" id="energy"><div class="h">Energi getaran (skala dikecilkan)</div>
    <div class="row"><div class="l"><span>Konser stadion (≈ M 2,3)</span><span>1×</span></div><div class="b"><div class="f" id="e1" style="background:#3aa0ff"></div></div></div>
    <div class="row"><div class="l"><span>Gempa M 6 (merusak rumah)</span><span>±350.000×</span></div><div class="b"><div class="f" id="e2" style="background:#e5281b"></div></div></div></div>
  <div class="ov panel" id="verdict"><div class="r" id="v1"><span>Pulau bergeser</span><i>❌</i></div><div class="r" id="v2"><span>Gempa besar</span><i>❌</i></div><div class="r" id="v3"><span>Ramai & antre tukang urut</span><i>✅</i></div></div>'''
