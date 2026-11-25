// KALAU KAMU… Episode 3: "Kalau kamu terjebak di dasar Palung Jawa".
// Java (Sunda) Trench deepest point 7,192 ± 13 m (Five Deeps, Vescovo, 5 Apr 2019, DSV Limiting Factor); ~+1 atm per 10 m
// → ~720 atm at the bottom; sunlight gone below ~1,000 m; ~1-2 °C; amphipods, snailfish; the expedition reported
// extraordinary ecosystems (BGS/Frontiers). Puncak Jaya 4,884 m.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { DeepSea, SubInside } from '../../src/deep.js';

const BASE = './episodes/k3/';
const KEY = /^(Tujuh|ribu|meter|Jawa\.|Gelap|total\.|naik\.|meremukkan|tetanggamu|Palung|Hindia\.|Indo-Australia|Eurasia\.|gempa\.|Victor|Vescovo|sembilan|puluh|dua|meter\.|Puncak|Jaya,|kilometer|atmosfer\.|ratus|kali|mobil|kuku|busa|Kaleng|titanium|seribu|abadi\.|Celsius,|kulkas\.|Amfipoda,|siput|cahayanya|sendiri\.|ekosistem|panik\.|oksigen|pemberat|besi\.|berjam-jam\.|robot|rumah|manusia\.|komentar\.|Skala)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
[[-10.2, 103.5], [-10.8, 107], [-11.13, 114.94], [-11.4, 118.5], [-11.2, 121.5]].forEach(([la, lo], i) => globe.addMarker(`tr${i}`, la, lo, i === 2 ? 0xff3b30 : 0x3aa0ff));
const TR = ['tr0', 'tr1', 'tr2', 'tr3', 'tr4'];
const deep = new DeepSea();
const inside = new SubInside();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = S(14);
const dive = (a, b, d0, d1) => (t) => lerp(d0, d1, smoothstep(a, b, t));
const subFront = (k) => ({ pos: V(lerp(5, 4, k), lerp(0.5, 0.2, k), lerp(9, 8, k)), tgt: V(0, -0.3, 0), fov: 50 });
const subSide = (k) => ({ pos: V(lerp(-8, -7, k), lerp(1, 0.5, k), lerp(2, 3, k)), tgt: V(0, -0.3, 0.5), fov: 50 });
const subTop = (k) => ({ pos: V(lerp(3, 2, k), lerp(10, 9, k), lerp(-6, -5, k)), tgt: V(0, -1, 2), fov: 50 });
const floorCam = (k) => ({ pos: V(lerp(-1, 0, k), lerp(0.5, 0.2, k), lerp(4, 5, k)), tgt: V(2, -1.6, 10), fov: 50 });
const gTrench = (k) => ({ spin: face(112) + k * 0.06, cam: { pos: V(0, -3, 30), tgt: V(0, -2.5, 0), fov: 45 }, zoom: lerp(1.0, 0.85, k) });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'deep', depth: () => 7192, cam: floorCam, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'inside', calm: 0, cam: (k) => ({ pos: V(0.3, 0.2, 2.0), tgt: V(0, -0.4, -0.6), fov: 65 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'deep', depth: () => 3000, cam: subTop, glitch: true },
  // hook: stuck on the bottom
  { id: 'bottom', t0: 1.7, t1: sn(1, 1).start, kind: 'deep', depth: () => 7192, cam: subFront },
  { id: 'dark', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'deep', depth: () => 7192, lights: () => 0.15, cam: subSide },
  { id: 'stuck', t0: sn(1, 2).start, t1: S(2), kind: 'inside', calm: 0, cam: (k) => ({ pos: V(lerp(0.4, 0.1, k), 0.2, lerp(2.1, 1.9, k)), tgt: V(0, -0.4, -0.6), fov: 65 }) },
  { id: 'crush', t0: S(2), t1: sn(2, 1).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(3.4, 3, k), 0.6, lerp(2.4, 2, k)), tgt: V(1.45, 0.2, 0.8), fov: 45 }) },
  { id: 'what', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'inside', calm: 0, cam: (k) => ({ pos: V(1.4, 0.4, 1.4), tgt: V(0, -0.5, -0.6), fov: 65 }) },
  { id: 'who', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'deep', depth: () => 7192, cam: floorCam },
  { id: 'watch', t0: sn(2, 3).start, t1: S(3), kind: 'deep', depth: () => 7150, cam: subTop },
  // 1. where and how deep
  { id: 'trench', t0: S(3), t1: sn(3, 1).start, kind: 'globe', g: gTrench, markers: TR },
  { id: 'plates', t0: sn(3, 1).start, t1: sn(3, 2).start, kind: 'globe', g: (k) => ({ spin: face(108) + k * 0.1, cam: { pos: V(0, -6, 30), tgt: V(0, -2, 0), fov: 45 }, zoom: 1.2 }), markers: TR },
  { id: 'quakes', t0: sn(3, 2).start, t1: S(4), kind: 'globe', g: (k) => ({ spin: face(100) + k * 0.25, cam: { pos: V(0, -2, 30), tgt: V(0, -1, 0), fov: 45 }, zoom: 1.3 }), markers: TR, shake: 0.15 },
  { id: 'ship', t0: S(4), t1: S(4) + 3.4, kind: 'deep', depth: (t) => lerp(2, 30, smoothstep(S(4), S(4) + 3.4, t)), speed: 1, cam: (k) => ({ pos: V(lerp(30, 24, k), lerp(14, 4, k), lerp(30, 24, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'descend', t0: S(4) + 3.4, t1: S(4) + 7, kind: 'deep', depth: dive(S(4) + 3.4, S(4) + 7, 30, 2500), speed: 4, cam: subFront, gauge: true },
  { id: 'deeper', t0: S(4) + 7, t1: S(5), kind: 'deep', depth: dive(S(4) + 7, S(5), 2500, 7192), speed: 4, cam: subTop, gauge: true },
  { id: 'howdeep', t0: S(5), t1: sn(5, 1).start, kind: 'deep', depth: () => 7192, cam: floorCam },
  { id: 'jaya', t0: sn(5, 1).start, t1: sn(5, 1).start + 4.6, kind: 'deep', depth: () => 7192, cam: subSide, cmp: true },
  { id: 'jaya2', t0: sn(5, 1).start + 4.6, t1: E(5) + 0.4, kind: 'deep', depth: dive(sn(5, 1).start + 4.6, E(5) + 0.4, 7192, 4800), speed: -4, cam: (k) => ({ pos: V(lerp(0, 4, k), lerp(-6, -3, k), 8), tgt: V(0, 0, 0), fov: 50 }), cmp: true },
  // 2. pressure
  { id: 'atm', t0: S(6), t1: sn(6, 1).start, kind: 'deep', depth: dive(S(6), sn(6, 1).start, 0, 3000), speed: 3, cam: subFront, gauge: true },
  { id: 'x700', t0: sn(6, 1).start, t1: sn(6, 2).start, kind: 'deep', depth: () => 7192, cam: subTop, big: 'press' },
  { id: 'nail', t0: sn(6, 2).start, t1: S(7), kind: 'inside', calm: 1, cam: (k) => ({ pos: V(lerp(0.6, 0.4, k), 0.0, lerp(1.6, 1.4, k)), tgt: V(0, -0.5, -0.6), fov: 60 }), big: 'nail' },
  { id: 'cup', t0: S(7), t1: sn(7, 1).start, kind: 'deep', depth: () => 7192, press: (t) => smoothstep(S(7), sn(7, 1).start, t), cam: (k) => ({ pos: V(lerp(3.4, 3, k), 0.6, lerp(2.4, 2.2, k)), tgt: V(1.45, 0.2, 1.0), fov: 40 }) },
  { id: 'can', t0: sn(7, 1).start, t1: sn(7, 2).start, kind: 'deep', depth: () => 7192, press: (t) => lerp(0.1, 1, smoothstep(sn(7, 1).start, sn(7, 1).start + 0.6, t)), cam: (k) => ({ pos: V(3, 0.5, lerp(1.4, 1.2, k)), tgt: V(1.45, 0.2, 0.4), fov: 40 }) },
  { id: 'sphere', t0: sn(7, 2).start, t1: S(8), kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(2.6, 2.2, k), -0.8, lerp(4.4, 4, k)), tgt: V(0, -0.6, 1.6), fov: 45 }) },
  // 3. dark, cold, alive
  { id: 'nolight', t0: S(8), t1: sn(8, 1).start, kind: 'deep', depth: dive(S(8), sn(8, 1).start, 300, 1200), speed: 3, cam: subSide, gauge: true },
  { id: 'night', t0: sn(8, 1).start, t1: sn(8, 2).start, kind: 'deep', depth: () => 4000, lights: () => 0.2, cam: subTop },
  { id: 'cold', t0: sn(8, 2).start, t1: S(9), kind: 'deep', depth: () => 7192, cam: floorCam, gauge: true },
  { id: 'alive', t0: S(9), t1: sn(9, 1).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(0, 1, k), lerp(1, 0.6, k), lerp(5, 7, k)), tgt: V(2, -1.8, 10), fov: 45 }) },
  { id: 'amph', t0: sn(9, 1).start, t1: sn(9, 2).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(4.6, 4.2, k), lerp(-0.6, -0.9, k), lerp(7.4, 7.8, k)), tgt: V(2, -1.8, 10), fov: 42 }) },
  { id: 'snail', t0: sn(9, 2).start, t1: sn(9, 3).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(-4, -2, k), -0.8, lerp(4, 4.5, k)), tgt: V(-2, -1.4, 8), fov: 45 }) },
  { id: 'glow', t0: sn(9, 3).start, t1: S(10), kind: 'deep', depth: () => 2500, lights: () => 0.2, cam: (k) => ({ pos: V(0, 0, 0.5), tgt: V(lerp(-4, 4, k), 0, 20), fov: 60 }) },
  { id: 'found', t0: S(10), t1: S(10) + 4.4, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(-6, -2, k), lerp(3, 2, k), lerp(16, 14, k)), tgt: V(1, -1.6, 9), fov: 50 }) },
  { id: 'found2', t0: S(10) + 4.4, t1: S(11), kind: 'globe', g: gTrench, markers: TR },
  // 4. stuck: what to do
  { id: 'trapped', t0: S(11), t1: sn(11, 1).start, kind: 'deep', depth: () => 7192, cam: subSide },
  { id: 'calm', t0: sn(11, 1).start, t1: S(12), kind: 'inside', calm: 1, plan: 1, cam: (k) => ({ pos: V(lerp(0.4, 0.1, k), 0.2, lerp(2.1, 1.9, k)), tgt: V(0, -0.4, -0.6), fov: 65 }) },
  { id: 'oxygen', t0: S(12), t1: sn(12, 1).start, kind: 'inside', calm: 1, plan: 1, cam: (k) => ({ pos: V(1.4, 0.4, 1.4), tgt: V(0, -0.5, -0.6), fov: 65 }) },
  { id: 'drop', t0: sn(12, 1).start, t1: sn(12, 3).start, kind: 'deep', depth: (t) => 7192 - 40 * smoothstep(sn(12, 2).start, sn(12, 3).start + 2, t), drop: (t) => smoothstep(sn(12, 1).start + 0.4, sn(12, 2).start + 0.5, t), speed: -1, cam: (k) => ({ pos: V(lerp(6, 5, k), lerp(-3, -1, k), lerp(6, 5, k)), tgt: V(0, -1.5, 0), fov: 50 }), plan: 2 },
  { id: 'rise', t0: sn(12, 3).start, t1: S(13), kind: 'deep', depth: dive(sn(12, 3).start, S(13), 7000, 4000), drop: () => 1, speed: -4, cam: subTop, plan: 3, gauge: true },
  { id: 'rov', t0: S(13), t1: S(13) + 3.8, kind: 'deep', depth: () => 7192, rov: (t) => smoothstep(S(13), S(13) + 3.6, t), cam: (k) => ({ pos: V(lerp(-6, -5, k), lerp(4, 3, k), lerp(9, 8, k)), tgt: V(1, 1, 1), fov: 50 }), plan: 4 },
  { id: 'rov2', t0: S(13) + 3.8, t1: S(14), kind: 'deep', depth: (t) => 7192 - 30 * smoothstep(S(13) + 4, S(14), t), rov: () => 1, speed: -1, cam: subFront, plan: 4 },
  // 5. answer
  { id: 'neighbours', t0: S(14), t1: sn(14, 1).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(4.6, 4.2, k), lerp(-0.6, -0.9, k), lerp(7.4, 7.8, k)), tgt: V(2, -1.8, 10), fov: 42 }) },
  { id: 'home', t0: sn(14, 1).start, t1: sn(14, 2).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(-4, -2, k), -0.8, lerp(4, 4.5, k)), tgt: V(-2, -1.4, 8), fov: 45 }) },
  { id: 'home2', t0: sn(14, 2).start, t1: sn(14, 3).start, kind: 'deep', depth: () => 7192, cam: (k) => ({ pos: V(lerp(4.6, 4.2, k), lerp(-0.6, -0.9, k), lerp(7.4, 7.8, k)), tgt: V(2, -1.8, 10), fov: 42 }) },
  { id: 'unseen', t0: sn(14, 3).start, t1: S(15), kind: 'deep', depth: () => 7192, lights: () => 0.6, cam: (k) => ({ pos: V(0, lerp(2, 12, k), lerp(8, 20, k)), tgt: V(0, -2, 0), fov: 55 }) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'deep', depth: (t) => lerp(400, 50, smoothstep(S(15), sn(15, 2).start, t)), speed: -3, cam: subTop },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'globe', g: (k) => ({ spin: face(112) + k * 0.4, cam: { pos: V(0, 0, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: lerp(1.6, 3.2, k) }), markers: [] },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
let curDepth = 0;
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c;
  if (shot.kind === 'globe') {
    const g = shot.g(k);
    globe.update(t, g.spin, { markers: shot.markers || [], clouds: 0.3 });
    c = { ...g.cam, pos: g.cam.tgt.clone().add(g.cam.pos.clone().sub(g.cam.tgt).multiplyScalar(g.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'deep') {
    c = shot.cam(k);
    curDepth = val(shot.depth, t);
    deep.update(t, { depth: curDepth, speed: shot.speed ?? 0, press: shot.press ? shot.press(t) : undefined, drop: val(shot.drop, t), rov: shot.rov ? shot.rov(t) : -1, lights: shot.lights ? shot.lights(t) : undefined });
    scene = deep.scene;
  } else if (shot.kind === 'inside') {
    c = shot.cam(k);
    inside.update(t, shot.calm);
    scene = inside.scene;
  }
  camera.position.copy(c.pos).add(camShake(t, (shot.glitch ? 0.3 : 0) + (shot.shake || 0) + (shot.kind === 'deep' ? 0.01 : 0)));
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  renderer.render(scene, camera);
  overlays(t, shot);
}

const fmt = (n) => Math.round(n).toLocaleString('id-ID');
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  const q = t > sn(2, 2).start + 0.3 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 2.5;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: AMFIPODA, IKAN SIPUT & KAWAN-KAWAN' : 'SIAPA TETANGGAMU DI BAWAH SANA? (di akhir)';
  const gg = shot.gauge ? pop(t, shot.t0 + 0.1, shot.t1, 0.25, 0.15) : 0;
  show('gauge', gg);
  if (gg) {
    const d = curDepth;
    $('gD').textContent = `${fmt(d)} m`; $('gP').textContent = `${fmt(1 + d / 10)} atm`;
    const temp = d < 200 ? lerp(28, 15, d / 200) : d < 1000 ? lerp(15, 4, (d - 200) / 800) : lerp(4, 1.5, clamp((d - 1000) / 6000));
    $('gT').textContent = `${temp.toFixed(d > 1000 ? 1 : 0).replace('.', ',')}°C`;
    $('gL').textContent = d < 200 ? 'terang' : d < 1000 ? 'redup' : 'GELAP TOTAL';
  }
  show('cmp', shot.cmp ? pop(t, sn(5, 1).start + 0.3, E(5) + 0.4, 0.3, 0.2) : 0);
  const bg = shot.big ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('big', bg);
  if (bg) {
    if (shot.big === 'press') { $('bA').textContent = 'TEKANAN DI DASAR'; $('bV').textContent = '±700×'; $('bU').textContent = 'tekanan di permukaan'; }
    if (shot.big === 'nail') { $('bA').textContent = 'SETIAP KUKU JARIMU'; $('bV').textContent = '≈ 1 mobil'; $('bU').textContent = 'kecil yang menekan'; }
  }
  const pl = shot.plan ? pop(t, sn(11, 1).start + 0.3, S(14), 0.3, 0.2) : 0;
  show('plan', pl);
  if (pl) ['p1', 'p2', 'p3', 'p4'].forEach((p, i) => ($(p).style.opacity = shot.plan > i ? 1 : 0.15));
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  renderer.domElement.style.filter = shot.glitch ? 'contrast(1.25) saturate(1.3)' : 'none';
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tAnswer + 2.5]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.6 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const D = deep.anchors;
  if (id === 'bottom') tag('bt', '7.192 m · PALUNG JAWA', D.sub, 'yellow', tin(0.3));
  if (id === 'crush') tag('cr', 'TEKANAN AIR', D.cup, 'red', tin(0.3));
  if (id === 'who') tag('wh', 'TETANGGA?', D.floor, 'yellow big', tin(0.3));
  if (id === 'trench') tag('tr', 'PALUNG JAWA', globe.markerPos('tr2', 1), 'red', tin(0.3));
  if (id === 'plates') tag('pl', 'LEMPENG INDO-AUSTRALIA ↗ EURASIA', globe.markerPos('tr1', 1), 'yellow', tin(0.3));
  if (id === 'ship') tag('sh', 'VESCOVO · 2019', V(0, 14, -10), 'yellow', tin(0.3));
  if (id === 'cup') tag('cp', 'GELAS BUSA MENGERUT', D.cup, 'yellow', tin(0.3));
  if (id === 'can') tag('cn', 'KALENG: REMUK!', V(1.45, 0.9, 0.4), 'red', tin(0.1));
  if (id === 'sphere') tag('sp', 'BOLA TITANIUM TEBAL', V(0, 0.8, 1.6), 'blue', tin(0.3));
  if (id === 'amph') tag('am', 'AMFIPODA', V(2, -0.6, 10), 'yellow', tin(0.3));
  if (id === 'snail') tag('sn', 'IKAN SIPUT', V(-2, -0.4, 8), 'yellow', tin(0.3));
  if (id === 'glow') tag('gw', 'CAHAYA SENDIRI', V(0, 2, 16), 'blue', tin(0.3));
  if (id === 'found') tag('fd', 'EKOSISTEM LUAR BIASA', D.floor, 'green', tin(0.3));
  if (id === 'drop') tag('dp', 'LEPAS PEMBERAT!', V(0, -3, 0), 'yellow', tin(0.5));
  if (id === 'rov') tag('rv', 'ROBOT BAWAH LAUT', deep.rov.position.clone().add(V(0, 1.4, 0)), 'yellow', tin(0.3));
  if (id === 'unseen') tag('us', 'SEBAGIAN BESAR BELUM PERNAH DILIHAT MANUSIA', V(0, 0, 0), 'blue', tin(0.6));
  if (id === 'cta') tag('ct', 'KAMU BERANI? 👇', D.sub, 'yellow', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}

const CH = [S(3), S(6), S(8), S(11), S(14)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, answer: tAnswer + 2.5, can: sn(7, 1).start + 0.3, drop: sn(12, 1).start + 0.4, teaser: sn(15, 3).start,
  dives: [[S(4) + 3.4, S(5)], [S(6), sn(6, 1).start], [S(8), sn(8, 1).start]], rise: [sn(12, 3).start, S(13)], rov: [S(13), S(14)],
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), s.kind]),
};
for (const t of [0.3, 0.9, 1.4, 3, 6, 8, 11, 15, 18, 20, 23, 28, 32, 36, 39, 42, 47, 52, 58, 63, 68, 72, 74, 77, 83, 86, 90, 94, 98, 102, 105, 110, 114, 118, 121, 124, 128, 133, 138, 143, 146, 150, 154, 158, 162, 167, 171]) renderAt(t);
renderAt(0);
