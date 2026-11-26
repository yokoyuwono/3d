// Dari Peternakan ke Piring — Isometric Infographic, vertical 1080×1920.
// One world: farm board (top) → gate plate → six floating factory floors (zig-zag) → city board (bottom).
import { Iso, PAL, tri, pin, inset, cutLine, hatch, ring, iconGrid, person, haloText, clamp, lerp, seg, ss, eo, eio, back, hash, mix, hex, rgb, C30, S30, TAU, FONT } from './engine.js';

let W = 1080, H = 1920, TL, SEC = {}, VO = {};
export const DUR = () => TL.end;
export async function load(w, h) {
  W = w; H = h;
  TL = await (await fetch('timeline.json')).json();
  for (const s of TL.sections) SEC[s.id] = s;
  for (const v of TL.voice) VO[v.id] = v;
  buildCam();
}

// ---------------- palette (one hue per meaning) ----------------
const INK = '#2E2522', GROUND = '#F3EBDD';
const C = {
  plateTop: tri('#F8F1E3', .1, .14), plateBody: tri('#CFC8BA', .18, .2),
  steel: tri('#A7B2BD'), steelD: tri('#76828E'), belt: tri('#4E5560', .12, .2),
  cold: tri('#6FB2DD'), ice: tri('#CDE7F6', .3, .14),
  halal: tri('#2F9C8F'),
  mustard: PAL.mustard,
  grass: tri('#A9C76F'), soil: PAL.soil, wood: tri('#C89B66'),
  white: tri('#F5F2EB', .3, .16), cream: PAL.cream, stone: PAL.stone,
  roof: tri('#8E8578'), asphalt: '#BDB5A8',
};
// the subject: meat → mince → paste → sausage (raw) → cooked. This hue family is reserved for it.
const MEAT = '#E3786D', MINCE = '#E89585', PASTE = '#F0B0A0', RAW = '#E7958A', COOKED = '#B35A37', COLD_S = '#C27C66';

// ---------------- world layout ----------------
const ZG = 91;                                     // farm + gate level
const FL = [78, 65, 52, 39, 26, 13];                // factory floors (top surfaces)
const FLOORS = ['grind', 'mix', 'fill', 'oven', 'cool', 'pack'];
const FNAME = { grind: 'LT.1 · GILING', mix: 'LT.2 · CAMPUR', fill: 'LT.3 · ISI', oven: 'LT.4 · MASAK', cool: 'LT.5 · DINGIN', pack: 'LT.6 · KEMAS' };
const P = 5;                                      // plate half size
const LC = [-3.8, 3.8], RC = [3.8, -3.8];                   // left / right corner stations (screen left / right)
// direction of flow per floor: +1 = left → right, −1 = right → left (zig-zag down the tower)
const DIRF = { grind: -1, mix: 1, fill: -1, oven: 1, cool: -1, pack: 1 };
const FARM = { x0: -23.5, y0: -3, x1: -7.5, y1: 13 };
const CITY = { x0: -12, y0: -12, x1: 36, y1: 32 };
const TABLE = [15, 25.8], HOUSE = { x: 8.5, y: 26.5 };
const COLDST = { x: 9, y: -9, w: 8, d: 7 };
const DEST = [                                       // distribution: name, position, building kind
  { id: 'distributor', name: 'DISTRIBUTOR', x: 27, y: -6, kind: 'ware' },
  { id: 'super', name: 'SUPERMARKET', x: 28, y: 8, kind: 'super' },
  { id: 'mini', name: 'MINIMARKET', x: 19, y: 17, kind: 'mini' },
  { id: 'warung', name: 'WARUNG', x: 3, y: 15, kind: 'warung' },
  { id: 'resto', name: 'RESTORAN', x: 30, y: 21, kind: 'resto' },
  { id: 'online', name: 'TOKO ONLINE', x: 24, y: 27, kind: 'online' },
];

// ---------------- helpers ----------------
const S = id => SEC[id], V = id => VO[id];
const rnd = (i, k = 0) => hash(i * 13.37 + k * 7.71);
let TX = null;                                       // text registry for readcheck
function rec(id, text, x0, y0, x1, y1, pass) { if (TX) TX.push({ id, text, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1), ...(pass ? { pass: true } : {}) }); }
function wordT(id, frac) { const v = V(id); return v.t0 + (v.t1 - v.t0) * frac; }   // estimated time of a word inside a line

// capsule (sausage) as one flat three-tone item: screen-space stroke from a to b
function capsule(iso, a, b, r, col, o = {}) {
  const t3 = typeof col === 'string' ? tri(col, .22, .24) : col;
  const m = iso.w((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  iso.add(m[0] + m[1] + m[2] + (o.bias || 0), () => {
    const g = iso.g, A = iso.L(...a), B = iso.L(...b), k = iso.cam.k * iso.scale(), R = r * k;
    if (R < .3) return;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = iso.col(t3[2]); g.lineWidth = 2 * R; g.beginPath(); g.moveTo(A[0], A[1] + R * .12); g.lineTo(B[0], B[1] + R * .12); g.stroke();
    g.strokeStyle = iso.col(t3[1]); g.lineWidth = 1.7 * R; g.beginPath(); g.moveTo(A[0], A[1] - R * .05); g.lineTo(B[0], B[1] - R * .05); g.stroke();
    g.strokeStyle = iso.col(t3[0]); g.lineWidth = .7 * R; g.beginPath(); g.moveTo(A[0], A[1] - R * .45); g.lineTo(B[0], B[1] - R * .45); g.stroke();
    g.restore();
  }, o.layer ?? 1);
}
// a chain of linked sausages along a polyline (local), n links
function chain(iso, pts, n, r, col, o = {}) {
  let L = 0; const d = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); d.push(L); }
  const at = s => { s = clamp(s, 0, L); let i = 1; while (i < d.length - 1 && d[i] < s) i++; const f = (s - d[i - 1]) / (d[i] - d[i - 1] || 1); return pts[i - 1].map((v, q) => lerp(v, pts[i][q], f)); };
  const len = L / n;
  for (let i = 0; i < n; i++) capsule(iso, at(i * len + r * .45), at((i + 1) * len - r * .45), r, typeof col === 'function' ? col(i) : col, o);
}
// floating plate with strata (cream top over concrete), soft shadow, and an etched floor name on its front edge
function plate(iso, x0, y0, x1, y1, z, o = {}) {
  const th = o.th || 1.4;
  shadow(iso, x0, y0, x1, y1, z - th);
  iso.box(x0, y0, z - th, x1 - x0, y1 - y0, th - .35, o.body || C.plateBody, { cull: false, layer: -.5 });
  iso.box(x0, y0, z - .35, x1 - x0, y1 - y0, .35, o.top || C.plateTop, { cull: false, layer: -.5, bias: .01 });
  if (o.band) iso.box(x0 - .01, y0 - .01, z - th + .2, x1 - x0 + .02, y1 - y0 + .02, .22, o.band, { cull: false, layer: -.5, bias: .02 });
  if (o.name) iso.text3(o.name, x0 + .6, y1 + .02, z - th + .45, { plane: 'xz', size: .62, tri: [INK, INK, INK], face: INK, weight: 600, track: 6, bias: 3 });
}
function shadow(iso, x0, y0, x1, y1, z) {
  iso.add(-1e9, () => {
    const g = iso.g, pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => iso.P(p[0] + 1.2, p[1] + 1.2, z - 1.5));
    g.save(); g.filter = `blur(${Math.max(2, iso.cam.k * .6)}px)`; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = 'rgba(60,45,35,.13)'; g.fill(); g.restore();
  }, -1);
}
// axis-aligned box rotated about z (for diagonal conveyors)
function rbox(iso, cx, cy, z, len, wid, h, rot, t3, o = {}) { iso.push(cx, cy, z, rot); iso.box(-len / 2, -wid / 2, 0, len, wid, h, t3, o); iso.pop(); }
function conveyor(iso, a, b, z, t, o = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
  iso.push((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, rot);
  iso.box(-len / 2, -.65, .55, len, 1.3, .35, C.steel, { bias: -.5 });
  iso.box(-len / 2, -.55, .9, len, 1.1, .06, C.belt, { bias: -.4 });
  for (let i = 0; i < 3; i++) { const x = -len / 2 + .4 + i * (len - .8) / 2; iso.box(x - .12, -.55, 0, .24, .24, .55, C.steelD); iso.box(x - .12, .31, 0, .24, .24, .55, C.steelD); }
  iso.pop();
}
// one point along a floor's diagonal flow (u ∈ 0..1: entry corner → centre → exit corner)
function flow(f, u) { const d = DIRF[f], A = d > 0 ? LC : RC, B = d > 0 ? RC : LC; return [lerp(A[0], B[0], u), lerp(A[1], B[1], u)]; }
function floorZ(f) { return FL[FLOORS.indexOf(f)]; }

// ---------------- people & animals ----------------
function cow(iso, x, y, z, s, t, face = 1) {
  const b = Math.abs(Math.sin(t * 5 + x)) * .12;
  iso.push(x, y, z + b, face > 0 ? 0 : Math.PI, s);
  iso.box(-1.1, -.5, .7, 2.2, 1, 1, C.white);                          // body
  iso.box(-.4, -.51, 1.2, .7, 1.02, .5, tri('#3B3330'), { bias: .01 });  // patch
  iso.box(1.05, -.4, 1.1, .7, .8, .8, C.white);                         // head
  iso.box(1.65, -.32, 1.12, .2, .64, .35, tri('#E9B9A8'));              // muzzle
  for (const [lx, ly] of [[-.9, -.45], [.7, -.45], [-.9, .25], [.7, .25]]) iso.box(lx, ly, 0, .22, .2, .7, tri('#4A3F3A'));
  iso.pop();
}
function chicken(iso, x, y, z, t, i) {
  const hop = Math.max(0, Math.sin(t * 7 + i * 1.7)) * .25;
  iso.push(x, y, z + hop, i % 2 ? .4 : -.6, .8);
  iso.box(-.35, -.25, .25, .7, .5, .45, C.white);
  iso.box(.25, -.15, .55, .3, .3, .35, C.white);
  iso.box(.3, -.06, .9, .18, .12, .14, tri('#D24A3A'));                // comb (tiny accent)
  iso.box(.55, -.05, .62, .14, .1, .08, PAL.mustard);
  iso.box(-.05, -.08, 0, .08, .08, .25, PAL.mustard); iso.box(-.05, .02, 0, .08, .08, .25, PAL.mustard);
  iso.pop();
}
function human(iso, x, y, z, o = {}) { iso.bill(x, y, z, g => person(g, { h: 2.1, ...o }), { r: 3 }); }

// ---------------- vehicles ----------------
function truck(iso, x, y, z, rot, o = {}) {
  iso.push(x, y, z, rot, o.s || 1);
  iso.box(-3.1, -1, .55, 4.3, 2, 2.1, C.white, { bias: .2 });          // reefer box
  iso.box(-3.1, .99, 1.2, 4.3, .03, .45, C.cold, { bias: .3 });         // cold stripe (+y side)
  iso.box(-3.1, -1.02, 1.2, 4.3, .03, .45, C.cold, { bias: .3 });
  iso.box(-3.4, -.6, 2.15, .5, 1.2, .5, C.steel, { bias: .25 });        // fridge unit
  iso.box(1.3, -1, .55, 1.6, 2, 1.65, C.cold, { bias: .2 });           // cab
  iso.box(2.85, -.85, 1.35, .06, 1.7, .6, tri('#DDEFF8', .2, .1), { bias: .25 });
  for (const wx of [-2.3, -.9, 2.1]) for (const wy of [-1.08, .82]) iso.cyl(wx, wy, .45, .45, .26, tri('#3A3434'), { axis: 'y', n: 10, bias: .1 });
  if (o.load) o.load(iso);
  iso.pop();
}
function scooter(iso, x, y, z, rot) {
  iso.push(x, y, z, rot);
  iso.cyl(-.7, -.1, .3, .3, .2, tri('#3A3434'), { axis: 'y', n: 10 }); iso.cyl(.7, -.1, .3, .3, .2, tri('#3A3434'), { axis: 'y', n: 10 });
  iso.box(-.8, -.25, .35, 1.6, .5, .35, C.halal);
  iso.box(-.9, -.4, .7, .7, .8, .7, PAL.mustard);                      // delivery box
  iso.pop();
  human(iso, x, y, z + .5, { body: C.halal[1], hat: 'cap', hatColor: PAL.mustard[1], arm: 1.2 });
}

// ---------------- buildings ----------------
function building(iso, x, y, w, d, h, t3, roofT, o = {}) {
  iso.box(x, y, 0, w, d, h, t3);
  if (o.gable) iso.roof(x, y, h, w, d, o.gable, roofT, { ridge: o.ridge || 'x', over: .2 });
  else iso.box(x - .15, y - .15, h, w + .3, d + .3, .3, roofT);
  // windows on +y face
  if (o.win) for (let i = 0; i < o.win; i++) iso.box(x + .6 + i * (w - 1.2) / Math.max(1, o.win - 1) - .3, y + d - .02, h * .45, .6, .05, h * .3, tri('#CFE3EE', .2, .1), { bias: .1 });
  if (o.sign) { iso.box(x + .4, y + d + .05, h + .1, w - .8, .12, .9, o.signT || C.cream, { bias: .2 }); iso.text3(o.sign, x + .6, y + d + .19, h + .3, { plane: 'xz', size: .62, tri: [INK, INK, INK], face: INK, weight: 700, track: 4, bias: .4 }); }
  if (o.awning) iso.box(x, y + d, h * .62, w, 1.1, .18, o.awning, { bias: .3 });
}

// ---------------- the world ----------------
function drawWorld(iso, t) {
  const levels = ['city', ...FLOORS.slice().reverse(), 'gate'];
  const zOf = l => l === 'city' ? 0 : l === 'gate' ? ZG : floorZ(l);
  const above = { city: 'pack', pack: 'cool', cool: 'oven', oven: 'fill', fill: 'mix', mix: 'grind', grind: 'gate' };
  for (const l of levels) iso.sub(() => {
    if (l === 'city') { drawCity(iso, t); delivery(iso, t); mother(iso, t); }
    else if (l === 'gate') { drawGate(iso, t); drawFarm(iso, t); farmTruck(iso, t); }
    else drawFloor(iso, t, l);
    // core column segment + the chute that arrives from the level above
    const up = above[l]; if (!up) return;
    const z0 = zOf(l), z1 = zOf(up) - 1.4;
    iso.box(-P + .3, -P + .3, z0, .7, .7, z1 - z0, C.steelD, { cull: false, bias: -4 });
    const c = up === 'gate' ? RC : flow(up, 1);
    iso.cyl(c[0], c[1], z0 + .1, .55, z1 - z0 - .1, C.steel, { n: 14, bias: -.3 });
    iso.cyl(c[0], c[1], zOf(up) - .02, .75, .25, C.steelD, { n: 14, bias: 50 });
  });
}
function farmTruck(iso, t) {
  if (t < S('farm').t0 - .5 || t > S('grind').t0 + 1) return;
  const [x, y, r] = pathAt(TRUCK_PATH(), truckU(t));
  const back2 = seg(t, wordT('a03_2', .6) + 1.2, S('gate').t1);
  truck(iso, x - back2 * 2, y, ZG, r);
}

// FARM BOARD (z = ZG)
function drawFarm(iso, t) {
  const { x0, y0, x1, y1 } = FARM;
  plate(iso, x0, y0, x1, y1, ZG, { body: C.soil, top: C.grass, th: 2.6, band: tri('#7A5634'), name: 'PETERNAKAN' });
  // fences + pasture
  for (let i = 0; i <= 9; i++) iso.box(x0 + 1 + i * 1.1, y0 + 1, ZG, .14, .14, .7, C.wood);
  iso.box(x0 + 1, y0 + 1.03, ZG + .45, 10, .08, .12, C.wood);
  for (let i = 0; i <= 6; i++) iso.box(x0 + 1, y0 + 1 + i * 1.3, ZG, .14, .14, .7, C.wood);
  iso.box(x0 + 1.03, y0 + 1, ZG + .45, .08, 8, .12, C.wood);
  // barn
  building(iso, x0 + 2, y0 + 10.5, 4.2, 3.2, 2.6, tri('#E7D9BF'), C.roof, { gable: 1.6, ridge: 'y' });
  // cows + chickens
  const ft = t;
  cow(iso, x0 + 4.5, y0 + 4, ZG, .9, ft, 1); cow(iso, x0 + 8, y0 + 3, ZG, .9, ft + 1, -1); cow(iso, x0 + 7.5, y0 + 6.6, ZG, .9, ft + 2, 1);
  for (let i = 0; i < 6; i++) chicken(iso, x0 + 8.6 + (i % 3) * .9, y0 + 9.6 + ((i / 3) | 0) * .9, ZG, ft, i);
  // farmer
  human(iso, x0 + 5.6, y0 + 8.2, ZG, { body: PAL.mustard[1], hat: 'straw', arm: .5 + Math.sin(t * 3) * .2 });
  // halal slaughterhouse (white, teal badge) at the right edge
  const sx = x1 - 5.2, sy = y0 + 1.2;
  building(iso, sx, sy, 4.4, 4.2, 3.0, C.white, C.stone, { win: 3 });
  iso.box(sx + 1.2, sy + 4.22, 3.05, 2, .1, 1.1, C.halal, { bias: .2 });
  iso.text3('HALAL', sx + 1.35, sy + 4.34, 3.3, { plane: 'xz', size: .62, tri: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], face: '#FFFFFF', weight: 700, track: 3, bias: .5 });
  // vet near the door
  human(iso, sx + 2.2, sy + 5.4, ZG, { body: '#F5F2EB', hair: '#3B2D27', arm: 1.0, apron: C.halal[1] });
  // road from the slaughterhouse to the bridge
  iso.flat([[sx + 4.4, y0 + 5.6], [x1, y0 + 5.6], [x1, y0 + 7.2], [sx + 4.4, y0 + 7.2]], ZG + .01, C.asphalt);
  iso.flat([[sx - 1, y0 + 5.6], [sx + 4.4, y0 + 5.6], [sx + 4.4, y0 + 7.2], [sx - 1, y0 + 7.2]], ZG + .01, C.asphalt);
  // bridge to the gate plate
  iso.box(x1, y0 + 5.4, ZG - .8, (-P - x1), 2, .8, C.plateBody, { cull: false });
  iso.flat([[x1, y0 + 5.6], [-P, y0 + 5.6], [-P, y0 + 7.2], [x1, y0 + 7.2]], ZG + .01, C.asphalt, { bias: 2 });
}

// TRUCK path on the farm level: slaughterhouse door → bridge → gate dock
const TRUCK_PATH = () => [[FARM.x1 - 4.2, FARM.y0 + 6.4], [FARM.x1 - 2, FARM.y0 + 6.4], [-P + .5, FARM.y0 + 6.4], [-2.6, FARM.y0 + 6.4]];
function pathAt(pts, u) {
  let L = 0; const d = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(L); }
  const s = clamp(u) * L; let i = 1; while (i < d.length - 1 && d[i] < s) i++;
  const f = (s - d[i - 1]) / (d[i] - d[i - 1] || 1), a = pts[i - 1], b = pts[i];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function truckU(t) { const s = S('truck'); return eio(seg(t, s.t0 + .2, s.t1 + .6)); }

// TOWER: gate plate + six floors + chutes
function drawTower(iso, t) {
  // core column + lift rails at the back corner (ties the stack together)
  iso.box(-P + .2, -P + .2, 0, .9, .9, ZG - 1.4, C.steelD, { cull: false, bias: -4 });
  drawGate(iso, t);
  FLOORS.forEach(f => drawFloor(iso, t, f));
  // chutes between plates (alternate corners)
  const seq = ['gate', ...FLOORS, 'city'];
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1], za = a === 'gate' ? ZG : floorZ(a), zb = b === 'city' ? 0 : floorZ(b);
    const c = a === 'gate' ? RC : flow(a, 1);
    iso.cyl(c[0], c[1], zb + .1, .75, za - zb - 1.4, C.steel, { n: 14, bias: -.3 });
    iso.cyl(c[0], c[1], za - .02, .95, .25, C.steelD, { n: 14 });
  }
}

function drawGate(iso, t) {
  plate(iso, -P, -P, P, P, ZG, { name: 'GERBANG MUTU', band: C.halal });
  const s = S('gate');
  // gate arch with scanner
  iso.box(-1.6, 1.6, ZG, .5, .5, 3.2, C.steel); iso.box(1.1, -1.9, ZG, .5, .5, 3.2, C.steel);
  rbox(iso, -.05, -.05, ZG + 3.0, 4.9, .6, .45, -Math.PI / 4, C.steelD);
  // QC booth + officer
  building(iso, 2.2, 2.4, 2.6, 2.2, 2.2, C.white, C.halal, { win: 2 });
  const chk = seg(t, V('a03_1').t0, V('a03_1').t1);
  human(iso, 1.5, 3.6, ZG, { body: '#F5F2EB', hat: 'cap', hatColor: C.halal[1], arm: .6 + Math.sin(chk * 14) * .4, apron: C.halal[1] });
  // scale platform
  iso.box(-3.2, -1.4, ZG, 2.2, 2.2, .25, C.steel); iso.box(-3.15, -1.35, ZG + .25, 2.1, 2.1, .05, C.belt);
  // crates: unloaded from the truck after it parks
  const park = s.t0 + .3, un = seg(t, park + .2, park + 1.2);
  const pass = V('a03_2').t0 + .15, fail = wordT('a03_2', .62);
  const crates = [[-2.8, -1, 0], [-2.2, -.4, 1], [-3.0, .6, 2]];
  if (t > park && t < S('grind').t0 + 1.4) for (const [cx, cy, i] of crates) {
    let x = cx, y = cy, z = ZG + .3 + (1 - back(clamp(un * 3 - i * .7))) * 2;
    let col = MEAT;
    if (i === 0) {                                      // the good crate rides into the chute
      const g1 = eio(seg(t, pass + .1, pass + 1.0)); x = lerp(cx, RC[0], g1); y = lerp(cy, RC[1], g1);
      const dr = seg(t, S('grind').t0 + .05, S('grind').t0 + .5); z -= dr * 3; if (dr >= 1) continue;
    }
    if (i === 2) {                                      // the failed crate goes back onto the truck
      const b1 = eio(seg(t, fail + .15, fail + 1.0)); x = lerp(cx, -5.8, b1); y = lerp(cy, 4.2, b1); if (t > fail + 1.3) continue;
    }
    iso.box(x - .5, y - .5, z, 1, 1, .7, C.cold, { bias: .3 });
    iso.box(x - .38, y - .38, z + .7, .76, .76, .14, MEAT === col ? tri(MEAT) : tri(col), { bias: .35 });
  }
}

// ---------------- the six floors ----------------
function drawFloor(iso, t, f) {
  const Z = floorZ(f), s = S(f), on = t > s.t0 - 2 && t < s.t1 + 2;     // dynamic content only near its section
  const band = { grind: C.cold, mix: C.mustard, fill: tri(PASTE), oven: tri('#C98A5B'), cool: C.cold, pack: C.mustard }[f];
  plate(iso, -P, -P, P, P, Z, { band, name: FNAME[f] });
  const a = flow(f, .08), b = flow(f, .92);
  ({ grind: floorGrind, mix: floorMix, fill: floorFill, oven: floorOven, cool: floorCool, pack: floorPack })[f](iso, t, Z, s, on, a, b);
}
const prog = (t, s) => seg(t, s.t0 + .3, s.t1 - .2);

function floorGrind(iso, t, Z, s, on, a, b) {
  conveyor(iso, a, [0, 0], Z, t); conveyor(iso, [0, 0], b, Z, t);
  // grinder: body + funnel + spout
  const run = on && t > s.v0 && t < s.v1 + .3, sh = run ? Math.sin(t * 60) * .03 : 0;
  iso.box(-1.3 + sh, -1.3, Z, 2.6, 2.6, 2.4, C.steel, { bias: .4 });
  iso.box(-1.1 + sh, -1.1, Z + 3.7, 2.2, 2.2, .5, C.steel, { bias: .7 });
  iso.box(-.6 + sh, -.6, Z + 2.4, 1.2, 1.2, 1.3, C.steelD, { bias: .5 });
  // cold unit on the back wall: blue, with frost lines
  iso.box(-P + .4, -2, Z, 1.2, 4, 3.2, C.cold); iso.box(-P + 1.6, -1.6, Z + 1, .05, 3.2, 1.6, C.ice, { bias: .1 });
  if (!on) return;
  const u = prog(t, s);
  // meat block rides in (entry → grinder), mince comes out (grinder → exit tub)
  const inU = seg(u, 0, .35), outU = seg(u, .45, .95);
  if (u < .4) { const p = flow('grind', lerp(.08, .5, eio(inU))); iso.box(p[0] - .55, p[1] - .55, Z + .96 + (u > .33 ? (u - .33) * 20 : 0), 1.1, 1.1, .7, tri(MEAT), { bias: .8 }); }
  if (u > .45) { const p = flow('grind', lerp(.5, .9, eio(outU))); mound(iso, p[0], p[1], Z + .96, .8, MINCE, 7); }
  // frost particles drifting from the cold unit
  for (let i = 0; i < 10; i++) { const ph = (t * .4 + rnd(i)) % 1; iso.sphere(-P + 2 + ph * 6, -2 + rnd(i, 2) * 4, Z + 1 + rnd(i, 3) * 2 - ph, .09, C.ice, { hi: false }); }
}
function mound(iso, x, y, z, r, col, n) { // a pile of little spheres (mince)
  const t3 = tri(col);
  iso.cyl(x, y, z, r, .25, t3, { n: 10 });
  for (let i = 0; i < n; i++) { const an = i / n * TAU, rr = r * (.2 + .55 * rnd(i, 9)); iso.sphere(x + Math.cos(an) * rr, y + Math.sin(an) * rr, z + .35 + rnd(i, 4) * .2, .22 + rnd(i, 5) * .08, t3, { hi: false }); }
}
function floorMix(iso, t, Z, s, on, a, b) {
  conveyor(iso, a, [-1.5, 1.5], Z, t); conveyor(iso, [1.5, -1.5], b, Z, t);
  // mixer bowl (open cylinder) with a turning paddle
  const u = on ? prog(t, s) : (t > s.t1 ? 1 : 0);
  iso.cyl(0, 0, Z, 2.1, 2.2, C.steel, { n: 20, bias: -.2, top: false });
  const fill = clamp(seg(u, .05, .5)), colr = hex(mix(MINCE, PASTE, seg(u, .3, .75)));
  if (fill > 0) iso.cyl(0, 0, Z + .2, 1.9, .3 + 1.6 * fill, tri(colr), { n: 20, bias: .1 });
  const ang = on ? t * 6 : 0;
  iso.push(0, 0, Z + 2.2, ang); iso.box(-1.6, -.12, 0, 3.2, .24, .22, C.steelD, { bias: .5 }); iso.pop();
  iso.box(-.25, -.25, Z + 2.2, .5, .5, 1.6, C.steelD, { bias: .5 });
  // four hoppers: tapioka (mustard), bumbu (soil), garam (white), es (ice)
  const HOP = [[-2.6, -2.6, C.mustard], [2.6, -2.6, C.soil], [-2.6, 2.6, C.white], [2.6, 2.6, C.ice]];
  HOP.forEach(([x, y, c], i) => {
    iso.box(x - .6, y - .6, Z, .2, .2, 4.2, C.steelD); iso.box(x - .7, y - .7, Z + 4.2, 1.4, 1.4, 1, c);
    if (on) { const d0 = s.v0 + .6 + i * .55, k = seg(t, d0, d0 + .5); if (k > 0 && k < 1) for (let j = 0; j < 4; j++) iso.sphere(lerp(x, 0, k * .6), lerp(y, 0, k * .6), Z + 4.1 - (k * 3 + j * .4) % 3.4, .16, c, { hi: false }); }
  });
  // digital scale readout (precise dosing)
  iso.box(3.0, .6, Z, 1.4, 1.4, 1.2, C.white); iso.box(3.05, 2.0, Z + .5, 1.3, .05, .5, tri('#3B4A44'), { bias: .1 });
  if (!on) return;
  if (u < .12) { const p = flow('mix', lerp(.08, .32, seg(u, 0, .1))); mound(iso, p[0], p[1], Z + .96, .7, MINCE, 6); }
  if (u > .82) { const p = flow('mix', lerp(.68, .92, seg(u, .82, 1))); iso.cyl(p[0], p[1], Z + .96, .7, .5, tri(PASTE), { n: 12, bias: .5 }); }
}
function floorFill(iso, t, Z, s, on, a, b) {
  conveyor(iso, a, [1.6, -1.6], Z, t);
  // stuffer: lying cylinder + piston + nozzle, pointing along the flow
  const d = DIRF.fill, rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const u = on ? prog(t, s) : (t > s.t1 ? 1 : 0), push = seg(u, .1, .9);
  iso.push(1.8, -1.8, Z, rot);
  iso.box(-1.2, -1.1, 0, 2.6, 2.2, 1.2, C.steelD, { bias: .1 });
  iso.cyl(-1.4, 0, 2.1, .95, 2.6, C.steel, { axis: 'x', n: 16, bias: .4 });
  iso.box(-2.4 + push * 1.2, -.15, 1.95, 1.2, .3, .3, C.steelD, { bias: .5 });
  iso.cyl(1.2, 0, 2.1, .3, 1.1, C.steelD, { axis: 'x', n: 10, bias: .6 });
  iso.pop();
  // long table for the chain
  const n0 = flow('fill', .55), n1 = flow('fill', .95);
  conveyor(iso, [n0[0], n0[1]], [n1[0], n1[1]], Z, t);
  if (!on) { if (t > s.t1) chain(iso, [[n0[0], n0[1], Z + 1.1], [n1[0], n1[1], Z + 1.1]], 7, .26, RAW); return; }
  // the chain grows from the nozzle; links appear one by one, accelerating
  const L = Math.hypot(n1[0] - n0[0], n1[1] - n0[1]);
  const g = eo(seg(u, .2, .75)), links = Math.floor(1 + 13 * Math.pow(seg(u, .2, .8), 1.6));
  const tip = [lerp(n0[0], n1[0], g), lerp(n0[1], n1[1], g)];
  if (g > .02) chain(iso, [[n0[0], n0[1], Z + 1.1], [tip[0], tip[1], Z + 1.1]], Math.max(1, Math.min(links, Math.round(7 * g) + 1)), .26, RAW, { bias: .8 });
  // finished links piling on a tray at the exit
  const pile = Math.floor(16 * seg(u, .55, .98));
  for (let i = 0; i < pile; i++) { const q = flow('fill', .98), ox = (i % 4) * .45 - .7, oy = ((i / 4) | 0) * .5 - .7; capsule(iso, [q[0] + ox - .2, q[1] + oy, Z + .2 + .25 * ((i / 8) | 0)], [q[0] + ox + .2, q[1] + oy + .1, Z + .2 + .25 * ((i / 8) | 0)], .2, RAW, { bias: 1 }); }
}
function floorOven(iso, t, Z, s, on, a, b) {
  const u = on ? prog(t, s) : (t > s.t1 ? 1 : 0);
  // rails across the floor
  conveyor(iso, a, b, Z, t);
  // oven cabinet; its front skin (+x and +y) is cut away at the start of the section
  const cut = on ? seg(t, s.v0 - .4, s.v0 + .5) : (t > s.t1 ? 1 : 0), slide = eo(seg(cut, .35, 1));
  const ox = -1.9, oy = -1.9, ow = 3.8, od = 3.8, oh = 3.6;
  iso.box(ox, oy, Z, ow, .3, oh, tri('#C98A5B'), { bias: -.2 });     // back walls
  iso.box(ox, oy, Z, .3, od, oh, tri('#C98A5B'), { bias: -.2 });
  iso.box(ox, oy, Z + oh, ow, od, .4, tri('#B07648'), { bias: 1.5 });  // roof
  if (slide < 1) { iso.box(ox + ow - .3 + slide * 3, oy, Z, .3, od, oh, tri('#C98A5B'), { bias: 1.4 }); iso.box(ox, oy + od - .3 + slide * 3, Z, ow, .3, oh, tri('#C98A5B'), { bias: 1.4 }); }
  // chimney + smoke puffs (smoked)
  iso.box(-1.6, -1.6, Z + oh + .4, .8, .8, 1.6, C.steelD, { bias: 1.6 });
  // racks of sausages hanging inside, colour raw → cooked
  const cook = seg(u, .2, .75), col = hex(mix(RAW, COOKED, cook));
  for (let r = 0; r < 3; r++) {
    const y = oy + .9 + r * 1.0;
    iso.box(ox + .4, y, Z + 3.1, 3.0, .08, .08, C.steelD, { bias: .2 });
    for (let i = 0; i < 4; i++) capsule(iso, [ox + .8 + i * .7, y, Z + 3.0], [ox + .8 + i * .7, y, Z + 1.3], .22, col, { bias: .3 + r * .01 });
  }
  if (on) { const sm = seg(t, wordT('a07_1', .78), s.t1 + 1); for (let i = 0; i < 6; i++) { const ph = (t * .5 + i / 6) % 1; if (sm > 0) iso.sphere(-1.2 + ph * .8, -1.2 - ph * .4, Z + oh + 2.2 + ph * 3, (.3 + ph * .5) * clamp(sm * 2), tri('#D8D2C8'), { hi: false, bias: 2 }); } }
  // steam wisps when cooking
  if (on && cook > 0 && cook < 1) for (let i = 0; i < 5; i++) { const ph = (t * .8 + i / 5) % 1; iso.sphere(ox + 1 + i * .5, oy + 1.2, Z + 1.5 + ph * 2, .12 + ph * .15, tri('#F2EEE8'), { hi: false, bias: 1 }); }
}
function floorCool(iso, t, Z, s, on, a, b) {
  const u = on ? prog(t, s) : (t > s.t1 ? 1 : 0);
  conveyor(iso, a, b, Z, t);
  // shower gantry
  rbox(iso, 0, 0, Z + 3.4, 5.4, .5, .3, Math.atan2(b[1] - a[1], b[0] - a[0]), C.steel, { bias: 1 });
  iso.box(-2.2, 1.6, Z, .3, .3, 3.4, C.steelD); iso.box(1.9, -1.9, Z, .3, .3, 3.4, C.steelD);
  // cold room
  iso.box(-P + .5, -P + .5, Z, 3.5, 3.5, 3, C.ice, { bias: -.3 }); iso.box(-P + 4.0, -P + 1.4, Z + .2, .06, 1.6, 2.2, C.cold, { bias: -.2 });
  // a hanging chain moving along the shower (cooked colour, tinted cool)
  const p = flow('cool', lerp(.1, .9, eio(u)));
  const col = hex(mix(COOKED, COLD_S, seg(u, .3, .7)));
  if (on || t > s.t1) for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * .55; capsule(iso, [p[0] + ox, p[1] + ox, Z + 2.8], [p[0] + ox, p[1] + ox, Z + 1.4], .22, col, { bias: .6 }); }
  if (on && u > .1 && u < .85) for (let i = 0; i < 18; i++) { const ph = (t * 2.2 + rnd(i)) % 1, q = flow('cool', .2 + rnd(i, 1) * .6); iso.box(q[0] + (rnd(i, 2) - .5), q[1] + (rnd(i, 3) - .5), Z + 3.3 - ph * 2.6, .05, .05, .35, C.cold, { bias: 1.2 }); }
}
function floorPack(iso, t, Z, s, on, a, b) {
  const u = on ? prog(t, s) : (t > s.t1 ? 1 : 0);
  conveyor(iso, a, b, Z, t);
  const rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
  // stations along the belt: cutter, scale, vacuum sealer, labeller, metal detector
  const ST = [.22, .38, .53, .68, .82];
  const pos = ST.map(k => flow('pack', k));
  rbox(iso, pos[0][0], pos[0][1], Z + 1.9, .5, 1.6, .6, rot, C.steelD, { bias: .6 });              // cutter head
  iso.box(pos[0][0] - .1, pos[0][1] - .9, Z, .2, .2, 2.2, C.steelD);
  rbox(iso, pos[1][0], pos[1][1], Z + 1.0, 1.2, 1.5, .12, rot, C.white, { bias: .3 });              // scale pan
  rbox(iso, pos[2][0], pos[2][1], Z + 1.0, 1.5, 1.6, 1.4, rot, C.steel, { bias: .5 });               // vacuum sealer hood
  rbox(iso, pos[3][0], pos[3][1], Z + 1.8, .9, 1.3, .9, rot, C.mustard, { bias: .6 });               // labeller
  iso.box(pos[3][0] - .1, pos[3][1] - .9, Z, .2, .2, 2.5, C.steelD);
  // metal detector arch
  iso.push(pos[4][0], pos[4][1], Z, rot); iso.box(-.3, -1, 0, .6, .25, 2.4, C.steel); iso.box(-.3, .75, 0, .6, .25, 2.4, C.steel); iso.box(-.3, -1, 2.4, .6, 2, .35, C.steel, { bias: .4 });
  const beep = on && seg(t, wordT('a09_2', .1), wordT('a09_2', .55)) > 0 && seg(t, wordT('a09_2', .1), wordT('a09_2', .55)) < 1;
  iso.box(-.2, -.4, 2.75, .4, .8, .15, beep ? C.halal : C.steelD, { bias: .5 }); iso.pop();
  // pallet with boxes at the exit
  const ex = flow('pack', 1.02);
  iso.box(ex[0] - 1, ex[1] - 1, Z, 2, 2, .3, C.wood);
  const boxes = on ? Math.floor(8 * seg(t, wordT('a09_2', .7), S('pack').t1)) : (t > s.t1 ? 8 : 0);
  for (let i = 0; i < boxes; i++) { const bx = (i % 2), by = ((i / 2) | 0) % 2, bz = (i / 4) | 0; iso.box(ex[0] - .95 + bx * .95, ex[1] - .95 + by * .95, Z + .3 + bz * .7, .9, .9, .68, tri('#D9B98A'), { bias: .5 + i * .01 }); }
  if (!on) return;
  // a stream of items along the belt: sausages → packs
  for (let i = 0; i < 6; i++) {
    const k = ((u * 1.6 + i / 6) % 1); if (u * 1.6 + i / 6 < 1 && u < .05) continue;
    const q = flow('pack', lerp(.08, .95, k)), z = Z + .96;
    if (k < ST[1]) capsule(iso, [q[0] - .5, q[1] - .5, z + .2], [q[0] + .5, q[1] + .5, z + .2], .22, COLD_S, { bias: .9 });
    else { const sq = k < ST[2] ? 0 : 1; iso.push(q[0], q[1], z, rot); iso.box(-.55, -.45, 0, 1.1, .9, .3 - sq * .08, sq ? tri('#F3D8CF', .1, .14) : tri(COLD_S), { bias: .9 }); if (k > ST[3]) { iso.box(-.3, -.3, .23, .6, .6, .02, C.mustard, { bias: 1 }); iso.box(-.15, -.15, .25, .3, .3, .02, C.halal, { bias: 1.01 }); } iso.pop(); }
  }
}

// CITY BOARD (z = 0)
function drawCity(iso, t) {
  const { x0, y0, x1, y1 } = CITY;
  plate(iso, x0, y0, x1, y1, 0, { body: C.soil, top: tri('#EFE6D4', .1, .12), th: 3, band: tri('#7A5634'), name: 'KOTA' });
  // roads (from the cold store out to every destination)
  const R = roads();
  for (const r of R) for (let i = 1; i < r.length; i++) roadSeg(iso, r[i - 1], r[i]);
  // trees
  for (let i = 0; i < 16; i++) { const x = x0 + 2 + rnd(i, 1) * (x1 - x0 - 4), y = y0 + 2 + rnd(i, 2) * (y1 - y0 - 4); if (Math.abs(x) < 9 && Math.abs(y) < 9) continue; if (nearRoad(x, y)) continue; iso.box(x - .1, y - .1, 0, .2, .2, .7, C.wood); iso.sphere(x, y, 1.3, .7, C.grass); }
  // cold storage (blue, frost)
  const cs = COLDST; building(iso, cs.x, cs.y, cs.w, cs.d, 3.4, C.ice, C.cold, { sign: 'GUDANG BEKU', signT: C.white });
  // destinations
  for (const d of DEST) destination(iso, d, t);
  // the house with the breakfast table (terrace)
  building(iso, HOUSE.x - 2, HOUSE.y - 2.5, 4, 3.2, 2.6, tri('#EADBC6'), C.roof, { gable: 1.4, ridge: 'x', win: 2 });
  iso.box(HOUSE.x + 2.2, HOUSE.y - 2.6, 0, 8.2, 4.4, .15, C.wood);                     // terrace deck
  table(iso, t);
}
function table(iso, t) {
  const [x, y] = TABLE;
  iso.box(x - 1, y - .8, .15, 2, 1.6, .9, C.wood, { bias: .1 });
  iso.box(x - 1.1, y - .9, 1.05, 2.2, 1.8, .12, tri('#F4E9D6', .1, .1), { bias: .2 });
  iso.cyl(x, y, 1.17, .62, .06, C.white, { n: 20, bias: .3 });            // plate
  const cooked = t < S('dist').t0 || t > S('home').v0;                     // the plate is full at the start and the end
  if (cooked) {
    capsule(iso, [x - .38, y - .05, 1.32], [x + .32, y + .1, 1.32], .13, COOKED, { bias: .5 });
    capsule(iso, [x - .3, y + .25, 1.32], [x + .38, y + .38, 1.32], .13, COOKED, { bias: .51 });
    for (let i = 0; i < 3; i++) { const ph = (t * .7 + i / 3) % 1; iso.sphere(x - .2 + i * .2, y + .1, 1.6 + ph * .9, .05 + ph * .05, tri('#FFFFFF'), { hi: false, bias: .6 }); }
  }
  iso.box(x - 1.6, y - .3, .15, .5, .6, .5, C.wood); iso.box(x + 1.1, y - .3, .15, .5, .6, .5, C.wood);  // stools
}
function destination(iso, d, t) {
  const { x, y, kind, name } = d;
  if (kind === 'ware') building(iso, x - 2.5, y - 2, 5, 4, 2.8, C.stone, C.roof, { sign: 'DISTRIBUTOR' });
  if (kind === 'super') building(iso, x - 2.5, y - 2, 5, 4, 2.4, C.white, C.stone, { sign: 'SUPERMARKET', awning: C.mustard, win: 3 });
  if (kind === 'mini') building(iso, x - 1.6, y - 1.5, 3.2, 3, 2.2, C.white, C.cold, { sign: 'MINIMARKET', win: 2 });
  if (kind === 'warung') { building(iso, x - 1.3, y - 1.2, 2.6, 2.4, 1.8, C.wood, C.stone, { awning: C.mustard }); }
  if (kind === 'resto') building(iso, x - 1.8, y - 1.6, 3.6, 3.2, 2.4, tri('#EADBC6'), C.roof, { gable: 1.2, win: 2, awning: C.halal });
  if (kind === 'online') { iso.box(x - .9, y - .9, 0, 1.8, 1.8, .1, C.stone); }
}
const ROAD_W = 1.4;
function roads() {
  const o = [COLDST.x + COLDST.w / 2, COLDST.y + COLDST.d + .9];
  return [
    [o, [o[0], 2.5], [27, 2.5], [27, -3.5]],
    [[27, 2.5], [27, 5.5]],
    [[19, 2.5], [19, 14.8]],
    [[19, 11], [3, 11], [3, 13.3]],
    [[27, 2.5], [33.5, 2.5], [33.5, 21], [32, 21]],
    [[19, 11], [24, 11], [24, 25.5]],
    [[3, 11], [3, 4], [o[0], 4], [o[0], 2.5]],
    [[19, 18.5], [19, 22], [15.8, 22], [15.8, 24]],
  ];
}
function nearRoad(x, y) { for (const r of roads()) for (let i = 1; i < r.length; i++) { const a = r[i - 1], b = r[i]; const minx = Math.min(a[0], b[0]) - 2, maxx = Math.max(a[0], b[0]) + 2, miny = Math.min(a[1], b[1]) - 2, maxy = Math.max(a[1], b[1]) + 2; if (x > minx && x < maxx && y > miny && y < maxy) return true; } for (const d of DEST) if (Math.abs(x - d.x) < 3.5 && Math.abs(y - d.y) < 3.5) return true; if (Math.abs(x - HOUSE.x - 1) < 6 && Math.abs(y - HOUSE.y) < 4) return true; if (x > COLDST.x - 1 && x < COLDST.x + COLDST.w + 1 && y > COLDST.y - 1 && y < COLDST.y + COLDST.d + 1) return true; return false; }
function roadSeg(iso, a, b) {
  const h = ROAD_W / 2, x0 = Math.min(a[0], b[0]) - h, x1 = Math.max(a[0], b[0]) + h, y0 = Math.min(a[1], b[1]) - h, y1 = Math.max(a[1], b[1]) + h;
  iso.flat([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], .01, C.asphalt);
}
// delivery routes for the distribution fan-out (polyline in xy from the cold store)
function routes() {
  const o = [COLDST.x + COLDST.w / 2, COLDST.y + COLDST.d + .9];
  return {
    distributor: [o, [o[0], 2.5], [27, 2.5], [27, -2.8]],
    super: [o, [o[0], 2.5], [27, 2.5], [27, 5.2]],
    mini: [o, [o[0], 2.5], [19, 2.5], [19, 14.6]],
    warung: [o, [o[0], 2.5], [19, 2.5], [19, 11], [3, 11], [3, 13.1]],
    resto: [o, [o[0], 2.5], [33.5, 2.5], [33.5, 21], [32.3, 21]],
    online: [o, [o[0], 2.5], [19, 2.5], [19, 11], [24, 11], [24, 25.2]],
  };
}
// when each destination is named in a10_1 (estimated word positions)
const DEST_FRAC = { distributor: .38, super: .5, mini: .6, warung: .7, resto: .78, online: .92 };

// ---------------- camera ----------------
let KEYS = [];
function floorCam(f, dz = -.6, k = 72) { return { x: .1, y: .1, z: floorZ(f) + dz, k }; }
function buildCam() {
  const s = id => SEC[id];
  const T = [TABLE[0], TABLE[1], 1.3], FC = { x: (FARM.x0 + FARM.x1) / 2 + 2, y: (FARM.y0 + FARM.y1) / 2, z: ZG + 1.5 };
  const MID = worldFrame();
  KEYS = [
    { t: 0, x: T[0] + .3, y: T[1] - .3, z: T[2], k: 210 },
    { t: s('plate').v0 + .2, x: T[0] + .2, y: T[1] - .2, z: T[2], k: 170 },
    { t: V('a01_1').t1, x: T[0] - .8, y: T[1] - .2, z: 1.4, k: 92 },
    { t: V('a01_2').t0 + 1.0, x: T[0] - .2, y: T[1] + 1.4, z: 1.0, k: 78 },
    { t: s('farm').t0 - .3, ...MID, k: MID.k * 1.05, e: 'exp' },
    { t: s('farm').t0 + 1.1, ...FC, k: 30, e: 'exp' },
    { t: s('farm').t1 - .4, x: FC.x + 2.4, y: FC.y - 2.6, z: ZG + 1.6, k: 36 },
    { t: s('truck').t0 + .3, follow: 'truck', k: 42 },
    { t: s('truck').t1 - .2, follow: 'truck', k: 46 },
    { t: s('gate').t0 + .5, x: -.8, y: .6, z: ZG - .2, k: 54 },
    { t: s('gate').t1, x: .2, y: -.2, z: ZG - .4, k: 56 },
  ];
  for (const f of FLOORS) {
    KEYS.push({ t: s(f).t0 + Math.min(.9, (s(f).v0 - s(f).t0) * .9), ...floorCam(f), k: 68 });
    KEYS.push({ t: s(f).t1 - .05, ...floorCam(f, -.4), k: 74 });
  }
  const CS = { x: COLDST.x + 4, y: COLDST.y + 6, z: 1 };
  KEYS.push(
    { t: s('dist').t0 + .9, ...CS, k: 34 },
    { t: s('dist').v0 + 1.6, x: 18, y: 9, z: 1, k: 21 },
    { t: s('dist').t1 - .3, x: 19, y: 11, z: 1, k: 20 },
    { t: s('home').t0 + .9, x: 16, y: 21, z: 1, k: 40 },
    { t: s('home').t1 + .3, x: TABLE[0] - .5, y: TABLE[1] - .6, z: 1.4, k: 70 },
    { t: s('end').t0 + .5, x: TABLE[0] - .5, y: TABLE[1] - .6, z: 1.4, k: 66 },
    { t: s('end').t0 + 3.2, ...MID, k: MID.k, e: 'exp' },
    { t: TL.end, ...MID, k: MID.k * .98 },
  );
}
// frame the whole world in the vertical frame (with room for the legend card at the bottom)
function worldFrame() {
  const pts = [[FARM.x0, FARM.y0, ZG + 3], [FARM.x0, FARM.y1, ZG], [FARM.x1, FARM.y0, ZG + 4], [CITY.x0, CITY.y1, -3], [CITY.x1, CITY.y1, -3], [CITY.x1, CITY.y0, 0], [CITY.x0, CITY.y0, 0], [P, -P, ZG + 4]];
  const sx = p => (p[0] - p[1]) * C30, sy = p => (p[0] + p[1]) * S30 - p[2];
  const X0 = Math.min(...pts.map(sx)), X1 = Math.max(...pts.map(sx)), Y0 = Math.min(...pts.map(sy)), Y1 = Math.max(...pts.map(sy));
  const k = Math.min((W * .92) / (X1 - X0), (H * .74) / (Y1 - Y0));
  const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2 + (H * .06) / k;   // shift up a little: the bottom is for the subtitle
  // invert: screen centre offset (cx, cy) on plane z = 0 → world x, y
  const v = cy, u = cx / C30, X = v + u / 2, Y = v - u / 2;
  return { x: X, y: Y, z: 0, k };
}
function camAt(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1].t <= t) i++;
  const A = resolve(KEYS[i], t), B = resolve(KEYS[Math.min(i + 1, KEYS.length - 1)], t);
  if (i >= KEYS.length - 1) return A;
  const f = seg(t, KEYS[i].t, KEYS[i + 1].t), e = eio(f);
  const k = Math.exp(lerp(Math.log(A.k), Math.log(B.k), e));
  // for big zoom changes, move in screen-proportional space (so a pull-out feels like one move)
  const wgt = (KEYS[i + 1].e === 'exp' || KEYS[i].e === 'exp') ? (A.k === B.k ? e : (Math.pow(A.k, -1) * 0 + (k - A.k) / (B.k - A.k))) : e;
  const w = clamp(KEYS[i + 1].e === 'exp' ? ss(f) : wgt);
  return { x: lerp(A.x, B.x, w), y: lerp(A.y, B.y, w), z: lerp(A.z, B.z, w), k };
}
function resolve(K, t) {
  if (K.follow === 'truck') { const [x, y] = pathAt(TRUCK_PATH(), truckU(t)); return { x: x + 1, y: y - 1, z: ZG - .3, k: K.k }; }
  return K;
}

// ---------------- the subject (tracked) ----------------
function subject(t) {
  // returns world point + tag of the thing we follow, or null
  const g = S('grind');
  if (t > S('gate').v0 && t < g.t0 + .5) return null;
  for (const f of FLOORS) {
    const s = S(f); if (t >= s.t0 - .2 && t < s.t0 + .9) { const p = flow(f, .1); return { p: [p[0], p[1], floorZ(f) + 1.4], tag: f === 'grind' || f === 'mix' ? 'CALON SOSIS' : 'SOSIS KITA' }; }
  }
  return null;
}

// ---------------- route line (drawn ahead of the subject) ----------------
function routePts() {
  const F = FARM, pts = [[F.x1 - 6, F.y0 + 6.4, ZG + .2], [-2.6, F.y0 + 6.4, ZG + .2], [-1, -1, ZG + .2], [RC[0], RC[1], ZG + .2]];
  for (const f of FLOORS) { const z = floorZ(f) + .2, a = flow(f, 0), b = flow(f, 1); pts.push([a[0], a[1], z], [0, 0, z], [b[0], b[1], z]); }
  const o = [COLDST.x + COLDST.w / 2, COLDST.y + COLDST.d + .9];
  pts.push([RC[0], RC[1], .2], [COLDST.x, COLDST.y + 2, .2], [o[0], o[1], .2], [o[0], 2.5, .2], [19, 2.5, .2], [19, 14.6, .2], [19, 20, .2], [TABLE[0] + .5, TABLE[1] - 1.4, .2]);
  return pts;
}
function routeLine(iso, frac, o = {}) {
  const pts = routePts(); let L = 0; const d = [0];
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); d.push(L); }
  const s = clamp(frac) * L, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (d[i] <= s) out.push(pts[i]); else { const f = (s - d[i - 1]) / (d[i] - d[i - 1]); out.push(pts[i - 1].map((v, q) => lerp(v, pts[i][q], f))); break; } }
  const g = iso.g; g.save(); g.strokeStyle = o.color || INK; g.lineWidth = o.lw || 3; g.setLineDash([12, 9]); g.lineCap = 'round';
  g.beginPath(); out.forEach((p, i) => { const q = iso.P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); g.restore();
}

// ---------------- labels (screen space) ----------------
function lab(iso, id, x, y, z, a, o) {
  if (a <= 0) return;
  const big = { ts: 30, ns: 54, up: 150, len: 60, ...o };
  pin(iso, x, y, z, { ...big, a });
  if (TX && a >= .999) { const [sx, sy] = iso.P(x, y, z), dir = big.dir ?? 1, tx = sx + dir * (big.len + 12), ty = sy - big.up; const txt = [big.title, big.num ? big.num + (big.unit ? ' ' + big.unit : '') : ''].filter(Boolean).join(' '); const wdt = txt.length * 16; rec(id, txt, dir > 0 ? tx : tx - wdt, ty - 36, dir > 0 ? tx + wdt : tx, ty + (big.num ? big.ns : 0) + 8); }
}
const life = (t, a, b, fi = .5, fo = .4) => seg(t, a, a + fi) * (1 - seg(t, b, b + fo));

function labels(iso, t) {
  const s = S, v = V;
  // farm
  lab(iso, 'farm', FARM.x0 + 5, FARM.y0 + 3.5, ZG + 1.6, life(t, v('a02_1').t0, s('farm').t1 - .2), { title: 'PETERNAKAN', num: 'SAPI & AYAM', ns: 40, dir: -1, up: 170 });
  lab(iso, 'halal', FARM.x1 - 3, FARM.y0 + 3, ZG + 3.4, life(t, wordT('a02_2', .25), s('truck').t0 + .2), { title: 'RUMAH POTONG', num: 'HALAL', ns: 44, dir: 1, up: 200, dot: C.halal[1] });
  // truck
  const [tx, ty] = pathAt(TRUCK_PATH(), truckU(t));
  lab(iso, 'truck', tx, ty, ZG + 2.8, life(t, s('truck').v0 + .2, s('truck').t1), { title: 'TRUK BERPENDINGIN', num: '< 4', unit: '°C', dir: 1, up: 210, icons: (g, x, y) => ingredientRow(g, x, y, t) });
  // gate checks
  const g0 = v('a03_1');
  lab(iso, 'qc', 1.4, 3.4, ZG + 2.2, life(t, g0.t0 + .2, V('a03_2').t0 - .1), { title: 'CEK MUTU', dir: 1, up: 300, len: 40, icons: (g, x, y) => checkRow(g, x - 20, y, t) });
  // floors
  lab(iso, 'cold1', -P + 1, -1, floorZ('grind') + 3.4, life(t, wordT('a04_1', .55), s('grind').t1 - .2), { title: 'DIJAGA', num: 'DINGIN', ns: 50, dir: -1, up: 120, dot: C.cold[1] });
  lab(iso, 'mix', 2.6, -2.6, floorZ('mix') + 5.2, life(t, v('a05_1').t0 + .2, wordT('a05_1', .58)), { title: 'DAGING + TAPIOKA', num: 'BUMBU · GARAM · ES', ns: 30, dir: -1, up: 170, len: 40 });
  lab(iso, 'dose', 3.7, 1.3, floorZ('mix') + 1.2, life(t, wordT('a05_1', .6), s('mix').t1 - .3), { title: 'TAKARAN PRESISI', num: (Math.min(2.5, 2.5 * seg(t, wordT('a05_1', .62), wordT('a05_1', .8)))).toFixed(2).replace('.', ','), unit: 'kg', ns: 48, dir: -1, up: 70, len: 30 });
  lab(iso, 'links', flow('fill', .75)[0], flow('fill', .75)[1], floorZ('fill') + 1.4, life(t, v('a06_1').t0 + .6, s('fill').t1 - .2), { title: 'RANTAI SOSIS', num: '× ' + Math.floor(1 + 13 * Math.pow(seg(t, s('fill').t0 + .3 + (s('fill').t1 - s('fill').t0 - .5) * .2, s('fill').t0 + .3 + (s('fill').t1 - s('fill').t0 - .5) * .8), 1.6)), ns: 56, dir: 1, up: 170 });
  lab(iso, 'oven', -1.9, 1.9, floorZ('oven') + 3.6, life(t, v('a07_1').t0 + .2, s('oven').t1 - .2), { title: 'SUHU INTI', num: String(Math.round(lerp(20, 72, seg(t, v('a07_1').t0 + .3, wordT('a07_1', .45))))), unit: '°C', ns: 64, dir: -1, up: 200, icons: (g, x, y, dir) => germs(g, x, y, t, dir) });
  lab(iso, 'smoke', -1.2, -1.2, floorZ('oven') + 6.2, life(t, wordT('a07_1', .78), s('oven').t1), { title: 'DIASAP', dir: 1, up: 80, len: 40 });
  lab(iso, 'cool', 0, 0, floorZ('cool') + 3.8, life(t, v('a08_1').t0 + .2, s('cool').t1 - .1), { title: 'AIR DINGIN', num: 'TEKSTUR TERKUNCI', ns: 32, dir: 1, up: 120 });
  const pk = flow('pack', .68);
  lab(iso, 'label', pk[0], pk[1], floorZ('pack') + 2.7, life(t, wordT('a09_1', .55), s('pack').t1 - .2), { title: 'LABEL', num: 'TANGGAL · HALAL · BPOM', ns: 30, dir: -1, up: 140 });
  const md = flow('pack', .82);
  lab(iso, 'metal', md[0], md[1], floorZ('pack') + 2.9, life(t, v('a09_2').t0, s('pack').t1 - .2), { title: 'DETEKTOR LOGAM', num: 'AMAN ✓', ns: 36, dir: -1, up: 330, dot: C.halal[1] });
  // distribution
  lab(iso, 'coldst', COLDST.x + 4, COLDST.y + 3.5, 4, life(t, s('dist').v0, s('dist').v0 + 3), { title: 'GUDANG BEKU', num: '−18', unit: '°C', dir: 1, up: 140 });
  for (const d of DEST) lab(iso, 'd_' + d.id, d.x, d.y, 3, life(t, wordT('a10_1', DEST_FRAC[d.id]), s('home').t0 + .4, .35), { title: d.name, ts: 24, dir: d.x > 22 ? -1 : 1, up: 70, len: 30 });
}
function germs(g, x, y, t, dir) {
  const a = seg(t, wordT('a07_1', .5), wordT('a07_1', .7)); if (a <= 0) return;
  for (let i = 0; i < 3; i++) {
    const cx = x + dir * (30 + i * 64), cy = y + 28, p = back(clamp(a * 3 - i), 2.2); if (p <= 0) continue;
    g.save(); g.translate(cx, cy); g.scale(p * 1.4, p * 1.4);
    g.fillStyle = '#8FA86A'; g.beginPath(); for (let k = 0; k < 10; k++) { const an = k / 10 * TAU, r = k % 2 ? 13 : 18; k ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(r, 0); } g.closePath(); g.fill();
    g.strokeStyle = '#B8433A'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, -16); g.lineTo(16, 16); g.stroke(); g.restore();
  }
}
// isotype rows inside pins
function ingredientRow(g, x, y, t) {
  const a = seg(t, wordT('a02_3', .55), wordT('a02_3', .95)); if (a <= 0) return;
  const items = [['tapioka', C.mustard], ['bawang', C.white], ['lada', tri('#3B3330')], ['garam', C.ice], ['selongsong', tri(PASTE)]];
  items.forEach(([n, c], i) => { const p = back(clamp(a * 5 - i), 2.4); if (p <= 0) return; g.save(); g.translate(x + 32 + i * 62, y + 26); g.scale(p, p); miniCrate(g, c); g.restore(); });
  if (a > .2) haloText(g, 'TAPIOKA · BAWANG · LADA · GARAM · SELONGSONG', x, y + 82, { font: `500 19px ${FONT}`, track: 1.5 });
  if (TX && a >= 1) rec('ingr', 'TAPIOKA · BAWANG · LADA · GARAM · SELONGSONG', x, y + 60, x + 520, y + 90);
}
function miniCrate(g, t3) { const s = 13, P2 = (x, y, z) => [(x - y) * C30 * s, ((x + y) * S30 - z) * s]; const f = (pts, c) => { g.beginPath(); pts.forEach((p, i) => { const q = P2(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = c; g.fill(); }; f([[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], t3[1]); f([[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], t3[2]); f([[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], t3[0]); }
function checkRow(g, x, y, t) {
  const v = V('a03_1'), names = ['SUHU', 'WARNA', 'BAU', 'BERAT'];
  names.forEach((n, i) => {
    const ti = wordT('a03_1', .5 + i * .12), p = back(seg(t, ti, ti + .3), 2.2); if (p <= 0) return;
    g.save(); g.translate(x + 30 + i * 86, y + 30); g.scale(p, p);
    g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fillStyle = PAL.paper; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    g.strokeStyle = C.halal[1]; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, 1); g.lineTo(-3, 9); g.lineTo(11, -9); g.stroke();
    g.restore();
    haloText(g, n, x + 30 + i * 86, y + 78, { font: `600 18px ${FONT}`, align: 'center', track: 2 });
  });
}

// ---------------- verdict stamps at the gate (Lolos / Gagal) ----------------
function verdict(iso, t) {
  const pass = V('a03_2').t0 + .1, fail = wordT('a03_2', .6);
  const g = iso.g;
  const draw = (p, ok, wx, wy, wz, word) => {
    if (p <= 0) return; const [sx, sy] = iso.P(wx, wy, wz), sc = back(seg(p, 0, .35), 2.4), a = 1 - seg(p, .8, 1);
    g.save(); g.globalAlpha = a; g.translate(sx, sy - 90); g.scale(sc, sc);
    g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.fillStyle = ok ? C.halal[1] : '#B8433A'; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.paper; g.stroke();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
    if (ok) { g.moveTo(-18, 2); g.lineTo(-5, 16); g.lineTo(20, -14); } else { g.moveTo(-15, -15); g.lineTo(15, 15); g.moveTo(15, -15); g.lineTo(-15, 15); } g.stroke();
    g.restore(); if (a <= 0) return; g.save(); g.globalAlpha = a; haloText(g, word, sx, sy - 10, { font: `700 34px ${FONT}`, align: 'center', track: 3, color: ok ? C.halal[2] : '#8F2F28' }); g.restore();
    if (TX && a > .99 && sc > .99) rec('v_' + word, word, sx - 70, sy - 40, sx + 70, sy);
  };
  draw(seg(t, pass, pass + 2.4), true, RC[0], RC[1], ZG + 1.6, 'LOLOS');
  draw(seg(t, fail, fail + 2.4), false, -4.2, 2.2, ZG + 1.6, 'GAGAL');
}

// ---------------- isotype: "rasa SELALU sama" ----------------
function isotypeSame(g, t) {
  const a0 = wordT('a05_1', .62), a = seg(t, a0, a0 + 1.6), out = 1 - seg(t, S('mix').t1 - .5, S('mix').t1); if (a <= 0 || out <= 0) return;
  const cols = 6, n = 24, gap = 92, x = W / 2 - cols * gap / 2, y = H * .14;
  g.save(); g.globalAlpha = out;
  g.beginPath(); g.roundRect(x - 30, y - 80, cols * gap + 60, 4 * gap + 120, 16); g.fillStyle = 'rgba(251,244,230,.95)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  haloText(g, 'RASA SELALU SAMA', W / 2, y - 30, { font: `600 34px ${FONT}`, align: 'center', track: 5, halo: false });
  iconGrid(g, x, y, n, a * n, cols, gap, (gg, px, py, s, lit) => { const t3 = tri(lit ? COOKED : '#D8CCB6'); gg.lineCap = 'round'; gg.strokeStyle = t3[2]; gg.lineWidth = s * .34; gg.beginPath(); gg.moveTo(-s * .3, s * .1); gg.lineTo(s * .3, -s * .1); gg.stroke(); gg.strokeStyle = t3[1]; gg.lineWidth = s * .28; gg.beginPath(); gg.moveTo(-s * .3, s * .08); gg.lineTo(s * .3, -s * .12); gg.stroke(); gg.strokeStyle = t3[0]; gg.lineWidth = s * .1; gg.beginPath(); gg.moveTo(-s * .26, 0); gg.lineTo(s * .26, -s * .18); gg.stroke(); });
  haloText(g, '1 RESEP · 1 TAKARAN', W / 2, y + 4 * gap + 26, { font: `500 24px ${FONT}`, align: 'center', track: 3, halo: false });
  g.restore();
  if (TX && a >= 1 && out >= 1) rec('same', 'RASA SELALU SAMA 1 RESEP · 1 TAKARAN', x - 30, y - 80, x + cols * gap + 30, y + 4 * gap + 40);
}

// ---------------- vet inset (frame within the frame) ----------------
function vetInset(iso, t) {
  const v = V('a02_2'), a = seg(t, wordT('a02_2', .55), wordT('a02_2', .55) + 1.0) * (1 - seg(t, S('farm').t1 - .4, S('farm').t1));
  if (a <= 0) return;
  const [ax, ay] = iso.P(FARM.x1 - 2.4, FARM.y0 + 5.6, ZG + 1.2);
  inset(iso, ax, ay, W * .7, H * .12, 150, a, (g, cx, cy, R) => {
    g.fillStyle = '#EAF1EC'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    g.save(); g.translate(cx - 40, cy + 110); g.scale(58, 58); person(g, { h: 3, body: '#F5F2EB', hair: '#3B2D27', apron: C.halal[1], arm: 1.4, tool: (gg, ex, ey, h) => { gg.fillStyle = '#FBF4E6'; gg.fillRect(ex - .05 * h, ey - .25 * h, .22 * h, .28 * h); gg.strokeStyle = C.halal[1]; gg.lineWidth = .04 * h; gg.beginPath(); gg.moveTo(ex, ey - .1 * h); gg.lineTo(ex + .05 * h, ey - .05 * h); gg.lineTo(ex + .14 * h, ey - .18 * h); gg.stroke(); } }); g.restore();
    const t3 = tri(MEAT); g.fillStyle = t3[1]; g.fillRect(cx + 30, cy + 10, 80, 46); g.fillStyle = t3[0]; g.fillRect(cx + 30, cy + 2, 80, 10);
  });
  if (a >= 1) { haloText(g0(iso), 'DIPERIKSA DOKTER HEWAN', W * .7, H * .12 + 190, { font: `600 24px ${FONT}`, align: 'center', track: 2 }); if (TX) rec('vet', 'DIPERIKSA DOKTER HEWAN', W * .7 - 170, H * .12 + 165, W * .7 + 170, H * .12 + 200); }
}
const g0 = iso => iso.g;

// ---------------- distribution: trucks fan out along routes ----------------
function delivery(iso, t) {
  const s = S('dist'); if (t < s.t0 || t > S('home').t1) return;
  const R = routes();
  Object.entries(R).forEach(([id, pts], i) => {
    const t0 = wordT('a10_1', DEST_FRAC[id]) - 1.6, u = eio(seg(t, t0, t0 + 1.8));
    if (u <= 0) return;
    // route line drawn slightly ahead
    const g = iso.g; let L = 0; const d = [0]; for (let j = 1; j < pts.length; j++) { L += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); d.push(L); }
    const lead = clamp(u + .12); const out = [pts[0]];
    for (let j = 1; j < pts.length; j++) { const sv = lead * L; if (d[j] <= sv) out.push(pts[j]); else { const f = (sv - d[j - 1]) / (d[j] - d[j - 1]); out.push([lerp(pts[j - 1][0], pts[j][0], f), lerp(pts[j - 1][1], pts[j][1], f)]); break; } }
    iso.add(1e6, () => { g.save(); g.strokeStyle = INK; g.lineWidth = 2.5; g.setLineDash([9, 7]); g.beginPath(); out.forEach((p, q) => { const sp = iso.P(p[0], p[1], .1); q ? g.lineTo(sp[0], sp[1]) : g.moveTo(sp[0], sp[1]); }); g.stroke(); g.restore(); }, 0);
    const [x, y, r] = pathAt(pts, u);
    if (id === 'online') scooter(iso, x, y, 0, r); else truck(iso, x, y, 0, r, { s: .62 });
  });
}

// ---------------- mother: buys at the minimarket, walks home ----------------
function mother(iso, t) {
  const s = S('home'); if (t < s.t0 - .5 || t > S('end').t0 + .6) return;
  const pts = [[19, 15], [19, 20], [15.8, 22], [TABLE[0] + .2, TABLE[1] - 1.2]];
  const u = eio(seg(t, s.t0 + .2, s.t1 - .2)), [x, y] = pathAt(pts, u);
  const step = Math.floor(t * 12) % 2;
  human(iso, x, y, 0, { body: '#7E9BC4', hair: '#3B2D27', arm: .3 + step * .15, bob: step * .05, tool: (g, ex, ey, h) => { const t3 = C.mustard; g.fillStyle = t3[1]; g.fillRect(ex - .08 * h, ey, .2 * h, .14 * h); g.fillStyle = C.halal[1]; g.fillRect(ex - .02 * h, ey + .04 * h, .06 * h, .06 * h); } });
}

// ---------------- title (extruded words on the table) ----------------
function title(iso, t) {
  const v = V('a01_2'), a = seg(t, v.t0 - .1, v.t0 + .3) * (1 - seg(t, S('plate').t1 - .9, S('plate').t1 - .5)); if (a <= 0) return;
  const words = ['DARI', 'MANA?'], g = iso.g;
  words.forEach((w, i) => {
    const ti = v.t0 + .15 + i * .35, e = back(seg(t, ti, ti + .25), 2.2); if (e <= 0) return;
    iso.text3Now(w, TABLE[0] - 1.2 + i * 1.15, TABLE[1] + 3.1 + i * 1.15, .16, { plane: 'xy', size: .95, extrude: .28 * e, tri: [PAL.cream[0], COOKED, '#7A3A22'], face: '#FBF4E6', weight: 700 });
  });
  if (TX && t > v.t0 + 1) rec('title', 'DARI MANA?', W * .2, H * .2, W * .8, H * .4, true);
}

// ---------------- the end: stations + legend card ----------------
const STATIONS = [
  ['PETERNAKAN', () => [FARM.x0 + 7, FARM.y0 + 4, ZG + 1]], ['RUMAH POTONG HALAL', () => [FARM.x1 - 3, FARM.y0 + 3, ZG + 3]], ['GERBANG MUTU', () => [0, 0, ZG + 2]],
  ['GILING', () => [0, 0, floorZ('grind') + 2]], ['CAMPUR', () => [0, 0, floorZ('mix') + 2]], ['ISI SELONGSONG', () => [0, 0, floorZ('fill') + 2]], ['MASAK & ASAP', () => [0, 0, floorZ('oven') + 2]],
  ['DINGINKAN', () => [0, 0, floorZ('cool') + 2]], ['KEMAS', () => [0, 0, floorZ('pack') + 2]], ['GUDANG BEKU', () => [COLDST.x + 4, COLDST.y + 3, 3]], ['TOKO', () => [19, 17, 2]], ['PIRING', () => [TABLE[0], TABLE[1], 1.5]],
];
function endStations(iso, t) {
  const s = S('end'), t0 = s.t0 + 2.6; if (t < t0) return;
  const g = iso.g;
  STATIONS.forEach(([n, at], i) => {
    const ti = t0 + i * .16, p = back(seg(t, ti, ti + .3), 2.4); if (p <= 0) return;
    const [sx, sy] = iso.P(...at()), left = i % 2 === 0, lx = left ? sx - 70 : sx + 70;
    g.save(); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lx, sy - 18); g.stroke();
    g.translate(sx, sy); g.scale(p, p); g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fillStyle = i === STATIONS.length - 1 ? COOKED : INK; g.fill(); g.fillStyle = '#FBF4E6'; g.font = `600 19px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 0, 1); g.restore();
    if (p > .9) haloText(g, n, left ? lx - 8 : lx + 8, sy - 12, { font: `600 22px ${FONT}`, align: left ? 'right' : 'left', track: 2 });
    if (TX && p > .99) rec('st' + i, n, left ? lx - 260 : lx, sy - 40, left ? lx : lx + 260, sy, true);
  });
}
function legend(g, t) {
  const s = S('end'), v = V('a11_2'), a = seg(t, s.t0 + 4.0, s.t0 + 4.6); if (a <= 0) return;
  const w = 900, h = 300, x = (W - w) / 2, y = H - h - 70;
  g.save(); g.globalAlpha = ss(a); g.translate(0, (1 - ss(a)) * 30);
  g.beginPath(); g.roundRect(x, y, w, h, 18); g.fillStyle = 'rgba(251,244,230,.97)'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  haloText(g, 'DARI PETERNAKAN KE PIRING', W / 2, y + 62, { font: `700 40px ${FONT}`, align: 'center', track: 4, halo: false });
  const words = [['AMAN', C.cold], ['HALAL', C.halal], ['LEZAT', tri(COOKED)]];
  words.forEach(([wd, c], i) => {
    const ti = wordT('a11_2', .7 + i * .1), p = back(seg(t, ti, ti + .3), 2.6); if (p <= 0) return;
    const cx = W / 2 + (i - 1) * 270, cy = y + 160;
    g.save(); g.translate(cx, cy); g.scale(p, p); g.rotate(-.06 + i * .05);
    g.beginPath(); g.roundRect(-115, -46, 230, 92, 12); g.fillStyle = c[1]; g.fill(); g.lineWidth = 4; g.strokeStyle = c[2]; g.stroke();
    g.fillStyle = '#FFFFFF'; g.font = `700 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText(wd, 0, 3); g.restore();
  });
  haloText(g, 'SOSIS PAGI CERIA (MEREK FIKTIF)  ·  TIDAK SESUAI SKALA', W / 2, y + h - 34, { font: `500 20px ${FONT}`, align: 'center', track: 2, halo: false, color: '#6B5E57' });
  g.restore();
  if (TX && a >= 1) { rec('legend', 'DARI PETERNAKAN KE PIRING', x, y, x + w, y + 90); if (t > wordT('a11_2', .95)) rec('stamps', 'AMAN HALAL LEZAT', x, y + 100, x + w, y + 220); rec('fine', 'SOSIS PAGI CERIA (MEREK FIKTIF) · TIDAK SESUAI SKALA', x, y + h - 60, x + w, y + h, true); }
}

// ---------------- subtitles: a map label card at the bottom ----------------
function wrap(g, text, maxW) { const words = text.split(' '), lines = []; let cur = ''; for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; } if (cur) lines.push(cur); return lines; }
export function subText(v) { return v.text.replace(/<[^>]+>\s*/g, '').replace(/\bEMPAT derajat Celsius\b/i, '4 °C').replace(/TUJUH PULUH DUA derajat/i, '72 °C').replace(/\s+/g, ' ').trim().replace(/\b([A-Z]{3,})\b/g, (m) => m === 'BPOM' ? m : m.toLowerCase()).replace(/(^|[^.][.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase()); }
function subtitle(g, t) {
  if (t > S('end').t0 + 3.8) return;                                         // the legend takes over at the end
  const v = TL.voice.find(v => t >= v.t0 - .05 && t < Math.max(v.t1 + .6, v.t0 + 1.8) + .25); if (!v) return;
  const t1 = Math.max(v.t1 + .6, v.t0 + 1.8), a = seg(t, v.t0, v.t0 + .5), fade = 1 - seg(t, t1, t1 + .25); if (fade <= 0) return;
  const text = subText(v);
  g.save(); g.font = `500 44px ${FONT}`;
  const lines = wrap(g, text, 840), lh = 56, tw = Math.max(...lines.map(l => g.measureText(l).width)), pad = 30, icon = 50, w = tw + pad * 2 + icon, h = lines.length * lh + 34, x = W / 2 - w / 2, y = H - 150 - h;
  g.globalAlpha = ss(fade); g.translate(0, (1 - ss(fade)) * 8);
  const bw = eo(seg(a, 0, .35));
  g.beginPath(); g.roundRect(x, y, w, h, 12); g.fillStyle = 'rgba(251,244,230,.97)'; g.fill();
  g.save(); g.beginPath(); g.rect(x - 4, y - 4, (w + 8) * bw, h + 8); g.clip(); g.beginPath(); g.roundRect(x, y, w, h, 12); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); g.restore();
  const ix = x + pad + 12, iy = y + 34, s = 13, P2 = (u, q, z) => [ix + (u - q) * C30 * s, iy + ((u + q) * .5 - z) * s];
  const f = (pts, c) => { g.beginPath(); pts.forEach((p, i) => { const q = P2(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = c; g.fill(); };
  const t3 = tri(COOKED); f([[-.5, .5, -.5], [.5, .5, -.5], [.5, .5, .5], [-.5, .5, .5]], t3[1]); f([[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]], t3[2]); f([[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], t3[0]);
  g.save(); g.beginPath(); g.rect(x + pad + icon - 6, y, (tw + 12) * ss(seg(a, .2, .75)), h); g.clip();
  g.fillStyle = INK; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, x + pad + icon, y + 17 + lh / 2 + i * lh));
  g.restore(); g.restore();
}

// ---------------- background: pale ground + iso dot lattice ----------------
function background(g, iso) {
  g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
  let sp = 2; while (sp * iso.cam.k < 46) sp *= 2;
  const c = iso.cam, z = c.z;
  const [ax, ay] = iso.unP(0, 0, z), [bx, by] = iso.unP(W, 0, z), [cx, cy] = iso.unP(0, H, z), [dx, dy] = iso.unP(W, H, z);
  const X0 = Math.floor(Math.min(ax, bx, cx, dx) / sp) * sp, X1 = Math.max(ax, bx, cx, dx), Y0 = Math.floor(Math.min(ay, by, cy, dy) / sp) * sp, Y1 = Math.max(ay, by, cy, dy);
  g.fillStyle = 'rgba(46,37,34,.09)';
  for (let x = X0; x <= X1; x += sp) for (let y = Y0; y <= Y1; y += sp) { const [sx, sy] = iso.P(x, y, z); if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue; g.fillRect(sx - 1.5, sy - 1.5, 3, 3); }
}

// ---------------- render ----------------
export function render(g, t, Q, texts = false) {
  TX = texts ? [] : null;
  t = clamp(t, 0, TL.end - 1e-3);
  const iso = new Iso(g, W, H);
  iso.cam = camAt(t);
  background(g, iso);
  drawWorld(iso, t);
  iso.flush();
  // route line on the reveal
  const endA = seg(t, S('end').t0 + 1.6, S('end').t0 + 3.6); if (endA > 0) routeLine(iso, endA, { lw: 3 });
  title(iso, t);
  // tracking ring on the subject when it lands on a new floor
  const sub = subject(t); if (sub) { const [sx, sy] = iso.P(...sub.p); const f = FLOORS.find(f => t >= S(f).t0 - .2 && t < S(f).t0 + .9), a = f ? seg(t, S(f).t0 - .2, S(f).t0 + .2) * (1 - seg(t, S(f).t0 + .6, S(f).t0 + .9)) : 0; ring(g, sx, sy, 70, a, t, sub.tag, { ts: 24 }); }
  labels(iso, t);
  verdict(iso, t);
  vetInset(iso, t);
  isotypeSame(g, t);
  endStations(iso, t);
  legend(g, t);
  if (!Q || !Q.has('nosub')) subtitle(g, t);
  return TX;
}

// ---------------- events for sound ----------------
export function events() {
  const E = [], s = S, v = V, ev = (t, type, o = {}) => E.push({ t: +t.toFixed(3), type, ...o });
  ev(0, 'sizzle', { dur: s('plate').t1 }); ev(v('a01_2').t0 + .15, 'title'); ev(v('a01_2').t0 + .5, 'title');
  ev(s('plate').t1 - 1.2, 'whoosh', { dur: 2.2 }); ev(s('farm').t0 + 1.0, 'land');
  ev(s('farm').t0, 'farm', { dur: s('truck').t1 - s('farm').t0 });
  ev(wordT('a02_2', .55), 'pop');
  ev(s('truck').t0 + .2, 'engine', { dur: s('truck').t1 - s('truck').t0 + .4 });
  for (let i = 0; i < 5; i++) ev(wordT('a02_3', .55) + i * .2 * (wordT('a02_3', .95) - wordT('a02_3', .55)), 'pop', { n: i });
  ev(s('gate').t0 + .3, 'brake'); for (let i = 0; i < 3; i++) ev(s('gate').t0 + .5 + i * .33, 'thud', { n: i });
  for (let i = 0; i < 4; i++) ev(wordT('a03_1', .5 + i * .12), 'beep', { n: i });
  ev(v('a03_2').t0 + .1, 'ding'); ev(wordT('a03_2', .6), 'buzz');
  ev(s('grind').t0, 'drop', { dur: 1 });
  for (const f of FLOORS) { ev(s(f).t0 + .1, 'whoosh', { dur: .9 }); ev(s(f).t0 + .9, 'land'); }
  ev(s('grind').v0, 'grinder', { dur: s('grind').v1 - s('grind').v0 + .3 });
  ev(s('mix').v0, 'mixer', { dur: s('mix').t1 - s('mix').v0 }); for (let i = 0; i < 4; i++) ev(s('mix').v0 + .6 + i * .55, 'pour', { n: i });
  for (let i = 0; i < 24; i++) ev(wordT('a05_1', .62) + i * 1.6 / 24, 'pop', { n: i, soft: 1 });
  { const st = s('fill'), u0 = st.t0 + .3, u1 = st.t1 - .2, span = u1 - u0; ev(u0 + .1 * span, 'piston', { dur: .8 * span }); let last = -1; for (let i = 0; i < 400; i++) { const tt = u0 + span * (.2 + .6 * i / 400); const n = Math.floor(1 + 13 * Math.pow(seg(tt, u0 + .2 * span, u0 + .8 * span), 1.6)); if (n !== last) { ev(tt, 'snap', { n }); last = n; } } }
  ev(s('oven').v0 - .4, 'cut'); ev(s('oven').v0, 'steam', { dur: s('oven').t1 - s('oven').v0 }); ev(wordT('a07_1', .45), 'ding'); ev(wordT('a07_1', .78), 'puff');
  ev(s('cool').v0, 'spray', { dur: s('cool').t1 - s('cool').v0 });
  { const st = s('pack'); ev(st.v0, 'conveyor', { dur: st.t1 - st.v0 }); for (let i = 0; i < 4; i++) ev(wordT('a09_1', .05 + i * .2), ['chop', 'beep', 'vacuum', 'stamp'][i]); ev(wordT('a09_2', .3), 'beep'); for (let i = 0; i < 8; i++) ev(wordT('a09_2', .7) + i * (st.t1 - wordT('a09_2', .7)) / 8, 'thud', { n: i, soft: 1 }); }
  ev(s('dist').t0, 'drop', { dur: 1 }); ev(s('dist').v0, 'city', { dur: s('end').t1 - s('dist').v0 });
  for (const d of DEST) { ev(wordT('a10_1', DEST_FRAC[d.id]) - 1.6, 'engine', { dur: 1.8, soft: 1 }); ev(wordT('a10_1', DEST_FRAC[d.id]), 'pop'); }
  ev(s('home').t0 + .2, 'steps', { dur: s('home').t1 - s('home').t0 - .4 }); ev(s('home').t1 - .2, 'plink'); ev(s('home').t1, 'sizzle', { dur: 3 });
  ev(s('end').t0 + 1.4, 'whoosh', { dur: 2.2 });
  STATIONS.forEach((_, i) => ev(s('end').t0 + 2.6 + i * .16, 'tick', { n: i }));
  for (let i = 0; i < 3; i++) ev(wordT('a11_2', .7 + i * .1), 'stamp', { n: i });
  return E.sort((a, b) => a.t - b.t);
}
