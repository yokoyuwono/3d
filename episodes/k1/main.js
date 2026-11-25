// KALAU KAMU… Episode 1: "Kalau kamu jatuh dari pesawat tanpa parasut".
// Belly-down terminal velocity ≈ 195 km/h, reached in ~12 s; ~-50 °C and thin air at ~10 km (useful consciousness without
// oxygen roughly 30-60 s at cruise altitude). Vesna Vulović (1972): 10,160 m inside a fuselage section that fell onto a
// wooded slope — Guinness record. Juliane Koepcke (1971): ~3 km strapped to her seat into the Amazon, walked 11 days.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { World } from '../../src/world.js';
import { SkyFall, SnowSlope, Jungle } from '../../src/fall.js';

const BASE = './episodes/k1/';
const KEY = /^(Sepuluh|ribu|meter|parasut\.|tiga|menit|selamat|udaranya\.|minus|lima|puluh|tipis\.|pingsan\.|tebal,|dua|belas|detik,|ratus|kilometer|tol\.|Rentangkan|lebar,|beton\.|bersalju,|rawa,|hutan|kaki,|lutut,|berguling\.|kepalamu|Vesna|Vulović,|Guinness|terjepit|pelindungnya\.|Juliane|Koepcke,|kursinya,|Amazon\.|sebelas|hari|lunak\.|keberuntungan|aman|jarang\.|sabuk|komentar\.|petir\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 40000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const T = await loadTiming(BASE + 'assets/timing.json');
const { S, E, wT, sentence: sn, CAPS } = T;
const sky = new SkyFall();
const slope = new SnowSlope();
const jungle = new Jungle();
const world = new World({ life: true });
world.noQuake = true;
const caption = captions($('cap'), CAPS, KEY);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tExit = sn(1, 1).start + 0.4, tLand = sn(9, 1).start + 0.5;
const tAnswer = S(10);
const altAt = (t) => 10000 * Math.pow(clamp(1 - (t - tExit) / (tLand - tExit)), 1.05);
const speedAt = (t) => 195 * smoothstep(tExit, tExit + 7, t);
const tempAt = (t) => 25 - 7.5 * altAt(t) / 1000;
const leftAt = (t) => 180 * clamp(1 - (t - tExit) / (tLand - tExit));
const vesnaAlt = (t) => lerp(10000, 1200, smoothstep(S(10), sn(11, 2).start, t));
const julAlt = (t) => lerp(3000, 600, smoothstep(S(12), sn(12, 1).start, t));
const near = (k, d = 1) => ({ pos: V(lerp(3.2, 2.6, k) * d, lerp(4.5, 4, k) * d, lerp(3.2, 2.8, k) * d), tgt: V(0, 0, 0), fov: 50 });
const below = (k) => ({ pos: V(lerp(5, 4, k), lerp(-5, -4, k), lerp(9, 8, k)), tgt: V(0, 0.3, 0), fov: 45 });
const pov = (k) => ({ pos: V(0, 1.2, 0.01), tgt: V(0, -100, 0.2), fov: 75 });
const side = (k) => ({ pos: V(lerp(-7, -6, k), 0.5, lerp(1, 0, k)), tgt: V(0, 0, 0), fov: 50 });
const town = (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 });
const coast = (k) => ({ pos: V(lerp(22, 20, k), 3.2, lerp(14, 12, k)), tgt: V(4, 0, -4), fov: 50 });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'sky', o: (t) => ({ alt: 6000, tumble: 1 }), cam: near, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'slope', cam: (k) => ({ pos: V(10, 8, 14), tgt: V(0, 1, 0), fov: 50 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'jungle', cam: (k) => ({ pos: V(-4, 3, 8), tgt: V(-2, 1.5, -1), fov: 50 }), glitch: true },
  // hook
  { id: 'cruise', t0: 1.7, t1: sn(1, 1).start, kind: 'sky', o: () => ({ alt: 10000, plane: 0, hideFaller: true, fall: 0 }), camPlane: true },
  { id: 'out', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'sky', o: (t) => ({ alt: altAt(t), plane: Math.max(0, t - tExit), tumble: 1, fall: smoothstep(tExit, tExit + 2, t) }), cam: (k) => ({ pos: V(lerp(-8, -14, k), lerp(4, 10, k), lerp(14, 22, k)), tgt: V(lerp(0, 30, k), lerp(0, 12, k), 0), fov: 55 }) },
  { id: 'nochute', t0: sn(1, 2).start, t1: S(2), kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 1 }), cam: near },
  { id: 'three', t0: S(2), t1: sn(2, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.7 }), cam: below, alt: true },
  { id: 'possible', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.7 }), cam: pov },
  { id: 'someone', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'slope', cam: (k) => ({ pos: V(lerp(14, 10, k), lerp(8, 6, k), lerp(18, 14, k)), tgt: V(0, 1, 0), fov: 50 }) },
  { id: 'how', t0: sn(2, 3).start, t1: sn(2, 4).start, kind: 'jungle', cam: (k) => ({ pos: V(lerp(-6, -4, k), 2.4, lerp(7, 6, k)), tgt: V(-2, 1.5, -1), fov: 50 }) },
  { id: 'watch', t0: sn(2, 4).start, t1: S(3), kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.6 }), cam: side },
  // 1. thin cold air
  { id: 'air', t0: S(3), t1: sn(3, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.6 }), cam: near, filter: 'saturate(0.7) hue-rotate(-10deg)' },
  { id: 'cold', t0: sn(3, 1).start, t1: S(4), kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.6 }), cam: below, alt: true, filter: 'saturate(0.7) hue-rotate(-10deg)' },
  { id: 'hypoxia', t0: S(4), t1: S(4) + 3.5, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.8 }), cam: side },
  { id: 'faint', t0: S(4) + 3.5, t1: sn(4, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 1 }), cam: pov, faint: true },
  { id: 'thicker', t0: sn(4, 1).start, t1: sn(4, 1).start + 3, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.5 }), cam: (k) => ({ pos: V(lerp(30, 24, k), lerp(-12, -10, k), 30), tgt: V(0, -40, 0), fov: 55 }), faint: 'wake' },
  { id: 'wake', t0: sn(4, 1).start + 3, t1: S(5), kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.4 }), cam: near },
  // 2. speed and the spread position
  { id: 'speed', t0: S(5), t1: sn(5, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.4 }), cam: side, alt: true },
  { id: 'max', t0: sn(5, 1).start, t1: sn(5, 1).start + 3.9, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.3 }), cam: below, alt: true },
  { id: 'streak', t0: sn(5, 1).start + 3.9, t1: sn(5, 2).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.2 }), cam: pov },
  { id: 'car', t0: sn(5, 2).start, t1: S(6), kind: 'world', cam: town },
  { id: 'nomore', t0: S(6), t1: sn(6, 2).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0.2 }), cam: near },
  { id: 'spread', t0: sn(6, 2).start, t1: sn(6, 3).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0 }), cam: (k) => ({ pos: V(0.1, lerp(6, 5, k), 0.3), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'spread2', t0: sn(6, 3).start, t1: sn(6, 3).start + 3, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0 }), cam: below },
  { id: 'steer', t0: sn(6, 3).start + 3, t1: S(7), kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0 }), cam: (k) => ({ pos: V(lerp(-4, 4, k), 3, 5), tgt: V(0, -20, 0), fov: 55 }) },
  // 3. where to land
  { id: 'where', t0: S(7), t1: sn(7, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0 }), cam: pov },
  { id: 'water', t0: sn(7, 1).start, t1: sn(7, 2).start, kind: 'world', cam: coast, land: 1 },
  { id: 'concrete', t0: sn(7, 2).start, t1: S(8), kind: 'world', cam: coast, land: 1, filter: 'contrast(1.2)' },
  { id: 'better', t0: S(8), t1: sn(8, 1).start, kind: 'sky', o: (t) => ({ alt: altAt(t), tumble: 0 }), cam: pov, land: 1 },
  { id: 'snow', t0: sn(8, 1).start, t1: sn(8, 1).start + 3, kind: 'slope', land: 2, cam: (k) => ({ pos: V(lerp(-30, -24, k), 20, lerp(40, 34, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'trees', t0: sn(8, 1).start + 3, t1: S(9), kind: 'jungle', land: 4, cam: (k) => ({ pos: V(lerp(-20, -16, k), lerp(24, 20, k), lerp(30, 26, k)), tgt: V(0, 8, 0), fov: 50 }) },
  { id: 'brace', t0: S(9), t1: S(9) + 3.6, kind: 'sky', o: (t) => ({ alt: Math.max(altAt(t), 30), tumble: 0, pose: 'brace', upright: true }), cam: (k) => ({ pos: V(lerp(4, 3, k), 1, lerp(4, 3, k)), tgt: V(0, 0.5, 0), fov: 50 }) },
  { id: 'brace2', t0: S(9) + 3.6, t1: sn(9, 1).start, kind: 'sky', o: (t) => ({ alt: Math.max(altAt(t), 30), tumble: 0, pose: 'brace', upright: true }), cam: (k) => ({ pos: V(-3, lerp(-1, 0, k), 3.5), tgt: V(0, 0.6, 0), fov: 50 }) },
  { id: 'head', t0: sn(9, 1).start, t1: S(10), kind: 'sky', o: () => ({ alt: 30, tumble: 0, pose: 'brace', upright: true, fall: 0.3 }), cam: (k) => ({ pos: V(0.2, 1.4, lerp(3, 2.4, k)), tgt: V(0, 1.4, 0), fov: 45 }) },
  // 4. the true stories
  { id: 'vesna', t0: S(10), t1: sn(10, 1).start, kind: 'sky', o: (t) => ({ alt: vesnaAlt(t), chunk: true, hideFaller: false, tumble: 0.3 }), cam: (k) => ({ pos: V(lerp(-14, -12, k), lerp(6, 5, k), lerp(16, 14, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'vesna2', t0: sn(10, 1).start, t1: sn(10, 1).start + 5.2, kind: 'sky', o: (t) => ({ alt: vesnaAlt(t), chunk: true, tumble: 0.3 }), cam: (k) => ({ pos: V(lerp(8, 10, k), lerp(-6, -8, k), 12), tgt: V(0, 0, 0), fov: 50 }), rec: true },
  { id: 'vesna3', t0: sn(10, 1).start + 5.2, t1: S(11), kind: 'sky', o: (t) => ({ alt: vesnaAlt(t), chunk: true, tumble: 0.3 }), cam: pov, rec: true },
  { id: 'record', t0: S(11), t1: sn(11, 1).start, kind: 'slope', cam: (k) => ({ pos: V(lerp(16, 12, k), lerp(9, 7, k), lerp(20, 16, k)), tgt: V(0, 1, 0), fov: 50 }), rec: true },
  { id: 'trapped', t0: sn(11, 1).start, t1: sn(11, 2).start, kind: 'sky', o: (t) => ({ alt: vesnaAlt(t), chunk: true, tumble: 0.3 }), cam: (k) => ({ pos: V(lerp(-6, -5, k), 1.5, lerp(5, 4, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'shield', t0: sn(11, 2).start, t1: sn(11, 3).start, kind: 'slope', cam: (k) => ({ pos: V(lerp(-8, -6, k), lerp(5, 4, k), lerp(10, 8, k)), tgt: V(0, 1, 0), fov: 50 }) },
  { id: 'alive', t0: sn(11, 3).start, t1: S(12), kind: 'slope', cam: (k) => ({ pos: V(lerp(4, 2, k), lerp(4, 3, k), lerp(30, 26, k)), tgt: V(0, 0, 10), fov: 50 }) },
  { id: 'juliane', t0: S(12), t1: S(12) + 4.5, kind: 'sky', o: (t) => ({ alt: julAlt(t), seat: true, tumble: 0 }), cam: (k) => ({ pos: V(lerp(4, 3, k), lerp(3, 2, k), lerp(5, 4, k)), tgt: V(0, 0.3, 0), fov: 50 }) },
  { id: 'canopy', t0: S(12) + 4.5, t1: sn(12, 1).start, kind: 'jungle', cam: (k) => ({ pos: V(lerp(-20, -10, k), lerp(40, 30, k), lerp(30, 20, k)), tgt: V(0, 10, 0), fov: 50 }) },
  { id: 'walk', t0: sn(12, 1).start, t1: sn(12, 1).start + 2.8, kind: 'jungle', cam: (k) => ({ pos: V(lerp(-6, -4, k), 2.4, lerp(7, 6, k)), tgt: V(-2, 1.5, -1), fov: 50 }), days: true },
  { id: 'rescue', t0: sn(12, 1).start + 2.8, t1: S(13), kind: 'jungle', cam: (k) => ({ pos: V(lerp(6, 4, k), 3, lerp(6, 5, k)), tgt: V(10, 1.2, -5), fov: 50 }) },
  // 5. the secret, and reassurance
  { id: 'secret', t0: S(13), t1: sn(13, 2).start, kind: 'slope', cam: (k) => ({ pos: V(lerp(-30, -24, k), 20, lerp(40, 34, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'soft', t0: sn(13, 2).start, t1: sn(13, 3).start, kind: 'jungle', cam: (k) => ({ pos: V(lerp(-20, -16, k), lerp(24, 20, k), lerp(30, 26, k)), tgt: V(0, 8, 0), fov: 50 }) },
  { id: 'luck', t0: sn(13, 3).start, t1: S(14), kind: 'sky', o: () => ({ alt: 3000, tumble: 0 }), cam: below },
  { id: 'safe', t0: S(14), t1: sn(14, 2).start, kind: 'sky', o: () => ({ alt: 10000, plane: 0, hideFaller: true, fall: 0 }), camPlane: true },
  { id: 'belt', t0: sn(14, 2).start, t1: S(15), kind: 'world', cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'sky', o: () => ({ alt: 1500, tumble: 0 }), cam: pov },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'world', storm: true, cam: (k) => ({ pos: V(-4, 3, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, o = null;
  if (shot.kind === 'sky') {
    o = shot.o(t);
    sky.update(t, o);
    if (o.upright) { sky.faller.root.rotation.set(0, 0.6, 0); sky.faller.pose(t, o.pose, 1); }
    if (shot.cam === pov) { sky.faller.root.visible = false; sky.chunk.visible = false; sky.seat.visible = false; }
    if (shot.camPlane) { const p = sky.plane.position; c = { pos: p.clone().add(V(lerp(-60, -40, k), lerp(14, 10, k), lerp(70, 60, k))), tgt: p.clone().add(V(4, 0, 0)), fov: 45 }; }
    else c = shot.cam(k);
    scene = sky.scene;
  } else if (shot.kind === 'slope') {
    c = shot.cam(k); slope.update(t); scene = slope.scene;
  } else if (shot.kind === 'jungle') {
    c = shot.cam(k); jungle.update(t, 1); scene = jungle.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = 0; world.moodT = 4; world.lifeMode = shot.storm ? 'storm' : 'calm'; world.jumpP = null; world.freezeT = null;
    scene = world.scene;
  }
  const fall = shot.kind === 'sky' && !shot.camPlane ? 0.04 + 0.05 * (o.tumble ?? 0) : 0;
  camera.position.copy(c.pos).add(camShake(t, (shot.glitch ? 0.3 : 0) + fall));
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot);
}

const fmt = (n) => Math.round(n).toLocaleString('id-ID');
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  const q = t > sn(2, 2).start + 0.4 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 1;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'KISAH NYATA: VESNA & JULIANE' : 'SIAPA YANG PERNAH SELAMAT? (di akhir)';
  const al = shot.alt ? pop(t, shot.t0 + 0.2, shot.t1, 0.25, 0.15) : 0;
  show('alt', al);
  if (al) { $('aH').textContent = `${fmt(altAt(t))} m`; $('aV').textContent = `${fmt(speedAt(t))} km/jam`; const tc = tempAt(t); $('aT').textContent = `${tc < 0 ? '−' : ''}${Math.abs(Math.round(tc))}°C`; $('aW').textContent = mmss(leftAt(t)); }
  const ld = shot.land ? pop(t, sn(7, 1).start + 0.3, S(9), 0.3, 0.2) : 0;
  show('land', ld);
  if (ld) ['l1', 'l2', 'l3', 'l4'].forEach((l, i) => ($(l).style.opacity = i === 0 ? (t >= sn(7, 2).start ? 1 : 0.5) : t >= sn(8, 1).start + i * 1.1 ? 1 : 0.15));
  const rc = shot.rec ? pop(t, sn(10, 1).start + 0.5, sn(11, 1).start, 0.3, 0.2) : 0;
  show('rec', rc);
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = shot.filter || 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.faint === true) { const d = smoothstep(shot.t0, shot.t1, t); filter = `brightness(${lerp(1, 0.15, d)}) blur(${(4 * d).toFixed(1)}px) saturate(${lerp(1, 0.2, d)})`; }
  if (shot.faint === 'wake') { const d = 1 - smoothstep(shot.t0, shot.t1, t); filter = `brightness(${lerp(1, 0.15, d)}) blur(${(4 * d).toFixed(1)}px)`; }
  if (shot.storm) filter = `brightness(${0.45 + (Math.sin(t * 7) > 0.97 ? 1.2 : 0)}) saturate(0.5)`;
  renderer.domElement.style.filter = filter;
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tExit, tAnswer]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const F = sky.anchors.faller;
  if (id === 'cruise') tag('cr', '10.000 m', sky.plane.position.clone().add(V(0, 6, 0)), 'yellow big', tin(0.3));
  if (id === 'nochute') tag('nc', 'TANPA PARASUT', F, 'red big', tin(0.1));
  if (id === 'someone') tag('so', 'ADA YANG PERNAH SELAMAT', slope.anchors.chunk, 'green', tin(0.3));
  if (id === 'air') tag('ai', 'BAHAYA PERTAMA: UDARA', F, 'yellow', tin());
  if (id === 'hypoxia') tag('hp', 'SADAR HANYA ±30–60 DETIK', F, 'red', tin(0.3));
  if (id === 'faint') tag('ft', 'PINGSAN…', V(0, -20, 0), 'red', tin(0.6));
  if (id === 'thicker') tag('tk', 'UDARA MAKIN TEBAL → SADAR KEMBALI', V(0, -40, 0), 'green', tin(0.4));
  if (id === 'max') tag('mx', 'MAKS ±200 km/jam', F, 'red', tin(0.6));
  if (id === 'car') tag('cc', 'LEBIH CEPAT DARI MOBIL NGEBUT', V(55, 30, 110), 'yellow', tin());
  if (id === 'spread' || id === 'spread2') tag('sp', 'RENTANGKAN TANGAN & KAKI', F, 'green', tin(0.3));
  if (id === 'steer') tag('st', 'SEDIKIT BISA MENGARAH', V(0, -20, 0), 'blue', tin(0.3));
  if (id === 'concrete') tag('cn', '200 km/jam: AIR ≈ BETON', V(4, 3, -6), 'red big', tin(0.2));
  if (id === 'brace' || id === 'brace2') tag('br', 'KAKI RAPAT · LUTUT DITEKUK', F, 'yellow', tin(0.2));
  if (id === 'head') tag('hd', 'LINDUNGI KEPALA · BERGULING', F, 'yellow', tin(0.2));
  if (id === 'vesna') tag('vs', 'VESNA VULOVIĆ · 1972', F, 'yellow', tin(0.4));
  if (id === 'trapped') tag('tp', 'TERJEPIT DI POTONGAN PESAWAT', F, 'yellow', tin(0.3));
  if (id === 'shield') tag('sh', 'LERENG BERHUTAN', slope.anchors.chunk, 'green', tin(0.3));
  if (id === 'alive') tag('al', 'TULANG PATAH, TAPI HIDUP', slope.anchors.chunk, 'green', tin(0.3));
  if (id === 'juliane') tag('jl', 'JULIANE KOEPCKE · 1971 · ±3 km', F, 'yellow', tin(0.3));
  if (id === 'walk') tag('wk', '11 HARI BERJALAN', jungle.anchors.girl, 'yellow', tin(0.2));
  if (id === 'rescue') tag('rs', 'DITEMUKAN NELAYAN', jungle.anchors.boat, 'green', tin(0.3));
  if (id === 'secret') tag('sc', 'SESUATU YANG MEMPERLAMBAT', slope.anchors.chunk, 'yellow', tin(0.3));
  if (id === 'soft') tag('sf', 'TEMPAT YANG LUNAK', V(0, 16, 0), 'green', tin(0.3));
  if (id === 'safe') tag('sa', 'SALAH SATU TRANSPORTASI TERAMAN', sky.plane.position.clone().add(V(0, 6, 0)), 'green', tin(0.6));
  if (id === 'belt') tag('bt', 'PAKAI SABUK PENGAMAN ✈', V(0, 9, 80), 'yellow', tin(0.3));
  if (id === 'cta') tag('ct', 'KAMU MENDARAT DI MANA? 👇', V(0, -30, 0), 'yellow', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}

const CH = [S(3), S(5), S(7), S(10), S(13)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'sky' ? (s.camPlane ? 'cabin' : 'wind') : s.kind === 'slope' ? 'snow' : s.kind === 'jungle' ? 'jungle' : s.storm ? 'storm' : 'calm');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, exit: tExit, land: tLand, answer: tAnswer, faint: [S(4) + 3.5, sn(4, 1).start + 3], teaser: sn(15, 3).start,
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 3, 5, 8, 10, 13, 15, 19, 21, 24, 28, 33, 37, 41, 44, 46, 49, 53, 56, 60, 66, 70, 73, 76, 78, 81, 85, 89, 92, 95, 99, 102, 105, 109, 114, 119, 124, 128, 132, 136, 140, 144, 147, 150, 155, 159, 163, 168, 175, 179]) renderAt(t);
renderAt(0);
