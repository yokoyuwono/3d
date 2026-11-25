// ANDAI… Season 2, Episode 3: "Andai semua orang Indonesia melompat bersamaan".
// 284.67 M people (BPS SUPAS 2025) x ~50 kg ≈ 1.4e10 kg; Earth 6e24 kg (≈ 4e14 x heavier) → recoil of a ~0.4 m jump
// ≈ 1e-15 m (smaller than a nucleus). Jump energy ≈ m g h ≈ 200 J each → ≈ 6e10 J ≈ 13 t TNT in total.
// Seattle "Swift Quake" (July 2023) ≈ M2.3 signal; M6 releases ~10^(1.5*3.7) ≈ 350,000x more energy.
// London Millennium Bridge swayed from synchronized footsteps (June 2000) and closed for repairs.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { MountainScene } from '../../src/mountain.js';
import { WarungScene } from '../../src/oxygen.js';
import { StadiumScene, BridgeScene, AtomScene } from '../../src/jump.js';

const BASE = './episodes/s2e3/';
const KEY = /^(Dua|ratus|delapan|puluh|lima|juta|melompat,|bergeser\?|gempa\?|mengejutkan\.|berbahaya,|jam\.|tiga|zona|WIB,|WITA,|WIT\.|Tiga\.|Dua\.|Satu\.|Lompat!|empat|belas|ton|triliun|atom\.|bahan|peledak\.|otot,|magnitudo|koma|enam|ribu|bangunan,|Millennium|seirama\.|ditutup|terkilir,|motor,|perahu\.|urut|kompak|komentar\.|Jakarta|tenggelam,)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
const CITY = [['medan', 3.59, 98.67], ['padang', -0.95, 100.35], ['bandung', -6.9, 107.6], ['surabaya', -7.26, 112.75], ['bali', -8.65, 115.2], ['pontianak', -0.03, 109.33], ['balikpapan', -1.24, 116.85], ['makassar', -5.14, 119.42], ['manado', 1.47, 124.84], ['kupang', -10.17, 123.6], ['ambon', -3.7, 128.18], ['jayapura', -2.53, 140.72], ['merauke', -8.49, 140.4]];
for (const [n, la, lo] of CITY) globe.addMarker(n, la, lo, 0xffd23a);
const MK = ['jakarta', ...CITY.map((c) => c[0])];
const world = new World({ life: true });
world.noQuake = true;
const jaya = new MountainScene('jaya');
const warung = new WarungScene();
const stadium = new StadiumScene();
const bridge = new BridgeScene();
const atom = new AtomScene();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tJ = sn(4, 3).start + 0.15;                                  // "Lompat!"
const tDanger = sn(2, 4).start, tAnswer = S(10);
const loopJump = (period = 1.3, t0 = 0) => (t) => (((t - t0) % period) + period) % period / 0.9;
const once = (t0, dur = 0.9) => (t) => (t - t0) / dur;
const town = (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 });
const sea = (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5, k), lerp(70, 64, k)), tgt: V(0, 8, -60), fov: 56 });
const aerial = (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 });
const wcam = (k) => ({ pos: V(lerp(-6.5, -5.5, k), 2.3, lerp(4.8, 4.2, k)), tgt: V(0, 1.4, 0), fov: 50 });
const wfront = (k) => ({ pos: V(lerp(-0.9, -1.1, k), 1.8, lerp(1.2, 1.0, k)), tgt: V(-1.6, 1.4, -1), fov: 45 });
const kids = (k) => ({ pos: V(lerp(7, 6.5, k), 1.4, lerp(-4.5, -4.2, k)), tgt: V(5, 0.9, -2.5), fov: 45 });
const gIndo = (lon = 118, z = 1.25) => (k) => ({ spin: face(lon) + k * 0.15, cam: { pos: V(0, 2, 30), tgt: V(0, -1, 0), fov: 45 }, zoom: z });
const stad = (k) => ({ pos: V(lerp(-30, -24, k), lerp(14, 12, k), lerp(40, 34, k)), tgt: V(0, 3, -10), fov: 50 });
const brg = (k) => ({ pos: V(lerp(-24, -20, k), lerp(8, 7, k), lerp(-30, -24, k)), tgt: V(0, 1, 10), fov: 50 });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'stadium', cam: stad, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'globe', g: gIndo(118, 1.1), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'bridge', sway: 1, cam: brg, glitch: true },
  // hook
  { id: 'people', t0: 1.7, t1: sn(1, 1).start, kind: 'world', cam: town },
  { id: 'signal', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'warung', cam: wfront },
  { id: 'jumpall', t0: sn(1, 2).start, t1: S(2), kind: 'world', jump: loopJump(1.3, sn(1, 2).start + 0.6), cam: town },
  { id: 'q1', t0: S(2), t1: sn(2, 1).start, kind: 'globe', g: gIndo(118, 1.2) },
  { id: 'q2', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'world', seis: 'q', cam: sea },
  { id: 'q3', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'warung', cam: wcam },
  { id: 'surprise', t0: sn(2, 3).start, t1: sn(2, 4).start, kind: 'stadium', cam: stad },
  { id: 'danger', t0: sn(2, 4).start, t1: sn(2, 5).start, kind: 'bridge', sway: 0.6, cam: brg },
  { id: 'watch', t0: sn(2, 5).start, t1: S(3), kind: 'world', jump: loopJump(1.3, sn(2, 5).start), cam: sea },
  // 1. the clock
  { id: 'clock', t0: S(3), t1: sn(3, 1).start, kind: 'globe', g: gIndo(118, 1.2) },
  { id: 'zones', t0: sn(3, 1).start, t1: sn(3, 2).start + 2.8, kind: 'globe', g: gIndo(122, 1.1), zones: true },
  { id: 'zones2', t0: sn(3, 2).start + 2.8, t1: sn(3, 3).start, kind: 'jaya', zones: true, cam: (k) => ({ pos: V(lerp(-150, -120, k), lerp(70, 64, k), lerp(150, 125, k)), tgt: V(0, 38, 0), fov: 45 }) },
  { id: 'radio', t0: sn(3, 3).start, t1: sn(3, 3).start + 2.8, kind: 'warung', cam: wfront },
  { id: 'phones', t0: sn(3, 3).start + 2.8, t1: S(4), kind: 'world', cam: sea },
  // 2. 3-2-1 jump
  { id: 'c3', t0: S(4), t1: sn(4, 1).start, kind: 'world', count: '3', cam: town },
  { id: 'c2', t0: sn(4, 1).start, t1: sn(4, 2).start, kind: 'warung', count: '2', cam: wcam },
  { id: 'c1', t0: sn(4, 2).start, t1: sn(4, 3).start, kind: 'jaya', count: '1', cam: (k) => ({ pos: V(-95, 68, 135), tgt: V(0, 40, 0), fov: 45 }) },
  { id: 'go', t0: sn(4, 3).start, t1: S(5), kind: 'warung', count: 'LOMPAT!', jumpW: once(tJ), cam: (k) => ({ pos: V(lerp(-9, -8, k), 3, lerp(9, 8, k)), tgt: V(1, 1.2, -1), fov: 50 }) },
  { id: 'mass', t0: S(5), t1: S(5) + 4.4, kind: 'world', jump: once(S(5) - 0.5, 4.6), slow: true, big: 'mass', cam: (k) => ({ pos: V(lerp(-5, -4, k), lerp(2.2, 2.6, k), lerp(52, 50, k)), tgt: V(0, 2, 70), fov: 50 }) },
  { id: 'mass2', t0: S(5) + 4.4, t1: S(6), kind: 'warung', jumpW: once(S(5) + 4.2, 4.6), slow: true, big: 'mass', cam: kids },
  // 3. does the Earth move?
  { id: 'push', t0: S(6), t1: sn(6, 1).start, kind: 'globe', g: gIndo(118, 1.4) },
  { id: 'tiny', t0: sn(6, 1).start, t1: sn(6, 2).start, kind: 'globe', g: gIndo(105, 1.0) },
  { id: 'ratio', t0: sn(6, 2).start, t1: sn(6, 3).start, kind: 'globe', g: gIndo(90, 1.6), big: 'ratio' },
  { id: 'atom', t0: sn(6, 3).start, t1: sn(6, 4).start, kind: 'atom', cam: (k) => ({ pos: V(lerp(4, 2, k), lerp(4, 3, k), lerp(22, 16, k)), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'land', t0: sn(6, 4).start, t1: S(7), kind: 'world', jump: (t) => 0.75 + (t - sn(6, 4).start) * 0.08, cam: town },
  // 4. an earthquake?
  { id: 'quake', t0: S(7), t1: sn(7, 1).start, kind: 'world', seis: 'q', cam: sea },
  { id: 'tnt', t0: sn(7, 1).start, t1: sn(7, 2).start, kind: 'world', big: 'tnt', jump: loopJump(1.6, sn(7, 1).start), cam: aerial },
  { id: 'spread', t0: sn(7, 2).start, t1: sn(7, 3).start, kind: 'globe', g: gIndo(118, 1.1) },
  { id: 'absorb', t0: sn(7, 3).start, t1: sn(7, 3).start + 3, kind: 'warung', jumpW: loopJump(1.5, sn(7, 3).start), cam: kids },
  { id: 'absorb2', t0: sn(7, 3).start + 3, t1: S(8), kind: 'world', jump: loopJump(1.5, sn(7, 3).start), cam: town },
  { id: 'seis', t0: S(8), t1: sn(8, 1).start, kind: 'world', seis: 'q', cam: sea },
  { id: 'concert', t0: sn(8, 1).start, t1: sn(8, 1).start + 5.6, kind: 'stadium', cam: stad },
  { id: 'concert2', t0: sn(8, 1).start + 5.6, t1: sn(8, 2).start, kind: 'stadium', seis: 'concert', cam: (k) => ({ pos: V(lerp(10, 6, k), 4, lerp(16, 12, k)), tgt: V(0, 2, -14), fov: 50 }) },
  { id: 'feel', t0: sn(8, 2).start, t1: S(9), kind: 'stadium', cam: (k) => ({ pos: V(lerp(40, 30, k), lerp(30, 24, k), lerp(70, 60, k)), tgt: V(0, 5, -10), fov: 50 }) },
  { id: 'm6', t0: S(9), t1: S(9) + 4.4, kind: 'globe', g: gIndo(105, 1.5), energy: true },
  { id: 'm6b', t0: S(9) + 4.4, t1: S(10), kind: 'world', energy: true, cam: aerial },
  // 5. the real danger
  { id: 'real', t0: S(10), t1: sn(10, 1).start, kind: 'world', cam: town },
  { id: 'notearth', t0: sn(10, 1).start, t1: sn(10, 2).start, kind: 'globe', g: gIndo(118, 1.2) },
  { id: 'bld', t0: sn(10, 2).start, t1: S(11), kind: 'bridge', sway: 0.1, cam: brg },
  { id: 'br1', t0: S(11), t1: S(11) + 3.7, kind: 'bridge', sway: 0.25, sync: 0.4, cam: (k) => ({ pos: V(lerp(3, 2, k), 1.8, lerp(-40, -34, k)), tgt: V(0, 1.4, 0), fov: 50 }) },
  { id: 'br2', t0: S(11) + 3.7, t1: sn(11, 1).start, kind: 'bridge', sway: 0.6, sync: 0.8, cam: brg },
  { id: 'br3', t0: sn(11, 1).start, t1: sn(11, 1).start + 3.9, kind: 'bridge', sway: 1, sync: 1, cam: (k) => ({ pos: V(lerp(-60, -50, k), lerp(20, 16, k), lerp(-10, -6, k)), tgt: V(0, 0, 0), fov: 48 }) },
  { id: 'br4', t0: sn(11, 1).start + 3.9, t1: sn(11, 2).start, kind: 'bridge', sway: 1, sync: 1, cam: (k) => ({ pos: V(lerp(2.6, 2.2, k), 1.6, lerp(-10, -8, k)), tgt: V(0, 1.2, 6), fov: 50 }) },
  { id: 'closed', t0: sn(11, 2).start, t1: S(12), kind: 'bridge', sway: 0, empty: true, cam: brg },
  { id: 'fall', t0: S(12), t1: sn(12, 1).start, kind: 'warung', jumpW: once(S(12) + 0.3, 1.2), cam: kids },
  { id: 'hurt', t0: sn(12, 1).start, t1: sn(12, 2).start, kind: 'warung', ouch: true, cam: wcam },
  { id: 'bike', t0: sn(12, 2).start, t1: S(13), kind: 'world', jump: loopJump(1.4, sn(12, 2).start), cam: sea },
  // 6. answer and the special part
  { id: 'ans', t0: S(13), t1: sn(13, 1).start, kind: 'globe', g: gIndo(118, 1.2), verdict: 0 },
  { id: 'ans1', t0: sn(13, 1).start, t1: sn(13, 2).start, kind: 'globe', g: gIndo(112, 1.1), verdict: 1 },
  { id: 'ans2', t0: sn(13, 2).start, t1: sn(13, 3).start, kind: 'world', verdict: 2, cam: sea },
  { id: 'urut', t0: sn(13, 3).start, t1: sn(13, 3).start + 2.8, kind: 'warung', ouch: true, verdict: 3, cam: wfront },
  { id: 'urut2', t0: sn(13, 3).start + 2.8, t1: S(14), kind: 'warung', ouch: true, cam: wcam },
  { id: 'special', t0: S(14), t1: sn(14, 1).start, kind: 'world', jump: loopJump(1.5, S(14)), cam: aerial },
  { id: 'together', t0: sn(14, 1).start, t1: sn(14, 1).start + 3, kind: 'globe', g: gIndo(118, 1.15), pulse: true },
  { id: 'together2', t0: sn(14, 1).start + 3, t1: sn(14, 2).start, kind: 'stadium', cam: (k) => ({ pos: V(lerp(40, 30, k), lerp(30, 24, k), lerp(70, 60, k)), tgt: V(0, 5, -10), fov: 50 }) },
  { id: 'kompak', t0: sn(14, 2).start, t1: S(15), kind: 'world', jump: loopJump(1.4, sn(14, 2).start), cam: (k) => ({ pos: V(-5, lerp(3, 14, k), lerp(50, 40, k)), tgt: V(0, 2, 90), fov: 54 }) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'warung', cam: wfront },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'world', level: (t) => lerp(0, 4, smoothstep(sn(15, 2).start, END, t)), tint: true, cam: (k) => ({ pos: V(lerp(60, 70, k), lerp(70, 60, k), lerp(140, 150, k)), tgt: V(40, 10, 90), fov: 52 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c;
  if (shot.kind === 'globe') {
    const g = shot.g(k);
    const mk = shot.pulse ? MK.filter((_, i) => Math.sin(t * 9 + i) > -0.3) : MK;
    globe.update(t, g.spin, { markers: mk, clouds: 0.3 });
    c = { ...g.cam, pos: g.cam.tgt.clone().add(g.cam.pos.clone().sub(g.cam.tgt).multiplyScalar(g.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = shot.level ? shot.level(t) : 0; world.moodT = 4; world.lifeMode = 'calm';
    world.jumpP = shot.jump ? shot.jump(t) : null;
    world.freezeT = shot.jump ? shot.t0 : null;
    scene = world.scene;
  } else if (shot.kind === 'warung') {
    c = shot.cam(k);
    warung.update(t, 1, { travel: t, jumpP: shot.jumpW ? shot.jumpW(t) : null, ears: shot.ouch });
    scene = warung.scene;
  } else if (shot.kind === 'jaya') {
    c = shot.cam(k);
    jaya.update(t, { ice: 0.45, climb: 0.6 });
    scene = jaya.scene;
  } else if (shot.kind === 'stadium') {
    c = shot.cam(k);
    stadium.update(t, 2.2, 0.45);
    scene = stadium.scene;
  } else if (shot.kind === 'bridge') {
    c = shot.cam(k);
    bridge.walkers.forEach((w) => (w.p.root.visible = !shot.empty));
    bridge.update(t, shot.sway ?? 0, shot.sync ?? 0);
    scene = bridge.scene;
  } else if (shot.kind === 'atom') {
    c = shot.cam(k);
    atom.update(t);
    scene = atom.scene;
  }
  camera.position.copy(c.pos).add(camShake(t, shot.glitch ? 0.3 : 0));
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot);
}

// seismogram: quiet noise, spikes at concert beats
const seisPath = (t, mode) => {
  let d = '';
  for (let i = 0; i <= 180; i++) {
    const x = i * 5, tt = t - (180 - i) * 0.02;
    let y = Math.sin(tt * 47) * 2 + Math.sin(tt * 91 + 1) * 1.5;
    if (mode === 'concert') { const p = (tt * 2.2) % 1; y += (p < 0.15 ? Math.sin(p / 0.15 * Math.PI * 6) * 55 * (1 - p / 0.15) : 0); }
    d += `${i ? 'L' : 'M'}${x},${130 + y}`;
  }
  return d;
};
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  const q = t > tDanger + 0.2 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 1.2;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: BANGUNAN & KITA SENDIRI' : 'BAHAYA SEBENARNYA? (di akhir)';
  show('count', shot.count ? pop(t, shot.t0, shot.t1 + 0.4, 0.08, 0.15) : 0);
  if (shot.count) { $('cV').textContent = shot.count; $('cV').style.fontSize = shot.count.length > 2 ? '170px' : ''; $('count').style.transform = `scale(${lerp(1.4, 1, smoothstep(shot.t0, shot.t0 + 0.2, t))})`; }
  show('zones', shot.zones ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  const bg = shot.big ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('big', bg);
  if (bg) {
    if (shot.big === 'mass') { $('bA').textContent = 'MELAYANG DI UDARA'; $('bV').textContent = '±14 juta ton'; $('bU').textContent = '285 juta orang × ±50 kg'; }
    if (shot.big === 'ratio') { $('bA').textContent = 'BERAT BUMI'; $('bV').textContent = '±400 triliun×'; $('bU').textContent = 'lebih berat dari kita semua'; }
    if (shot.big === 'tnt') { $('bA').textContent = 'ENERGI SEMUA LOMPATAN'; $('bV').textContent = '±13 ton TNT'; $('bU').textContent = 'tersebar di ribuan pulau'; }
  }
  show('seis', shot.seis ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  if (shot.seis) {
    $('sP').setAttribute('d', seisPath(t, shot.seis));
    $('sM').textContent = shot.seis === 'concert' ? '≈ M 2,3' : 'tenang';
    $('sF').textContent = shot.seis === 'concert' ? 'Konser di Seattle, Juli 2023 · terlihat di alat, hampir tak terasa' : 'Alat pencatat gempa (seismograf)';
  }
  const en = shot.energy ? pop(t, S(9) + 0.3, S(10), 0.3, 0.2) : 0;
  show('energy', en);
  if (en) { $('e1').style.width = `${0.6 + 0.4 * smoothstep(S(9) + 0.5, S(9) + 1.2, t)}%`; $('e2').style.width = `${100 * smoothstep(S(9) + 1.4, S(9) + 3.4, t)}%`; }
  const vd = shot.verdict != null ? pop(t, S(13) + 0.3, sn(13, 3).start + 2.8, 0.3, 0.2) : 0;
  show('verdict', vd);
  if (vd) ['v1', 'v2', 'v3'].forEach((v, i) => ($(v).style.opacity = shot.verdict > i ? 1 : 0.15));
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'globe' || shot.kind === 'atom' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.slow) filter = 'contrast(1.1) saturate(1.15)';
  renderer.domElement.style.filter = filter;
  $('tint').style.background = shot.tint ? 'rgba(60,120,220,0.35)' : 'transparent';
  show('tint', shot.tint ? 1 : 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tJ, tAnswer + 1.2]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  if (id === 'people') tag('pp', '285 JUTA ORANG', V(0, 9, 80), 'yellow big', tin());
  if (id === 'q1') tag('q1', 'PULAU BERGESER?', globe.markerPos('surabaya', 2), 'yellow big', tin(0.1));
  if (id === 'q3') tag('q3', 'TIDAK TERJADI APA-APA?', warung.anchors.seller, 'yellow', tin(0.1));
  if (id === 'mass') tag('sl', 'GERAK LAMBAT', V(0, 6, 70), 'blue', tin(0.1));
  if (id === 'tiny') tag('tn', 'BUMI TERDORONG… SEDIKIT SEKALI', globe.markerPos('jakarta', 1), 'yellow', tin());
  if (id === 'atom') tag('at', 'PERGESERAN BUMI < INTI ATOM', atom.anchors.arrow, 'yellow', tin(0.4));
  if (id === 'land') tag('ld', 'MENDARAT → BUMI KEMBALI', V(0, 7, 80), 'green', tin());
  if (id === 'absorb' || id === 'absorb2') tag('ab', 'TERSERAP OTOT, SENDI & TANAH', id === 'absorb' ? warung.anchors.cake : V(0, 7, 80), 'blue', tin());
  if (id === 'concert') tag('cc', 'KONSER · SEATTLE, AS · 2023', stadium.anchors.stage, 'yellow', tin(0.4));
  if (id === 'br3') tag('lb', 'JEMBATAN MILLENNIUM · LONDON 2000', bridge.anchors.mid, 'red', tin(0.2));
  if (id === 'closed') tag('cl', 'DITUTUP UNTUK DIPERBAIKI', bridge.anchors.mid, 'yellow', tin(0.3));
  if (id === 'hurt') tag('ht', 'KAKI TERKILIR!', warung.anchors.seller, 'red', tin(0.3));
  if (id === 'urut2') tag('ur', 'ANTRE TUKANG URUT 😅', warung.anchors.seller, 'yellow big', tin(0.2));
  if (id === 'together') tag('tg', '285 JUTA · 1 DETIK', globe.markerPos('bali', 2), 'yellow big', tin(0.2));
  if (id === 'cta') tag('ct', 'KAMU MELOMPAT DARI MANA? 👇', warung.anchors.seller, 'yellow', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}

const CH = [S(3), S(6), S(7), S(10), S(13)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'warung' ? 'warung' : s.kind === 'world' ? 'calm' : s.kind === 'stadium' ? 'crowd' : s.kind === 'bridge' ? 'bridge' : s.kind === 'jaya' ? 'dieng' : 'none');
const jumpsOf = () => {
  const out = [];
  for (const s of SHOTS) {
    if (!s.jump && !s.jumpW) continue;
    const f = s.jump || s.jumpW;
    for (let t = Math.max(s.t0, 1.7); t < s.t1; t += 0.02) { const p = f(t), p2 = f(t + 0.02); if (p < 0.7 && p2 >= 0.7) out.push(+t.toFixed(2)); }
  }
  return out;
};
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, jump: tJ, answer: tAnswer + 1.2, counts: [S(4), sn(4, 1).start, sn(4, 2).start, sn(4, 3).start],
  landings: jumpsOf(), concert: [sn(8, 1).start, S(9)], sway: [S(11), sn(11, 2).start], teaser: sn(15, 3).start, slow: [S(5), S(6)],
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 3, 7, 10, 12, 14, 16, 19, 22, 24, 26, 31, 34, 37, 39.3, 40, 41, 41.6, 45, 49, 53, 55, 58, 62, 65, 68, 72, 75, 79, 84, 88, 95, 100, 104, 108, 112, 114, 116, 119, 123, 127, 131, 134, 137, 140, 145, 148, 150, 152, 154, 157, 160, 163, 166, 169, 173, 178]) renderAt(t);
renderAt(0);
