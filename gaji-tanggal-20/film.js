// "Gaji Habis Tanggal 20" — Stick-figure Explainer, vertical 1080×1920, 60 fps. Channel "Uang & Kerja", episode 2.
// Rig, springs and hand-joining are adapted from the style's demo engine (Lemo-Opuscar, styles/stick-explainer/demo).
const W = 1080, H = 1920;
const C = { paper: '#F3F0EA', ink: '#24242C', mute: '#9C978C', tint: '#E2DDD2', sig: '#EB4A2A', soft: '#F4C3B4' };
const EN = 'Jost';
let g, TL, VO = {}, T = {}, A, B, TXT = null, CUES = [], EV = [];
export const DUR = () => TL.end;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a)), ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const bell = (t, a, b) => { const u = seg(t, a, b); return Math.sin(Math.PI * u) ** 2; };
const eo3 = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); }
const wordT = (id, f) => VO[id].t0 + (VO[id].t1 - VO[id].t0) * f;
const rpS = n => n >= 1e6 ? (n / 1e6).toString().replace('.', ',') + 'jt' : (n / 1e3) + 'rb';
const rpL = n => 'Rp' + Math.round(n).toLocaleString('de-DE');

// ---------------- paper ----------------
let paperC = null;
function paper() {
  if (!paperC) { paperC = document.createElement('canvas'); paperC.width = W; paperC.height = H; const x = paperC.getContext('2d'); x.fillStyle = C.paper; x.fillRect(0, 0, W, H);
    const id = x.getImageData(0, 0, W, H), d = id.data, r = mulberry(11); for (let i = 0; i < d.length; i += 4) { const n = (r() + r() - 1) * 3.2; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(id, 0, 0); }
  g.drawImage(paperC, 0, 0);
}
// ---------------- skeleton (figure height = 1) ----------------
const GEO = { thigh: .215, shin: .215, hipH: .42, spine: .285, sh: .065, upper: .18, fore: .155, headR: .112, stance: .09 };
function rest() { return { hx: 0, hy: 0, lean: 0, bend: 0, head: 0, la: -.56, lb: .24, ra: .56, rb: -.24, lfx: 0, lfy: 0, rfx: 0, rfy: 0, hdx: 0, hdy: 0 }; }
const KEYS = Object.keys(rest()), dirv = a => [Math.sin(a), Math.cos(a)];
function ik(H, F, L1, L2, side) {
  let dx = F[0] - H[0], dy = F[1] - H[1], d = Math.hypot(dx, dy); const m = (L1 + L2) * .9995;
  if (d > m) { F = [H[0] + dx / d * m, H[1] + dy / d * m]; dx = F[0] - H[0]; dy = F[1] - H[1]; d = m; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const px = H[0] + a * dx / d, py = H[1] + a * dy / d; let nx = -dy / d, ny = dx / d; if (nx * side < 0) { nx = -nx; ny = -ny; }
  return [[px + nx * h, py + ny * h], F];
}
function joints(f, p) {
  const S = f.S, bx = f.x, gy = f.gy;
  const Hp = [bx + p.hx * S, gy - (GEO.hipH - p.hy) * S], sd = dirv(Math.PI - p.lean);
  const N = [Hp[0] + sd[0] * GEO.spine * S, Hp[1] + sd[1] * GEO.spine * S], mid = [(Hp[0] + N[0]) / 2, (Hp[1] + N[1]) / 2], perp = [-sd[1], sd[0]];
  const Cc = [mid[0] + perp[0] * p.bend * S, mid[1] + perp[1] * p.bend * S], u = 1 - GEO.sh / GEO.spine;
  const Sh = [(1 - u) * (1 - u) * Hp[0] + 2 * (1 - u) * u * Cc[0] + u * u * N[0], (1 - u) * (1 - u) * Hp[1] + 2 * (1 - u) * u * Cc[1] + u * u * N[1]];
  const lag = clamp(p.hdx / GEO.headR * .9, -.35, .35), hd = dirv(Math.PI - (p.lean + p.head + lag)), hr = GEO.headR * S;
  const Hd = [N[0] + hd[0] * hr, N[1] + hd[1] * hr];
  const arm = (a, b) => { const e = dirv(a), E = [Sh[0] + e[0] * GEO.upper * S, Sh[1] + e[1] * GEO.upper * S]; const w = dirv(a + b); return [E, [E[0] + w[0] * GEO.fore * S, E[1] + w[1] * GEO.fore * S]]; };
  const st = GEO.stance, footL = [bx + (-st + p.lfx) * S, gy - p.lfy * S], footR = [bx + (st + p.rfx) * S, gy - p.rfy * S];
  return { Hp, N, Cc, Sh, Hd, aL: arm(p.la, p.lb), aR: arm(p.ra, p.rb), lL: ik(Hp, footL, GEO.thigh * S, GEO.shin * S, -1), lR: ik(Hp, footR, GEO.thigh * S, GEO.shin * S, 1) };
}
function ctrl(A, B, E, k) { const m = [(A[0] + E[0]) / 2, (A[1] + E[1]) / 2]; return [B[0] + (B[0] - m[0]) * k, B[1] + (B[1] - m[1]) * k]; }
const qpt = (A, Q, E, t) => { const s = 1 - t; return [s * s * A[0] + 2 * s * t * Q[0] + t * t * E[0], s * s * A[1] + 2 * s * t * Q[1] + t * t * E[1]]; };
const LWBASE = 7.5, HOSE_K = .8;
const lwOf = f => Math.max(3, LWBASE * clamp(Math.sqrt(f.S / 380), .6, 1.05) * (f.lwk ?? 1));
function figure(f, p) {
  const S = f.S, j = joints(f, p), col = f.col || C.ink, fill = f.fill || C.paper, lw = lwOf(f);
  g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = lw; g.beginPath();
  for (const [K, F] of [j.lL, j.lR]) { const Q = ctrl(j.Hp, K, F, HOSE_K); g.moveTo(j.Hp[0], j.Hp[1]); g.quadraticCurveTo(Q[0], Q[1], F[0], F[1]); }
  g.moveTo(j.Hp[0], j.Hp[1]); g.quadraticCurveTo(j.Cc[0], j.Cc[1], j.N[0], j.N[1]);
  [j.aL, j.aR].forEach(([El, Hn], ai) => { if (ai === 0 && f.noL || ai === 1 && f.noR) return; const Q = ctrl(j.Sh, El, Hn, HOSE_K); g.moveTo(j.Sh[0], j.Sh[1]); g.quadraticCurveTo(Q[0], Q[1], Hn[0], Hn[1]); });
  g.stroke();
  g.beginPath(); g.arc(j.Hd[0], j.Hd[1], GEO.headR * S, 0, 7); g.fillStyle = fill; g.fill(); g.lineWidth = lw * .95; g.stroke();
  g.restore(); return j;
}
// ---------------- springs ----------------
const SPR = { hx: [20, .8], hy: [24, .62], lean: [13, .6], bend: [12, .55], head: [9, .42], la: [13, .58], ra: [13, .58], lb: [9.5, .46], rb: [9.5, .46], lfx: [30, .85], lfy: [30, .85], rfx: [30, .85], rfy: [30, .85] };
const HEADSPR = [16, .38];
function simulate(n, target, t0, t1) {
  const dt = 1 / 1200, every = 5, out = [], st = [];
  for (let i = 0; i < n; i++) { const p = target(i, t0), v = {}; for (const k in p) v[k] = 0; st.push({ p: { ...p }, v, hp: null, hv: [0, 0] }); }
  const rigidHead = p => { const hy = GEO.hipH - p.hy, s = GEO.spine, r = GEO.headR; return [p.hx + Math.sin(p.lean) * s + Math.sin(p.lean + p.head) * r, hy + Math.cos(p.lean) * s + Math.cos(p.lean + p.head) * r]; };
  let step = 0;
  for (let t = t0; t <= t1 + 1e-9; t += dt, step++) {
    if (step % every === 0) out.push(st.map(s => ({ ...s.p })));
    for (let i = 0; i < n; i++) {
      const s = st[i], tg = target(i, t);
      for (const k in SPR) { const [w, z] = SPR[k]; const a = w * w * (tg[k] - s.p[k]) - 2 * z * w * s.v[k]; s.v[k] += a * dt; s.p[k] += s.v[k] * dt; }
      const R = rigidHead(s.p); if (!s.hp) s.hp = [...R]; const [w, z] = HEADSPR;
      for (let q = 0; q < 2; q++) { const a = w * w * (R[q] - s.hp[q]) - 2 * z * w * s.hv[q]; s.hv[q] += a * dt; s.hp[q] += s.hv[q] * dt; }
      s.p.hdx = clamp(s.hp[0] - R[0], -.03, .03); s.p.hdy = clamp(s.hp[1] - R[1], -.03, .03);
    }
  }
  return { t0, rate: 240, frames: out, at(t) { const f = (t - this.t0) * this.rate, i = clamp(Math.floor(f), 0, this.frames.length - 2), u = clamp(f - i); const A = this.frames[i], B = this.frames[i + 1]; return A.map((p, k) => { const q = {}; for (const key of KEYS) q[key] = lerp(p[key], B[k][key], u); return q; }); } };
}
const UP = { la: -2.25, lb: -.5, ra: 2.25, rb: .5 };
function popS(tau, w = 17, z = .45) { if (tau <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + z * w / wd * Math.sin(wd * tau)); }
const L2D = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function elbow(Sh, Hn, L1, L2) {
  let dx = Hn[0] - Sh[0], dy = Hn[1] - Sh[1], d = Math.hypot(dx, dy) || 1e-6;
  if (d >= L1 + L2) return [Sh[0] + dx / d * L1 * d / (L1 + L2), Sh[1] + dy / d * L1 * d / (L1 + L2)];
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)); let nx = -dy / d, ny = dx / d; if (ny < 0) { nx = -nx; ny = -ny; }
  return [Sh[0] + a * dx / d + nx * h, Sh[1] + a * dy / d + ny * h];
}
const quadPts = (A, Q, E, n = 16) => { const o = []; for (let i = 0; i <= n; i++) o.push(qpt(A, Q, E, i / n)); return o; };
const polyLen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
function strokePoly(P, upto) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); let L = 0; for (let i = 1; i < P.length; i++) { const s = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (L + s >= upto) { const u = (upto - L) / s; g.lineTo(lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)); break; } g.lineTo(P[i][0], P[i][1]); L += s; } g.stroke(); }

// ---------------- text (left-aligned, slides up while fading in) ----------------
function text(s, x, y, { size = 28, w = 500, col = C.ink, align = 'left', track = 0, a = 1, rec = true } = {}) {
  if (a <= 0) return 0;
  g.save(); g.globalAlpha = clamp(a); g.font = `${w} ${size}px ${EN}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.letterSpacing = track + 'px'; g.fillText(s, x, y);
  const m = g.measureText(s).width;
  if (TXT && rec && a > .99) { const x0 = align === 'left' ? x : align === 'right' ? x - m : x - m / 2; TXT.push({ id: s, text: s, x0, y0: y - size * .8, x1: x0 + m, y1: y + size * .25 }); }
  g.restore(); return m;
}
const tw = (s, size, w = 600, track = 0) => { g.save(); g.font = `${w} ${size}px ${EN}`; g.letterSpacing = track + 'px'; const m = g.measureText(s).width; g.restore(); return m; };
const M = 84;                     // left margin
function rise(t, t0, t1 = 99, dy = 18) { const a = eo3(seg(t, t0, t0 + .4)) * (1 - ss(seg(t, t1, t1 + .3))); return { a, d: dy * (1 - eo3(seg(t, t0, t0 + .4))) }; }

// ---------------- rows ----------------
const NAMES = ['KAMU', 'KOS', 'CICILAN', 'MAKAN', 'TRANSPORT', 'JAJAN', 'LANGGANAN'];
const AMT_A = [0, 1500000, 1000000, 1200000, 500000, 500000, 300000];
const NAMES_B = ['KAMU', 'TABUNGAN', 'KOS', 'CICILAN', 'MAKAN', 'TRANSPORT', 'JAJAN', 'LANGGANAN'];
const AMT_B = [0, 500000, 1500000, 1000000, 1200000, 500000, 250000, 50000];
function buildRows() {
  const v = id => VO[id];
  T.hook = [0, v('l01').t1 + .2];
  // row A: the chain that eats the salary
  const a0 = wordT('l02', .42), span = v('l02').t1 + .25 - a0, fr = [0, .3, .52, .7, .84, .95];
  A = { gy: 1170, S: 285, xs: [112, 252, 392, 532, 672, 812, 952], names: NAMES, amt: AMT_A,
    appear: [0.08, ...fr.map(f => a0 + f * span)], clasp: [], pulse: [] };
  A.clasp = A.appear.slice(1).map(x => x + .38);
  A.pulse = [wordT('l03', .1) - .35, wordT('l03', .12), wordT('l03', .47), wordT('l03', .8), wordT('l04', .1), wordT('l04', .44), wordT('l04', .78)];
  A.lift = () => 1e9;
  T.slump = wordT('l05', .52); T.grey = v('l06').t0 + .2; T.zero = wordT('l05', .05);
  // row B: savings first
  const b0 = v('l08').t0 - .25, bspan = wordT('l08', .26) - b0, frb = [0, .25, .45, .62, .78, .9];
  B = { gy: 1622, S: 236, xs: [100, 226, 352, 478, 604, 730, 856, 982], names: NAMES_B, amt: AMT_B,
    appear: [v('l07').t0 - .35, wordT('l07', .42), ...frb.map(f => b0 + f * bspan)], clasp: [], pulse: [] };
  B.clasp = B.appear.slice(1).map(x => x + .32);
  B.pulse = [wordT('l07', .7) - .3, wordT('l07', .86), wordT('l08', .3), wordT('l08', .35), wordT('l08', .4), wordT('l08', .45), wordT('l08', .62), wordT('l08', .92)];
  T.lift = v('l09').t0 + .25; B.lift = k => T.lift + .06 * (k - 1);
  for (const R of [A, B]) { R.lineY = R.gy + 34; R.linkX = k => (R.xs[k - 1] + R.xs[k]) / 2; }
}
function rowTarget(R, isA) {
  return (i, t) => {
    const p = rest(), ph = i * 1.93 + .4;
    p.hx += .004 * Math.sin(t * 1.25 + ph); p.lean += .01 * Math.sin(t * 1.05 + ph * 1.3); p.hy += .004 * (.5 + .5 * Math.sin(t * 2.1 + ph)); p.la -= .03 * Math.sin(t * 1.5 + ph); p.ra += .03 * Math.sin(t * 1.5 + ph + .7);
    // a new figure first looks left at the one it will take by the hand
    if (i >= 1) { const c = R.clasp[i - 1], L = ss(seg(t, R.appear[i] + .06, R.appear[i] + .25)) * (1 - ss(seg(t, c + .15, c + .5))); p.head -= .18 * L; p.lean -= .04 * L; }
    // clasp: pull back first, then a tug toward each other
    for (let k = 1; k < R.xs.length; k++) { let dir = 0; if (i === k - 1) dir = 1; else if (i === k) dir = -1; else continue; const c = R.clasp[k - 1];
      p.lean -= dir * .035 * bell(t, c - .38, c - .18); const tug = bell(t, c - .04, c + .4); p.lean += dir * .07 * tug; p.hy += .006 * tug; }
    // nod as the money reaches you
    if (i >= 1) { const tp = R.pulse[i]; p.hy += .02 * bell(t, tp - .03, tp + .24); p.head += .06 * bell(t, tp - .03, tp + .3); }
    if (isA && i === 0) {   // "you": slumped in the hook, slumped again when nothing is left
      const s1 = 1 - ss(seg(t, T.hook[1] - .4, T.hook[1])), s2 = ss(seg(t, T.slump - .15, T.slump + .3)) * (1 - ss(seg(t, VO.l07.t0, VO.l07.t0 + .5))), s = Math.max(s1, s2);
      p.hy += .035 * s; p.head += .32 * s; p.lean += .06 * s; p.la = lerp(p.la, -.18, s); p.lb = lerp(p.lb, .05, s);
    }
    if (!isA) {
      if (i === 1) { const h = Math.sin(Math.PI * seg(t, R.pulse[1] + .02, R.pulse[1] + .26)); if (h > 0) { p.lfy = p.rfy = .05 * h; p.hy -= .05 * h; } }
      const lk = Math.min(R.xs.length - 1, Math.max(1, i)), lt = R.lift(lk); p.hy += .03 * bell(t, lt - .2, lt + .04);
      if (i === 0 && t >= R.lift(1) - .02) { p.la = UP.la; p.lb = UP.lb; p.lean = -.015; }
      if (i === R.xs.length - 1 && t >= R.lift(R.xs.length - 1) - .02) { p.ra = UP.ra; p.rb = UP.rb; p.lean = .015; }
    }
    return p;
  };
}
function linkGeo(R, k, t, J, sc) {
  const c = R.clasp[k - 1], S = R.S, Aj = J[k - 1], Bj = J[k];
  let r = seg(t, c - .3, c); r = r < .3 ? -.10 * Math.sin(Math.PI * r / .3) : ss((r - .3) / .7);
  const lift = popS(t - R.lift(k), 15, .5), tc = t - c, bounce = tc > 0 ? .045 * Math.exp(-tc * 6) * Math.sin(tc * 21) : 0;
  const Pc = [(Aj.Sh[0] + Bj.Sh[0]) / 2, (Aj.Sh[1] + Bj.Sh[1]) / 2 + (lerp(.17, -.085, lift) + bounce) * S];
  const hi = L2D(Aj.aR[1], Pc, r), hj = L2D(Bj.aL[1], Pc, r);
  const Ei = elbow(Aj.Sh, hi, GEO.upper * S * sc[k - 1], GEO.fore * S * sc[k - 1]), Ej = elbow(Bj.Sh, hj, GEO.upper * S * sc[k], GEO.fore * S * sc[k]);
  let Qi = ctrl(Aj.Sh, Ei, hi, HOSE_K), Qj = ctrl(Bj.Sh, Ej, hj, HOSE_K);
  const jw = r >= 1 ? ss(seg(t, c, c + .14)) : 0;
  if (jw > 0) { let d = [Qj[0] - Qi[0], Qj[1] - Qi[1]], l = Math.hypot(d[0], d[1]) || 1; d = [d[0] / l, d[1] / l]; const li = Math.hypot(Pc[0] - Qi[0], Pc[1] - Qi[1]), lj = Math.hypot(Qj[0] - Pc[0], Qj[1] - Pc[1]); Qi = L2D(Qi, [Pc[0] - d[0] * li, Pc[1] - d[1] * li], jw); Qj = L2D(Qj, [Pc[0] + d[0] * lj, Pc[1] + d[1] * lj], jw); }
  return { Si: Aj.Sh, Qi, hi, Sj: Bj.Sh, Qj, hj, Pc, joined: r >= 1 };
}
// draw one row: ground line, nodes, links, money run, figures, labels
function drawRow(R, SIM, t, isA) {
  const n = R.xs.length; if (t < R.appear[0] - .3) return;
  const grey = isA ? ss(seg(t, T.grey, T.grey + .6)) : 0;
  const ink = mix(C.ink, C.mute, grey), sig = mix(C.sig, C.soft, grey);
  const P = SIM.at(t), lx0 = R.xs[0] - 70, lx1 = R.xs[n - 1] + 70, ld = eo3(seg(t, R.appear[0] - .3, R.appear[0] + .5));
  g.save(); g.lineCap = 'round'; g.strokeStyle = C.tint; g.lineWidth = 6; g.beginPath(); g.moveTo(lx0, R.lineY); g.lineTo(lerp(lx0, lx1, ld), R.lineY); g.stroke(); g.restore();
  const sc = R.xs.map((_, i) => popS(t - R.appear[i]));
  const reached = i => i >= 1 && t >= R.pulse[i];
  const colOf = i => i === 0 ? sig : (!isA && i === 1 ? mix(ink, sig, ss(seg(t, R.pulse[1] - .02, R.pulse[1] + .1))) : ink);
  const filOf = i => i === 0 ? sig : (!isA && i === 1 ? mix(C.paper, sig, ss(seg(t, R.pulse[1] - .02, R.pulse[1] + .1))) : C.paper);
  const F = R.xs.map((x, i) => ({ x, gy: R.gy, S: R.S * sc[i], col: colOf(i), fill: filOf(i), lwk: clamp(sc[i] * 1.6) }));
  const J = F.map((f, i) => sc[i] > .01 ? joints(f, P[i]) : null);
  // nodes under each figure fill when the money arrives
  for (let i = 1; i < n; i++) { if (sc[i] <= .01) continue; const on = ss(seg(t, R.pulse[i] - .02, R.pulse[i] + .1)), pop = bell(t, R.pulse[i] - .02, R.pulse[i] + .3);
    g.beginPath(); g.arc(R.xs[i], R.lineY, (8 + 4 * pop) * Math.min(1, sc[i]), 0, 7); g.fillStyle = mix(C.tint, sig, on); g.fill(); }
  // links behind the figures
  const links = [];
  for (let k = 1; k < n; k++) { const c = R.clasp[k - 1]; if (t < c - .3 || !J[k - 1] || !J[k]) continue; const L = linkGeo(R, k, t, J, sc); links.push([k, L]);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = colOf(k - 1); g.lineWidth = lwOf(F[k - 1]); g.beginPath(); g.moveTo(L.Si[0], L.Si[1]); g.quadraticCurveTo(L.Qi[0], L.Qi[1], L.hi[0], L.hi[1]); g.stroke();
    g.strokeStyle = colOf(k); g.lineWidth = lwOf(F[k]); g.beginPath(); g.moveTo(L.hj[0], L.hj[1]); g.quadraticCurveTo(L.Qj[0], L.Qj[1], L.Sj[0], L.Sj[1]); g.stroke(); g.restore(); }
  // the money runs along the joined arms (round front, like liquid in a hose)
  for (const [k, L] of links) { const f = seg(t, R.pulse[k - 1], R.pulse[k]); if (f <= 0 || !L.joined) continue;
    const Pp = quadPts(L.Si, L.Qi, L.hi).concat(quadPts(L.hj, L.Qj, L.Sj).slice(1)), len = polyLen(Pp);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = sig; g.lineWidth = lwOf(F[k]) + .6; strokePoly(Pp, f * len); g.restore(); }
  for (let i = 0; i < n; i++) { if (!J[i]) continue; const noL = i >= 1 && t >= R.clasp[i - 1] - .3 && !!J[i - 1], noR = i <= n - 2 && t >= R.clasp[i] - .3 && !!J[i + 1]; figure({ ...F[i], noL, noR }, P[i]); }
  // labels under the line: name, then the amount when the money arrives
  for (let i = 0; i < n; i++) { if (sc[i] <= .3) continue; const na = ss(seg(t, R.appear[i] + .15, R.appear[i] + .45));
    text(R.names[i], R.xs[i], R.lineY + 44, { size: isA ? 20 : 18, w: 600, col: i === 0 ? sig : mix(C.mute, C.mute, 0), align: 'center', track: 1.5, a: na * (1 - .4 * grey) });
    if (i >= 1) { const aa = eo3(seg(t, R.pulse[i], R.pulse[i] + .3)); const reduced = !isA && (i === 6 || i === 7);
      text(rpS(R.amt[i]), R.xs[i], R.lineY + 82 + 8 * (1 - aa), { size: isA ? 30 : 27, w: 600, col: reduced ? sig : ink, align: 'center', a: aa }); } }
  // row tag
  const tag = isA ? 'SEBELUM' : 'SESUDAH', ta = isA ? ss(seg(t, T.grey, T.grey + .4)) : ss(seg(t, VO.l07.t0, VO.l07.t0 + .4));
  text(tag, M, R.gy - R.S - 46, { size: 20, w: 600, col: isA ? C.mute : C.sig, track: 3, a: ta });
}

// ---------------- screen type ----------------
function drawType(t) {
  const v = id => VO[id];
  text('UANG & KERJA  ·  EP. 02', M, 132, { size: 20, w: 500, col: C.mute, track: 3, a: 1 });
  // hook: big, from the first frame
  { const r1 = rise(t, -.2, T.hook[1] + .1, 22), r2 = rise(t, .1, T.hook[1] + .1, 30), pk = popS(t - .35, 16, .4);
    text('Tanggal 20,', M - 6, 330 - r1.d, { size: 124, w: 600, track: -3, a: r1.a });
    const w1 = text('saldo ', M - 6, 500 - r2.d, { size: 150, w: 600, track: -3, a: r2.a });
    g.save(); g.translate(M - 6 + w1, 500 - r2.d); g.scale(.6 + .4 * pk, .6 + .4 * pk); text('Rp0?', 0, 0, { size: 150, w: 700, track: -3, col: C.sig, a: r2.a * clamp(pk * 3), rec: false }); g.restore();
    if (TXT && t >= .5 && t < T.hook[1]) TXT.push({ id: 'Rp0?', text: 'Rp0?', x0: M + w1, y0: 380, x1: M + w1 + 330, y1: 540 }); }
  // counter (row A)
  const cA = rise(t, v('l02').t0, T.grey - .1, 20);
  if (cA.a > 0) {
    let left = 5000000; for (let i = 1; i < A.xs.length; i++) if (t >= A.pulse[i]) left -= A.amt[i];
    const zero = left <= 0, pk = zero ? popS(t - A.pulse[6], 16, .4) : 1;
    text(t < A.pulse[1] ? 'GAJI (CONTOH)' : 'SISA GAJI', M, 270 - cA.d, { size: 22, w: 600, col: C.mute, track: 3, a: cA.a });
    g.save(); g.translate(M - 6, 430 - cA.d); const s = zero ? .7 + .3 * pk : 1; g.scale(s, s); text(rpL(Math.max(0, left)), 0, 0, { size: 140, w: 600, track: -3, col: zero ? C.sig : C.ink, a: cA.a, rec: false }); g.restore();
    if (TXT && cA.a > .99) { const s0 = rpL(Math.max(0, left)); TXT.push({ id: s0, text: s0, x0: M, y0: 430 - 112, x1: M + tw(s0, 140, 600, -3), y1: 430 + 35, ...(left > 0 && left < 5000000 ? { pass: true } : {}) }); }
    const ka = rise(t, wordT('l05', .33), T.grey - .1, 14);
    text('Kamu sendiri?', M, 560 - ka.d, { size: 64, w: 600, track: -1, a: ka.a }); text('Nggak kebagian.', M, 640 - ka.d, { size: 64, w: 600, track: -1, col: C.sig, a: ka.a });
  }
  // the turn
  const tr = rise(t, v('l06').t0 + .1, v('l07').t0 + .5, 20);
  text('Bukan besar gajinya.', M, 330 - tr.d, { size: 86, w: 600, track: -2, col: C.mute, a: tr.a });
  text('Tapi urutannya.', M, 450 - tr.d, { size: 110, w: 600, track: -3, col: C.sig, a: rise(t, v('l06').t0 + .6, v('l07').t0 + .5, 20).a });
  // row B counter: savings first
  const cB = rise(t, v('l07').t0 + .7, v('l09').t0 - .1, 20);
  if (cB.a > 0) {
    text('BAYAR DIRIMU DULU', M, 270 - cB.d, { size: 22, w: 600, col: C.mute, track: 3, a: cB.a });
    text('Tabungan 10%', M, 380 - cB.d, { size: 86, w: 600, track: -2, a: cB.a });
    const sa = rise(t, B.pulse[1], v('l09').t0 - .1, 24); text('Rp500.000', M - 4, 520 - sa.d, { size: 130, w: 600, track: -3, col: C.sig, a: sa.a });
    const ra = rise(t, wordT('l08', .1), v('l09').t0 - .1, 14); text('sisanya baru dibagi: Rp4.500.000', M, 610 - ra.d, { size: 34, w: 500, col: C.mute, a: ra.a });
  }
  // verdict
  const vd = rise(t, v('l09').t0 + .05, v('l10').t0 + .1, 22);
  text('Tanggal 20:', M, 330 - vd.d, { size: 110, w: 600, track: -3, a: vd.a });
  text('tabungan masih', M, 450 - vd.d, { size: 86, w: 600, track: -2, a: rise(t, v('l09').t0 + .3, v('l10').t0 + .1, 22).a });
  text('Rp500.000', M - 4, 590 - vd.d, { size: 130, w: 600, track: -3, col: C.sig, a: rise(t, v('l09').t0 + .55, v('l10').t0 + .1, 26).a });
  // question + share
  const q = rise(t, v('l10').t0, v('l11').t0 - .05, 20);
  text('Gajimu biasanya', M, 330 - q.d, { size: 96, w: 600, track: -2, a: q.a }); text('habis tanggal berapa?', M, 440 - q.d, { size: 84, w: 600, track: -2, col: C.sig, a: q.a });
  text('TULIS DI KOMEN', M, 520 - q.d, { size: 24, w: 600, col: C.mute, track: 3, a: rise(t, v('l10').t0 + .45, v('l11').t0 - .05, 12).a });
  const sh = rise(t, v('l11').t0, 999, 22);
  const w1 = text('Kirim ke ', M, 350 - sh.d, { size: 110, w: 600, track: -3, a: sh.a }); text('@teman', M + w1, 350 - sh.d, { size: 110, w: 700, track: -3, col: C.sig, a: sh.a });
  text('yang bokek tanggal 20.', M, 460 - sh.d, { size: 80, w: 600, track: -2, a: rise(t, v('l11').t0 + .3, 999, 22).a });
  text('ANGKA CONTOH  ·  EDUKASI, BUKAN SARAN KEUANGAN', M, 560, { size: 18, w: 500, col: C.mute, track: 2, a: rise(t, v('l11').t0 + .8, 999, 8).a });
}
// ---------------- subtitles: bottom-left, accent bar, one line, no box ----------------
function buildCues() {
  g.save(); g.font = `500 40px ${EN}`; const maxW = W - M * 2 - 30;
  for (const v of TL.voice) {
    const ws = v.text.split(' '), chunks = []; let cur = '';
    for (const w of ws) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > maxW && cur) { chunks.push(cur); cur = w; } else cur = tt; }
    if (cur) chunks.push(cur);
    if (chunks.length > 1) {        // re-balance: same number of chunks, roughly equal length
      const n = chunks.length, target = v.text.length / n, out = []; let c2 = '';
      for (const w of ws) { const tt = c2 ? c2 + ' ' + w : w; if (tt.length > target * 1.08 && c2 && out.length < n - 1) { out.push(c2); c2 = w; } else c2 = tt; }
      if (c2) out.push(c2);
      if (out.every(c => g.measureText(c).width <= maxW)) chunks.splice(0, chunks.length, ...out);
    }
    const tot = chunks.reduce((a, c) => a + c.length, 0); let t = v.t0; chunks.forEach(c => { const d = (v.t1 - v.t0) * c.length / tot; CUES.push({ t0: t, t1: t + d, text: c }); t += d; });
  }
  g.restore();
  for (let i = 0; i < CUES.length; i++) { const nx = CUES[i + 1]; const want = Math.max(CUES[i].t1 + .5, CUES[i].t0 + 1.4); CUES[i].c1 = nx ? Math.min(want, nx.t0 - .02) : want; }
}
function drawSubs(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.c1); if (!c) return;
  const a = Math.min(seg(t, c.t0, c.t0 + .12), 1 - seg(t, c.c1 - .12, c.c1));
  g.save(); g.globalAlpha = a; g.fillStyle = C.sig; g.fillRect(M, 1794, 5, 52); g.restore();
  text(c.text, M + 24, 1834, { size: 40, w: 500, a, rec: false });
}
// ---------------- camera: a short push into "you" when nothing is left ----------------
function camK(t) { const v = VO; return 1 + .14 * ss(seg(t, T.slump - .2, T.slump + .6)) * (1 - ss(seg(t, v.l06.t0, v.l06.t0 + .7))); }

let SIMA, SIMB;
export async function load(ctx) {
  g = ctx; TL = await (await fetch('timeline.json')).json(); for (const v of TL.voice) VO[v.id] = v;
  buildRows(); buildCues();
  SIMA = simulate(A.xs.length, rowTarget(A, true), -1.5, TL.end + .5);
  SIMB = simulate(B.xs.length, rowTarget(B, false), -1.5, TL.end + .5);
  // sound events
  const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  ev(.35, 'slam');
  for (const R of [A, B]) {
    R.appear.forEach((a, i) => ev(a, 'pop', { i, pan: (R.xs[i] - 540) / 540 }));
    R.clasp.forEach((c, k) => { ev(c - .3, 'reach', { k: k + 1 }); ev(c, 'clasp', { k: k + 1, pan: (R.linkX(k + 1) - 540) / 540 }); });
    R.pulse.forEach((p, i) => { if (i >= 1) ev(p, 'node', { k: i, row: R === A ? 'A' : 'B', pan: (R.xs[i] - 540) / 540 }); });
  }
  ev(A.pulse[6], 'zero'); ev(T.slump, 'slump'); ev(VO.l06.t0 + .6, 'turn'); ev(B.pulse[1], 'save'); ev(T.lift, 'lift');
  ev(VO.l11.t0, 'share');
  ev(T.slump - .3, 'cue', { name: 'silence' }); ev(VO.l06.t0 + .6, 'cue', { name: 'turn' }); ev(VO.l07.t0, 'cue', { name: 'b' }); ev(T.lift, 'cue', { name: 'lift' });
  EV.sort((a, b) => a.t - b.t);
}
export function events() { return EV; }
export function render(t, q, texts = false) {
  TXT = texts ? [] : null; t = clamp(t, 0, TL.end - 1e-3);
  paper();
  const k = camK(t), cx = A.xs[0] + 40, cy = A.gy - A.S * .5;
  g.save(); g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
  drawRow(A, SIMA, t, true); drawRow(B, SIMB, t, false);
  g.restore();
  drawType(t);
  if (!q || q.get('nosub') !== '1') drawSubs(t);
  return TXT;
}
