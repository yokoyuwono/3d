// "Kasus #2: Cicilan 0% yang Nggak Pernah 0%" — Instruction Manual Art, vertical 1080×1920, 30 fps. Channel "Uang & Kerja".
// One printed manual page; the camera pans down it step by step. Line art, flat fills, true isometric; yellow = the part that is new
// (here: the costs nobody printed on the box). Engine (iso.js, hand.js, rig.js, page.js) from the style's demo (Lemo-Opuscar).
import { PAL, LW, setLW, makeView, box, cyl, prism, blob, poly3, planeArrow, turnArrow, dashed, dashed3, cross, tick, roundRect, clickMark, rotAbout, arrow2, setGrow, add3 } from './engine/iso.js';
const W = 1080, H = 1920, F = 'Inter';
let g, TL, VO = {}, T = {}, TXT = null, EV = [], CUES = [], LINES = [];
export const DUR = () => TL.end;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo3 = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const settle = u => u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * .06;   // ease in, small settle
const popS = u => u <= 0 ? 0 : 1 - Math.exp(-10 * u) * Math.cos(15 * u);
const wAt = (id, w, last = false) => { const v = VO[id], i = last ? v.text.lastIndexOf(w) : v.text.indexOf(w); if (i < 0) throw new Error(id + ' ' + w); return v.t0 + (v.t1 - v.t0) * i / v.text.length; };
const rp = n => 'Rp' + Math.round(n).toLocaleString('de-DE');

// ---------------- paper ----------------
let paperC;
function buildPaper() {
  paperC = document.createElement('canvas'); paperC.width = W; paperC.height = H; const x = paperC.getContext('2d');
  x.fillStyle = PAL.paper; x.fillRect(0, 0, W, H); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3200; i++) { const px = r() * W, py = r() * H, a = r() * Math.PI, l = 4 + r() * 16; x.strokeStyle = r() < .5 ? 'rgba(120,105,80,0.05)' : 'rgba(255,255,255,0.22)'; x.lineWidth = .6 + r() * .6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l * .4); x.stroke(); }
  for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(90,80,60,0.10)'; x.fillRect(r() * W, r() * H, 1 + r(), 1 + r()); }
}
// ---------------- type ----------------
function txt(s, x, y, { size = 40, w = 700, col = PAL.ink, align = 'left', a = 1, rec = true, track = 0 } = {}) {
  if (a <= 0) return 0;
  g.save(); g.globalAlpha = a; g.font = `${w} ${size}px ${F}`; g.letterSpacing = track + 'px'; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  const m = g.measureText(s).width; g.restore();
  if (TXT && rec && a > .99) { const x0 = align === 'left' ? x : align === 'right' ? x - m : x - m / 2; TXT.push({ id: s, text: s, x0, y0: y - size * .78, x1: x0 + m, y1: y + size * .2 }); }
  return m;
}
const tw = (s, size, w = 700) => { g.save(); g.font = `${w} ${size}px ${F}`; const m = g.measureText(s).width; g.restore(); return m; };
// printed type that inks in: scale pop from the baseline centre (nothing fades)
function ptxt(t, t0, s, x, y, o = {}) {
  if (t < t0) return 0; const k = Math.min(1, popS(t - t0) * 1) , size = o.size || 40, m = tw(s, size, o.w || 700);
  const cx = o.align === 'center' ? x : o.align === 'right' ? x - m / 2 : x + m / 2;
  g.save(); g.translate(cx, y - size * .3); g.scale(k, k); g.translate(-cx, -(y - size * .3));
  const r = txt(s, x, y, { ...o, rec: false }); g.restore();
  if (TXT && (o.rec ?? true) && t - t0 > .3) { const x0 = o.align === 'center' ? x - m / 2 : o.align === 'right' ? x - m : x; TXT.push({ id: s, text: s, x0, y0: y - size * .78, x1: x0 + m, y1: y + size * .2 }); }
  return r;
}
// yellow marker block behind a word (yellow = new)
function mark(x, y, w, h, p = 1) { if (p <= 0) return; g.fillStyle = PAL.neu.top; g.fillRect(x, y, w * eo3(p), h); }
// text printed on an isometric face: origin o3, unit axes U (to the right) and D (down), sizes in cm
function faceText(v, o3, U, D, s, size, { w = 800, col = PAL.ink, align = 'center' } = {}) {
  const o = v.P(o3), u = v.P(add3(o3, U)), d = v.P(add3(o3, D));
  g.save(); g.transform(u[0] - o[0], u[1] - o[1], d[0] - o[0], d[1] - o[1], o[0], o[1]);
  g.font = `${w} ${size}px ${F}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
}
const ZF = { U: [1, 0, 0], D: [0, -1, 0] }, XF = { U: [0, 0, -1], D: [0, -1, 0] }, TF = { U: [1, 0, 0], D: [0, 0, 1] };

// ---------------- props (world cm, y up) ----------------
function carton(v, c, o = {}) {      // the "0%" box; o.lid 0..1 opens the two top flaps
  const [x, y, z] = c, a = [x - 22, y, z - 16], b = [x + 22, y + 26, z + 16];
  box(v, a, b, o.pal || PAL.part, { after: gg => {
    faceText(v, [x, y + 15, z + 16], ZF.U, ZF.D, '0%', 13, { w: 900 });
    faceText(v, [x, y + 5.5, z + 16], ZF.U, ZF.D, '12× CICILAN', 3.4, { w: 700 });
    faceText(v, [x + 22, y + 13, z], XF.U, XF.D, 'HP', 9, { w: 900 });
    if (o.cross > 0) { const p = v.P([x - 14, y + 23, z + 16]), q = v.P([x + 14, y + 6, z + 16]), p2 = v.P([x + 14, y + 23, z + 16]), q2 = v.P([x - 14, y + 6, z + 16]);
      gg.save(); gg.strokeStyle = PAL.red; gg.lineWidth = 16; gg.lineCap = 'round'; const k1 = eo3(o.cross * 2), k2 = eo3(o.cross * 2 - 1);
      gg.beginPath(); gg.moveTo(p[0], p[1]); gg.lineTo(lerp(p[0], q[0], k1), lerp(p[1], q[1], k1)); if (k2 > 0) { gg.moveTo(p2[0], p2[1]); gg.lineTo(lerp(p2[0], q2[0], k2), lerp(p2[1], q2[1], k2)); } gg.stroke(); gg.restore(); }
  } });
  const L = o.lid || 0;
  if (L > 0) {   // flaps hinged on the long top edges, opening outwards
    const yt = y + 26;
    box(v, [x - 22, yt, z - 16], [x - 21.4, yt + 16, z + 16], PAL.part, { xf: rotAbout([x - 22, yt, 0], [0, 0, 1], (1 - L) * -Math.PI / 2 + L * .55), bias: -2 });
    box(v, [x + 21.4, yt, z - 16], [x + 22, yt + 16, z + 16], PAL.part, { xf: rotAbout([x + 22, yt, 0], [0, 0, 1], (1 - L) * Math.PI / 2 - L * .55), bias: 2 });
  } else box(v, [x - 22, y + 26, z - 16], [x + 22, y + 26.3, z + 16], PAL.part, { after: () => faceText(v, [x, y + 26.3, z], TF.U, TF.D, 'CICILAN 0%', 4.6, { w: 900 }) });
}
function phone(v, c, pal = PAL.part, rot = 0) {
  const [x, y, z] = c; const xf = rot ? rotAbout(c, [0, 1, 0], rot) : undefined;
  box(v, [x - 4, y, z - .5], [x + 4, y + 16, z + .5], pal, { xf, after: gg => { if (rot) return; const p = [[x - 3.2, y + 14.6, z + .5], [x + 3.2, y + 14.6, z + .5], [x + 3.2, y + 1.6, z + .5], [x - 3.2, y + 1.6, z + .5]].map(v.P);
    gg.beginPath(); p.forEach((q, i) => i ? gg.lineTo(...q) : gg.moveTo(...q)); gg.closePath(); gg.lineWidth = LW * .8; gg.strokeStyle = PAL.ink; gg.stroke(); } });
}
function coin(v, c, pal = PAL.neu, o = {}) { cyl(v, c, add3(c, [0, 1.1, 0]), 4.2, pal, { bias: o.bias || 0, after: o.after }); }
function block(v, c, label, pal = PAL.neu, o = {}) {
  const [x, y, z] = c; box(v, [x - 7, y, z - 5], [x + 7, y + 9, z + 5], pal, { bias: o.bias || 0, after: () => faceText(v, [x, y + 4.5, z + 5], ZF.U, ZF.D, label, 3.6, { w: 900 }) });
}
function trap(v, c, snap, pal = PAL.neu) {        // mousetrap: board, spring, the bar swinging over (snap 0 = set, 1 = shut)
  const [x, y, z] = c;
  box(v, [x - 12, y, z - 6.5], [x + 12, y + 1.6, z + 6.5], pal);
  const ang = lerp(-Math.PI * .95, 0, snap), piv = [x - 1, y + 2.2, z];
  cyl(v, [x - 1, y + 2.2, z - 5.6], [x - 1, y + 2.2, z + 5.6], 1.1, PAL.metal, { bias: .5 });
  const xf = rotAbout(piv, [0, 0, 1], ang);
  [[-5.4], [5.4]].forEach(([dz]) => cyl(v, [x - 1, y + 2.2, z + dz], [x + 9, y + 2.2, z + dz], .35, PAL.metal, { xf, bias: 1 }));
  cyl(v, [x + 9, y + 2.2, z - 5.4], [x + 9, y + 2.2, z + 5.4], .35, PAL.metal, { xf, bias: 1 });
  box(v, [x + 4, y + 1.6, z - 2], [x + 8, y + 2.1, z + 2], PAL.metal, { bias: .2 });     // bait plate
}
function tag(v, c, label, sub, pal = PAL.part, o = {}) {   // price tag standing in the +z plane, with a hole
  const [x, y, z] = c, w = o.w || 26, h = 15, n = 6;
  const face = [[x - w / 2 + n, y + h, z], [x + w / 2, y + h, z], [x + w / 2, y, z], [x - w / 2 + n, y, z], [x - w / 2, y + h / 2, z]];
  prism(v, face, [0, 0, -1.2], pal, { sharp: [0, 1, 2, 3, 4], bias: o.bias || 0, after: gg => {
    const hp = v.P([x - w / 2 + 3.2, y + h / 2, z]); gg.beginPath(); gg.arc(hp[0], hp[1], .9 * v.s, 0, 7); gg.fillStyle = PAL.paper; gg.fill(); gg.lineWidth = LW; gg.strokeStyle = PAL.ink; gg.stroke();
    faceText(v, [x + 3, y + h * .64, z], ZF.U, ZF.D, label, o.fs || 3.6, { w: 900 }); faceText(v, [x + 3, y + h * .27, z], ZF.U, ZF.D, sub, 2.4, { w: 700 });
  } });
}
function calculator(v, c, pal = PAL.part) {
  const [x, y, z] = c; box(v, [x - 7, y, z - 10], [x + 7, y + 2, z + 10], pal, { after: gg => {
    const q = (a, b) => [[a[0], y + 2, a[1]], [b[0], y + 2, a[1]], [b[0], y + 2, b[1]], [a[0], y + 2, b[1]]].map(v.P);
    const rect = (pts, f) => { gg.beginPath(); pts.forEach((p, i) => i ? gg.lineTo(...p) : gg.moveTo(...p)); gg.closePath(); if (f) { gg.fillStyle = f; gg.fill(); } gg.lineWidth = LW * .8; gg.strokeStyle = PAL.ink; gg.stroke(); };
    rect(q([x - 5.5, z - 8.5], [x + 5.5, z - 3.5]), PAL.part.z);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) rect(q([x - 5.5 + i * 3.9, z - 2 + j * 2.9], [x - 3 + i * 3.9, z - .1 + j * 2.9]), '#FFFFFF');
  } });
}
function plane(v, c, k = 1) {
  const [x, y, z] = c, s = k;
  poly3(v, [[x - 8 * s, y, z], [x + 10 * s, y + 1 * s, z - 3 * s], [x - 4 * s, y + .2, z + 6 * s]], '#FFFFFF', { bias: 2 });
  poly3(v, [[x - 8 * s, y, z], [x + 10 * s, y + 1 * s, z - 3 * s], [x - 3 * s, y + 3 * s, z]], PAL.part.z, { bias: 3 });
}

// ---------------- the page header (fixed print): case tag, the three hidden parts, the running difference ----------------
function header(t) {
  txt('KASUS #2', 84, 200, { size: 30, w: 800, rec: false }); txt('UANG & KERJA', 84, 236, { size: 22, w: 600, col: PAL.grey3, track: 2, rec: false });
  if (t < T.found[0] - .2) return;
  // three slots: empty ring → yellow (found) → white with a tick (explained)
  for (let i = 0; i < 3; i++) {
    const cx = 520 + i * 66, cy = 205, f = t >= T.found[i], d = t >= T.done[i];
    g.save(); g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fillStyle = d ? '#FFFFFF' : f ? PAL.neu.top : PAL.paper; g.fill(); g.lineWidth = LW; g.strokeStyle = PAL.ink; g.stroke(); g.restore();
    txt(String(i + 1), cx, cy + 11, { size: 30, w: 800, align: 'center', rec: false });
  }
  // the running difference against paying cash
  const d1 = 360000 * eo3(seg(t, T.add1, T.add1 + .8)), d2 = 300000 * eo3(seg(t, T.add2, T.add2 + .8)), val = Math.round((d1 + d2) / 1000) * 1000;
  txt('vs CASH', W - 84, 196, { size: 20, w: 700, col: PAL.grey3, align: 'right', track: 2, rec: false });
  txt('+' + rp(val), W - 84, 240, { size: 34, w: 900, align: 'right', rec: false });
}

// ---------------- scenes (each a part of the one page; the camera pans down between them) ----------------
const M = 84;
function sCover(t, v) {
  // cover frame
  g.save(); g.strokeStyle = PAL.ink; g.lineWidth = 4; g.strokeRect(54, 290, W - 108, 1100); g.lineWidth = 1.5; g.strokeRect(66, 302, W - 132, 1076); g.restore();
  ptxt(t, -.4, 'CICILAN 0%', 540, 470, { size: 150, w: 900, align: 'center' });
  ptxt(t, -.25, 'KOK BAYARNYA', 540, 575, { size: 66, w: 800, align: 'center' });
  if (t >= T.slam) { const m = tw('Rp3,36 JUTA?', 132, 900); mark(540 - m / 2 - 18, 610, m + 36, 140, seg(t, T.slam, T.slam + .18)); }
  ptxt(t, T.slam, 'Rp3,36 JUTA?', 540, 720, { size: 132, w: 900, align: 'center' });
  // the box, its flaps opening on "kita bongkar"
  const lid = ss(seg(t, T.open, T.open + .7));
  carton(v, [0, 0, 0], { lid });
  v.flush(g);
  if (t > T.slam + .2 && t < T.open) { const p = v.P([24, 36, 16]); txt('?', p[0], p[1], { size: 120, w: 900, rec: false }); }
  ptxt(t, T.s1t - .1, 'KASUS #2 · CICILAN 0% YANG NGGAK PERNAH 0%', 540, 1350, { size: 27, w: 800, align: 'center', track: 1 });
}
function sParts(t, v, vb) {
  // the open box low on the page; parts fly out along dotted guides to the parts box above
  carton(vb, [0, 0, 0], { lid: 1 }); vb.flush(g);
  const bx = 84, by = 320, bw = W - 168, bh = 340;
  roundRect(g, bx, by, bw, bh, 22, '#FFFFFF', LW);
  const slots = [{ n: '1×', t0: T.p0, x: 0 }, { n: '12×', t0: T.p1, x: 1 }, { n: '1×', t0: T.p2, x: 2 }, { n: '1×', t0: T.p3, x: 3 }], cw = bw / 4;
  const top = vb.P([0, 30, 0]);
  slots.forEach((s, i) => {
    const cx = bx + cw * i + cw * .5, cy = by + bh * .52, u = seg(t, s.t0, s.t0 + .55), k = settle(u);
    if (t < s.t0) return;
    dashed(g, top, [cx, cy + 40], { p: eo3(seg(t, s.t0 - .25, s.t0)) });
    const px = lerp(top[0], cx, k), py = lerp(top[1], cy + 10, k);
    const pv = makeView({ cx: px, cy: py, s: 7 });
    if (i === 0) phone(pv, [0, -8, 0]); else if (i === 1) [0, 1.2, 2.4].forEach(h => coin(pv, [0, -3 + h, 0])); else if (i === 2) block(pv, [0, -4.5, 0], '?'); else trap(pv, [0, -1, 0], 0);
    pv.flush(g);
    if (u >= 1) ptxt(t, s.t0 + .55, s.n, bx + cw * i + 18, by + 58, { size: 40, w: 800 });
    if (i > 0 && u >= 1) txt('?', bx + cw * i + cw - 30, by + bh - 28, { size: 50, w: 900, align: 'right', rec: false });
  });
  // "the last one is the sneakiest": a ring on the trap
  if (t > T.sly) { const cx = bx + cw * 3.5, cy = by + bh * .55, r = 120 + 6 * Math.sin((t - T.sly) * 9); g.save(); g.strokeStyle = PAL.red; g.lineWidth = 6; g.setLineDash([16, 12]); g.beginPath(); g.arc(cx, cy, r * Math.min(1, popS(t - T.sly)), 0, 7); g.stroke(); g.restore(); }
}
function stepNum(n, t, t0) { ptxt(t, t0, String(n), M, 470, { size: 170, w: 800, rec: false }); }
function sStep1(t, v) {
  stepNum(1, t, T.s2 + .1);
  ptxt(t, T.s2 + .3, 'BIAYA LAYANAN', 300, 400, { size: 48, w: 800 });
  ptxt(t, T.s2 + .45, '1% / bulan', 300, 456, { size: 40, w: 600 });
  // twelve coins drop one by one into a stack (arrow first, then the part)
  const n = Math.floor(clamp((t - T.c0) / T.cdt, 0, 12));
  if (t > T.c0 - .5 && n < 12) { planeArrow(v, [0, 40, 0], [0, -1, 0], [1, 0, 0], 12, 3.2); }
  for (let i = 0; i < 12; i++) {
    const t0 = T.c0 + i * T.cdt; if (t < t0) continue; const k = settle(seg(t, t0, t0 + .22));
    coin(v, [0, lerp(30, i * 1.2, k), 0], t > T.done[0] ? PAL.part : PAL.neu, { bias: i * .01 });
  }
  v.flush(g);
  const cnt = Math.min(12, Math.ceil(clamp((t - T.c0) / T.cdt + .01, 0, 12)));
  if (t > T.c0) { txt(cnt + '×', 330, 1010, { size: 96, w: 900, rec: cnt === 12 }); txt('Rp30.000', 330, 1070, { size: 44, w: 700, rec: cnt === 12 }); }
  if (t >= T.add1) { const m = tw('= Rp360.000', 104, 900); mark(M - 14, 1150, m + 28, 120, seg(t, T.add1, T.add1 + .2)); }
  ptxt(t, T.add1, '= Rp360.000', M, 1245, { size: 104, w: 900 });
}
function sStep2(t, v) {
  stepNum(2, t, T.s3 + .1);
  ptxt(t, T.s3 + .3, 'SELISIH HARGA', 300, 400, { size: 48, w: 800 });
  const tc = wAt('l07', 'cash') - .2, tm = T.add2 - .5;
  // cash tag (left, lower) and the instalment tag (right) that carries a hidden yellow block
  const k1 = settle(seg(t, T.s3 + .4, T.s3 + .9)), k2 = settle(seg(t, tc, tc + .5));
  if (k1 > 0) tag(v, [-20, lerp(40, 22, k1), 8], 'Rp3.000.000', 'CICILAN 0%', PAL.part, { w: 34 });
  if (k2 > 0) tag(v, [16, lerp(36, 2, k2), 24], 'Rp2.700.000', 'CASH', PAL.part, { w: 34, bias: 5 });
  // the 300k block slides out of the instalment tag along a dotted guide
  if (t > tm) { const k = settle(seg(t, tm, tm + .6)); dashed3(v, [-20, 30, 8], [-20, 6, 30], { layer: 1 }); block(v, [-20, lerp(26, 0, k), lerp(8, 30, k)], '300rb', t > T.done[1] ? PAL.part : PAL.neu, { bias: 20 }); }
  v.flush(g);
  if (t > tm + .6) { const p = v.P([-20, 0, 30]); clickMark(g, p[0] + 80, p[1] - 70, 26, -Math.PI / 4); }
  ptxt(t, T.eq2, '3.000.000 − 2.700.000', 540, 1170, { size: 52, w: 700, align: 'center' });
  if (t >= T.eq2 + .25) { const m = tw('= Rp300.000', 104, 900); mark(540 - m / 2 - 14, 1185, m + 28, 120, seg(t, T.eq2 + .25, T.eq2 + .45)); }
  ptxt(t, T.eq2 + .25, '= Rp300.000', 540, 1280, { size: 104, w: 900, align: 'center' });
}
function sStep3(t, v) {
  stepNum(3, t, T.s4 + .1);
  ptxt(t, T.s4 + .3, 'DENDA TELAT', 300, 400, { size: 48, w: 800 });
  const snap = ss(seg(t, T.snap, T.snap + .09));
  trap(v, [0, 0, 0], snap, t > T.done[2] ? PAL.part : PAL.neu);
  // the bait: one coin on the plate, an arrow pointing at it; the bar comes down on it
  coin(v, [6, 2.1, 0], PAL.neu, { bias: .3 });
  if (t < T.snap) planeArrow(v, [6, 14, 0], [0, -1, 0], [1, 0, 0], 9, 2.4);
  v.flush(g);
  if (t > T.snap && t < T.snap + .5) { const p = v.P([4, 6, 0]); clickMark(g, p[0], p[1] - 30, 40, -Math.PI / 2, 5); clickMark(g, p[0], p[1] - 30, 40, -Math.PI * .85, 5); }
  ptxt(t, T.snap + .1, 'Rp50.000', 540, 1170, { size: 120, w: 900, align: 'center' });
  ptxt(t, T.snap + .3, '1× TELAT', 540, 1235, { size: 46, w: 700, align: 'center' });
  // the bill arrives
  const tb = wAt('l09', 'Dan biasanya') - .1;
  if (t > tb) { const k = settle(seg(t, tb, tb + .45)); const x = lerp(W + 200, 760, k); g.save(); g.translate(x, 1290); g.rotate(-.06);
    roundRect(g, -150, 0, 300, 160, 10, '#FFFFFF', LW); g.beginPath(); g.moveTo(-150, 0); g.lineTo(0, 80); g.lineTo(150, 0); g.lineWidth = LW; g.strokeStyle = PAL.ink; g.stroke();
    g.fillStyle = PAL.neu.top; g.fillRect(-120, 104, 150, 40); g.restore(); txt('+50.000', x - 40, 1290 + 136, { size: 34, w: 900, align: 'center', rec: k >= 1 }); }
}
function sTotal(t, v) {
  stepNum('=', t, T.s5 + .1);
  // the assembled kit: box, coins, block, trap — all white now
  carton(v, [0, 0, 0], { cross: seg(t, T.x0, T.x0 + .5) });
  [0, 1.2, 2.4, 3.6].forEach((h, i) => coin(v, [28, h, -12], PAL.part, { bias: i * .01 }));
  block(v, [-30, 0, 14], '300rb', PAL.part);
  v.flush(g);
  ptxt(t, T.s5 + .3, 'Rp3.000.000', W - M, 400, { size: 56, w: 700, align: 'right' });
  ptxt(t, T.s5 + .5, '+ Rp360.000', W - M, 466, { size: 56, w: 700, align: 'right' });
  if (t > T.s5 + .8) { g.fillStyle = PAL.ink; g.fillRect(W - M - 420 * eo3(seg(t, T.s5 + .8, T.s5 + 1.1)), 492, 420 * eo3(seg(t, T.s5 + .8, T.s5 + 1.1)), 5); }
  ptxt(t, T.tot, 'Rp3.360.000', W - M, 590, { size: 88, w: 900, align: 'right' });
  ptxt(t, T.cash, 'CASH Rp2.700.000', M, 1125, { size: 48, w: 700 });
  if (t >= T.pct) { const m = tw('+24%', 200, 900); mark(M - 10, 1150, m + 20, 190, seg(t, T.pct, T.pct + .2)); }
  ptxt(t, T.pct, '+24%', M, 1315, { size: 200, w: 900 });
  if (t > T.x0 + .3) { const s = 1 + .06 * Math.exp(-10 * (t - T.x0 - .3)); g.save(); g.translate(850, 1225); g.scale(s, s); cross(g, 0, 0, 170, 22); g.restore(); }
}
function sDoDont(t, v1, v2) {
  const t0 = T.s6, bx = 84, by = 330, bw = W - 168, bh = 640, k = popS(t - t0 - .05);
  if (k <= 0) return;
  g.save(); g.translate(540, by + bh / 2); g.scale(k, k); g.translate(-540, -(by + bh / 2));
  roundRect(g, bx, by, bw, bh, 26, '#FFFFFF', LW); g.beginPath(); g.moveTo(540, by); g.lineTo(540, by + bh); g.lineWidth = LW; g.strokeStyle = PAL.ink; g.stroke(); g.restore();
  if (k < .98) return;
  // ✗: a finger straight onto the 0% button
  cyl(v1, [0, 0, 0], [0, 3, 0], 9, PAL.part, { after: () => faceText(v1, [0, 3, 0], TF.U, TF.D, '0%', 6, { w: 900 }) });
  const pr = .5 + .5 * Math.sin((t - t0) * 7);
  planeArrow(v1, [0, 18 - pr * 4, 0], [0, -1, 0], [1, 0, 0], 11, 3.4, { layer: 2 });
  v1.flush(g);
  // ✓: the calculator between the two tags
  calculator(v2, [0, 0, 0]); tag(v2, [-14, 3, -14], '3,36jt', 'CICILAN', PAL.part, { w: 20, fs: 4.2 }); tag(v2, [14, 3, -14], '2,7jt', 'CASH', PAL.part, { w: 20, fs: 4.2, bias: 1 }); v2.flush(g);
  cross(g, 312, by + bh - 70, 70, 14);
  if (t > t0 + .6) tick(g, 768, by + bh - 70, 80, 14);
  // the formula, printed under the box
  const tf = wAt('l12', 'harga cicilan') - .1;
  ptxt(t, tf, 'CICILAN + BIAYA', 540, 1100, { size: 70, w: 900, align: 'center' });
  ptxt(t, tf + .4, 'vs  HARGA CASH', 540, 1190, { size: 70, w: 900, align: 'center' });
  if (t > wAt('l12', 'bandingkan')) { const m = tw('vs  HARGA CASH', 70, 900); g.fillStyle = PAL.neu.top; g.fillRect(540 - m / 2, 1202, m * eo3(seg(t, wAt('l12', 'bandingkan'), wAt('l12', 'bandingkan') + .3)), 12); }
}
function sOutro(t, v) {
  const t0 = T.s7;
  // bookmark: "save before checkout"
  ptxt(t, t0 + .05, 'SIMPAN', 540, 470, { size: 120, w: 900, align: 'center' });
  ptxt(t, t0 + .25, 'SEBELUM CHECKOUT', 540, 550, { size: 56, w: 800, align: 'center' });
  if (t > t0 + .1) { const k = settle(seg(t, t0 + .1, t0 + .5)); g.save(); g.translate(900, lerp(250, 330, k)); g.fillStyle = PAL.neu.top; g.beginPath(); g.moveTo(-40, 0); g.lineTo(40, 0); g.lineTo(40, 130); g.lineTo(0, 100); g.lineTo(-40, 130); g.closePath(); g.fill(); g.lineWidth = LW; g.strokeStyle = PAL.ink; g.stroke(); g.restore(); }
  const tk = wAt('l13', 'tulis') - .1;
  if (t > tk) { const k = popS(t - tk); g.save(); g.translate(540, 720); g.scale(k, k); roundRect(g, -380, -80, 760, 160, 40, '#FFFFFF', LW); g.beginPath(); g.moveTo(-250, 80); g.lineTo(-290, 140); g.lineTo(-190, 80); g.fillStyle = '#FFFFFF'; g.fill(); g.stroke(); g.restore(); }
  ptxt(t, tk + .1, 'PERNAH KENA?', 540, 745, { size: 76, w: 900, align: 'center' });
  // share
  const ts = VO.l14.t0 - .1;
  ptxt(t, ts, 'KIRIM KE', 540, 960, { size: 86, w: 900, align: 'center' });
  if (t >= ts + .2) { const m = tw('@teman', 150, 900); mark(540 - m / 2 - 16, 990, m + 32, 160, seg(t, ts + .2, ts + .4)); }
  ptxt(t, ts + .2, '@teman', 540, 1120, { size: 150, w: 900, align: 'center' });
  ptxt(t, ts + .45, 'yang mau checkout cicilan', 540, 1200, { size: 48, w: 700, align: 'center' });
  if (t > ts + .6) { const u = seg(t, ts + .6, ts + 1.8); if (u < 1) { const pv = makeView({ cx: lerp(-100, 1180, u), cy: 1268 - Math.sin(u * Math.PI) * 20, s: 5 }); plane(pv, [0, 0, 0]); pv.flush(g); } }
  txt('ANGKA CONTOH · CEK BIAYA DI SYARAT & KETENTUAN', 540, 1330, { size: 22, w: 700, col: PAL.grey3, align: 'center', track: 1, a: t > ts - .3 ? 1 : 0 });
}
// ---------------- subtitles: bottom left, yellow bar, paper bed ----------------
function buildCueLines() {
  g.save(); g.font = `600 40px ${F}`; const maxW = 860;
  LINES = CUES.map(c => { const ws = c.text.replace(/(Rp[\d,.]+) (juta|ribu)/g, '$1 $2').split(' '), out = []; let cur = ''; for (const w of ws) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > maxW && cur) { out.push(cur); cur = w; } else cur = tt; } if (cur) out.push(cur); return out; });
  g.restore();
}
function subs(t) {
  const i = CUES.findIndex(c => t >= c.t0 && t < c.t1); if (i < 0) return;
  const ls = LINES[i], x = 110, y0 = 1490;
  g.save(); g.font = `600 40px ${F}`; const w = Math.max(...ls.map(l => g.measureText(l).width));
  g.fillStyle = 'rgba(244,241,234,0.9)'; g.beginPath(); g.roundRect(x - 40, y0 - 52, w + 70, ls.length * 54 + 34, 10); g.fill();
  g.fillStyle = PAL.neu.z; g.fillRect(x - 26, y0 - 34, 8, ls.length * 54 - 2);
  g.fillStyle = PAL.ink; ls.forEach((l, j) => g.fillText(l, x, y0 + j * 54)); g.restore();
}
// ---------------- camera: one page, panned down between scenes ----------------
const PAN = .45;
function sceneAt(t) { let k = 0; for (let i = 0; i < T.cuts.length; i++) if (t >= T.cuts[i]) k = i; return k; }
function drawScene(k, t) {
  const V = (cy, s, cx = 540) => makeView({ cx, cy, s });
  setLW(2.8);
  if (k === 0) sCover(t, V(1190, 8.4));
  else if (k === 1) sParts(t, null, V(1180, 9.5));
  else if (k === 2) sStep1(t, V(960, 13, 600));
  else if (k === 3) sStep2(t, V(860, 11));
  else if (k === 4) sStep3(t, V(900, 22, 560));
  else if (k === 5) sTotal(t, V(960, 8.5, 470));
  else if (k === 6) sDoDont(t, V(700, 9, 312), V(690, 9.5, 768));
  else sOutro(t, null);
}
export async function load(ctx) {
  g = ctx; TL = await (await fetch('timeline.json')).json(); for (const v of TL.voice) VO[v.id] = v; CUES = TL.cues;
  buildPaper(); buildCueLines();
  T.slam = .45; T.open = wAt('l02', 'bongkar') - .1; T.s1t = 3.2;
  T.s1 = VO.l03.t0 - .25; T.s2 = VO.l05.t0 - .3; T.s3 = VO.l07.t0 - .3; T.s4 = VO.l09.t0 - .3; T.s5 = VO.l10.t0 - .3; T.s6 = VO.l12.t0 - .3; T.s7 = VO.l13.t0 - .25;
  T.cuts = [0, T.s1, T.s2, T.s3, T.s4, T.s5, T.s6, T.s7];
  T.p0 = wAt('l03', 'HP') - .1; T.p1 = wAt('l04', 'tiga komponen'); T.p2 = T.p1 + .45; T.p3 = T.p1 + .9; T.sly = wAt('l04', 'terakhir');
  T.found = [T.p1, T.p2, T.p3];
  T.c0 = wAt('l05', 'Satu persen') - .1; T.cdt = .14; T.add1 = VO.l06.t0 - .25;
  T.add2 = wAt('l08', 'Tiga ratus') - .05; T.eq2 = wAt('l07', 'cash') + .6;
  T.snap = wAt('l09', 'Telat') + .15;
  T.done = [T.add1 + .6, T.add2 + .9, wAt('l09', 'tagihan') + .6];
  T.tot = wAt('l10', 'tiga koma') - .1; T.cash = wAt('l10', 'harga cash') - .5; T.pct = wAt('l10', 'Dua puluh') - .1;
  T.x0 = wAt('l11', 'bukan') - .05;
  const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  ev(0, 'thud'); ev(T.slam, 'slam'); ev(T.open, 'flap'); ev(T.open + .25, 'flap');
  T.cuts.slice(1).forEach(c => ev(c - PAN / 2, 'slide'));
  [T.p0, T.p1, T.p2, T.p3].forEach((p, i) => { ev(p, 'whoosh', { i }); ev(p + .5, 'land', { i }); });
  ev(T.sly, 'sting');
  for (let i = 0; i < 12; i++) ev(T.c0 + i * T.cdt + .2, 'coin', { i });
  ev(T.add1, 'ding', { k: 1 }); ev(T.eq2 + .25, 'ding', { k: 2 }); ev(T.add2 - .5, 'slidebox'); ev(T.add2 + .1, 'click');
  ev(T.snap, 'snap'); ev(wAt('l09', 'Dan biasanya') - .1, 'paper');
  ev(T.tot, 'ding', { k: 3 }); ev(T.pct, 'slam'); ev(T.x0, 'stamp');
  ev(T.s6 + .05, 'pop'); ev(T.s6 + .6, 'tickok'); ev(T.s7 + .1, 'pop'); ev(wAt('l13', 'tulis') - .1, 'pop'); ev(VO.l14.t0 + .1, 'pop'); ev(VO.l14.t0 + .6, 'whoosh', { i: 9 });
  ev(T.x0 - 1.2, 'cue', { name: 'silence' }); ev(T.x0, 'cue', { name: 'verdict' }); ev(T.s6, 'cue', { name: 'outro' });
  EV.sort((a, b) => a.t - b.t);
}
export function events() { return EV; }
export function render(t, q, texts = false) {
  TXT = texts ? [] : null; t = clamp(t, 0, TL.end - 1e-3);
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(paperC, 0, 0);
  const k = sceneAt(t), tc = T.cuts[k], p = k > 0 ? ss(seg(t, tc - PAN / 2, tc + PAN / 2)) : 1;
  // pan: the previous part of the page slides up and away as the next one comes up from below
  const k2 = k + 1 < T.cuts.length && t > T.cuts[k + 1] - PAN / 2 ? k + 1 : null;
  if (k2 !== null) {
    const u = ss(seg(t, T.cuts[k2] - PAN / 2, T.cuts[k2] + PAN / 2));
    const keep = TXT; TXT = null;
    g.save(); g.translate(0, -u * H); drawScene(k, t); g.restore();
    g.save(); g.translate(0, (1 - u) * H); drawScene(k2, t); g.restore(); TXT = keep;
  } else if (k > 0 && t < tc + PAN / 2) {
    const u = p, keep = TXT; TXT = null;
    g.save(); g.translate(0, -u * H); drawScene(k - 1, t); g.restore();
    g.save(); g.translate(0, (1 - u) * H); drawScene(k, t); g.restore(); TXT = keep;
  } else drawScene(k, t);
  header(t);
  if (!q || q.get('nosub') !== '1') subs(t);
  return TXT;
}
