// "Kasus: Diskon yang Menipu Mata" — Halftone Dossier, vertical 1080×1920, 30 fps. Channel "Uang & Kerja", episode 3.
// Canvas 2D take on the style's rules (Lemo-Opuscar, styles/halftone-dossier): paper ground, one navy ink + spot inks, red only for stamps,
// misregistered slab headlines, per-glyph pops, halftone dot fields, stamp slams with shake + flash, dot wipes, caption pill = subtitle.
const W = 1080, H = 1920;
const C = { paper: '#F4ECDD', navy: '#1D2340', blue: '#2E55D6', pink: '#FF5A87', yellow: '#FFC628', red: '#E8384F', cream: '#FFF4E2' };
const SLAB = 'Slab', BAGEL = 'Bagel', MONO = 'Mono', SANS = 'Inter';
let g, TL, VO = {}, T = {}, TXT = null, EV = [], CUES = [];
export const DUR = () => TL.end;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo3 = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const popS = u => u <= 0 ? 0 : 1 - Math.exp(-11 * u) * Math.cos(17 * u);          // 0 → overshoot ≈1.2 → 1
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// time of a word inside a narration line (by character position in the spoken text)
const wAt = (id, w, last = false) => { const v = VO[id], i = last ? v.text.lastIndexOf(w) : v.text.indexOf(w); if (i < 0) throw new Error(id + ' ' + w); return v.t0 + (v.t1 - v.t0) * i / v.text.length; };

// ---------------- paper ----------------
let paperC;
function buildPaper() {
  paperC = document.createElement('canvas'); paperC.width = W; paperC.height = H; const x = paperC.getContext('2d');
  x.fillStyle = C.paper; x.fillRect(0, 0, W, H);
  const r = mulberry(7);
  for (let i = 0; i < 70; i++) { const px = r() * W, py = r() * H, rad = 120 + r() * 380; const gr = x.createRadialGradient(px, py, 0, px, py, rad); const d = r() < .5;
    gr.addColorStop(0, d ? 'rgba(120,90,50,0.05)' : 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
  const id = x.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (r() + r() - 1) * 7; d[i] += n; d[i + 1] += n; d[i + 2] += n * .9; } x.putImageData(id, 0, 0);
  const vg = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,45,20,0.16)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  // one fold across the sheet
  const fy = H * .52; let gr = x.createLinearGradient(0, fy - 18, 0, fy + 18); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.48, 'rgba(90,60,30,0.07)'); gr.addColorStop(.52, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, fy - 18, W, 36);
}
function specks(t) {                 // paper and ink specks, reseeded every 2 frames
  const r = mulberry(1 + Math.floor(t * 15)); g.save();
  for (let i = 0; i < 26; i++) { g.fillStyle = i % 3 ? 'rgba(29,35,64,0.22)' : 'rgba(255,250,240,0.55)'; g.beginPath(); g.arc(r() * W, r() * H, .8 + r() * 2.2, 0, 7); g.fill(); }
  g.restore();
}
// ---------------- halftone (cached patches) ----------------
const HT = {};
function ht(key, w, h, step, ang, col, dens, maxK = 1.18) {
  if (HT[key]) return HT[key];
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d'); x.fillStyle = col;
  const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(w, h) / 2 + step;
  for (let i = -R; i <= R; i += step) for (let j = -R; j <= R; j += step) {
    const px = w / 2 + i * ca - j * sa, py = h / 2 + i * sa + j * ca; if (px < -step || py < -step || px > w + step || py > h + step) continue;
    const d = clamp(dens(px / w, py / h)); if (d < .03) continue; x.beginPath(); x.arc(px, py, step * .5 * maxK * Math.sqrt(d), 0, 7); x.fill();
  }
  return HT[key] = c;
}
const radial = (cx, cy, r0, r1) => (u, v) => 1 - seg(Math.hypot((u - cx) * 1, (v - cy) * 1.78), r0, r1);
const flat = k => () => k, lin = (a, b) => (u, v) => lerp(a, b, v), diag = (a, b) => (u, v) => lerp(a, b, (u + v) / 2);

// ---------------- drawing helpers ----------------
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function font(fam, size, w = 400) { return `${w} ${size}px ${fam}`; }
function measure(s, fam, size, w = 400, track = 0) { g.save(); g.font = font(fam, size, w); g.letterSpacing = track + 'px'; const m = g.measureText(s).width; g.restore(); return m; }
// static text (HUD, receipt, labels)
function txt(s, x, y, { fam = MONO, size = 30, w = 800, col = C.navy, align = 'left', track = 0, rec = true, a = 1 } = {}) {
  if (a <= 0) return 0;
  g.save(); g.globalAlpha = a; g.font = font(fam, size, w); g.letterSpacing = track + 'px'; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  const m = g.measureText(s).width; g.restore();
  if (TXT && rec && a > .99) { const x0 = align === 'left' ? x : align === 'right' ? x - m : x - m / 2; TXT.push({ id: s, text: s, x0, y0: y - size * .78, x1: x0 + m, y1: y + size * .2 }); }
  return m;
}
// headline with per-glyph pop and a misregistered overprint shadow (multiply)
function pop(t, s, x, y, { fam = SLAB, size = 90, w = 400, col = C.navy, sh = C.pink, off, t0 = 0, st = .028, align = 'left', track = 0, rec = true } = {}) {
  if (t < t0) return 0;
  off = off ?? Math.max(5, size * .07);
  g.save(); g.font = font(fam, size, w); g.letterSpacing = track + 'px'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const ch = [...s], cum = ch.map((c, i) => g.measureText(ch.slice(0, i + 1).join('')).width), tot = cum[cum.length - 1];
  const x0 = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x; let done = true;
  const pass = (colr, dx, mult) => {
    g.globalCompositeOperation = mult ? 'multiply' : 'source-over'; g.fillStyle = colr;
    ch.forEach((c, i) => {
      const u = t - t0 - i * st, k = popS(u); if (u < .3) done = false; if (k <= .002 || c === ' ') return;
      const a = i ? cum[i - 1] : 0, cw = cum[i] - a; g.save(); g.translate(x0 + a + cw / 2 + dx, y - size * .33 + dx); g.scale(k, k); g.fillText(c, -cw / 2, size * .33); g.restore();
    });
  };
  if (sh) pass(sh, off, true);
  pass(col, 0, false);
  g.restore();
  if (TXT && rec && done) TXT.push({ id: s, text: s, x0, y0: y - size * .8, x1: x0 + tot, y1: y + size * .22 });
  return tot;
}
// pill chip (pops as a unit)
function chip(t, s, x, y, { t0 = 0, bg = C.navy, col = C.yellow, size = 30, fam = MONO, w = 800, align = 'left', padX = 24, h, sh = null, rec = true, track = 1 } = {}) {
  if (t < t0) return 0;
  const k = popS(t - t0), m = measure(s, fam, size, w, track), ww = m + padX * 2, hh = h ?? size * 1.65, x0 = align === 'center' ? x - ww / 2 : align === 'right' ? x - ww : x;
  g.save(); g.translate(x0 + ww / 2, y); g.scale(k, k); g.translate(-x0 - ww / 2, -y);
  if (sh) { g.globalCompositeOperation = 'multiply'; g.fillStyle = sh; rr(x0 + 6, y - hh / 2 + 6, ww, hh, hh / 2); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.fillStyle = bg; rr(x0, y - hh / 2, ww, hh, hh / 2); g.fill();
  g.font = font(fam, size, w); g.letterSpacing = track + 'px'; g.fillStyle = col; g.textBaseline = 'alphabetic'; g.fillText(s, x0 + padX, y + size * .36);
  g.restore();
  if (TXT && rec && t - t0 > .45) TXT.push({ id: s, text: s, x0: x0 + padX, y0: y - size * .42, x1: x0 + padX + m, y1: y + size * .56 });
  return ww;
}
// ink line drawn on
function inkLine(x1, y1, x2, y2, p, col = C.pink, lw = 12) { if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.globalCompositeOperation = 'multiply'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(lerp(x1, x2, eo3(p)), lerp(y1, y2, eo3(p))); g.stroke(); g.restore(); }

// ---------------- stamps ----------------
const STAMPS = {};
function stampCanvas(key, lines, size) {
  if (STAMPS[key]) return STAMPS[key];
  const pad = size * .55, lh = size * 1.02; g.save(); g.font = font(SLAB, size); const mw = Math.max(...lines.map(l => g.measureText(l).width)); g.restore();
  const w = mw + pad * 2, h = lines.length * lh + pad * 1.3, c = document.createElement('canvas'); c.width = w + 20; c.height = h + 20; const x = c.getContext('2d');
  x.translate(10, 10); x.strokeStyle = C.red; x.fillStyle = C.red;
  x.lineWidth = size * .12; x.beginPath(); x.roundRect(0, 0, w, h, size * .3); x.stroke();
  x.lineWidth = size * .05; x.beginPath(); x.roundRect(size * .18, size * .18, w - size * .36, h - size * .36, size * .2); x.stroke();
  x.font = font(SLAB, size); x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh + size * .04));
  // worn ink: knock out specks and a few scuffs
  const r = mulberry(key.length * 31 + 5); x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h / 260; i++) { x.globalAlpha = .35 + r() * .65; x.beginPath(); x.arc(r() * w, r() * h, .6 + r() * r() * 3.2, 0, 7); x.fill(); }
  for (let i = 0; i < 7; i++) { x.globalAlpha = .25; x.lineWidth = 2 + r() * 5; x.beginPath(); const sx = r() * w, sy = r() * h; x.moveTo(sx, sy); x.lineTo(sx + (r() - .5) * w * .5, sy + (r() - .5) * 20); x.stroke(); }
  return STAMPS[key] = c;
}
function stamp(t, t0, key, lines, size, cx, cy, tilt) {
  if (t < t0) return;
  const c = stampCanvas(key, lines, size), a = t - t0;
  const k = a < .09 ? lerp(2.6, 1, eo3(a / .09)) : 1 + .05 * Math.sin(30 * (a - .09)) * Math.exp(-9 * (a - .09));
  g.save(); g.translate(cx, cy); g.rotate(tilt * Math.PI / 180); g.scale(k, k); g.globalAlpha = a < .09 ? .5 + .43 * a / .09 : .93; g.globalCompositeOperation = 'multiply';
  g.drawImage(c, -c.width / 2, -c.height / 2); g.restore();
  if (TXT && a > .35) TXT.push({ id: lines.join(' '), text: lines.join(' '), x0: cx - c.width / 2 + 30, y0: cy - c.height / 2 + 30, x1: cx + c.width / 2 - 30, y1: cy + c.height / 2 - 30 });
}

// ---------------- shared props ----------------
function tagShape(x, y, w, h, r) {     // price tag: notched left end with a punched hole
  const n = h * .32; g.beginPath(); g.moveTo(x + n, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + n, y + h); g.lineTo(x, y + h - n); g.lineTo(x, y + n); g.closePath();
}
function box(cx, by, w, h, k, label, colBand) {        // a product box with halftone shade
  if (k <= 0) return;
  g.save(); g.translate(cx, by); g.scale(k, k);
  const x = -w / 2, y = -h;
  g.globalCompositeOperation = 'multiply'; g.drawImage(ht('boxsh' + w, w, h, 11, .5, C.navy, flat(.55)), x + 14, y + 14); g.globalCompositeOperation = 'source-over';
  g.fillStyle = C.cream; rr(x, y, w, h, 14); g.fill();
  g.save(); rr(x, y, w, h, 14); g.clip(); g.globalCompositeOperation = 'multiply'; g.drawImage(ht('boxs' + w, w * .4, h, 9, .6, C.blue, lin(.25, .7)), x + w * .6, y); g.restore();
  g.fillStyle = colBand; g.fillRect(x, y + h * .36, w, h * .26);
  g.strokeStyle = C.navy; g.lineWidth = 6; rr(x, y, w, h, 14); g.stroke();
  g.beginPath(); g.moveTo(x + w * .2, y + h * .12); g.lineTo(x + w * .8, y + h * .12); g.lineWidth = 5; g.stroke();
  g.font = font(SLAB, w * .17); g.fillStyle = C.cream; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, y + h * .49);
  g.restore();
}
function eye(cx, cy, s, open) {
  g.save(); g.translate(cx, cy);
  g.beginPath(); g.moveTo(-200 * s, 0); g.quadraticCurveTo(0, -150 * s * open, 200 * s, 0); g.quadraticCurveTo(0, 150 * s * open, -200 * s, 0); g.closePath();
  g.fillStyle = C.cream; g.fill(); g.save(); g.clip();
  g.fillStyle = C.blue; g.beginPath(); g.arc(0, 0, 92 * s, 0, 7); g.fill();
  g.globalCompositeOperation = 'multiply'; g.drawImage(ht('iris', 200, 200, 12, .3, C.navy, radial(.5, .5, .1, .5)), -100 * s, -100 * s, 200 * s, 200 * s); g.globalCompositeOperation = 'source-over';
  g.font = font(BAGEL, 116 * s); g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('%', 0, 6 * s);
  g.fillStyle = C.cream; g.beginPath(); g.arc(34 * s, -36 * s, 15 * s, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = C.navy; g.lineWidth = 12 * s; g.lineJoin = 'round'; g.stroke();
  for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .32, r0 = 105 * s * Math.max(open, .3) + 25 * s; g.beginPath(); g.moveTo(Math.cos(a) * r0 * 1.5, Math.sin(a) * r0 * .9 - 20 * s); g.lineTo(Math.cos(a) * (r0 + 40 * s) * 1.5, Math.sin(a) * (r0 + 40 * s) * .9 - 20 * s); g.lineWidth = 10 * s; g.lineCap = 'round'; g.stroke(); }
  g.restore();
}
function plane(x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(-60, -10); g.lineTo(70, -40); g.lineTo(-20, 40); g.lineTo(-18, 8); g.closePath(); g.fillStyle = C.cream; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 6; g.lineJoin = 'round'; g.stroke();
  g.beginPath(); g.moveTo(-18, 8); g.lineTo(70, -40); g.stroke();
  g.restore();
}

// ---------------- scenes ----------------
const M = 90;
function sceneHook(t) {
  const burst = ht('burst', W, 1100, 26, .26, C.yellow, radial(.5, .5, .08, .55));
  g.save(); g.globalCompositeOperation = 'multiply'; g.drawImage(burst, 0, 300); g.restore();
  // mugshot height chart
  g.save(); g.strokeStyle = C.navy; g.globalAlpha = .5; g.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const y = 560 + i * 78; g.beginPath(); g.moveTo(M - 30, y); g.lineTo(W - M + 30, y); g.stroke(); g.font = font(MONO, 22, 700); g.fillStyle = C.navy; g.fillText(String(180 - i * 10), M - 30, y - 8); g.textAlign = 'right'; g.fillText(String(180 - i * 10), W - M + 30, y - 8); g.textAlign = 'left'; }
  g.restore();
  // the title, readable from frame 0
  chip(t, 'KASUS #1 · DISKON YANG MENIPU MATA', 540, 320, { t0: -.6, align: 'center', size: 28, bg: C.navy, col: C.yellow, padX: 28 });
  pop(t, 'BELANJA DISKON,', 540, 480, { size: 92, t0: -.55, st: .02, align: 'center', sh: C.pink });
  // the suspect: a price tag
  const k = popS(t + .25) * .78, sw = Math.sin(t * 2.2) * .9;
  g.save(); g.translate(540, 760); g.rotate((-4 + sw) * Math.PI / 180); g.scale(k, k);
  g.strokeStyle = C.navy; g.lineWidth = 5; g.beginPath(); g.moveTo(-372, -6); g.bezierCurveTo(-470, -120, -430, -300, -330, -330); g.stroke();
  g.globalCompositeOperation = 'multiply'; g.drawImage(ht('tagsh', 840, 460, 12, .5, C.navy, flat(.6)), -420 + 16, -230 + 16); g.globalCompositeOperation = 'source-over';
  tagShape(-420, -230, 840, 460, 30); g.fillStyle = C.pink; g.fill();
  g.save(); tagShape(-420, -230, 840, 460, 30); g.clip(); g.globalCompositeOperation = 'multiply'; g.drawImage(ht('tagdots', 840, 460, 14, .78, '#C93A6A', diag(0, .85)), -420, -230); g.restore();
  tagShape(-420, -230, 840, 460, 30); g.strokeStyle = C.navy; g.lineWidth = 8; g.stroke();
  g.fillStyle = C.paper; g.beginPath(); g.arc(-372, -6, 22, 0, 7); g.fill(); g.stroke();
  g.font = font(SLAB, 92); g.fillStyle = C.cream; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DISKON', 30, -70);
  g.font = font(BAGEL, 190); g.fillText('%', 30, 100);
  g.restore();
  pop(t, 'MALAH', 540, 1150, { size: 88, t0: T.boncos - .25, align: 'center', track: 6, sh: C.pink });
  pop(t, 'BONCOS?', 540, 1345, { fam: BAGEL, size: 196, col: C.yellow, sh: C.navy, off: 12, t0: T.boncos, st: .04, align: 'center' });
}
function sceneTitle(t) {
  const t0 = T.s1;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .7; g.beginPath(); g.rect(0, 290, W, H - 290); g.clip(); g.drawImage(ht('edgeB', W, H, 30, .26, C.blue, (u, v) => .42 - Math.min(u, 1 - u, (v - .15) * .55, (1 - v) * .55) * 6), 0, 0); g.restore();
  // folder
  const k = popS(t - t0 - .02);
  g.save(); g.translate(540, 860); g.rotate(-2 * Math.PI / 180); g.scale(k, k); g.translate(-540, -860);
  g.globalCompositeOperation = 'multiply'; g.drawImage(ht('foldsh', 860, 820, 12, .5, C.navy, flat(.6)), 110 + 18, 440 + 18); g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#F2D9A4'; rr(110, 380, 360, 110, 22); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 7; g.stroke();
  g.fillStyle = '#F2D9A4'; rr(110, 440, 860, 820, 24); g.fill(); g.stroke();
  g.font = font(MONO, 34, 800); g.fillStyle = C.navy; g.fillText('KASUS #001', 140, 432);
  g.restore();
  // eye with a % pupil, blinking
  const bl = t - t0, open = 1 - .92 * Math.max(0, 1 - Math.abs(bl - 1.9) / .09) * (bl > 1.8 && bl < 2.0 ? 1 : 0);
  eye(540, 700, popS(bl - .15) * 1.05, open);
  pop(t, 'DISKON YANG', 540, 990, { size: 86, t0: T.s1, align: 'center', sh: C.pink });
  pop(t, 'MENIPU MATA', 540, 1115, { size: 98, t0: T.s1 + .18, align: 'center', col: C.navy, sh: C.yellow, off: 9 });
}
function header(t, t0, n, title) {
  chip(t, 'BARANG BUKTI 0' + n, M, 340, { t0, size: 30 });
  const sz = Math.min(84, 84 * (W - 2 * M) / measure(title, SLAB, 84));
  pop(t, title, M, 480, { size: sz, t0: t0 + .15, st: .022, sh: C.pink });
}
function sceneEx1(t) {
  header(t, T.s2 + .1, 1, 'DISKON BERTUMPUK');
  // the riddle first: 50% + 50% = free?
  const tq0 = wAt('l03a', 'diskon') - .1, tq1 = wAt('l03a', 'tambah') + .25, out = VO.l03.t0 + .1;
  if (t < out + .2) {
    const ko = 1 - ss(seg(t, out, out + .18));
    g.save(); g.translate(540, 900); g.scale(ko, ko); g.translate(-540, -900);
    pop(t, '50% + 50%', 540, 820, { fam: BAGEL, size: 150, t0: tq0, st: .04, align: 'center', col: C.navy, sh: C.pink, off: 9, rec: ko > .99 });
    pop(t, '= GRATIS?', 540, 1010, { fam: BAGEL, size: 150, t0: tq1, st: .04, align: 'center', col: C.yellow, sh: C.navy, off: 9, rec: ko > .99 });
    g.restore();
    if (t < out) return;
  }
  const tP1 = VO.l03.t0 + .2, tC1 = wAt('l03', 'diskon'), tP2 = wAt('l03', 'lima puluh ribu', true) - .05, tC2 = wAt('l04', 'Diskon'), tP3 = wAt('l04', 'dua puluh') - .05, tTot = wAt('l05', 'Totalnya');
  pop(t, 'Rp100.000', M, 670, { fam: BAGEL, size: 118, t0: tP1, st: .03, sh: C.blue, off: 8 });
  inkLine(M - 10, 630, M + 600, 640, seg(t, tC1 + .35, tC1 + .6), C.pink, 14);
  chip(t, '−50%', 760, 630, { t0: tC1, bg: C.pink, col: C.cream, size: 46, fam: BAGEL, w: 400, padX: 26, sh: C.navy });
  pop(t, 'Rp50.000', M, 820, { fam: BAGEL, size: 118, t0: tP2, st: .03, sh: C.blue, off: 8 });
  inkLine(M - 10, 780, M + 510, 790, seg(t, tC2 + .35, tC2 + .6), C.pink, 14);
  chip(t, '−50% LAGI', 660, 780, { t0: tC2, bg: C.pink, col: C.cream, size: 46, fam: BAGEL, w: 400, padX: 26, sh: C.navy });
  pop(t, 'Rp25.000', M, 970, { fam: BAGEL, size: 118, t0: tP3, st: .03, col: C.blue, sh: C.navy, off: 8 });
  // the bar: 100% of the price, cut twice
  const bx = M, by = 1040, bw = W - 2 * M, bh = 110, kb = popS(t - tP1 - .1);
  if (kb > 0) {
    g.save(); g.translate(540, by + bh / 2); g.scale(1, kb); g.translate(-540, -by - bh / 2);
    const cut1 = seg(t, tC1 + .1, tC1 + .4), cut2 = seg(t, tC2 + .1, tC2 + .4);
    const seg_ = (x0, x1, removed, drop) => {
      const yy = by + drop; g.save(); rr(x0 + 3, yy, x1 - x0 - 6, bh, 10); g.clip();
      g.fillStyle = removed ? C.cream : C.blue; g.fillRect(x0, yy, x1 - x0, bh);
      if (removed) { g.globalCompositeOperation = 'multiply'; g.drawImage(ht('barpink', 900, 110, 13, .78, C.pink, flat(.75)), bx, yy); }
      g.restore(); g.strokeStyle = C.navy; g.lineWidth = 6; rr(x0 + 3, yy, x1 - x0 - 6, bh, 10); g.stroke();
    };
    const xm = bx + bw / 2, xq = bx + bw / 4;
    if (cut1 <= 0) seg_(bx, bx + bw, false, 0);
    else {
      seg_(xm, bx + bw, true, 22 * eo3(cut1));
      if (cut2 <= 0) seg_(bx, xm, false, 0); else { seg_(xq, xm, true, 22 * eo3(cut2)); seg_(bx, xq, false, 0); }
    }
    g.restore();
    if (cut1 <= 0) txt('100%', 540, by + 76, { fam: BAGEL, size: 64, w: 400, col: C.cream, align: 'center', rec: false });
    else txt(cut2 > 0 ? '25%' : '50%', (bx + (cut2 > 0 ? xq : xm)) / 2, by + 76, { fam: BAGEL, size: 58, w: 400, col: C.cream, align: 'center', rec: cut2 > 0 });
    const kt = popS(t - tTot);
    if (kt > 0) {       // bracket over everything cut away
      const yb = by + bh + 44; g.save(); g.strokeStyle = C.navy; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(xq + 6, yb - 14); g.lineTo(xq + 6, yb); g.lineTo(xq + (bx + bw - xq) * kt, yb); g.lineTo(xq + (bx + bw - xq) * kt, yb - 14); g.stroke(); g.restore();
    }
  }
  pop(t, 'DISKON 75%', 540, 1335, { fam: BAGEL, size: 140, t0: tTot + .15, st: .035, align: 'center', col: C.pink, sh: C.navy, off: 9 });
  stamp(t, T.b1, 'bukangratis', ['BUKAN', 'GRATIS'], 60, 820, 915, -11);
}
function sceneEx2(t) {
  header(t, T.s3 + .1, 2, 'BELI 2, GRATIS 1');
  const tB = wAt('l06', 'Beli') - .1, tG = wAt('l06', 'gratis satu') - .05, tK = wAt('l06', 'Kedengarannya'), tP = wAt('l07', 'Padahal'), t3 = wAt('l07', 'dapat tiga') - .05, tR = wAt('l07', 'Diskonnya') - .05;
  const xs = [235, 540, 845], bounce = i => 1 + .12 * Math.exp(-8 * Math.max(0, t - t3 - i * .14)) * Math.sin(Math.max(0, t - t3 - i * .14) * 20) * (t > t3 + i * .14 ? 1 : 0);
  xs.forEach((x, i) => {
    const k = popS(t - tB - i * .16) * bounce(i);
    box(x, 860, 230, 270, k, i === 2 ? 'GRATIS' : 'PROMO', i === 2 ? C.yellow : C.blue);
    if (t > t3 + i * .14) pop(t, String(i + 1), x, 838, { fam: BAGEL, size: 66, t0: t3 + i * .14, align: 'center', col: C.navy, sh: C.pink, rec: false });
  });
  chip(t, 'BAYAR', xs[0], 920, { t0: tB + .35, align: 'center', size: 32, bg: C.navy, col: C.cream });
  chip(t, 'BAYAR', xs[1], 920, { t0: tB + .5, align: 'center', size: 32, bg: C.navy, col: C.cream });
  chip(t, 'GRATIS', xs[2], 920, { t0: tG, align: 'center', size: 32, bg: C.yellow, col: C.navy, sh: C.navy });
  // "half price?" — then crossed out
  if (t >= tK) {
    const wob = t < tP ? Math.sin((t - tK) * 7) * 2.5 : 0;
    g.save(); g.translate(330, 1085); g.rotate(wob * Math.PI / 180); g.translate(-330, -1085);
    pop(t, '50%?', 330, 1130, { fam: BAGEL, size: 150, t0: tK, st: .04, align: 'center', col: C.pink, sh: C.navy, off: 9 });
    g.restore();
    inkLine(160, 1030, 500, 1120, seg(t, tP + .1, tP + .35), C.navy, 16); inkLine(160, 1120, 500, 1030, seg(t, tP + .3, tP + .55), C.navy, 16);
  }
  pop(t, '1/3 = 33%', 540, 1320, { fam: BAGEL, size: 150, t0: tR, st: .04, align: 'center', col: C.blue, sh: C.navy, off: 9 });
  stamp(t, T.b2, 'cuma33', ['CUMA 33%'], 56, 790, 1085, 7);
}
function sceneEx3(t) {
  header(t, T.s4 + .1, 3, 'JEBAKAN ONGKIR');
  const t0 = T.s4, tPr = wAt('l08', 'Gratis ongkir') - .05, tMin = wAt('l08', 'minimal') - .05, tB = wAt('l09', 'Belanjaanmu'), tKur = wAt('l09', 'Kamu') - .3, tAdd = wAt('l09', 'tambah'),
    tH = wAt('l10', 'Hemat'), tK2 = wAt('l10', 'tapi'), tSel = wAt('l10', 'keluar') - .1;
  // receipt
  const kr = popS(t - t0 - .2), rx = 150, ry = 540, rw = 780, rh = 470;
  if (kr > 0) {
    g.save(); g.translate(540, ry); g.scale(1, kr); g.translate(-540, -ry); g.translate(540, 760); g.rotate(1.2 * Math.PI / 180); g.translate(-540, -760);
    const zig = (dx, dy) => { g.beginPath(); g.moveTo(rx + dx, ry + dy); g.lineTo(rx + rw + dx, ry + dy); g.lineTo(rx + rw + dx, ry + rh + dy); for (let i = 0; i <= 26; i++) g.lineTo(rx + rw + dx - i * rw / 26, ry + rh + dy + (i % 2 ? 0 : -18)); g.closePath(); };
    g.globalCompositeOperation = 'multiply'; zig(16, 16); g.save(); g.clip(); g.drawImage(ht('rcsh', rw + 20, rh + 20, 12, .5, C.navy, flat(.55)), rx + 10, ry + 10); g.restore(); g.globalCompositeOperation = 'source-over';
    zig(0, 0); g.fillStyle = '#FFFBF2'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 5; g.stroke();
    g.restore();
  }
  const L = rx + 40, R = rx + rw - 40, row = (s, v, y, t1, col = C.navy) => { if (t < t1) return; const a = 1; txt(s, L, y, { size: 32, col, a, rec: t - t1 > .1 }); if (v) txt(v, R, y, { size: 32, col, align: 'right', a, rec: t - t1 > .1 }); };
  const dash = (y, t1) => { if (t < t1) return; g.save(); g.strokeStyle = C.navy; g.setLineDash([10, 9]); g.lineWidth = 3; g.beginPath(); g.moveTo(L, y); g.lineTo(L + (R - L) * eo3(seg(t, t1, t1 + .3)), y); g.stroke(); g.restore(); };
  row('PROMO: GRATIS ONGKIR', '10.000', 610, tPr);
  row('SYARAT: MIN. BELANJA', '100.000', 660, tMin);
  dash(690, tMin + .2);
  row('BELANJAANMU', '80.000', 740, tB);
  // progress to the free-shipping minimum
  if (t >= tB + .3) {
    const p80 = 8 / 11 * eo3(seg(t, tB + .3, tB + .9)), pAdd = 3 / 11 * eo3(seg(t, tAdd + .3, tAdd + 1)), bw = R - L, y = 762;
    g.fillStyle = C.paper; rr(L, y, bw, 26, 13); g.fill();
    g.fillStyle = C.blue; rr(L, y, bw * Math.min(1, p80), 26, 13); g.fill();
    if (pAdd > 0) { g.save(); rr(L, y, bw, 26, 13); g.clip(); g.fillStyle = C.pink; g.fillRect(L + bw * 8 / 11, y, bw * pAdd, 26); g.restore(); }
    g.strokeStyle = C.navy; g.lineWidth = 4; rr(L, y, bw, 26, 13); g.stroke();
    g.beginPath(); g.moveTo(L + bw * 10 / 11, y - 10); g.lineTo(L + bw * 10 / 11, y + 36); g.lineWidth = 5; g.stroke();
    if (t > tB + .7 && t < tAdd + 1.4) txt('KURANG 20.000', R, y + 64, { size: 26, col: C.pink, align: 'right' });
  }
  row('+ BARANG TAK PERLU', '30.000', 870, tAdd + .15, C.pink);
  row('ONGKIR', '', 920, tH);
  if (t >= tH) { txt('10.000', R - 150, 920, { size: 32, align: 'right', rec: false }); inkLine(R - 290, 908, R - 150, 908, seg(t, tH + .2, tH + .45), C.pink, 8); if (t > tH + .45) txt('0', R, 920, { size: 32, align: 'right', col: C.blue }); }
  dash(948, tH + .3);
  row('TOTAL', '110.000', 990, tH + .45);
  // the comparison
  const cmp = (lab, val, y, w, col, t1) => { if (t < t1) return; txt(lab, M, y - 18, { size: 28, w: 800 }); const k = eo3(seg(t, t1, t1 + .45)); g.fillStyle = col; rr(M, y, w * k, 54, 12); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 5; rr(M, y, w * k, 54, 12); g.stroke(); if (k > .99) txt(val, M + w + 18, y + 42, { fam: BAGEL, size: 46, w: 400, col: C.navy }); };
  cmp('HEMAT ONGKIR', '+10rb', 1100, 200, C.blue, tH + .1);
  cmp('UANG EKSTRA', '−30rb', 1210, 600, C.pink, tK2);
  pop(t, '= RUGI Rp20.000', 540, 1360, { fam: BAGEL, size: 92, t0: tSel, st: .025, align: 'center', col: C.navy, sh: C.pink, off: 7 });
  stamp(t, T.v3stamp, 'rugi', ['RUGI', 'Rp20RB'], 50, 862, 1092, -9);
}
function sceneVerdict(t) {
  const t0 = T.s5, ts = T.stamp, kb = eo3(seg(t, ts, ts + .25));
  if (kb > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.translate(540, 870); g.scale(.6 + .4 * kb, .6 + .4 * kb); g.drawImage(ht('burst2', W, 1300, 26, .26, C.yellow, radial(.5, .5, .1, .62)), -540, -650); g.restore(); }
  pop(t, 'PUTUSAN', 540, 450, { size: 120, t0: VO.l11.t0 - .1, align: 'center', track: 6, sh: C.pink });
  const cards = [['50%+50%', '≠ 100%', -7, 250, 760], ['2+1', '≠ 50%', 4, 560, 700], ['ONGKIR', '−Rp20rb', -3, 850, 790]];
  cards.forEach(([a, b, rot, x, y], i) => {
    const k = popS(t - t0 - .2 - i * .15); if (k <= 0) return;
    g.save(); g.translate(x, y); g.rotate(rot * Math.PI / 180); g.scale(k, k);
    g.globalCompositeOperation = 'multiply'; g.drawImage(ht('cardsh', 270, 330, 11, .5, C.navy, flat(.55)), -135 + 14, -165 + 14); g.globalCompositeOperation = 'source-over';
    g.fillStyle = C.cream; g.fillRect(-135, -165, 270, 330); g.strokeStyle = C.navy; g.lineWidth = 6; g.strokeRect(-135, -165, 270, 330);
    g.fillStyle = [C.pink, C.blue, C.yellow][i]; g.fillRect(-115, -145, 230, 200);
    g.save(); g.beginPath(); g.rect(-115, -145, 230, 200); g.clip(); g.globalCompositeOperation = 'multiply'; g.drawImage(ht('card' + i, 230, 200, 12, .78, C.navy, diag(.05, .6)), -115, -145); g.restore();
    g.font = font(BAGEL, a.length > 4 ? 40 : 88); g.fillStyle = i === 2 ? C.navy : C.cream; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a, 0, -45);
    g.font = font(MONO, 30, 800); g.fillStyle = C.navy; g.fillText(b, 0, 100); g.font = font(MONO, 20, 800); g.fillText('BUKTI 0' + (i + 1), 0, 140);
    g.fillStyle = '#9AA0B5'; g.fillRect(-14, -186, 28, 44); g.strokeStyle = C.navy; g.lineWidth = 4; g.strokeRect(-14, -186, 28, 44);
    g.restore();
  });
  stamp(t, ts, 'terbukti', ['TERBUKTI', 'MENJEBAK'], 112, 540, 1110, -8);
}
function sceneQuestion(t) {
  const t0 = T.s6, k = popS(t - t0 - .05);
  if (k > 0) {
    g.save(); g.translate(540, 780); g.scale(k, k); g.translate(-540, -780);
    const bub = (dx, col, mult) => { g.globalCompositeOperation = mult ? 'multiply' : 'source-over'; g.fillStyle = col; rr(100 + dx, 480 + dx, 880, 560, 60); g.fill(); g.beginPath(); g.moveTo(260 + dx, 1030 + dx); g.lineTo(230 + dx, 1160 + dx); g.lineTo(390 + dx, 1030 + dx); g.closePath(); g.fill(); };
    bub(14, C.pink, true); bub(0, C.navy, false); g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  const tq = VO.l12.t0 - .05;
  pop(t, 'PROMO APA', 540, 640, { size: 104, t0: tq, align: 'center', col: C.cream, sh: null });
  pop(t, 'YANG PERNAH', 540, 770, { size: 92, t0: tq + .2, align: 'center', col: C.cream, sh: null });
  pop(t, 'BIKIN KAMU', 540, 890, { size: 92, t0: tq + .4, align: 'center', col: C.cream, sh: null });
  pop(t, 'KALAP?', 540, 1000, { fam: BAGEL, size: 120, t0: tq + .65, align: 'center', col: C.yellow, sh: C.pink, off: 7 });
  const tc = tq + .55;
  chip(t, 'TULIS DI KOMEN', 540, 1250, { t0: tc, align: 'center', size: 40, bg: C.pink, col: C.cream, padX: 40, h: 88, sh: C.navy });
  if (t > tc + .2) { const b = Math.sin((t - tc) * 8) * 6; g.save(); g.strokeStyle = C.navy; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(540, 1310 + b); g.lineTo(540, 1360 + b); g.moveTo(515, 1338 + b); g.lineTo(540, 1364 + b); g.lineTo(565, 1338 + b); g.stroke(); g.restore(); }
}
function sceneCTA(t) {
  const t0 = VO.l13.t0 - .1;
  pop(t, 'KIRIM KE', 540, 560, { size: 110, t0, align: 'center', track: 4, sh: C.pink });
  const wb = Math.sin((t - t0) * 5) * 1.5;
  g.save(); g.translate(540, 720); g.rotate(wb * Math.PI / 180); g.translate(-540, -720);
  pop(t, '@teman', 540, 790, { fam: BAGEL, size: 210, t0: t0 + .25, st: .04, align: 'center', col: C.pink, sh: C.navy, off: 12 });
  g.restore();
  pop(t, 'yang kalap tiap', 540, 920, { fam: SANS, w: 900, size: 76, t0: wAt('l13', 'kalap') - .15, st: .015, align: 'center', sh: null });
  pop(t, 'ada promo!', 540, 1010, { fam: SANS, w: 900, size: 76, t0: wAt('l13', 'promo') - .2, st: .015, align: 'center', sh: null });
  const tc = VO.l13.t0 + .7; let x = 120;
  [['@teman', C.navy, C.cream], ['@pasangan', C.blue, C.cream], ['@grupkantor', C.yellow, C.navy]].forEach(([s, bg, col], i) => { x += chip(t, s, x, 1130, { t0: tc + i * .14, size: 34, bg, col, padX: 26, h: 72, sh: i === 2 ? C.navy : null }) + 18; });
  if (t > tc + .4) { const u = seg(t, tc + .4, tc + 1.5); if (u < 1) plane(lerp(-80, 1180, u), 370 - Math.sin(u * Math.PI) * 50 + Math.sin(u * 14) * 10, 1.0, -.15 + Math.cos(u * 14) * .12); }
  txt('ANGKA CONTOH  ·  EDUKASI, BUKAN SARAN KEUANGAN', 540, 1260, { size: 22, w: 700, align: 'center', col: C.navy, a: t > VO.l13.t0 + .4 ? 1 : 0 });
  stamp(t, TL.end - 2.8, 'tutup', ['BERKAS DITUTUP'], 50, 540, 1420, -6);
}
// ---------------- HUD + subtitles ----------------
const CH = ['TERSANGKA', 'KASUS #1', 'BUKTI 1/3', 'BUKTI 2/3', 'BUKTI 3/3', 'PUTUSAN', 'KOMENTAR', 'BAGIKAN'];
function hud(t, sc) {
  txt('BERKAS 003', M, 205, { size: 28, w: 800, rec: false });
  txt('UANG & KERJA', M, 240, { size: 22, w: 700, col: C.blue, track: 2, rec: false });
    const s = Math.floor(t), f = Math.floor((t - s) * 30);
  const tw = txt('REC ' + `00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - M, 205, { size: 28, w: 800, align: 'right', rec: false });
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = C.pink; g.beginPath(); g.arc(W - M - tw - 20, 196, 10, 0, 7); g.fill(); }
  txt(CH[sc], W - M, 240, { size: 22, w: 700, col: C.blue, align: 'right', track: 2, rec: false });
}
let LINES = [];
function buildCueLines() {
  g.save(); g.font = font(SANS, 46, 900); const maxW = 860;
  LINES = CUES.map(c => { const ws = c.text.replace(/(Rp\d+) ribu/g, '$1\u00A0ribu').split(' '), out = []; let cur = ''; for (const w of ws) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > maxW && cur) { out.push(cur); cur = w; } else cur = tt; } if (cur) out.push(cur);
    if (out.length === 2) { const n = ws.length; let best = null; for (let i = 1; i < n; i++) { const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '); const d = Math.abs(g.measureText(a).width - g.measureText(b).width); if (g.measureText(a).width <= maxW && g.measureText(b).width <= maxW && (!best || d < best[0])) best = [d, [a, b]]; } if (best) return best[1]; }
    return out; });
  g.restore();
}
const isKey = w => /[0-9%#]/.test(w) || /^(gratis|menjebak|kalap|terbukti|boncos)/i.test(w.replace(/[^\w]/g, ''));
function subs(t) {
  const i = CUES.findIndex(c => t >= c.t0 && t < c.t1); if (i < 0) return;
  const c = CUES[i], ls = LINES[i], k = Math.min(1, .86 + .14 * popS(t - c.t0)), size = 46, lh = 60;
  g.save(); g.font = font(SANS, size, 900);
  const ww = Math.max(...ls.map(l => g.measureText(l).width)) + 64, hh = ls.length * lh + 34, cx = 540, cy = 1475;
  g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = C.pink; rr(cx - ww / 2 + 8, cy - hh / 2 + 8, ww, hh, 26); g.fill(); g.globalCompositeOperation = 'source-over';
  g.fillStyle = C.navy; rr(cx - ww / 2, cy - hh / 2, ww, hh, 26); g.fill();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  ls.forEach((l, j) => {
    const y = cy - hh / 2 + 17 + lh * j + lh * .76; let x = cx - g.measureText(l).width / 2;
    l.split(' ').forEach((w, n, arr) => { const s = w + (n < arr.length - 1 ? ' ' : ''); g.fillStyle = isKey(w) ? C.yellow : C.cream; g.fillText(s, x, y); x += g.measureText(s).width; });
  });
  g.restore();
}
// ---------------- transitions, shake, flash, beat ----------------
function wipe(t) {
  for (const [ts, col] of T.wipes) {
    const p = seg(t, ts - .28, ts + .28); if (p <= 0 || p >= 1) continue;
    const step = 64; g.save(); g.fillStyle = col;
    for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) {
      const ox = (Math.floor(y / step) % 2) * step / 2, d = ((x + ox) / W * .45 + y / H * .55);
      const cover = p < .5 ? clamp((p * 2) * 1.6 - d * .6) : clamp(1 - ((p - .5) * 2 * 1.6 - d * .6));
      if (cover <= 0) continue; g.beginPath(); g.arc(x + ox, y, step * .76 * cover, 0, 7); g.fill();
    }
    g.restore();
  }
}
function shakeAt(t) { let dx = 0, dy = 0; for (const [ts, amp] of T.shakes) { const u = (t - ts) / .38; if (u < 0 || u > 1) continue; const r = mulberry(Math.floor(t * 30) + 3), a = amp * (1 - u) * (1 - u); dx += (r() * 2 - 1) * a; dy += (r() * 2 - 1) * a; } return [dx, dy]; }
function flash(t) { for (const [ts, a0] of T.flashes) { const u = (t - ts) / .16; if (u < 0 || u > 1) continue; g.save(); g.globalAlpha = a0 * (1 - u); g.fillStyle = C.cream; g.fillRect(0, 0, W, H); g.restore(); } }
const BEAT = 60 / 100;
function beatK(t) { if (t > T.silence[0] && t < T.silence[1] || t > TL.end - 1.6) return 1; return 1 + .006 * Math.exp(-((t % BEAT) / BEAT) * 9); }

export async function load(ctx) {
  g = ctx; TL = await (await fetch('timeline.json')).json(); for (const v of TL.voice) VO[v.id] = v; CUES = TL.cues;
  buildPaper(); buildCueLines();
  T.s1 = VO.l02.t0 - .2; T.s2 = VO.l03a.t0 - .3; T.s3 = VO.l06.t0 - .3; T.s4 = VO.l08.t0 - .3; T.s5 = VO.l11.t0 - .3; T.s6 = VO.l12.t0 - .25; T.s7 = VO.l13.t0 - .15;
  T.cuts = [0, T.s1, T.s2, T.s3, T.s4, T.s5, T.s6, T.s7];
  T.boncos = .5; T.stamp = wAt('l11', 'terbukti') - .04; T.silence = [VO.l11.t0 - .5, T.stamp];
  T.v3stamp = wAt('l10', 'dua puluh') + .05;
  const wc = [C.navy, C.pink, C.blue, C.yellow, C.navy, C.pink, C.blue];
  T.wipes = T.cuts.slice(1).map((c, i) => [c, wc[i]]);
  T.b1 = wAt('l05', 'Totalnya') + 1.0; T.b2 = wAt('l07', 'cuma') - .05;
  const st = { b1: T.b1, b2: T.b2, b3: T.v3stamp, end: TL.end - 2.8 };
  T.shakes = [[T.boncos + .1, 16], [st.b1, 10], [st.b2, 10], [st.b3, 10], [T.stamp, 28], [st.end, 6]];
  T.flashes = [[T.boncos + .1, .25], [T.stamp, .55]];
  // sound events
  const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  ev(0, 'hit'); ev(T.boncos - .25, 'pops', { n: 5 }); ev(T.boncos, 'pops', { n: 7 }); ev(T.boncos + .1, 'slam');
  ev(wAt('l03a', 'diskon') - .1, 'pops', { n: 9 }); ev(wAt('l03a', 'tambah') + .25, 'pops', { n: 9 }); ev(VO.l03.t0 + .1, 'whoosh');
  T.wipes.forEach(([c]) => ev(c - .3, 'wipe'));
  ev(T.s1 + .02, 'flap'); ev(T.s1 + .15 + 1.75, 'blink');
  ev(T.s1, 'pops', { n: 11 }); ev(T.s1 + .18, 'pops', { n: 11 });
  for (const s of [T.s2, T.s3, T.s4]) { ev(s + .1, 'pop'); ev(s + .25, 'pops', { n: 14 }); }
  ev(VO.l03.t0 + .2, 'pops', { n: 9 }); ev(wAt('l03', 'diskon'), 'pop'); ev(wAt('l03', 'diskon') + .12, 'slash'); ev(wAt('l03', 'diskon') + .4, 'drop');
  ev(wAt('l03', 'lima puluh ribu', true) - .05, 'pops', { n: 8 }); ev(wAt('l04', 'Diskon'), 'pop'); ev(wAt('l04', 'Diskon') + .12, 'slash'); ev(wAt('l04', 'Diskon') + .4, 'drop');
  ev(wAt('l04', 'dua puluh') - .05, 'pops', { n: 8 }); ev(wAt('l05', 'Totalnya') + .15, 'pops', { n: 10 }); ev(st.b1, 'stamp');
  [0, 1, 2].forEach(i => ev(wAt('l06', 'Beli') - .1 + i * .16, 'plop', { i }));
  ev(wAt('l06', 'gratis satu') - .05, 'ding'); ev(wAt('l06', 'Kedengarannya'), 'pops', { n: 4 });
  ev(wAt('l07', 'Padahal') + .1, 'scribble'); [0, 1, 2].forEach(i => ev(wAt('l07', 'dapat tiga') - .05 + i * .14, 'boing', { i }));
  ev(wAt('l07', 'Diskonnya') - .05, 'pops', { n: 9 }); ev(st.b2, 'stamp');
  ev(T.s4 + .2, 'tear');
  for (const [id, w, last] of [['l08', 'Gratis ongkir'], ['l08', 'minimal'], ['l09', 'Belanjaanmu'], ['l09', 'tambah'], ['l10', 'Hemat']]) ev(wAt(id, w) - .05, 'print');
  ev(VO.l10.t0 + .45, 'print'); ev(wAt('l10', 'tapi'), 'whoosh'); ev(wAt('l10', 'keluar') - .1, 'pops', { n: 15 }); ev(st.b3, 'stamp');
  ev(T.s5 + .2, 'shutter'); ev(T.s5 + .35, 'shutter'); ev(T.s5 + .5, 'shutter'); ev(VO.l11.t0 - .1, 'pops', { n: 7 });
  ev(T.stamp, 'bigstamp');
  ev(T.s6 + .05, 'pop'); ev(VO.l12.t0 + .6, 'pops', { n: 6 }); ev(VO.l12.t0 + .5, 'pop');
  ev(VO.l13.t0 - .1, 'pops', { n: 8 }); ev(VO.l13.t0 + .15, 'pops', { n: 6 }); ev(VO.l13.t0 + .7, 'share'); ev(VO.l13.t0 + 1.1, 'whoosh'); ev(st.end, 'stamp');
  ev(T.silence[0], 'cue', { name: 'silence' }); ev(T.stamp, 'cue', { name: 'stamp' }); ev(T.s6, 'cue', { name: 'outro' });
  EV.sort((a, b) => a.t - b.t);
}
export function events() { return EV; }
const SCENES = [sceneHook, sceneTitle, sceneEx1, sceneEx2, sceneEx3, sceneVerdict, sceneQuestion, sceneCTA];
export function render(t, q, texts = false) {
  TXT = texts ? [] : null; t = clamp(t, 0, TL.end - 1e-3);
  let sc = 0; for (let i = 0; i < T.cuts.length; i++) if (t >= T.cuts[i]) sc = i;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(paperC, 0, 0);
  const [dx, dy] = shakeAt(t), k = beatK(t);
  g.save(); g.translate(dx, dy); g.translate(540, 900); g.scale(k, k); g.translate(-540, -900);
  SCENES[sc](t);
  g.restore();
  hud(t, sc);
  if (!q || q.get('nosub') !== '1') subs(t);
  specks(t); wipe(t); flash(t);
  return TXT;
}
