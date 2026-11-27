// "Kopi 25 Ribu Sehari" — Spreadsheet Film, vertical 1080×1920. Channel "Uang & Kerja", episode 1.
// Everything on screen is something a sheet can make: fills, values, merged cells, the formula bar, a widening column.
const W = 1080, H = 1920;
let TL, VO = {}, g, Q;
export const DUR = () => TL.end;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, eo = t => 1 - Math.pow(1 - t, 3), ss = t => t * t * (3 - 2 * t);
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const UI = "'Inter',sans-serif";
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join(''); };

// ---------------- palette (colour = a rule fired) ----------------
const INK = '#17120a', AMBER = '#ffb21f', CUP = ['#ffb21f', '#ffc95a', '#f29a12', '#ffd27a', '#e88b0c'];  // one shade per year
const SAVE = '#b8f25a', SAVE_INK = '#2c4a00', NO = '#e8382d', NOTE = '#fff4c7', HEAD = '#2a2f6c';
const rp = n => 'Rp' + Math.round(n).toLocaleString('de-DE');            // 25000 → Rp25.000

// ---------------- shell (fixed; only the sheet zooms) ----------------
const TITLE_H = 48, TOOL_H = 64, FBAR_H = 86, ROWH_W = 64, TABS_H = 44, STAT_H = 42;
const SHEET_B = H - TABS_H - STAT_H;
const RH = 22, CWID = 64, VAL = 3, VAL_W0 = 170, VAL_W1 = 318;      // value column B (index 3): narrow → wide at the #### gag
const WALL0 = 5, WALL_C = 14, WALL_R0 = 1, DAYS = 1825;               // 1 cell = 1 cup; 14 columns = 2 weeks per row
const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };

// ---------------- merged cells (the layout) ----------------
const M = {
  HDR_L: [0, 2, 0, 0], HDR_V: [3, 3, 0, 0],
  L1: [0, 2, 1, 2], V1: [3, 3, 1, 2],
  L2: [0, 2, 3, 4], V2: [3, 3, 3, 4],
  L3: [0, 2, 5, 6], V3: [3, 3, 5, 6],
  L4: [0, 2, 7, 8], V4: [3, 3, 7, 8],
  L5: [0, 2, 9, 10], V5: [3, 3, 9, 10],
  LS: [0, 2, 12, 13], VS: [3, 3, 12, 13],
  CARD: [0, 3, 15, 24],
  HOOK_L: [3, 3, 3, 5], HOOK_V: [3, 3, 6, 17],
};
const ROWS = [
  { l: 'L1', v: 'V1', label: 'Kopi / hari', fx: '=25000', val: 25000 },
  { l: 'L2', v: 'V2', label: 'Sebulan (22 hari kerja)', fx: '=D2*22', val: 550000 },
  { l: 'L3', v: 'V3', label: 'Setahun', fx: '=D4*12', val: 6600000 },
  { l: 'L4', v: 'V4', label: 'Setahun (tiap hari)', fx: '=D2*365', val: 9125000 },
  { l: 'L5', v: 'V5', label: '5 tahun', fx: '=D8*5', val: 45625000 },
];
const HOOK_FX = '=25000*365*5', HOOK_VAL = 45625000;
const SAVE_ROW = { l: 'LS', v: 'VS', label: 'Hemat (2× seminggu)', fx: '=D2*5*52', val: 6500000 };

// ---------------- timing (from the narration) ----------------
let T = {}, EV = [], CUES = [];
const wordT = (id, f) => VO[id].t0 + (VO[id].t1 - VO[id].t0) * f;
function buildTiming() {
  const v = id => VO[id];
  T = {
    // row 1: typed before the hook line, result on the word
    hk: { ty: [0.02, 0.42], slam: 0.6, rw: [3.0, 3.55] },
    ty1: [3.55, 3.55], en1: 3.55,
    hop2: 4.85, ty2: [5.55, 6.35], en2: wordT('l02', .6),
    hop3: v('l03').t0 - .35, ty3: [v('l03').t0 - .2, v('l03').t1], en3: v('l03').t1 + .1,
    wid: [v('l04').t0 - .45, v('l04').t0 + .15],
    hop4: v('l05').t0 - .3, ty4: [v('l05').t0 + .2, v('l05').t0 + 1.0], en4: wordT('l05', .68),
    hop5: v('l06').t0 - .5, ty5: [v('l06').t0 - .3, v('l06').t1 - .05], en5: v('l07').t0 - .2,
    sil: [v('l06').t0 - .55, v('l07').t0 - .2],
    pull: [wordT('l07', .5), wordT('l07', .5) + 2.0], paint: [wordT('l07', .56), v('l07').t1 + .9],
    sweep: [v('l09').t0 + .3, wordT('l09', .45)],
    tyS: [wordT('l09', .42), wordT('l09', .56)], enS: wordT('l09', .62),
    card: [v('l10').t0 - .6, v('l10').t0 + .5],
  };
  // paint order: day by day (rows from the top), one ring of light per cell
  EV = [];
  const keys = (s, a, b) => { const n = [...s].length; for (let q = 0; q < n; q++) EV.push({ t: +(a + (b - a) * q / n).toFixed(3), type: 'key' }); };
  ROWS.forEach((r, i) => { if (i) keys(r.fx, ...T['ty' + (i + 1)]); });
  keys(HOOK_FX, ...T.hk.ty);
  for (let q = 0; q < 14; q++) EV.push({ t: +(T.hk.ty[1] + q * (T.hk.slam - T.hk.ty[1]) / 14).toFixed(3), type: 'count', n: q });
  EV.push({ t: T.hk.slam, type: 'slam' }, { t: T.hk.rw[0], type: 'rewind', dur: T.hk.rw[1] - T.hk.rw[0] });
  keys(SAVE_ROW.fx, ...T.tyS);
  [T.en1, T.en2, T.en3, T.en4, T.en5, T.enS].forEach((t, n) => EV.push({ t, type: 'enter', n }));
  [T.hop2, T.hop3, T.hop4, T.hop5].forEach(t => EV.push({ t, type: 'hop' }));
  EV.push({ t: T.en3 + .05, type: 'hash' });
  for (let q = 0; q < 5; q++) EV.push({ t: +(T.wid[0] + q * (T.wid[1] - T.wid[0]) / 5).toFixed(3), type: 'ratchet' });
  EV.push({ t: wordT('l04', .1), type: 'pop' }, { t: T.en5, type: 'ding' }, { t: T.enS, type: 'win' });
  EV.push({ t: T.pull[0], type: 'whoosh', dur: T.pull[1] - T.pull[0] }, { t: T.card[0], type: 'card' });
  for (let q = 0; q < 60; q++) EV.push({ t: +(T.paint[0] + (T.paint[1] - T.paint[0]) * q / 60).toFixed(3), type: 'paint', n: q });
  for (let q = 0; q < 36; q++) EV.push({ t: +(T.sweep[0] + (T.sweep[1] - T.sweep[0]) * q / 36).toFixed(3), type: 'save', n: q });
  EV.push({ t: T.sil[0], type: 'cue', name: 'silence' }, { t: T.sil[1], type: 'cue', name: 'drop' }, { t: VO.l08.t0 - .3, type: 'cue', name: 'half' }, { t: T.sweep[0], type: 'cue', name: 'groove' });
  EV.sort((a, b) => a.t - b.t);
}
// day d → cell; when it is painted (cup) and when it turns lime (saved: 5 of every 7 days)
const dayCell = d => ({ c: WALL0 + (d % WALL_C), r: WALL_R0 + Math.floor(d / WALL_C) });
const paintT = d => T.paint[0] + (T.paint[1] - T.paint[0]) * (d / DAYS) * .92 + hash(d, 3) * .06;
const saved = d => { const w = d % 7; return w !== 0 && w !== 3; };
const saveT = d => T.sweep[0] + (T.sweep[1] - T.sweep[0]) * (Math.floor(d / WALL_C) / Math.ceil(DAYS / WALL_C)) * .95 + hash(d, 7) * .04;

// ---------------- column layout ----------------
const NC = 40; let CX = new Float64Array(NC + 2);
function layout(t) { let x = 0; for (let i = 0; i <= NC; i++) { CX[i] = x; x += colWt(i, t); } CX[NC + 1] = x; }
function colWt(i, t) {
  if (i === VAL) { if (t < T.hk.rw[1]) return lerp(VAL_W1, VAL_W0, eio(seg(t, T.hk.rw[0], T.hk.rw[1]))); return lerp(VAL_W0, VAL_W1, eio(seg(t, T.wid[0], T.wid[1]))); }
  return CWID;
}
let TNOW = 0;
const colX = i => i <= NC ? CX[Math.max(0, i)] : CX[NC] + (i - NC) * CWID;
const colW = i => colWt(i, TNOW);
const colXf = c => { const i = Math.floor(c); return colX(i) + (c - i) * colW(i); };

// ---------------- camera ----------------
let CK = [];
function buildCam() {
  const v = id => VO[id];
  CK = [
    { t: 0, at: [3.5, 10.6], z: 2.95 },
    { t: T.hk.rw[0], at: [3.5, 10.6], z: 3.08, e: 'ss' },
    { t: T.hk.rw[1] + .05, at: [2.2, 1.8], z: 2.75, e: 'eio' },
    { t: 4.3, at: [2.2, 2.4], z: 2.45, e: 'ss' },
    { t: T.hop2 + .4, at: [2.3, 3.6], z: 2.25, e: 'eio' },
    { t: T.hop3 + .3, at: [2.4, 5.4], z: 2.2, e: 'eio' },
    { t: T.wid[1] + .3, at: [3.18, 5.8], z: 1.88, e: 'eio' },
    { t: T.hop4 + .4, at: [3.18, 7.2], z: 1.88, e: 'eio' },
    { t: T.hop5 + .3, at: [3.18, 8.8], z: 1.88, e: 'eio' },
    { t: T.pull[0], at: [3.18, 9.4], z: 1.9, e: 'ss' },
    { t: (T.pull[0] + T.pull[1]) / 2, at: [5.4, 26], z: 0.95, e: 'eio' },
    { t: T.pull[1], at: [10.6, 64], z: 0.5, e: 'ss' },
    { t: v('l09').t0, at: [10.6, 64], z: 0.53, e: 'ss' },
    { t: T.sweep[0] + .7, at: [11.5, 13.5], z: 1.05, e: 'eio' },
    { t: T.tyS[0], at: [11.5, 16.5], z: 1.05, e: 'ss' },
    { t: T.enS - .1, at: [3.05, 12.0], z: 1.9, e: 'eio' },
    { t: T.card[0] + .1, at: [3.05, 13.0], z: 1.9, e: 'ss' },
    { t: T.card[1] + .3, at: [3.05, 18.2], z: 1.85, e: 'eio' },
    { t: TL.end, at: [3.05, 18.6], z: 1.95, e: 'ss' },
  ];
}
const EASE = { eio, ss, eo, lin: x => x };
let CAM, HDR, SHEET_Y, VCX, VCY, VW, VH;
function camera(t) {
  let q = 0; while (q < CK.length - 2 && t > CK[q + 1].t) q++;
  const A = CK[q], B = CK[q + 1], u = (EASE[B.e] || EASE.lin)(seg(t, A.t, B.t));
  const z = Math.exp(lerp(Math.log(A.z), Math.log(B.z), u));
  return { x: lerp(colXf(A.at[0]), colXf(B.at[0]), u), y: lerp(A.at[1] * RH, B.at[1] * RH, u), z };
}
const X = wx => VCX + (wx - CAM.x) * CAM.z, Y = wy => VCY + (wy - CAM.y) * CAM.z;
const XC = i => Math.round(X(colX(i))), YR = j => Math.round(Y(j * RH));

// ---------------- helpers ----------------
const rect = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); };
function text(s, x, y, font, col, align = 'left', base = 'middle') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); }
const line = (x1, y1, x2, y2, col, w = 1) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
const tw = (s, font) => { g.font = font; return g.measureText(s).width; };
const mrect = k => { const [c0, c1, r0, r1] = M[k]; const x = XC(c0), y = YR(r0); return [x, y, XC(c1 + 1) - x, YR(r1 + 1) - y]; };
const typed = (s, t, a, b) => t < a ? '' : t >= b ? s : [...s].slice(0, Math.floor(seg(t, a, b) * [...s].length + 1e-6)).join('');
const popK = (t, t0, d = .22, amt = .3) => t >= t0 && t < t0 + d ? 1 + amt * (1 - (t - t0) / d) : 1;
function tri(x, y, s, col, dir = 'down') { g.fillStyle = col; g.beginPath(); if (dir === 'down') { g.moveTo(x - s, y - s / 2); g.lineTo(x + s, y - s / 2); g.lineTo(x, y + s / 2); } else if (dir === 'left') { g.moveTo(x + s / 2, y - s); g.lineTo(x + s / 2, y + s); g.lineTo(x - s / 2, y); } else { g.moveTo(x - s / 2, y - s); g.lineTo(x - s / 2, y + s); g.lineTo(x + s / 2, y); } g.fill(); }

// ---------------- the sheet ----------------
function enterAt(i) { return [T.en1, T.en2, T.en3, T.en4, T.en5][i]; }
function drawSheet(t) {
  const z = CAM.z;
  g.save(); g.beginPath(); g.rect(ROWH_W, SHEET_Y, VW, VH); g.clip();
  rect(ROWH_W, SHEET_Y, VW, VH, '#ffffff');
  const xl = CAM.x - (VCX - ROWH_W) / z, xr = CAM.x + (W - VCX) / z;
  let i0 = 0; while (i0 < NC && colX(i0 + 1) < xl) i0++;
  let i1 = i0; while (colX(i1) < xr && i1 < NC + 40) i1++;
  const j0 = Math.max(0, Math.floor((CAM.y - (VCY - SHEET_Y) / z) / RH)), j1 = Math.ceil((CAM.y + (SHEET_B - VCY) / z) / RH);
  const fs = 11 * z, showVal = fs >= 6.5, valFont = `500 ${fs}px ${UI}`;
  const light = new Path2D(), dark = new Path2D();
  for (let i = i0; i <= i1; i++) {
    const x = XC(i), w = XC(i + 1) - x;
    for (let j = j0; j <= j1; j++) {
      const y = YR(j), h = YR(j + 1) - y;
      let fill = null, val = '', ink = '#8a8a84', painted = false, flash = 0;
      const k = i - WALL0, rr = j - WALL_R0;
      if (k >= 0 && k < WALL_C && rr >= 0) {
        const d = rr * WALL_C + k;
        if (d < DAYS) {
          const tp = paintT(d), ts = saveT(d);
          if (t >= tp) {
            painted = true;
            if (saved(d) && t >= ts) { fill = SAVE; val = '0'; ink = SAVE_INK; flash = t - ts < .12 ? (1 - (t - ts) / .12) * .7 : 0; }
            else { fill = CUP[Math.min(4, Math.floor(d / 365))]; val = '1'; ink = '#5a3a00'; flash = t - tp < .12 ? (1 - (t - tp) / .12) * .8 : 0; }
          }
        }
      }
      if (!fill) { const dt = t - T.hk.slam; if (dt >= 0 && dt < .9) { const d = Math.max(Math.abs(i + .5 - 3.5) * 1.6, Math.abs(j + .5 - 11.5) * .9); const e = Math.exp(-(((d - dt * 18) / 1.6) ** 2)) * (1 - dt / .9); if (e > .06) fill = mix('#ffffff', ['#ffd0c9', '#ffe2a3', '#ffd0c9'][Math.floor(d / 4) % 3], Math.round(e * 4) / 4); } }
      if (fill) rect(x, y, w, h, fill);
      if (flash > 0) rect(x, y, w, h, `rgba(255,255,255,${flash})`);
      const p = painted ? dark : light; p.moveTo(x + w + .5, y); p.lineTo(x + w + .5, y + h); p.moveTo(x, y + h + .5); p.lineTo(x + w, y + h + .5);
      if (showVal && val) text(val, x + w / 2, y + h / 2 + .5, valFont, ink, 'center');
    }
  }
  g.lineWidth = 1; g.strokeStyle = '#dad9d3'; g.stroke(light); g.strokeStyle = 'rgba(6,4,18,0.42)'; g.stroke(dark);
  drawMerged(t); drawYearTags(t); drawSelection(t);
  g.restore();
}
function cellBox(x, y, w, h, fill, border = INK, lw = 1.5) { rect(x, y, w, h, fill); g.lineWidth = lw; g.strokeStyle = border; g.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); }
function valueCell(k, s, t, t0, opts = {}) {
  const [x, y, w, h] = mrect(k), z = CAM.z;
  const editing = opts.editing;
  cellBox(x, y, w, h, opts.fill || '#ffffff', INK, 1.5);
  if (editing) return;
  if (t < t0) return;
  const f = `700 ${Math.round(25 * z * popK(t, t0))}px ${UI}`, need = tw(s, `700 ${25 * z}px ${UI}`) + 22 * z;
  if (need > w) text('#'.repeat(Math.max(3, Math.floor(w / (15 * z)))), x + w - 10 * z, y + h / 2 + 1, f, opts.hashCol || INK, 'right');
  else text(s, x + w - 10 * z, y + h / 2 + 1, f, opts.ink || INK, 'right');
}
function labelCell(k, s, opts = {}) {
  const [x, y, w, h] = mrect(k), z = CAM.z;
  cellBox(x, y, w, h, opts.fill || '#f6f5f0', INK, 1.5);
  text(s, x + 10 * z, y + h / 2 + 1, `${opts.weight || 600} ${Math.round((opts.size || 15) * z)}px ${UI}`, opts.ink || '#3a3a34');
}
function hookVal(t) {
  const h = T.hk;
  if (t < h.slam) return Math.max(25000, Math.round(HOOK_VAL * Math.pow(seg(t, 0, h.slam), .55) / 25000) * 25000);
  if (t < h.rw[0]) return HOOK_VAL;
  return Math.max(25000, Math.round(HOOK_VAL * Math.pow(1 - seg(t, h.rw[0], h.rw[1] - .1), 2.2) / 25000) * 25000);
}
function drawHook(t) {
  const z = CAM.z, h = T.hk, v = hookVal(t), [x, y, w, hh] = mrect('HOOK_V');
  const slamK = t >= h.slam ? Math.max(0, 1 - (t - h.slam) / .35) : 0, out = seg(t, h.rw[0], h.rw[1] - .05);
  const fill = t < h.slam ? '#ffffff' : mix(NO, '#ffffff', out);
  cellBox(x, y, w, hh, fill, INK, 3);
  if (slamK > 0) rect(x, y, w, hh, `rgba(255,255,255,${slamK * .85})`);
  if (v !== null && out < 1) {      // custom number format: Rp#,0 "JUTA" on two lines
    const s1 = 'Rp' + (v / 1e6).toFixed(1).replace('.', ','), s2 = 'JUTA', pk = popK(t, h.slam, .25, .1);
    g.font = `800 100px ${UI}`; const fs = Math.min(hh * .36, (w * .84) / g.measureText('Rp45,6').width * 100) * pk;
    const col = t < h.slam ? INK : mix('#ffffff', INK, out);
    text(s1, x + w / 2, y + hh * .37, `800 ${fs}px ${UI}`, col, 'center');
    text(s2, x + w / 2, y + hh * .72, `800 ${fs * .82}px ${UI}`, col, 'center');
  }
  if (t >= h.slam && out < 1) {
    const [lx, ly, lw, lh] = mrect('HOOK_L'), k = popK(t, h.slam + .05, .25, .06);
    g.save(); g.globalAlpha = 1 - out; cellBox(lx, ly, lw, lh, INK, INK, 3);
    g.font = `800 100px ${UI}`; const ls = '5 TAHUN NGOPI', lf = Math.min(lh * .55, (lw * .8) / g.measureText(ls).width * 100) * k;
    text(ls, lx + lw / 2, ly + lh / 2 + 2, `800 ${lf}px ${UI}`, AMBER, 'center'); g.restore();
  }
}
function drawMerged(t) {
  const z = CAM.z;
  if (t < T.hk.rw[1]) { drawHook(t); return; }
  // header row
  labelCell('HDR_L', 'Kebiasaan', { fill: HEAD, ink: '#fff', size: 13, weight: 700 });
  labelCell('HDR_V', 'Biaya', { fill: HEAD, ink: '#fff', size: 13, weight: 700 });
  ROWS.forEach((r, i) => {
    const shown = i === 0 || t >= [0, T.hop2, T.hop3, T.hop4, T.hop5][i] - .25;
    if (!shown) return;
    labelCell(r.l, r.label);
    const big = i === 4;
    valueCell(r.v, rp(r.val), t, enterAt(i), { editing: editingRow(t) === i, fill: big && t >= T.en5 ? '#ffe8b3' : '#fff', ink: big ? '#b3261e' : INK });
  });
  if (t >= T.tyS[0] - .3) {
    labelCell(SAVE_ROW.l, SAVE_ROW.label, { fill: '#effbd9' });
    valueCell(SAVE_ROW.v, rp(SAVE_ROW.val), t, T.enS, { editing: t >= T.tyS[0] && t < T.enS, fill: t >= T.enS ? SAVE : '#fff', ink: SAVE_INK });
  }
  // end card: a merged cell typed into
  if (t >= T.card[0]) {
    const [x, y, w, h] = mrect('CARD'), k = eo(seg(t, T.card[0], T.card[0] + .35));
    cellBox(x, y, w, h * k, '#ffffff', INK, 2.5);
    if (k >= 1) {
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      rect(x, y, w, 48 * z, SAVE);
      text('HEMAT / TAHUN', x + 16 * z, y + 25 * z, `800 ${14 * z}px ${UI}`, SAVE_INK);
      text(typed(rp(SAVE_ROW.val), t, T.card[0] + .3, T.card[0] + .8), x + 16 * z, y + 92 * z, `800 ${40 * z}px ${UI}`, INK);
      text('tanpa berhenti ngopi', x + 16 * z, y + 132 * z, `500 ${15 * z}px ${UI}`, '#55554f');
      line(x + 16 * z, y + 156 * z, x + w - 16 * z, y + 156 * z, '#d0cfc9', 1);
      const q1 = typed('Kebiasaan apa yang kita', t, T.card[1] - .1, T.card[1] + .5), q2 = typed('hitung berikutnya?', t, T.card[1] + .5, T.card[1] + .95);
      text(q1, x + 16 * z, y + 182 * z, `700 ${17 * z}px ${UI}`, INK); text(q2, x + 16 * z, y + 206 * z, `700 ${17 * z}px ${UI}`, INK);
      g.restore();
    }
  }
}
function drawYearTags(t) {
  if (t < T.paint[0]) return;
  const z = CAM.z;
  for (let y = 0; y < 5; y++) {
    const d = y * 365, r = WALL_R0 + Math.floor(d / WALL_C), tp = paintT(d);
    if (t < tp) continue;
    const x = XC(WALL0 - 1), yy = YR(r), w = XC(WALL0) - x, h = YR(r + 1) - yy;
    rect(x, yy, w, h, CUP[y]); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(x + .5, yy + .5, w - 1, h - 1);
    if (11 * z >= 6.5) text(`TH ${y + 1}`, x + w / 2, yy + h / 2 + .5, `700 ${11 * z}px ${UI}`, INK, 'center');
  }
}
// ---------------- selection (the amber active cell) ----------------
function editingRow(t) { for (let i = 0; i < 5; i++) { const ty = T['ty' + (i + 1)]; if (t >= ty[0] && t < enterAt(i)) return i; } return -1; }
function selBox(t) {
  if (t < T.hk.rw[0]) return M.HOOK_V;
  if (t < T.hk.rw[1]) return null;
  if (t >= T.card[0] - .1) return M.CARD;
  if (t >= T.tyS[0] - .2) return M.VS;
  if (t >= T.pull[0]) return null;
  const hops = [0, T.hop2, T.hop3, T.hop4, T.hop5]; let i = 0; for (let q = 0; q < 5; q++) if (t >= hops[q]) i = q;
  return M[ROWS[i].v];
}
function drawSelection(t) {
  const b = selBox(t); if (!b) return;
  const [c0, c1, r0, r1] = b; const x = XC(c0), y = YR(r0), w = XC(c1 + 1) - x, h = YR(r1 + 1) - y, lw = 4;
  g.lineWidth = lw; g.strokeStyle = INK; g.strokeRect(x - lw / 2, y - lw / 2, w + lw, h + lw);
  const o = lw + 3; g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.strokeRect(x - o, y - o, w + 2 * o, h + 2 * o);
  g.setLineDash([8, 6]); g.lineDashOffset = -t * 60; g.strokeStyle = AMBER; g.strokeRect(x - o, y - o, w + 2 * o, h + 2 * o); g.setLineDash([]);
  const hs = 11; rect(x + w - hs / 2 + 1, y + h - hs / 2 + 1, hs, hs, INK);
  // typing inside the cell
  const er = editingRow(t), typingS = t >= T.tyS[0] && t < T.enS;
  if (er >= 0 || typingS) {
    const s = typingS ? typed(SAVE_ROW.fx, t, ...T.tyS) : typed(ROWS[er].fx, t, ...T['ty' + (er + 1)]);
    const f = `700 ${Math.round(20 * CAM.z)}px ${UI}`; text(s, x + 10 * CAM.z, y + h / 2 + 1, f, INK);
    if (Math.floor(t * 8) % 2 === 0) rect(x + 12 * CAM.z + tw(s, f), y + h * .22, 3, h * .56, INK);
  }
}
// ---------------- headers ----------------
function drawHeaders(t) {
  const z = CAM.z, b = selBox(t), top = SHEET_Y - HDR;
  rect(0, top, W, HDR, '#ecebe6');
  g.save(); g.beginPath(); g.rect(ROWH_W, top, VW, HDR); g.clip();
  const xl = CAM.x - (VCX - ROWH_W) / z, xr = CAM.x + (W - VCX) / z;
  let i0 = 0; while (i0 < NC && colX(i0 + 1) < xl) i0++;
  const fsz = Math.min(22, 15 * Math.sqrt(Math.max(1, z)));
  for (let i = i0; colX(i) < xr && i < NC + 40; i++) {
    const x = XC(i), w = XC(i + 1) - x, on = b && i >= b[0] && i <= b[1];
    if (on) rect(x, top, w, HDR, '#ffd98a');
    if (w > 18) text(colName(i), x + w / 2, top + HDR / 2 + 1, `${on ? 700 : 500} ${fsz}px ${UI}`, on ? INK : '#55554f', 'center');
    line(x + .5, top + 5, x + .5, SHEET_Y, i === VAL + 1 && t >= T.wid[0] && t < T.wid[1] + .2 ? AMBER : '#c4c3bc', i === VAL + 1 && t >= T.wid[0] && t < T.wid[1] + .2 ? 4 : 1);
  }
  g.restore();
  line(0, SHEET_Y - .5, W, SHEET_Y - .5, '#9a9a94');
  rect(0, SHEET_Y, ROWH_W, VH, '#ecebe6');
  g.save(); g.beginPath(); g.rect(0, SHEET_Y, ROWH_W, VH); g.clip();
  const j0 = Math.max(0, Math.floor((CAM.y - (VCY - SHEET_Y) / z) / RH)), j1 = Math.ceil((CAM.y + (SHEET_B - VCY) / z) / RH);
  for (let j = j0; j <= j1; j++) {
    const y = YR(j), h = YR(j + 1) - y, on = b && j >= b[2] && j <= b[3];
    if (on) rect(0, y, ROWH_W, h, '#ffd98a');
    if (h > 12) text(String(j + 1), ROWH_W - 10, y + h / 2 + 1, `${on ? 700 : 500} ${Math.min(fsz, h - 2)}px ${UI}`, on ? INK : '#5a5a54', 'right');
    line(8, y + .5, ROWH_W, y + .5, '#cfcec8');
  }
  g.restore();
  line(ROWH_W - .5, top, ROWH_W - .5, SHEET_B, '#9a9a94');
  rect(0, top, ROWH_W, HDR, '#e0dfd9');
}
// ---------------- shell ----------------
function formulaLine(t) {
  const h = T.hk;
  if (t < h.slam) return { s: typed(HOOK_FX, t, ...h.ty), caret: true, name: 'D8' };
  if (t < h.rw[0]) return { s: HOOK_FX, after: '= ' + rp(HOOK_VAL), name: 'D8' };
  if (t < h.rw[1]) return { s: 'Ctrl+Z', after: 'urungkan · mulai dari 1 gelas', name: 'D8' };
  const nm = b => b ? colName(b[0]) + (b[2] + 1) : '';
  const er = editingRow(t);
  if (er >= 0) return { s: typed(ROWS[er].fx, t, ...T['ty' + (er + 1)]), caret: true, name: nm(M[ROWS[er].v]) };
  if (t >= T.tyS[0] && t < T.enS) return { s: typed(SAVE_ROW.fx, t, ...T.tyS), caret: true, name: 'D13' };
  if (t >= T.card[0]) return { s: typed('Hemat Rp6.500.000 / tahun', t, T.card[0] + .2, T.card[1]), caret: t < T.card[1], name: 'A16' };
  if (t >= T.enS) return { s: SAVE_ROW.fx, after: '= ' + rp(SAVE_ROW.val), name: 'D13' };
  if (t >= T.sweep[0]) return { s: '=COUNTIF(kopi, "hemat")', after: '5 dari 7 hari', name: 'kopi' };
  if (t >= T.paint[0]) return { s: '=SEQUENCE(1825)', after: '1 kotak = 1 gelas', name: 'kopi' };
  let i = -1; for (let q = 0; q < 5; q++) if (t >= enterAt(q)) i = q;
  if (i < 0) return { s: '', name: 'D2' };
  const after = i === 2 && t < T.wid[0] ? 'kolom terlalu sempit' : '= ' + rp(ROWS[i].val);
  return { s: ROWS[i].fx, after, name: nm(M[ROWS[i].v]) };
}
function drawChrome(t) {
  rect(0, 0, W, TITLE_H, '#dcdbd5');
  for (let n = 0; n < 3; n++) { g.fillStyle = '#c6c5bf'; g.beginPath(); g.arc(22 + n * 22, TITLE_H / 2, 7, 0, 7); g.fill(); }
  text('kebiasaan-kopi.sheet', W / 2, TITLE_H / 2 + 1, `600 19px ${UI}`, '#333', 'center');
  line(0, TITLE_H - .5, W, TITLE_H - .5, '#b5b4ae');
  const ty = TITLE_H; rect(0, ty, W, TOOL_H, '#f1f0eb');
  let x = 16; const m = ty + TOOL_H / 2;
  const btn = (w, draw, pressed) => { if (pressed) { rect(x, ty + 9, w, TOOL_H - 18, '#ffe2a3'); g.strokeStyle = '#c9a24f'; g.lineWidth = 1; g.strokeRect(x + .5, ty + 9.5, w - 1, TOOL_H - 19); } draw(x); x += w + 6; };
  const sep = () => { line(x + 3, ty + 14, x + 3, ty + TOOL_H - 14, '#c8c7c1'); x += 12; };
  btn(40, a => text('B', a + 20, m + 1, `800 22px ${UI}`, '#222', 'center')); btn(40, a => text('I', a + 20, m + 1, `italic 500 22px ${UI}`, '#222', 'center')); sep();
  btn(40, a => text('%', a + 20, m + 1, `500 22px ${UI}`, '#222', 'center')); btn(40, a => text('Σ', a + 20, m + 1, `500 23px ${UI}`, '#222', 'center'), t >= T.tyS[0] && t < T.enS); sep();
  const cfOn = (t >= T.paint[0] - .1 && t < T.paint[1]) || (t >= T.sweep[0] && t < T.sweep[1]);
  btn(250, a => { [INK, AMBER, SAVE, NO, HEAD].forEach((c, n) => rect(a + 10 + n * 6, m - 10, 6, 20, c)); text('Format bersyarat', a + 52, m + 1, `600 19px ${UI}`, '#222'); tri(a + 236, m, 5, '#666'); }, cfOn);
  btn(150, a => { g.strokeStyle = '#333'; g.lineWidth = 1.5; g.strokeRect(a + 10.5, m - 9.5, 26, 19); line(a + 10, m - 3, a + 36, m - 3, '#333', 1.5); text('Lebar', a + 46, m + 1, `600 19px ${UI}`, '#222'); }, t >= T.wid[0] && t < T.wid[1] + .1);
  line(0, ty + TOOL_H - .5, W, ty + TOOL_H - .5, '#c8c7c1');
  // formula bar: the line of the film
  const fy = TITLE_H + TOOL_H, fm = fy + FBAR_H / 2 + 1; rect(0, fy, W, FBAR_H, '#f8f7f3');
  const F = formulaLine(t);
  rect(12, fy + 14, 120, FBAR_H - 28, '#fff'); g.strokeStyle = '#b3b2ac'; g.lineWidth = 1; g.strokeRect(12.5, fy + 14.5, 119, FBAR_H - 29);
  text(F.name || '', 26, fm, `700 22px ${UI}`, INK);
  text('fx', 156, fm, `italic 700 24px ${UI}`, '#333', 'center');
  rect(182, fy + 10, W - 194, FBAR_H - 20, '#fff'); g.strokeStyle = '#b3b2ac'; g.strokeRect(182.5, fy + 10.5, W - 195, FBAR_H - 21);
  const ff = `700 38px ${UI}`; text(F.s, 198, fm, ff, INK); const fx = 198 + tw(F.s, ff);
  if (F.caret && Math.floor(t * 8) % 2 === 0) rect(fx + 4, fy + 20, 3, FBAR_H - 40, INK);
  if (F.after) text(F.after, Math.min(fx + 22, W - 30), fm, `600 26px ${UI}`, F.after === 'kolom terlalu sempit' ? NO : '#7a7a74', fx + 22 > W - 30 ? 'right' : 'left');
  line(0, fy + FBAR_H - .5, W, fy + FBAR_H - .5, '#b5b4ae');
  // tabs + status bar
  const by = SHEET_B; rect(0, by, W, TABS_H, '#e5e4de'); line(0, by + .5, W, by + .5, '#9a9a94');
  let tx = 24;
  for (const [name, on] of [['kopi', true], ['catatan', false], ['+', false]]) {
    g.font = `${on ? 700 : 500} 19px ${UI}`; const w = g.measureText(name).width + 36;
    if (on) { rect(tx, by, w, TABS_H - 4, '#fff'); line(tx, by + TABS_H - 4, tx + w, by + TABS_H - 4, AMBER, 4); }
    text(name, tx + w / 2, by + TABS_H / 2, `${on ? 700 : 500} 19px ${UI}`, on ? INK : '#555', 'center'); line(tx + w + .5, by + 7, tx + w + .5, by + TABS_H - 7, '#b5b4ae'); tx += w;
  }
  const sy = by + TABS_H, sm = sy + STAT_H / 2 + 1; rect(0, sy, W, STAT_H, INK);
  let mode = 'Siap', msg = '';
  const nP = t >= T.paint[0] ? Math.min(DAYS, Math.floor(DAYS * seg(t, T.paint[0], T.paint[1] - .15))) : 0;
  if (t < T.hk.slam) { mode = 'Hitung'; msg = 'Menghitung…'; }
  else if (t < T.hk.rw[0]) msg = 'Rp25.000 × 365 hari × 5 tahun';
  else if (t < T.hk.rw[1]) { mode = 'Urung'; msg = 'Urungkan semua (Ctrl+Z)'; }
  else if (editingRow(t) >= 0 || (t >= T.tyS[0] && t < T.enS)) mode = 'Edit';
  else if (t >= T.en3 && t < T.wid[1]) { mode = 'Lebar'; msg = 'Kolom D terlalu sempit untuk angkanya'; }
  else if (t >= T.paint[0] && t < T.paint[1] + .2) { mode = 'Hitung'; msg = `Mewarnai  ${nP.toLocaleString('de-DE')} / 1.825 gelas`; }
  else if (t >= T.paint[1] + .2 && t < T.sweep[0]) msg = '1 kotak = 1 gelas  ·  5 tahun = 1.825 gelas';
  else if (t >= T.sweep[0] && t < T.sweep[1] + .2) { mode = 'Hitung'; msg = 'Aturan: 5 dari 7 hari → hijau (hemat)'; }
  else if (t >= T.enS) msg = '25.000 × 5 gelas × 52 minggu';
  rect(0, sy, 104, STAT_H, mode === 'Hitung' || mode === 'Lebar' || mode === 'Urung' ? AMBER : mode === 'Siap' ? INK : '#3a3326');
  text(mode, 52, sm, `700 18px ${UI}`, mode === 'Hitung' || mode === 'Lebar' || mode === 'Urung' ? INK : '#fff', 'center');
  text(msg, 120, sm, `500 18px ${UI}`, 'rgba(255,255,255,0.85)');
  text(Math.round(CAM.z * 100) + '%', W - 18, sm, `700 18px ${UI}`, '#fff', 'right');
}
// ---------------- subtitles: a cell comment, lower left, one line ----------------
function buildCues() {
  g.font = `600 38px ${UI}`; const maxW = W - ROWH_W - 44 - 56;
  CUES = [];
  for (const v of TL.voice) {
    const parts = v.text.replace(/\bJUTA\b/g, 'juta').split(/(?<=[.?!:,])\s+/);
    const chunks = []; let cur = '';
    for (const p of parts) { const tt = cur ? cur + ' ' + p : p; if (g.measureText(tt).width > maxW && cur) { chunks.push(cur); cur = p; } else cur = tt; }
    if (cur) chunks.push(cur);
    const total = chunks.reduce((a, c) => a + c.length, 0); let t = v.t0;
    chunks.forEach((c, i) => { const d = (v.t1 - v.t0) * c.length / total; CUES.push({ t0: t, t1: t + d, text: c, id: v.id }); t += d; });
  }
  for (let i = 0; i < CUES.length; i++) { const nx = CUES[i + 1]; const want = Math.max(CUES[i].t1 + .6, CUES[i].t0 + 1.8); CUES[i].c1 = nx ? Math.min(want, nx.t0 - .02) : want; }
}
function drawSubs(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.c1); if (!c) return;
  const k = Math.min(seg(t, c.t0, c.t0 + .12), 1 - seg(t, c.c1 - .12, c.c1));
  const f = `600 38px ${UI}`, w = tw(c.text, f) + 56, h = 80, x = ROWH_W + 22, y = SHEET_B - h - 22;
  g.save(); g.globalAlpha = k;
  rect(x, y, w, h, NOTE); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = NO; g.beginPath(); g.moveTo(x + w - 18, y + 2); g.lineTo(x + w - 2, y + 2); g.lineTo(x + w - 2, y + 18); g.fill();
  text(c.text, x + 26, y + h / 2 + 2, f, INK);
  g.restore();
}
function setup(t) {
  TNOW = t; layout(t); CAM = camera(t);
  { const d = t - T.hk.slam; if (d >= 0 && d < .3) { const a = (1 - d / .3) * 9 / CAM.z; CAM.x += Math.sin(d * 95) * a; CAM.y += Math.cos(d * 77) * a; } }
  HDR = Math.round(34 * clamp(Math.sqrt(CAM.z), 1, 1.35));
  SHEET_Y = TITLE_H + TOOL_H + FBAR_H + HDR; VW = W - ROWH_W; VH = SHEET_B - SHEET_Y;
  VCX = ROWH_W + VW / 2; VCY = SHEET_Y + (SHEET_B - 130 - SHEET_Y) / 2;
  CAM.x = Math.max(CAM.x, (VCX - ROWH_W) / CAM.z); CAM.y = Math.max(CAM.y, (VCY - SHEET_Y) / CAM.z);
}
export async function load(ctx, q) {
  g = ctx; Q = q;
  TL = await (await fetch('timeline.json')).json();
  for (const v of TL.voice) VO[v.id] = v;
  buildTiming(); buildCam(); buildCues();
}
export function events() { return EV; }
export function render(t) {
  t = clamp(t, 0, TL.end - 1e-3);
  setup(t); rect(0, 0, W, H, '#1a1a1a');
  drawSheet(t); drawHeaders(t); drawChrome(t);
  if (!Q || Q.get('nosub') !== '1') drawSubs(t);
}
// texts the viewer must read (readcheck): results, the saving, the end card
export function texts(t) {
  t = clamp(t, 0, TL.end - 1e-3); setup(t); const out = [];
  const put = (id, s, k) => { const [x, y, w, h] = mrect(k); const inside = x >= ROWH_W - 1 && y >= SHEET_Y - 1 && x + w <= W + 1 && y + h <= SHEET_B + 1; out.push({ id, text: s, x0: inside ? x : -1, y0: y, x1: x + w, y1: y + h }); };
  if (t >= T.hk.slam && t < T.hk.rw[0]) { put('hookV', 'Rp45,6 JUTA', 'HOOK_V'); put('hookL', '5 TAHUN NGOPI', 'HOOK_L'); }
  ROWS.forEach((r, i) => { if (t >= enterAt(i) && !(i === 2 && t < T.wid[1])) put('v' + i, rp(r.val), r.v); });
  if (t >= T.enS) put('save', rp(SAVE_ROW.val), 'VS');
  if (t >= T.card[0] + .8) put('card', 'HEMAT / TAHUN Rp6.500.000 tanpa berhenti ngopi', 'CARD');
  if (t >= T.card[1] + .95) put('q', 'Kebiasaan apa yang kita hitung berikutnya?', 'CARD');
  return out;
}
