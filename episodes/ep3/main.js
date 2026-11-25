// ANDAI… Episode 3: "Andai semua es mencair" — live web episode.
// Real elevation data drives the flooding map; the town shows how people would live with it.
import * as THREE from 'three';
import { clamp, easeInOut, easeOut, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe, ll } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { DemMap, dgeo } from '../../src/demmap.js';
import { IceSheet, Glasses } from '../../src/icesheet.js';

const BASE = './episodes/ep3/';
const KEY = /^(Monas\.|seratus|tiga|puluh|dua|meter\.|setengahnya|selamat\?|Antartika|Greenland|kilometer\.|penguin|tujuh|meter\.|mengapung,|daratan,|naik\.|berbahaya\.|Sepuluh|Jakarta,|Surabaya,|Makassar,|Palembang|Sepertiga|separuh|Medan|Bandung,|Bogor,|Malang,|Yogyakarta|kering\.|perahu|Monas,|terendam\.|ribuan|setengah|milimeter|lebih|rendah|air\.|lubang|Bumi|mana\?)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T, dem] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json'), DemMap.load(BASE + 'assets/dem.png')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
const world = new World({ monument: true, life: true });
world.noQuake = true;
const ice = new IceSheet();
const glasses = new Glasses();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// tunnel through the Earth (episode 4 teaser): Jakarta -> antipode
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 10), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
tunnel.visible = false;
globe.earth.add(tunnel);
const jkt = ll(-6.2, 106.8, 10.05);
tunnel.position.copy(jkt.clone().multiplyScalar(0.5));
tunnel.scale.y = 20.1;
tunnel.quaternion.setFromUnitVectors(V(0, 1, 0), jkt.clone().normalize());

// ------------------------------------------------------------------ timeline
const END = E(17) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tRise = sn(1, 2).start;                    // "Dan suatu hari..." water rises around Monas
const t10 = S(10), t25 = S(11), t70 = S(12), tMedan = sn(12, 2).start, tSafe = sn(12, 3).start;
const tCalve = S(5) + 0.4;
const levelAt = (t) => {
  if (t < t10) return 0;
  if (t < t25) return 10 * easeOut(clamp((t - t10) / 1.4));
  if (t < t70) return lerp(10, 25, easeOut(clamp((t - t25) / 1.6)));
  return lerp(25, 70, easeOut(clamp((t - t70) / 3.5)));
};
const MONAS_HALF = 32; // scene metres: the stylised monument is ~half scale, so 32 ~ "almost half"

const monasLow = (k) => ({ pos: V(lerp(86, 84, k), lerp(4, 5, k), lerp(84, 82, k)), tgt: V(63, lerp(12, 40, easeInOut(k)), 106), fov: 58 });
const SHOTS = [
  // hook montage
  { id: 'm1', t0: 0, t1: 0.6, kind: 'world', life: 'flood', level: MONAS_HALF, cam: () => ({ pos: V(110, 40, 60), tgt: V(62, 30, 107), fov: 50 }), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'ice', calve: (t) => (t - 0.6) * 4 + 1.0, cam: () => ({ pos: V(60, 22, 70), tgt: V(28, 8, 0), fov: 50 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'dem', level: 70, cam: () => ({ pos: dgeo(114, -22, 330), tgt: dgeo(114, -3, 0), fov: 50 }), glitch: true },
  // S1: Monas, its height, the sea rises around it
  { id: 'monas', t0: 1.7, t1: tRise, kind: 'world', life: 'calm', level: null, cam: (k) => monasLow(k) },
  { id: 'rise', t0: tRise, t1: S(2), kind: 'world', life: 'flood', level: (t) => MONAS_HALF * easeInOut(smoothstep(tRise + 0.3, E(1), t)), cam: (k) => ({ pos: V(lerp(120, 115, k), lerp(42, 46, k), lerp(55, 60, k)), tgt: V(62, 28, 107), fov: 50 }) },
  // S2: far away… which city survives?
  { id: 'how', t0: S(2), t1: sn(2, 1).start, kind: 'globe', g: (t, k) => ({ spin: face(107) + k * 0.3, cam: { pos: V(0, 3, 30), tgt: V(0, 0, 0), fov: 45 }, markers: ['jakarta'] }) },
  { id: 'far', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'globe', g: (t, k) => ({ spin: face(lerp(107, 80, k)), cam: { pos: V(0, lerp(3, -24, easeInOut(k)), lerp(30, 16, easeInOut(k))), tgt: V(0, lerp(0, -3, k), 0), fov: 45 }, iceGlow: smoothstep(sn(2, 1).start + 1, sn(2, 1).start + 2, t), markers: ['antarctica'] }) },
  { id: 'which', t0: sn(2, 2).start, t1: S(3), kind: 'dem', level: 0, cam: (k) => ({ pos: dgeo(lerp(110, 108, k), lerp(-18, -16, k), lerp(240, 200, k)), tgt: dgeo(109, -5, 0), fov: 50 }) },
  // 1. where the ice is
  { id: 'poles', t0: S(3), t1: S(4), kind: 'globe', g: (t, k) => { const north = t > sn(3, 1).start + 1.6; return { spin: face(north ? -40 : 60), cam: { pos: north ? V(0, 22, 18) : V(0, -24, 16), tgt: V(0, north ? 3 : -3, 0), fov: 45 }, iceGlow: 1, markers: north ? ['greenland'] : ['antarctica'] }; } },
  { id: 'shelf', t0: S(4), t1: sn(4, 1).start, kind: 'ice', calve: () => -1, cam: (k) => ({ pos: V(lerp(-90, -70, k), lerp(30, 34, k), lerp(110, 95, k)), tgt: V(0, 14, -20), fov: 48 }) },
  { id: 'peng', t0: sn(4, 1).start, t1: S(5), kind: 'ice', calve: () => -1, cam: (k) => ({ pos: V(lerp(-14, -8, k), lerp(29, 28.5, k), lerp(-4, -8, k)), tgt: V(-5, 25.5, -30), fov: 50 }) },
  { id: 'calve', t0: S(5), t1: CHS(2), kind: 'ice', calve: (t) => t - tCalve, cam: (k) => ({ pos: V(lerp(70, 62, k), lerp(20, 24, k), lerp(80, 72, k)), tgt: V(26, 8, 0), fov: 50 }) },
  // 2. two glasses
  { id: 'glass', t0: CHS(2), t1: S(7), kind: 'glass', melt: () => 0, cam: (k) => ({ pos: V(0, lerp(16, 14, k), lerp(46, 40, k)), tgt: V(-2, 8, 0), fov: 45 }) },
  { id: 'gLeft', t0: S(7), t1: sn(7, 1).start, kind: 'glass', melt: (t) => smoothstep(S(7) + 0.5, sn(7, 1).start, t) * 0.55, cam: (k) => ({ pos: V(-8, 11, 24), tgt: V(-8, 7, 0), fov: 45 }) },
  { id: 'gRight', t0: sn(7, 1).start, t1: S(8), kind: 'glass', melt: (t) => 0.55 + 0.45 * smoothstep(sn(7, 1).start, sn(7, 2).start + 0.6, t), cam: (k) => ({ pos: V(lerp(10, 6, k), lerp(14, 11, k), lerp(28, 24, k)), tgt: V(8, 10, 0), fov: 45 }) },
  { id: 'landIce', t0: S(8), t1: CHS(3), kind: 'globe', g: (t, k) => ({ spin: face(-30) + k * 0.4, cam: { pos: V(0, 14, 26), tgt: V(0, 2, 0), fov: 45 }, iceGlow: 1, markers: ['greenland', 'antarctica'] }) },
  // 3. raise the sea over the real map of Indonesia
  { id: 'map0', t0: CHS(3), t1: t10, kind: 'dem', level: () => 0, cam: (k) => ({ pos: dgeo(lerp(116, 113, k), lerp(-24, -20, k), lerp(330, 280, k)), tgt: dgeo(114, -3, 0), fov: 50 }) },
  { id: 'map10', t0: t10, t1: t25, kind: 'dem', level: levelAt, cam: (k) => ({ pos: dgeo(lerp(111, 113, k), lerp(-17, -16, k), lerp(170, 190, k)), tgt: dgeo(lerp(110, 112, k), -6, 0), fov: 50 }) },
  { id: 'map25', t0: t25, t1: t70, kind: 'dem', level: levelAt, cam: (k) => ({ pos: dgeo(lerp(108, 104, k), lerp(-15, -10, k), lerp(170, 190, k)), tgt: dgeo(lerp(108, 104, k), lerp(-6, -2, k), 0), fov: 50 }) },
  { id: 'map70', t0: t70, t1: CHS(4), kind: 'dem', level: levelAt, cam: (k) => ({ pos: dgeo(lerp(110, 112, k), lerp(-22, -20, k), lerp(300, 360, k)), tgt: dgeo(112, -1, 0), fov: 50 }) },
  // 4. life in the flooded world
  { id: 'move', t0: CHS(4), t1: sn(13, 2).start, kind: 'world', life: 'flood', level: MONAS_HALF, cam: (k) => ({ pos: V(lerp(-10, -20, k), lerp(48, 50, k), lerp(170, 175, k)), tgt: V(-40, 38, 207), fov: 52 }) },
  { id: 'boats', t0: sn(13, 2).start, t1: S(14), kind: 'world', life: 'flood', level: 5.5, cam: (k) => ({ pos: V(lerp(-30, -24, k), 9, lerp(64, 74, k)), tgt: V(lerp(-6, 0, k), 6, 120), fov: 54 }) },
  { id: 'alone', t0: S(14), t1: CHS(5), kind: 'world', life: 'flood', level: MONAS_HALF, cam: (k) => ({ pos: V(lerp(90, 84, k), MONAS_HALF + 3, lerp(80, 84, k)), tgt: V(63, lerp(40, 46, k), 106), fov: 56 }) },
  // 5. reality now + teaser
  { id: 'calm', t0: CHS(5), t1: sn(15, 1).start, kind: 'world', life: 'calm', level: null, cam: (k) => ({ pos: V(-5, 4.5, lerp(70, 62, k)), tgt: V(0, 2.5, -40), fov: 56 }) },
  { id: 'slow', t0: sn(15, 1).start, t1: sn(15, 2).start, kind: 'globe', g: (t, k) => ({ spin: face(60) + k * 0.2, cam: { pos: V(0, -22, 18), tgt: V(0, -3, 0), fov: 45 }, iceMelt: 0.15 * k, markers: ['antarctica'] }) },
  { id: 'begun', t0: sn(15, 2).start, t1: sn(15, 3).start, kind: 'ice', calve: (t) => (t - sn(15, 2).start) * 1.4, cam: (k) => ({ pos: V(66, 22, 76), tgt: V(26, 8, 0), fov: 50 }) },
  { id: 'rate', t0: sn(15, 3).start, t1: S(16), kind: 'world', life: 'calm', level: null, cam: (k) => ({ pos: V(lerp(16, 10, k), 6, lerp(22, 14, k)), tgt: V(0, 1, -120), fov: 54 }) },
  { id: 'jktLow', t0: S(16), t1: sn(16, 1).start, kind: 'dem', level: 0, hi: 1, cam: (k) => ({ pos: dgeo(106.9, lerp(-9.6, -9.0, k), lerp(70, 58, k)), tgt: dgeo(106.85, -6.4, 0), fov: 50 }) },
  { id: 'race', t0: sn(16, 1).start, t1: S(17), kind: 'world', life: 'calm', level: null, cam: (k) => ({ pos: V(lerp(-30, -24, k), lerp(5, 4.4, k), lerp(14, 10, k)), tgt: V(0, 1.5, -60), fov: 54 }) },
  { id: 'dig', t0: S(17), t1: sn(17, 2).start, kind: 'world', life: 'calm', level: null, digger: true, cam: (k) => ({ pos: V(lerp(11.5, 10.8, k), lerp(2.4, 2.1, k), lerp(3.6, 4.4, k)), tgt: V(7.9, 0.8, 8.4), fov: 52 }) },
  { id: 'tunnel', t0: sn(17, 2).start, t1: DURATION + 1, kind: 'globe', g: (t, k) => ({ spin: face(lerp(107, 140, k)), cam: { pos: V(lerp(6, 14, k), 6, 30), tgt: V(0, 0, 0), fov: 45 }, markers: ['jakarta'], tunnel: smoothstep(sn(17, 2).start + 0.3, sn(17, 2).start + 2.2, t) }) },
];
function CHS(c) { return Object.values(T.SEG).find((s) => s.ch === c).start - 0.45; }
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t) => (typeof v === 'function' ? v(t) : v);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, g = null;
  tunnel.visible = false;
  if (shot.kind === 'globe') {
    g = shot.g(t, k);
    globe.update(t, g.spin, g);
    if (g.tunnel) { tunnel.visible = true; tunnel.scale.y = 20.1 * g.tunnel; tunnel.position.copy(jkt.clone().normalize().multiplyScalar(10.05 - 10.05 * g.tunnel)); }
    c = g.cam;
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = val(shot.level, t) ?? null;
    world.moodT = shot.life === 'flood' ? 50 : 4;
    world.lifeMode = shot.life || 'calm';
    world.showDigger = !!shot.digger;
    scene = world.scene;
  } else if (shot.kind === 'dem') {
    c = shot.cam(k);
    dem.update(t, val(shot.level, t), shot.hi || 0);
    scene = dem.scene;
  } else if (shot.kind === 'ice') {
    c = shot.cam(k);
    ice.update(t, shot.calve(t));
    scene = ice.scene;
  } else if (shot.kind === 'glass') {
    c = shot.cam(k);
    glasses.update(t, shot.melt(t));
    scene = glasses.scene;
  }
  const sh = camShake(t, shot.glitch ? 0.3 : 0);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot, k);
}

const fmtM = (m) => `+${Math.round(m)} m`;
function overlays(t, shot, k) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // open loop: which city survives?
  show('pill', t > S(3) - 0.6 && t < tSafe + 3.2 && t < END ? 1 : 0);
  $('pill').className = 'ov' + (t >= tSafe ? ' done' : '');
  $('pill').textContent = t >= tSafe ? 'SELAMAT: BANDUNG, BOGOR, MALANG, YOGYA' : 'KOTA MANA YANG SELAMAT?';
  // sea-level counter
  let lv = null;
  if (id.startsWith('map') && id !== 'map0') lv = levelAt(t);
  if (id === 'calve' && t > sn(5, 0).start + 1.5) lv = 70 * easeOut(clamp((t - sn(5, 0).start - 1.5) / 2.5));
  show('lvl', lv !== null ? 1 : 0);
  if (lv !== null) { $('lvlV').textContent = fmtM(lv); $('lvlU').textContent = id === 'calve' ? 'JIKA SEMUA ES MENCAIR' : 'PERMUKAAN LAUT'; }
  // sea-level chart (NASA: ~10 cm since 1993)
  const ch = id === 'rate' ? 1 : 0;
  show('chart', ch);
  if (ch) {
    const p = smoothstep(shot.t0 + 0.2, shot.t0 + 3.5, t);
    const n = Math.max(2, Math.round(40 * p));
    let d = '';
    for (let i = 0; i < n; i++) { const u = i / 39; const y = 290 - 260 * (0.47 * u + 0.53 * u * u) + 8 * Math.sin(i * 1.7); d += (i ? 'L' : 'M') + (u * 900).toFixed(0) + ' ' + y.toFixed(0); }
    $('chP').setAttribute('d', d);
    $('chV').textContent = `+${Math.round(10 * (0.47 * p + 0.53 * p * p))} cm`;
  }
  show('teaser', pop(t, sn(17, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', id.startsWith('map') || id === 'which' || id === 'jktLow' || id === 'glass' || id === 'gLeft' || id === 'gRight' || id === 'm3' ? 0.9 : 0);
  $('note').textContent = id.startsWith('map') || id === 'which' || id === 'jktLow' || id === 'm3' ? 'Data elevasi: AWS Terrain Tiles (SRTM) · relief diperbesar' : 'Ilustrasi · skala tidak sebenarnya';
  show('scan', shot.glitch ? 0.8 : 0);
  renderer.domElement.style.filter = shot.glitch ? 'contrast(1.25) saturate(1.3)' : 'none';
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, S(2), t10, t25, t70, sn(17, 2).start]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.7 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  const mon = world.anchors.monument;
  if (id === 'monas') tag('h', t < sn(1, 1).start ? 'MONAS' : 'TINGGI 132 m', mon, 'yellow big', smoothstep(1.9, 2.2, t));
  if (id === 'rise') tag('r', 'HAMPIR SETENGAHNYA TERENDAM', mon, 'blue big', smoothstep(E(1) - 0.6, E(1), t));
  if (id === 'far') tag('a', 'ANTARTIKA', globe.markerPos('antarctica', 1), 'blue big', smoothstep(sn(2, 1).start + 1, sn(2, 1).start + 1.3, t));
  if (id === 'which') for (const n of ['Jakarta', 'Surabaya', 'Bandung', 'Semarang']) tag('q' + n, `${n.toUpperCase()}?`, dem.cityPos(n), 'yellow', smoothstep(shot.t0 + 0.2, shot.t0 + 0.5, t));
  if (id === 'poles') { const north = t > sn(3, 1).start + 1.6; tag('p', north ? 'GREENLAND · ±8% ES DUNIA' : 'ANTARTIKA · ±91% ES DUNIA', globe.markerPos(north ? 'greenland' : 'antarctica', 1), 'blue', 1); }
  if (id === 'shelf') tag('th', 'ES SETEBAL ±2 km (ilustrasi)', ice.anchors.cliff, 'blue', smoothstep(shot.t0 + 0.4, shot.t0 + 0.7, t));
  if (id === 'peng') tag('pg', 'PENGUIN KAISAR', ice.anchors.colony, 'yellow', smoothstep(shot.t0 + 0.5, shot.t0 + 0.8, t));
  if (id === 'glass') { tag('gl', 'ES MENGAPUNG', glasses.anchors.left, 'blue', smoothstep(sn(6, 2).start, sn(6, 2).start + 0.3, t)); tag('gr', 'ES DI DARATAN', glasses.anchors.right, 'yellow', smoothstep(sn(6, 2).start + 0.5, sn(6, 2).start + 0.8, t)); }
  if (id === 'gLeft') tag('gl2', 'MENCAIR → AIR TIDAK NAIK', glasses.anchors.left, 'blue', 1);
  if (id === 'gRight') tag('gr2', t > sn(7, 2).start ? 'AIR NAIK!' : 'MENCAIR → MENGALIR KE BAWAH', t > sn(7, 2).start ? glasses.anchors.mark : glasses.anchors.right, t > sn(7, 2).start ? 'red big' : 'yellow', 1);
  if (id === 'landIce') { tag('l1', 'ES DARATAN', globe.markerPos('greenland', 1), 'red', 1); tag('l2', 'ES DARATAN', globe.markerPos('antarctica', 1), 'red', smoothstep(shot.t0 + 0.6, shot.t0 + 0.9, t)); }
  if (shot.kind === 'dem' && id.startsWith('map')) {
    const lv = levelAt(t);
    const show1 = (n, ts) => tag('c' + n, dem.drowned(n, lv) ? `${n.toUpperCase()} TENGGELAM` : n.toUpperCase(), dem.cityPos(n), dem.drowned(n, lv) ? 'red' : '', smoothstep(ts, ts + 0.3, t));
    if (id === 'map10') { show1('Jakarta', wT(10, /^Jakarta/)); show1('Surabaya', wT(10, /^Surabaya/)); show1('Semarang', wT(10, /^Surabaya/) + 0.6); }
    if (id === 'map25') { tag('jn', 'PESISIR UTARA JAWA', dgeo(108.5, -6.4, 4), 'red', smoothstep(sn(11, 1).start, sn(11, 1).start + 0.3, t)); tag('se', 'PESISIR TIMUR SUMATRA', dgeo(104.5, -1.5, 4), 'red', smoothstep(sn(11, 2).start, sn(11, 2).start + 0.3, t)); }
    if (id === 'map70') {
      show1('Medan', tMedan);
      for (const n of ['Bandung', 'Bogor', 'Malang', 'Yogyakarta']) tag('s' + n, `${n.toUpperCase()} AMAN`, dem.cityPos(n, n === 'Bogor' ? 10 : 4), 'green', smoothstep(tSafe + 0.3, tSafe + 0.6, t));
      tag('loss', '±44% DARATAN KAWASAN INI HILANG', dgeo(112, 2.5, 6), 'red big', pop(t, sn(12, 1).start, tMedan, 0.3, 0.2));
    }
  }
  if (id === 'move') tag('mv', 'MENGUNGSI KE DATARAN TINGGI', world.anchors.hilltop, 'green', smoothstep(shot.t0 + 0.4, shot.t0 + 0.7, t));
  if (id === 'boats') tag('bt', 'PERAHU MENGGANTIKAN MOTOR', V(-12, 12, 110), 'yellow', smoothstep(shot.t0 + 0.4, shot.t0 + 0.7, t));
  if (id === 'alone') tag('al', 'MONAS DI TENGAH LAUT', mon, 'blue big', smoothstep(sn(14, 1).start - 0.2, sn(14, 1).start + 0.1, t));
  if (id === 'slow') tag('sl', 'BUTUH RIBUAN TAHUN', globe.markerPos('antarctica', 1), 'green', 1);
  if (id === 'jktLow') tag('jl', 'SEBAGIAN DI BAWAH PERMUKAAN LAUT', dgeo(106.88, -6.1, 1), 'red', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'dig') tag('dg', 'GALI SAMPAI TEMBUS?', V(7.4, 2.6, 7.6), 'yellow', smoothstep(sn(17, 1).start, sn(17, 1).start + 0.3, t));
  if (id === 'tunnel') tag('tn', 'KELUAR DI MANA?', globe.earth.localToWorld(ll(6.2, -73.2, 11.5)), 'red big', smoothstep(sn(17, 3).start - 0.3, sn(17, 3).start, t));
}

startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: [1, 2, 3, 4, 5].map(CHS) });
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], rise: tRise, calve: tCalve, t10, t25, t70, safe: tSafe, end: END, teaser: sn(17, 3).start, tunnel: sn(17, 2).start,
  glass: S(7), drops: sn(7, 1).start, begun: sn(15, 2).start, dig: S(17), chapters: [1, 2, 3, 4, 5].map(CHS), shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.kind === 'world' || s.kind === 'ice').map((s) => [s.t0, s.t1, s.kind === 'ice' ? 'ice' : s.life || 'calm']),
};
for (const t of [0.3, 0.9, 1.4, 4, 12, 20, 27, 37, 44, 50, 72, 98, 101, 106, 118, 125, 133, 140]) renderAt(t);
renderAt(0);
