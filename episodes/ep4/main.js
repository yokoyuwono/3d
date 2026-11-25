// ANDAI… Episode 4: "Andai ada lubang tembus Bumi dari Jakarta" — live web episode.
// The fall follows simple harmonic motion through the Earth (~38 min one way, ~8 km/s at the centre).
import * as THREE from 'three';
import { clamp, easeInOut, easeOut, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe, ll } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { EarthCut, TunnelPOV, LAYERS } from '../../src/earthcut.js';
import { KolaScene } from '../../src/kola.js';
import { MountainScene, diengH } from '../../src/mountain.js';
import { Person } from '../../src/life.js';
import { mulberry32 } from '../../src/util.js';

const BASE = './episodes/ep4/';
const KEY = /^(Jakarta,|Bumi,|duga\.|empat|puluh|menit\.|masalah|Kola,|Rusia\.|dua|belas|kilometer|sepersepuluh|delapan|derajat\.|melompat\.|kerak|mantel,|cair\.|inti|lima|ribu|Matahari\.|delapan|detik\.|nol\.|Kolombia\.|Andes,|Bucaramanga\.|laut\.|Surabaya|Amerika|Selatan\.|Medan,|Pasifik\.|bandul,|selamanya\.|dinding|imajinasi\.|malam\.|sentimeter|Bulan|terakhir)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
renderer.localClippingEnabled = true;
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addMarker('colombia', 6.2, -73.15, 0xffd23a);
globe.addMarker('surabaya', -7.26, 112.75, 0xff3b30);
globe.addMarker('venezuela2', 7.26, -67.25, 0xffd23a);
globe.addMarker('medan', 3.59, 98.67, 0xff3b30);
globe.addMarker('pacific', -3.59, -81.33, 0x3aa0ff);
const world = new World({ life: true });
world.noQuake = true;
const cut = new EarthCut(globe.u.uMap.value);
const pov = new TunnelPOV();
const kola = new KolaScene();
const andes = new MountainScene('dieng');
andes.scene.background.set(0xa9c9e4); andes.scene.fog.color.set(0xa9c9e4);
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// tunnels drawn through the globe (Jakarta, Surabaya, Medan -> antipodes)
const tubes = {};
const addTube = (name, lat, lon, color) => {
  const p = ll(lat, lon, 10.05);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8), new THREE.MeshBasicMaterial({ color }));
  m.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().normalize());
  globe.earth.add(m);
  tubes[name] = { m, dir: p.clone().normalize() };
};
addTube('jakarta', -6.2, 106.8, 0xffd23a);
addTube('surabaya', -7.26, 112.75, 0xff8a00);
addTube('medan', 3.59, 98.67, 0x3aa0ff);
const setTube = (name, k) => { const q = tubes[name]; q.m.visible = k > 0.001; q.m.scale.y = 20.1 * k; q.m.position.copy(q.dir.clone().multiplyScalar(10.05 - 10.05 * k)); };

// Andes exit: a hole, the traveller popping out, a farmer waving "Hola!"
const R = mulberry32(77);
const HX = -28, HZ = 38, HY = diengH(HX, HZ);
const hole = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0x1a0f08 }));
hole.rotation.x = -Math.PI / 2; hole.position.set(HX, HY + 0.08, HZ); andes.scene.add(hole);
const traveller = new Person(R, { scale: 1.8 }); andes.scene.add(traveller.root);
const farmer = new Person(R, { hat: 'sombrero', scale: 1.8 }); farmer.root.position.set(HX + 3.2, diengH(HX + 3.2, HZ + 4.5), HZ + 4.5); farmer.root.rotation.y = -2.3; andes.scene.add(farmer.root);
// moon for the night town
const moonTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.75, 'rgba(240,236,220,1)'); gr.addColorStop(0.78, 'rgba(255,250,220,0.35)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(160,160,150,0.5)'; for (const [x, y, r] of [[100, 100, 22], [150, 140, 16], [120, 165, 12], [165, 95, 10], [90, 150, 9]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true }));
moon.scale.setScalar(230);
world.scene.add(moon);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tJump = sn(5, 1).start, tExit = S(10) + 0.5;
const tAnswer = wT(10, /^Kolombia/);
const fallU = (t) => clamp((t - tJump) / (tExit - tJump));
const fallY = (t) => LAYERS.crust * Math.cos(Math.PI * fallU(t));      // +10 Jakarta -> -10 Colombia
const tripOf = (t) => {
  const u = fallU(t), y = fallY(t);
  const fromStart = (LAYERS.crust - y) / LAYERS.crust * 6371;          // km travelled along the tunnel
  const depth = fromStart <= 6371 ? fromStart : 12742 - fromStart;      // depth below the nearer surface
  const T_ = depth < 12 ? lerp(27, 180, depth / 12) : depth < 35 ? lerp(180, 500, (depth - 12) / 23) : depth < 2900 ? lerp(500, 3700, (depth - 35) / 2865) : depth < 5150 ? lerp(3700, 4800, (depth - 2900) / 2250) : lerp(4800, 5200, (depth - 5150) / 1221);
  return { km: fromStart, depth, temp: T_, kmh: 7.9 * 3600 * Math.sin(Math.PI * u), min: 38.2 * u };
};

const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'cut', y: () => 1.5, cam: () => ({ pos: V(16, 4, 16), tgt: V(0, 0, 0), fov: 45 }), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'pov', depth: 0.85, speed: 2, glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'andes', pop: 1, cam: () => ({ pos: V(HX - 6, HY + 5, HZ + 9), tgt: V(HX, HY + 2, HZ), fov: 50 }), glitch: true },
  // S1: a kid digging on the beach, then the tunnel all the way through
  { id: 'dig', t0: 1.7, t1: wT(1, /^terus,/), kind: 'world', life: 'calm', digger: true, cam: (k) => ({ pos: V(lerp(11.5, 10.8, k), 2.3, lerp(3.8, 4.6, k)), tgt: V(7.9, 0.8, 8.4), fov: 52 }) },
  { id: 'drill', t0: wT(1, /^terus,/), t1: S(2), kind: 'cut', y: () => 20, tunnelK: (t) => smoothstep(wT(1, /^terus,/), wT(1, /^Bumi,/), t), cam: (k) => ({ pos: V(lerp(20, 24, k), lerp(8, 2, k), lerp(20, 24, k)), tgt: V(0, -4, 0), fov: 45 }) },
  { id: 'forty', t0: S(2), t1: sn(2, 1).start, kind: 'globe', g: (t, k) => ({ spin: face(107) + k * 0.5, cam: { pos: V(6, 6, 30), tgt: V(0, 0, 0), fov: 45 }, markers: ['jakarta'], tube: 1 }) },
  { id: 'problem', t0: sn(2, 1).start, t1: S(3), kind: 'cut', y: (t) => LAYERS.crust * Math.cos((t - sn(2, 1).start) * 2.2), trailFrom: -10, cam: (k) => ({ pos: V(lerp(22, 18, k), 4, lerp(22, 18, k)), tgt: V(0, 0, 0), fov: 45 }) },
  // 1. the deepest hole ever dug
  { id: 'kola', t0: S(3), t1: sn(3, 1).start, kind: 'kola', cam: (k) => ({ pos: V(lerp(-30, -18, k), lerp(14, 10, k), lerp(46, 36, k)), tgt: V(-4, 8, -2), fov: 50 }) },
  { id: 'cap', t0: sn(3, 1).start, t1: S(4), kind: 'kola', cam: (k) => ({ pos: V(lerp(6, 5, k), lerp(3.2, 2.6, k), lerp(11.5, 10.5, k)), tgt: V(2, 0.4, 6), fov: 50 }) },
  { id: 'kbar', t0: S(4), t1: sn(4, 2).start, kind: 'kola', cam: (k) => ({ pos: V(lerp(-10, -4, k), lerp(6, 5, k), lerp(26, 22, k)), tgt: V(1, 2, 2), fov: 50 }) },
  { id: 'scratch', zoom: 1, t0: sn(4, 2).start, t1: S(5) - 0.4, kind: 'cut', y: () => 20, tunnelK: () => 0.004, cam: (k) => ({ pos: V(lerp(6, 2.4, k), lerp(12, 10.9, k), lerp(6, 2.4, k)), tgt: V(0, 9.9, 0), fov: 45 }) },
  // 2. the fall
  { id: 'magic', t0: S(5) - 0.4, t1: tJump, kind: 'cut', y: () => 10.2, trail: false, cam: (k) => ({ pos: V(lerp(26, 20, k), lerp(10, 8, k), lerp(26, 20, k)), tgt: V(0, 2, 0), fov: 45 }) },
  { id: 'crust', t0: tJump, t1: S(6), kind: 'pov', depth: (t) => lerp(0, 0.08, smoothstep(tJump, S(6), t)), speed: (t) => lerp(0.3, 0.9, smoothstep(tJump, S(6), t)), trip: true },
  { id: 'mantle', t0: S(6), t1: S(7), kind: 'cut', y: fallY, trip: true, cam: (k) => ({ pos: V(lerp(18, 14, k), lerp(9, 6, k), lerp(18, 14, k)), tgt: V(0, lerp(5, 3, k), 0), fov: 45 }) },
  { id: 'outer', t0: S(7), t1: sn(7, 1).start, kind: 'pov', depth: (t) => lerp(0.5, 0.65, smoothstep(S(7), sn(7, 1).start, t)), speed: () => 1.4, trip: true },
  { id: 'inner', zoom: 1.3, t0: sn(7, 1).start, t1: S(8), kind: 'cut', y: fallY, trip: true, cam: (k) => ({ pos: V(lerp(9, 6, k), lerp(3, 1.5, k), lerp(9, 6, k)), tgt: V(0, 0.5, 0), fov: 45 }) },
  { id: 'speed', t0: S(8), t1: S(9), kind: 'pov', depth: () => 0.88, speed: () => 2.4, trip: true },
  { id: 'slow', t0: S(9), t1: sn(9, 1).start, kind: 'cut', y: fallY, trip: true, cam: (k) => ({ pos: V(16, lerp(-2, -6, k), 16), tgt: V(0, -4, 0), fov: 45 }) },
  { id: 'arrive', t0: sn(9, 1).start, t1: S(10), kind: 'pov', depth: (t) => lerp(0.4, 0.02, smoothstep(sn(9, 1).start, S(10), t)), speed: (t) => lerp(0.9, 0.05, smoothstep(sn(9, 1).start, S(10), t)), trip: true },
  // 3. where you come out
  { id: 'hola', t0: S(10), t1: sn(10, 1).start, kind: 'andes', pop: (t) => smoothstep(S(10) + 0.3, S(10) + 1.6, t), cam: (k) => ({ pos: V(lerp(HX - 7, HX - 5, k), HY + 4.2, lerp(HZ + 10, HZ + 8, k)), tgt: V(HX + 1, HY + 2.2, HZ), fov: 50 }) },
  { id: 'map', t0: sn(10, 1).start, t1: S(11), kind: 'globe', g: (t, k) => ({ spin: face(lerp(-60, -73, k)), cam: { pos: V(0, 6, 30), tgt: V(0, 1, 0), fov: 45 }, markers: ['colombia'], zoom: 1.3 }) },
  { id: 'ocean', t0: S(11), t1: sn(11, 2).start, kind: 'globe', g: (t, k) => ({ spin: face(lerp(-150, -60, k)), cam: { pos: V(0, 3, 30), tgt: V(0, 0, 0), fov: 45 } }) },
  { id: 'pairs', t0: sn(11, 2).start, t1: S(12), kind: 'globe', g: (t, k) => ({ spin: face(lerp(150, 175, k)), cam: { pos: V(0, 8, 30), tgt: V(0, 0, 0), fov: 45 }, markers: t < sn(11, 3).start ? ['jakarta', 'surabaya'] : ['jakarta', 'surabaya', 'medan'],
      tubes: { jakarta: smoothstep(sn(11, 2).start, sn(11, 2).start + 1.2, t), surabaya: smoothstep(sn(11, 2).start + 0.6, sn(11, 2).start + 1.8, t), medan: smoothstep(sn(11, 3).start, sn(11, 3).start + 1.2, t) } }) },
  // 4. the catch
  { id: 'fallback', t0: S(12), t1: sn(12, 1).start, kind: 'andes', pop: (t) => 1 - smoothstep(S(12) + 0.6, S(12) + 1.4, t), cam: () => ({ pos: V(HX - 6, HY + 4.2, HZ + 9), tgt: V(HX + 1, HY + 1.6, HZ), fov: 50 }) },
  { id: 'pendulum', t0: sn(12, 1).start, t1: S(13), kind: 'cut', y: (t) => LAYERS.crust * Math.cos((t - sn(12, 1).start) * 1.6), trailFrom: -10, cam: (k) => ({ pos: V(lerp(20, 24, k), lerp(4, 6, k), lerp(20, 24, k)), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'wall', zoom: 1, t0: S(13), t1: sn(13, 1).start, kind: 'cut', y: () => 9, coriolis: true, cam: (k) => ({ pos: V(lerp(8, 5, k), lerp(9.5, 8.5, k), lerp(8, 6, k)), tgt: V(0.4, 8.2, 0), fov: 45 }) },
  { id: 'burn', t0: sn(13, 1).start, t1: sn(13, 2).start, kind: 'pov', depth: () => 0.7, speed: () => 1.8, shake: 0.35 },
  { id: 'imagine', t0: sn(13, 2).start, t1: S(14), kind: 'world', life: 'calm', digger: true, cam: (k) => ({ pos: V(lerp(13, 15, k), lerp(3, 5, k), lerp(2, -1, k)), tgt: V(7.9, 1.2, 8.4), fov: 52 }) },
  // 5. the Moon + teaser
  { id: 'moonTown', t0: S(14), t1: DURATION + 1, kind: 'world', life: 'moon', night: true, cam: (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5.5, k), lerp(70, 58, k)), tgt: V(0, lerp(10, 16, k), -60), fov: 56 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, g = null;
  for (const n in tubes) setTube(n, 0);
  if (shot.kind === 'globe') {
    g = shot.g(t, k);
    globe.update(t, g.spin, g);
    if (g.tube) setTube('jakarta', g.tube);
    if (g.tubes) for (const n in g.tubes) setTube(n, g.tubes[n]);
    c = g.cam;
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'cut') {
    c = shot.cam(k);
    // pull back so the whole cut-away Earth fits the 9:16 frame (close-ups set zoom: 1)
    const z = shot.zoom ?? 1.85;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    const y = shot.y(t);
    const tk = shot.tunnelK ? shot.tunnelK(t) : 1;
    cut.tunnel.scale.y = Math.max(0.001, tk); cut.tunnel.position.y = (LAYERS.crust + 0.2) * (1 - tk);
    cut.update(t, Math.min(y, 10.2), { trailFrom: shot.trailFrom ?? 10, trail: shot.trail !== false && y < 10, coriolis: shot.coriolis });
    cut.faller.root.visible = y < 11 && !shot.coriolis;
    scene = cut.scene;
  } else if (shot.kind === 'pov') {
    pov.update(t, val(shot.depth, t), val(shot.speed, t, 1));
    c = { pos: V(0, 4, 0), tgt: V(0, -40, 0.001), fov: 70 };
    scene = pov.scene;
  } else if (shot.kind === 'kola') {
    c = shot.cam(k);
    kola.update(t, size.h / (2 * Math.tan(rad(c.fov) / 2)));
    scene = kola.scene;
  } else if (shot.kind === 'andes') {
    c = shot.cam(k);
    andes.update(t, { frost: 0 });
    const p = val(shot.pop, t);
    traveller.root.position.set(HX, HY - 3.2 + 3.0 * easeOut(p), HZ);
    traveller.root.rotation.y = 0.6;
    traveller.pose(t, p > 0.9 ? 'wave' : 'cheer', 1);
    farmer.pose(t, 'wave', 1);
    scene = andes.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = null;
    world.moodT = shot.night ? 4 : 4;
    world.lifeMode = shot.life || 'calm';
    world.showDigger = !!shot.digger;
    moon.visible = !!shot.night;
    scene = world.scene;
  }
  const sh = camShake(t, (shot.glitch ? 0.3 : 0) + (shot.shake || 0) + (shot.kind === 'pov' ? 0.04 * val(shot.speed, t, 1) : 0));
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') {
    world.update(4, camera, size.h);
    if (shot.night) {
      const fade = 1 - smoothstep(sn(15, 0).start + 1.2, sn(15, 1).start + 0.6, t); // the Moon disappears in the teaser
      moon.material.opacity = fade;
      moon.position.copy(camera.position).add(V(0.1, 0.42, -1).normalize().multiplyScalar(900));
    }
  }
  renderer.render(scene, camera);
  overlays(t, shot);
}

const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // open loops: where do you come out? / what's the big problem?
  const q1 = t > S(3) - 0.6 && t < tAnswer + 3.2;
  const q2 = t >= tAnswer + 3.2 && t < sn(12, 2).start + 3;
  show('pill', (q1 || q2) && t < END ? 1 : 0);
  $('pill').className = 'ov' + ((q1 && t >= tAnswer) || (q2 && t >= sn(12, 2).start) ? ' done' : '');
  $('pill').textContent = q1 ? (t >= tAnswer ? 'TERJAWAB: KOLOMBIA, AMERIKA SELATAN' : 'KELUAR DI MANA?') : (t >= sn(12, 2).start ? 'TERJAWAB: BOLAK-BALIK SELAMANYA' : 'APA MASALAH BESARNYA?');
  // trip panel
  show('trip', shot.trip ? 1 : 0);
  if (shot.trip) {
    const tr = tripOf(t);
    $('tD').textContent = `${Math.round(tr.km).toLocaleString('id-ID')} km`;
    $('tT').textContent = `${Math.round(tr.temp).toLocaleString('id-ID')}°C`;
    $('tV').textContent = `${Math.round(tr.kmh / 100) * 100 > 0 ? (Math.round(tr.kmh / 100) * 100).toLocaleString('id-ID') : 0} km/jam`;
    $('tW').textContent = `${pad2(tr.min)}:${pad2((tr.min % 1) * 60)}`;
  }
  show('kbar', id === 'kbar' ? pop(t, shot.t0, shot.t1, 0.3, 0.2) : 0);
  show('teaser', pop(t, sn(15, 1).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'cut' || shot.kind === 'pov' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (id === 'burn') filter = 'saturate(1.6) contrast(1.3) brightness(1.15)';
  renderer.domElement.style.filter = filter;
  $('tint').style.background = shot.night ? 'rgba(40,60,130,0.5)' : 'transparent';
  show('tint', shot.night ? 1 : 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tJump, tExit]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  const A = cut.anchors;
  if (id === 'dig') tag('dg', 'GALI TERUS KE BAWAH…', V(7.4, 2.6, 7.6), 'yellow', smoothstep(2.4, 2.7, t));
  if (id === 'drill') { tag('jk', 'JAKARTA', A.top, 'red', 1); tag('qq', '???', A.bottom, 'yellow big', smoothstep(wT(1, /^Bumi,/), wT(1, /^Bumi,/) + 0.3, t)); }
  if (id === 'forty') tag('40', '± 40 MENIT', globe.markerPos('jakarta', 1), 'yellow big', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'problem') tag('pb', 'MASALAH BESAR?', A.top, 'red big', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'kola') tag('kl', 'SUMUR SUPERDALAM KOLA, RUSIA', kola.anchors.tower, 'yellow', smoothstep(shot.t0 + 0.5, shot.t0 + 0.8, t));
  if (id === 'cap') tag('cp', '12.262 m KE BAWAH', kola.anchors.cap, 'red big', smoothstep(shot.t0 + 0.2, shot.t0 + 0.5, t));
  if (id === 'scratch') tag('sc', 'KOLA: 12 km · DASAR 180°C', A.top.clone().add(V(0, -0.8, 0)), 'red', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'magic') tag('mg', 'LUBANG AJAIB TAHAN PANAS', A.top, 'yellow', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'mantle') { tag('mt', 'MANTEL · ±2.900 km', A.mantle, 'red', 1); tag('cr', 'KERAK (tipis)', A.crust, '', 1); }
  if (id === 'inner') { tag('oc', 'INTI LUAR: BESI CAIR', A.outer, 'yellow', 1); tag('ic', 'INTI DALAM ±5.200°C', A.inner, 'red big', smoothstep(sn(7, 2).start, sn(7, 2).start + 0.3, t)); }
  if (id === 'slow') tag('sl', 'MELAMBAT…', A.faller, 'blue', 1);
  if (id === 'hola') { tag('ho', '¡HOLA!', farmer.root.position.clone().add(V(0, 4.4, 0)), 'yellow big', smoothstep(S(10) + 1.2, S(10) + 1.5, t)); tag('co', 'KOLOMBIA', traveller.root.position.clone().add(V(0, 5, 0)), 'red', smoothstep(tAnswer, tAnswer + 0.3, t)); }
  if (id === 'map') tag('bc', 'PEGUNUNGAN ANDES · DEKAT BUCARAMANGA', globe.markerPos('colombia', 1), 'yellow', smoothstep(shot.t0 + 0.2, shot.t0 + 0.5, t));
  if (id === 'ocean') tag('oc2', 'KEBANYAKAN TEMBUS KE LAUT', V(0, -12, 0), 'blue big', smoothstep(sn(11, 1).start, sn(11, 1).start + 0.3, t));
  if (id === 'pairs') {
    tag('pj', 'JAKARTA → KOLOMBIA', globe.markerPos('jakarta', 1), 'yellow', smoothstep(sn(11, 2).start + 0.3, sn(11, 2).start + 0.6, t));
    tag('ps', 'SURABAYA → VENEZUELA', globe.markerPos('surabaya', 1), '', smoothstep(sn(11, 2).start + 0.9, sn(11, 2).start + 1.2, t));
    tag('pm', 'MEDAN → SAMUDRA PASIFIK', globe.markerPos('medan', 1), 'blue', smoothstep(sn(11, 3).start + 0.3, sn(11, 3).start + 0.6, t));
  }
  if (id === 'fallback') tag('fb', 'JATUH LAGI!', traveller.root.position.clone().add(V(0, 5, 0)), 'red big', smoothstep(S(12) + 0.8, S(12) + 1.1, t));
  if (id === 'pendulum') tag('pd', 'BOLAK-BALIK SEPERTI BANDUL', A.top, 'red big', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'wall') tag('wl', 'PUTARAN BUMI → MENABRAK DINDING', A.wall, 'red', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'imagine') tag('im', 'HANYA DALAM IMAJINASI', V(7.6, 3.2, 8.2), 'yellow', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'moonTown') tag('mn', 'MENJAUH ±3,8 cm / TAHUN', camera.position.clone().add(V(0.1, 0.52, -1).normalize().multiplyScalar(900)), 'yellow', pop(t, sn(14, 1).start, sn(15, 1).start + 0.4, 0.3, 0.3));
}

startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: [S(3), S(5), S(9), S(12), S(14)].map((x) => x - 0.4) });
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], jump: tJump, exit: tExit, answer: tAnswer, end: END, teaser: sn(15, 1).start, kola: S(3), cap: sn(3, 1).start,
  pendulum: sn(12, 1).start, wall: S(13), burn: sn(13, 1).start, moon: S(14), moonFade: sn(15, 0).start + 1.2, hola: S(10) + 1.2, fallback: S(12) + 0.6,
  chapters: [S(3), S(5), S(9), S(12), S(14)].map((x) => x - 0.4), shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.kind === 'world' || s.kind === 'kola' || s.kind === 'andes').map((s) => [s.t0, s.t1, s.kind === 'world' ? (s.life === 'moon' ? 'night-calm' : 'calm') : s.kind]),
  pov: SHOTS.filter((s) => s.kind === 'pov').map((s) => [s.t0, s.t1]),
};
for (const t of [0.3, 0.9, 1.4, 4, 8, 13, 18, 25, 33, 40, 44, 50, 55, 63, 72, 82, 92, 98, 108, 115, 120, 128, 132, 136, 145]) renderAt(t);
renderAt(0);
