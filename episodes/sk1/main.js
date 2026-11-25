// SKALA Episode 1: "Skala yang bikin merinding" — a 7-to-1 countdown of size comparisons.
// Aceh 2004 tsunami run-up >30 m in places; Sabang–Merauke ≈ 5,120 km (Lisbon–Moscow ≈ 3,900 km, contiguous US ≈ 4,500 km);
// Puncak Jaya 4,884 m, Everest 8,849 m, Olympus Mons ≈ 21.9 km high / ≈ 600 km wide; Challenger Deep ≈ 10,935 m;
// Great Red Spot wider than Earth; Sun ≈ 109 Earth diameters, ≈ 1.3 million Earths by volume;
// Stephenson 2-18 radius ≈ 2,150 R☉ (uncertain), surface beyond Saturn's orbit if placed at the Sun.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe, ll } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { ISLANDS, ELLIPSES } from '../../src/map.js';
import { TsunamiScale, ReliefScale, SpaceScale } from '../../src/scale.js';

const BASE = './episodes/sk1/';
const KEY = /^(Tujuh|debu\.|tujuh\.|Aceh|tiga|puluh|meter\.|sepuluh|lantai,|enam\.|Sabang|Merauke,|Portugal|Moskow\.|Amerika|Serikat,|lima\.|Puncak|Jaya,|Everest,|Olympus|Mons\.|empat\.|Mariana,|sebelas|tenggelam|tiga\.|Jupiter\.|Bintik|Merah|Besar,|Bumi\.|dua\.|Matahari\.|seratus|sembilan|juta|satu\.|Stephenson|dua|ribu|Saturnus\.|titik|diperdebatkan|kecil\.|semesta|satu-satunya|merinding\?|komentar\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 40000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addOutline(ISLANDS, ELLIPSES);
globe.addMarker('sabang', 5.89, 95.32, 0xff3b30);
globe.addMarker('merauke', -8.49, 140.4, 0xff3b30);
const tsu = new TsunamiScale();
const relief = new ReliefScale();
const space = new SpaceScale(globe.u.uMap.value);
const world = new World({ life: true });
world.noQuake = true;
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);
const HOME = ll(-2.5, 118, 1).normalize();
const moveTo = (lat, lon, k) => new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), new THREE.Quaternion().setFromUnitVectors(HOME, ll(lat, lon, 1).normalize()), k);

// ------------------------------------------------------------------ timeline
const END = E(13) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const RANKS = [[S(2), 7, 'TSUNAMI ACEH'], [S(3), 6, 'LEBAR INDONESIA'], [S(4), 5, 'GUNUNG'], [S(5), 4, 'PALUNG MARIANA'], [S(6), 3, 'JUPITER'], [S(7), 2, 'MATAHARI'], [S(8), 1, '???']];
const town = (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 });
const gIndo = (lon, lat = 0, z = 1.2) => (k) => ({ spin: face(lon), cam: { pos: V(0, lat, 30), tgt: V(0, lat * 0.3, 0), fov: 45 }, zoom: z });
const land = (k, a, b, c, d) => ({ pos: V(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)), tgt: V(...c), fov: d || 45 });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'space', mode: 'giant', cam: () => ({ pos: V(1800, 1200, 7000), tgt: V(600, 0, 0), fov: 50 }), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'tsu', wave: () => 0.9, cam: () => ({ pos: V(30, 6, 30), tgt: V(0, 14, 0), fov: 55 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'relief', mode: 'land', cam: () => ({ pos: V(150, 60, 500), tgt: V(150, 40, 0), fov: 50 }), glitch: true },
  // intro
  { id: 'intro', t0: 1.7, t1: sn(1, 1).start, kind: 'world', cam: town },
  { id: 'dust', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(lerp(2600, 2800, k), lerp(200, 600, k), lerp(400, 2600, k)), tgt: V(2400, 0, 0), fov: 50 }) },
  { id: 'watch', t0: sn(1, 2).start, t1: S(2), kind: 'space', mode: 'jupiter', cam: (k) => ({ pos: V(lerp(20, 30, k), 6, lerp(40, 60, k)), tgt: V(6, 0, 0), fov: 45 }) },
  // #7 tsunami
  { id: 'r7', t0: S(2), t1: sn(2, 2).start, kind: 'tsu', wave: (t) => smoothstep(S(2), sn(2, 2).start, t) * 0.5, cam: (k) => land(k, [24, 3, 40], [20, 3, 34], [0, 12, 0], 55) },
  { id: 'r7b', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'tsu', wave: () => 0.6, big: 'tsu', cam: (k) => land(k, [40, 16, 60], [36, 18, 54], [0, 16, -10], 50) },
  { id: 'r7c', t0: sn(2, 3).start, t1: sn(2, 3).start + 3.2, kind: 'tsu', wave: () => 0.75, cam: (k) => land(k, [3, 1.6, 12], [2, 2, 11], [-1, 4, 4], 55) },
  { id: 'r7d', t0: sn(2, 3).start + 3.2, t1: S(3), kind: 'tsu', wave: () => 0.85, cam: (k) => land(k, [-30, 8, 40], [-26, 10, 36], [2, 14, 0], 55) },
  // #6 Indonesia's width
  { id: 'r6', t0: S(3), t1: sn(3, 2).start, kind: 'globe', g: gIndo(118, 0, 1.15), outline: 1, markers: ['sabang', 'merauke'] },
  { id: 'r6b', t0: sn(3, 2).start, t1: sn(3, 3).start, kind: 'globe', g: gIndo(118, 0, 1.0), outline: 1, markers: ['sabang', 'merauke'], big: 'width' },
  { id: 'r6c', t0: sn(3, 3).start, t1: sn(3, 4).start, kind: 'globe', g: (k) => ({ spin: face(lerp(118, 15, smoothstep(0, 0.5, k))), cam: { pos: V(0, lerp(0, 14, smoothstep(0, 0.5, k)), 30), tgt: V(0, lerp(0, 4, smoothstep(0, 0.5, k)), 0), fov: 45 }, zoom: 1.05 }), outline: 1, move: (t) => ({ lat: 47, lon: 14, k: smoothstep(sn(3, 3).start + 0.3, sn(3, 3).start + 2.8, t) }) },
  { id: 'r6d', t0: sn(3, 4).start, t1: S(4), kind: 'globe', g: (k) => ({ spin: face(lerp(15, -97, smoothstep(0, 0.4, k))), cam: { pos: V(0, 12, 30), tgt: V(0, 4, 0), fov: 45 }, zoom: 1.05 }), outline: 1, move: (t) => ({ lat: 38, lon: -97, k: 1, from: [47, 14], u: smoothstep(sn(3, 4).start, sn(3, 4).start + 1.6, t) }) },
  // #5 mountains
  { id: 'r5', t0: S(4), t1: sn(4, 2).start, kind: 'relief', mode: 'land', cam: (k) => land(k, [-40, 40, 160], [-40, 30, 130], [-40, 22, 0], 45) },
  { id: 'r5b', t0: sn(4, 2).start, t1: sn(4, 4).start, kind: 'relief', mode: 'land', cam: (k) => land(k, [-30, 60, 260], [120, 70, 700], [lerp(-20, 160, k), 40, 0], 45) },
  { id: 'r5c', t0: sn(4, 4).start, t1: S(5), kind: 'relief', mode: 'land', big: 'olympus', cam: (k) => land(k, [150, 90, 820], [170, 100, 860], [160, 40, 0], 48) },
  // #4 Mariana
  { id: 'r4', t0: S(5), t1: sn(5, 2).start, kind: 'relief', mode: 'ocean', cam: (k) => land(k, [0, 10, 150], [0, -5, 130], [0, -28, 0], 45) },
  { id: 'r4b', t0: sn(5, 2).start, t1: sn(5, 2).start + 3.6, kind: 'relief', mode: 'ocean', cam: (k) => land(k, [20, -2, 70], [16, -6, 60], [0, -14, 0], 45) },
  { id: 'r4c', t0: sn(5, 2).start + 3.6, t1: S(6), kind: 'relief', mode: 'ocean', cam: (k) => land(k, [-60, -30, 120], [-50, -34, 110], [0, -30, 0], 45) },
  // #3 Jupiter
  { id: 'r3', t0: S(6), t1: sn(6, 2).start, kind: 'space', mode: 'jupiter', cam: (k) => ({ pos: V(lerp(30, 24, k), 6, lerp(50, 40, k)), tgt: V(5, 0, 0), fov: 45 }) },
  { id: 'r3b', t0: sn(6, 2).start, t1: sn(6, 3).start, kind: 'space', mode: 'jupiter', cam: (k) => ({ pos: V(lerp(6, 4, k), -3, lerp(30, 26, k)), tgt: V(2, -3.5, 8), fov: 45 }) },
  { id: 'r3x', t0: sn(6, 3).start, t1: S(7), kind: 'space', mode: 'jupiter', cam: (k) => ({ pos: V(0, lerp(30, 20, k), lerp(30, 34, k)), tgt: V(0, 0, 0), fov: 45 }) },
  // #2 the Sun
  { id: 'r2', t0: S(7), t1: sn(7, 2).start, kind: 'space', mode: 'sun', cam: (k) => ({ pos: V(lerp(140, 200, k), lerp(4, 40, k), lerp(50, 300, k)), tgt: V(lerp(130, 60, k), 0, 20), fov: 45 }) },
  { id: 'r2b', t0: sn(7, 2).start, t1: sn(7, 2).start + 3.4, kind: 'space', mode: 'sun', big: 'sun', cam: (k) => ({ pos: V(lerp(220, 260, k), 60, lerp(420, 480, k)), tgt: V(40, 0, 0), fov: 45 }) },
  { id: 'r2c', t0: sn(7, 2).start + 3.4, t1: S(8), kind: 'space', mode: 'sun', big: 'sun', cam: (k) => ({ pos: V(lerp(-60, -120, k), lerp(150, 220, k), lerp(320, 420, k)), tgt: V(0, 0, 0), fov: 45 }) },
  // #1 the red supergiant
  { id: 'r1', t0: S(8), t1: sn(8, 1).start, kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(lerp(2450, 2500, k), lerp(40, 100, k), lerp(150, 600, k)), tgt: V(2400, 0, 0), fov: 50 }) },
  { id: 'r1b', t0: sn(8, 1).start, t1: sn(8, 1).start + 4, kind: 'space', mode: 'giant', big: 'giant', cam: (k) => ({ pos: V(lerp(2700, 1500, k), lerp(600, 2400, k), lerp(3000, 7000, k)), tgt: V(lerp(2000, 500, k), 0, 0), fov: 50 }) },
  { id: 'r1c', t0: sn(8, 1).start + 4, t1: S(9), kind: 'space', mode: 'giant', big: 'giant', cam: (k) => ({ pos: V(lerp(2600, 2450, k), lerp(30, 20, k), lerp(200, 120, k)), tgt: V(lerp(1600, 0, k), lerp(200, 0, k), 0), fov: 60 }) },
  { id: 'orbits', t0: S(9), t1: S(9) + 5, kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(0, lerp(5200, 6200, k), lerp(1600, 2200, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'orbits2', t0: S(9) + 5, t1: sn(9, 1).start, kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(lerp(-600, -300, k), 900, lerp(5400, 5000, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'dot', t0: sn(9, 1).start, t1: S(10), kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(lerp(3600, 4200, k), 400, lerp(1600, 2600, k)), tgt: V(1600, 0, 0), fov: 50 }) },
  { id: 'debate', t0: S(10), t1: S(10) + 4.6, kind: 'space', mode: 'giant', cam: (k) => ({ pos: V(lerp(-2000, -2600, k), lerp(1200, 1800, k), lerp(6000, 7200, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'debate2', t0: S(10) + 4.6, t1: S(11), kind: 'world', cam: (k) => ({ pos: V(-4, lerp(3, 5, k), lerp(72, 70, k)), tgt: V(0, lerp(30, 40, k), -60), fov: 56 }) },
  // back home
  { id: 'home', t0: S(11), t1: sn(11, 1).start, kind: 'world', cam: town },
  { id: 'home2', t0: sn(11, 1).start, t1: sn(11, 2).start, kind: 'world', cam: (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 }) },
  { id: 'small', t0: sn(11, 2).start, t1: sn(11, 2).start + 4, kind: 'globe', g: (k) => ({ spin: face(118) + k * 0.3, cam: { pos: V(0, 0, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: lerp(1.3, 4, k) }), outline: 0.6 },
  { id: 'small2', t0: sn(11, 2).start + 4, t1: S(12), kind: 'globe', g: (k) => ({ spin: face(118) + 0.3 + k * 0.3, cam: { pos: V(0, 0, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: lerp(4, 8, k) }), outline: 0.3 },
  { id: 'we', t0: S(12), t1: S(13), kind: 'world', cam: (k) => ({ pos: V(-4, lerp(3, 6, k), lerp(72, 68, k)), tgt: V(0, lerp(10, 40, k), -60), fov: 56 }) },
  { id: 'cta', t0: S(13), t1: S(13) + 4.4, kind: 'world', cam: (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 }) },
  { id: 'cta2', t0: S(13) + 4.4, t1: DURATION + 1, kind: 'world', cam: (k) => ({ pos: V(lerp(-6, -4, k), lerp(4, 18, k), lerp(44, 30, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
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
    globe.update(t, g.spin, { markers: shot.markers || [], clouds: 0.25, outline: shot.outline || 0 });
    if (shot.move) {
      const m = shot.move(t);
      globe.outline.quaternion.copy(m.from ? moveTo(m.from[0], m.from[1], 1).slerp(moveTo(m.lat, m.lon, 1), m.u) : moveTo(m.lat, m.lon, m.k));
    } else globe.outline.quaternion.identity();
    c = { ...g.cam, pos: g.cam.tgt.clone().add(g.cam.pos.clone().sub(g.cam.tgt).multiplyScalar(g.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'tsu') {
    c = shot.cam(k); tsu.update(t, shot.wave(t)); scene = tsu.scene;
  } else if (shot.kind === 'relief') {
    c = shot.cam(k); relief.update(t, shot.mode); scene = relief.scene;
  } else if (shot.kind === 'space') {
    c = shot.cam(k); space.update(t, shot.mode); scene = space.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = 0; world.moodT = 4; world.lifeMode = shot.id === 'we' ? 'moon' : 'calm'; world.jumpP = null; world.freezeT = null;
    scene = world.scene;
  }
  camera.position.copy(c.pos).add(camShake(t, shot.glitch ? 0.3 : 0));
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot);
}

function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // countdown ladder + rank card at each new number; the pill keeps #1 a mystery until it arrives
  let cur = null;
  for (const r of RANKS) if (t >= r[0] - 0.1) cur = r;
  show('ladder', t > S(2) - 0.2 && t < S(11) ? 1 : 0);
  for (let n = 7; n >= 1; n--) $(`L${n}`).className = cur && cur[1] === n ? 'on' : cur && n > cur[1] ? 'done' : '';
  const rk = cur && t < cur[0] + 1.6 ? smoothstep(cur[0] - 0.1, cur[0] + 0.1, t) * (1 - smoothstep(cur[0] + 1.3, cur[0] + 1.6, t)) : 0;
  show('rank', rk);
  if (cur) { $('rV').textContent = `#${cur[1]}`; $('rU').textContent = cur[2]; $('rank').style.transform = `scale(${lerp(1.3, 1, smoothstep(cur[0] - 0.1, cur[0] + 0.15, t))})`; }
  const q = t > 7.7 && t < S(8) + 3;
  show('pill', q ? 1 : 0);
  const done = t >= S(8) + 1.4;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? '#1: BINTANG STEPHENSON 2-18' : 'NOMOR 1: MATAHARI SEPERTI DEBU?';
  const bg = shot.big ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('big', bg && rk < 0.5 ? bg : 0);
  if (bg) {
    const B = { tsu: ['TSUNAMI ACEH 2004', '>30 m', '≈ gedung 10 lantai'], width: ['SABANG → MERAUKE', '±5.120 km', 'lebih jauh dari Portugal ke Moskow'], olympus: ['OLYMPUS MONS · MARS', '±22 km', 'tinggi · lebar ±600 km'], sun: ['MATAHARI', '±1,3 juta', 'Bumi bisa masuk ke dalamnya'], giant: ['STEPHENSON 2-18', '±2.150×', 'jari-jari Matahari (perkiraan)'] }[shot.big];
    $('bA').textContent = B[0]; $('bV').textContent = B[1]; $('bU').textContent = B[2];
  }
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'space' || shot.kind === 'relief' || shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  renderer.domElement.style.filter = shot.glitch ? 'contrast(1.25) saturate(1.3)' : shot.id === 'we' ? 'brightness(0.45) saturate(0.6)' : 'none';
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, ...RANKS.map((r) => r[0])]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.7 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const RA = relief.anchors, SA = space.anchors, TA = tsu.anchors;
  if (id === 'r7c') tag('ps', 'MANUSIA 1,7 m', TA.person, 'yellow', tin(0.2));
  if (id === 'r7d') tag('bd', 'GEDUNG 10 LANTAI ≈ 30 m', TA.building, 'red', tin(0.2));
  if (id === 'r6') { tag('sb', 'SABANG', globe.markerPos('sabang', 1), 'red', tin(0.3)); tag('mr', 'MERAUKE', globe.markerPos('merauke', 1), 'red', tin(0.6)); }
  if (id === 'r6c') tag('eu', 'INDONESIA DI ATAS EROPA', V(0, 16, 0), 'yellow', smoothstep(sn(3, 3).start + 2.6, sn(3, 3).start + 2.9, t));
  if (id === 'r6d') tag('us', 'INDONESIA DI ATAS AMERIKA SERIKAT', V(0, 16, 0), 'yellow', smoothstep(sn(3, 4).start + 1.4, sn(3, 4).start + 1.7, t));
  if (id === 'r5') { tag('pj', 'PUNCAK JAYA 4.884 m', RA.jaya, 'green', tin(0.4)); tag('ev', 'EVEREST 8.849 m', RA.everest, 'yellow', smoothstep(sn(4, 2).start - 0.4, sn(4, 2).start, t)); }
  if (id === 'r5b') { tag('ev2', 'EVEREST', RA.everest, 'yellow', 1); tag('om', 'OLYMPUS MONS (MARS)', RA.olympus, 'red', tin(1.2)); tag('jt', '✈ PESAWAT ±10 km', RA.jet, '', tin(0.4)); }
  if (id === 'r4') tag('mr4', 'PALUNG MARIANA ±10.935 m', V(0, -52, 0), 'blue', tin(0.4));
  if (id === 'r4b') tag('gap', '±2 km AIR DI ATAS EVEREST', RA.gap, 'yellow', tin(0.3));
  if (id === 'r3') { tag('jp', 'JUPITER', SA.jupiter, 'yellow', tin(0.3)); tag('ea', 'BUMI', SA.earth, 'blue', tin(0.6)); }
  if (id === 'r3b') tag('grs', 'BINTIK MERAH BESAR > BUMI', V(3, -2.5, 10.8), 'red', tin(0.4));
  if (id === 'r2') { tag('e2', 'BUMI', SA.earth, 'blue', tin(0.3)); tag('j2', 'JUPITER', SA.jupiter, 'yellow', tin(0.6)); }
  if (id === 'r2b') tag('s2', 'MATAHARI', SA.sun, 'yellow', tin(0.3));
  if (id === 'r1') tag('dt', 'MATAHARI KITA', SA.dot, 'yellow', tin(0.3));
  if (id === 'orbits' || id === 'orbits2') tag('sat', 'ORBIT SATURNUS ADA DI DALAMNYA', V(0, 0, 2049), 'yellow', tin(0.4));
  if (id === 'dot') tag('dt2', 'MATAHARI = TITIK KECIL', SA.dot, 'yellow', tin(0.3));
  if (id === 'small') tag('sm', 'RUMAH KITA', globe.markerPos('sabang', 1), 'green', 0);
  if (id === 'cta' || id === 'cta2') tag('ct', 'MANA YANG PALING MERINDING? 👇', V(55, 30, 110), 'yellow', smoothstep(S(13) + 0.3, S(13) + 0.6, t));
}

const CH = [S(2), S(4), S(6), S(8), S(11)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, ranks: RANKS.map((r) => r[0]), one: S(8), reveal: S(8) + 1.4,
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), s.kind]),
};
for (const t of [0.3, 0.9, 1.4, 4, 9, 12, 15, 19, 23, 27, 31, 35, 40, 44, 50, 55, 60, 63, 68, 74, 81, 86, 93, 99, 105, 112, 118, 127, 133, 142, 148, 155, 162]) renderAt(t);
renderAt(0);
