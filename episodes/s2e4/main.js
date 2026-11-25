// ANDAI… Season 2, Episode 4: "Andai Jakarta tenggelam 2050".
// ITB projection: ~90-95% of North Jakarta under water by 2050 at past subsidence rates; worst areas (Muara Baru) ~10 cm/yr;
// up to ~4 m since the 1970s; sea level rises a few mm/yr. Masjid Wal Adhuna (Muara Baru) now stands in seawater.
// Muara Baru sea wall leaked in 2019 and Dec 2025. Tokyo curbed groundwater use (1950s-70s) and subsidence nearly stopped.
// PAM Jaya target: 100% piped water by 2030; DSDA reports subsidence slowing at some points.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { SubsidenceScene, SpongeScene } from '../../src/sink.js';
import { Person } from '../../src/life.js';

const BASE = './episodes/s2e4/';
const KEY = /^(masjid|laut\.|daratan\.|ITB|sembilan|puluh|persen|lima|puluh\.|kaki|kita\.|naik\.|kecil\.|milimeter|sepuluh|sentimeter|cepat\.|empat|meter|dewasa|spons|memampat,|semula\.|sumur|bor|pipa\.|bangunan|rob|pasang\.|tanggul\.|bocor\.|Muara|Baru|Tokyo|sungai|waduk\.|berhenti\.|tiga|melambat\.|lagi\.|pasti\.|perkiraan,|hari|ini\.|komentar\.|Matahari)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
const world = new World({ life: true });
world.noQuake = true;
const sub = new SubsidenceScene();
const sponge = new SpongeScene();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// sea wall in the cut-away + leaking spray; two stacked people as a 4 m ruler
const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 14), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
sub.scene.add(wall);
const leak = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0x4f9bff })); sub.scene.add(m); return { m, ph: i / 40, z: -5 + (i % 10) }; });
const R = mulberry32(8);
const stack = [new Person(R, { hat: 'hair' }), new Person(R, { hat: 'hijab' })];
stack.forEach((p, i) => { sub.scene.add(p.root); p.root.scale.setScalar(1.15); });

// ------------------------------------------------------------------ timeline
const END = E(13) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = S(9);                                    // "Tapi ada kabar baik. Tokyo..."
const mosque = (k) => ({ pos: V(lerp(-32, -36, k), lerp(15, 12, k), lerp(42, 46, k)), tgt: V(-60, 7, 72.75), fov: 50 });
const town = (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 });
const coast = (k) => ({ pos: V(lerp(22, 20, k), 3.2, lerp(14, 12, k)), tgt: V(4, 0, -4), fov: 50 });
const aerial = (k) => ({ pos: V(lerp(60, 70, k), lerp(70, 60, k), lerp(140, 150, k)), tgt: V(40, 10, 90), fov: 52 });
const cut = (k, z = 1) => ({ pos: V(lerp(-14, -8, k) * z, lerp(6, 4, k) * z, lerp(44, 40, k) * z), tgt: V(-2, -6, 0), fov: 48 });
const gJava = (lon = 107, z = 1.2) => (k) => ({ spin: face(lon) + k * 0.1, cam: { pos: V(0, 0, 30), tgt: V(0, -1, 0), fov: 45 }, zoom: z });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'world', level: () => 3.2, life: 'flood', cam: mosque, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'sub', o: () => ({ pump: 1, tide: 1.2 }), cam: (k) => cut(k), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'world', level: () => 2.6, life: 'flood', cam: aerial, glitch: true },
  // hook: the drowned mosque
  { id: 'mosque', t0: 1.7, t1: 5.0, kind: 'world', level: () => 3.4, life: 'flood', cam: mosque },
  { id: 'mosque2', t0: 5.0, t1: sn(1, 1).start, kind: 'world', level: () => 3.4, life: 'flood', cam: (k) => ({ pos: V(lerp(-20, -26, k), lerp(26, 22, k), lerp(30, 36, k)), tgt: V(-60, 6, 72.75), fov: 50 }) },
  { id: 'before', t0: sn(1, 1).start, t1: S(2), kind: 'world', level: () => 0, cam: mosque, sepia: true },
  { id: 'itb', t0: S(2), t1: S(2) + 4, kind: 'world', level: (t) => lerp(0, 2.8, smoothstep(S(2), S(2) + 6, t)), life: 'flood', cam: aerial, big: 'itb' },
  { id: 'itb2', t0: S(2) + 4, t1: S(2) + 7.4, kind: 'world', level: () => 2.8, life: 'flood', cam: town, big: 'itb' },
  { id: 'itb3', t0: S(2) + 7.4, t1: sn(2, 1).start, kind: 'world', level: () => 2.8, life: 'flood', cam: mosque, big: 'itb' },
  { id: 'how', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'world', level: () => 2.4, life: 'flood', cam: coast },
  { id: 'save', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'world', level: () => 0, cam: town },
  { id: 'under', t0: sn(2, 3).start, t1: S(3), kind: 'sub', o: () => ({ pump: 0.2, pumping: 1 }), cam: (k) => cut(k, 1.1) },
  // 1. sea rising vs land sinking
  { id: 'sea', t0: S(3), t1: sn(3, 2).start, kind: 'world', level: (t) => 0.3 * Math.sin(t * 1.2), cam: coast },
  { id: 'race', t0: sn(3, 2).start, t1: sn(3, 3).start, kind: 'sub', o: (t) => ({ pump: lerp(0.1, 0.35, smoothstep(sn(3, 2).start, sn(3, 4).start, t)), pumping: 1 }), cam: (k) => cut(k), race: true },
  { id: 'race2', t0: sn(3, 3).start, t1: sn(3, 4).start, kind: 'sub', o: (t) => ({ pump: lerp(0.2, 0.35, smoothstep(sn(3, 3).start, sn(3, 4).start, t)), pumping: 1 }), cam: (k) => ({ pos: V(lerp(-30, -28, k), 2, lerp(26, 22, k)), tgt: V(-20, -1, 4), fov: 48 }), race: true },
  { id: 'faster', t0: sn(3, 4).start, t1: S(4), kind: 'world', level: () => 1.9, life: 'flood', cam: coast, race: true },
  { id: 'four', t0: S(4), t1: sn(4, 1).start, kind: 'sub', o: (t) => ({ pump: lerp(0.35, 1, smoothstep(S(4), sn(4, 1).start, t)), pumping: 1 }), cam: (k) => ({ pos: V(lerp(-30, -28, k), 2, lerp(26, 22, k)), tgt: V(-20, -1, 4), fov: 48 }) },
  { id: 'stack', t0: sn(4, 1).start, t1: S(5), kind: 'sub', stack: true, o: () => ({ pump: 1 }), cam: (k) => ({ pos: V(lerp(-31, -30, k), 0.5, lerp(14, 12, k)), tgt: V(-23, 0, 6.5), fov: 48 }) },
  // 2. the sponge
  { id: 'why', t0: S(5), t1: sn(5, 1).start, kind: 'world', level: () => 0, cam: town },
  { id: 'sponge', t0: sn(5, 1).start, t1: sn(5, 2).start, kind: 'sponge', sq: () => 0, cam: (k) => ({ pos: V(lerp(6, 5, k), lerp(4, 3.5, k), lerp(9, 8, k)), tgt: V(0, 1.2, 0), fov: 45 }) },
  { id: 'squeeze', t0: sn(5, 2).start, t1: sn(5, 3).start, kind: 'sponge', sq: (t) => smoothstep(sn(5, 2).start + 0.6, sn(5, 3).start - 0.3, t), cam: (k) => ({ pos: V(lerp(5, 4, k), 3, lerp(8, 7, k)), tgt: V(0, 1, 0), fov: 45 }) },
  { id: 'noback', t0: sn(5, 3).start, t1: S(6), kind: 'sub', o: () => ({ pump: 0.8 }), cam: (k) => ({ pos: V(lerp(-4, 0, k), -4, 30), tgt: V(-4, -6, 0), fov: 48 }) },
  { id: 'wells', t0: S(6), t1: S(6) + 3.6, kind: 'sub', o: () => ({ pump: 0.5, pumping: 1 }), cam: (k) => ({ pos: V(lerp(-6, -2, k), -6, 26), tgt: V(0, -9, 0), fov: 48 }) },
  { id: 'houses', t0: S(6) + 3.6, t1: S(6) + 7.2, kind: 'world', level: () => 0, cam: (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5, k), lerp(70, 64, k)), tgt: V(0, 8, -60), fov: 56 }) },
  { id: 'nopipe', t0: S(6) + 7.2, t1: sn(6, 1).start, kind: 'sub', o: () => ({ pump: 0.6, pumping: 1 }), cam: (k) => cut(k, 0.8) },
  { id: 'weight', t0: sn(6, 1).start, t1: S(7), kind: 'world', level: () => 0, cam: aerial },
  // 3. 2050
  { id: 'y2050', t0: S(7), t1: sn(7, 1).start, kind: 'world', level: (t) => lerp(0, 2.2, smoothstep(S(7), sn(7, 1).start, t)), life: 'flood', cam: aerial, year: true },
  { id: 'rob', t0: sn(7, 1).start, t1: sn(7, 2).start, kind: 'world', level: (t) => 2.2 + 0.6 * Math.sin(t * 2), life: 'flood', cam: town, year: true },
  { id: 'port', t0: sn(7, 2).start, t1: sn(7, 2).start + 3.6, kind: 'world', level: () => 3.0, life: 'flood', cam: coast },
  { id: 'wall', t0: sn(7, 2).start + 3.6, t1: S(8), kind: 'sub', o: () => ({ pump: 1, tide: 1.4, wall: 1 }), wall: true, cam: (k) => ({ pos: V(lerp(30, 26, k), 4, lerp(36, 32, k)), tgt: V(16, -1, 0), fov: 48 }) },
  { id: 'leak', t0: S(8), t1: sn(8, 1).start + 1.5, kind: 'sub', o: () => ({ pump: 1, tide: 1.4, wall: 1 }), wall: true, leaking: true, cam: (k) => ({ pos: V(lerp(24, 22, k), 2.5, lerp(22, 20, k)), tgt: V(18, -0.5, 4), fov: 48 }) },
  { id: 'leakhome', t0: sn(8, 1).start + 1.5, t1: sn(8, 1).start + 5, kind: 'world', level: () => 2.6, life: 'flood', cam: town },
  { id: 'leak2', t0: sn(8, 1).start + 5, t1: S(9), kind: 'world', level: (t) => lerp(2.2, 2.9, smoothstep(sn(8, 1).start + 5, S(9), t)), life: 'flood', cam: mosque },
  // 4. good news: Tokyo, piped water
  { id: 'tokyo', t0: S(9), t1: sn(9, 2).start, kind: 'globe', g: gJava(125, 1.0), markers: ['tokyo', 'jakarta'] },
  { id: 'tokyo4', t0: sn(9, 2).start, t1: sn(9, 3).start, kind: 'globe', g: gJava(139, 1.2), markers: ['tokyo'] },
  { id: 'reservoir', t0: sn(9, 3).start, t1: sn(9, 3).start + 3, kind: 'sub', o: () => ({ pump: 0.6, piped: 1, wells: 0 }), cam: (k) => cut(k, 0.9) },
  { id: 'reservoir2', t0: sn(9, 3).start + 3, t1: sn(9, 4).start, kind: 'sub', o: () => ({ pump: 0.6, piped: 1, wells: 0 }), cam: (k) => ({ pos: V(lerp(6, 10, k), 4, lerp(20, 18, k)), tgt: V(4, 1, 4), fov: 48 }) },
  { id: 'stopped', t0: sn(9, 4).start, t1: S(10), kind: 'sub', o: () => ({ pump: 0.6, piped: 1, wells: 0 }), cam: (k) => ({ pos: V(lerp(-20, -10, k), lerp(8, 6, k), 30), tgt: V(0, 0, 0), fov: 48 }) },
  { id: 'jkt', t0: S(10), t1: sn(10, 1).start, kind: 'world', level: () => 0, cam: town },
  { id: 'fix', t0: sn(10, 1).start, t1: sn(10, 2).start, kind: 'sub', o: () => ({ pump: 0.7, piped: 1, wells: 0, tide: 0.8, wall: 1 }), wall: true, fix: true, cam: (k) => cut(k, 1.05) },
  { id: 'fix2', t0: sn(10, 2).start, t1: sn(10, 3).start, kind: 'world', level: () => 0, fix: true, cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'slow', t0: sn(10, 3).start, t1: S(11), kind: 'world', level: () => 0, cam: (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5, k), lerp(70, 64, k)), tgt: V(0, 8, -60), fov: 56 }), fix: true },
  { id: 'never', t0: S(11), t1: sn(11, 1).start, kind: 'sponge', sq: () => 0.85, cam: (k) => ({ pos: V(lerp(5, 4, k), 3, lerp(8, 7, k)), tgt: V(0, 1, 0), fov: 45 }) },
  { id: 'stop', t0: sn(11, 1).start, t1: S(12), kind: 'sub', o: () => ({ pump: 0.7, piped: 1, wells: 0 }), cam: (k) => cut(k) },
  // 5. answer
  { id: 'sure', t0: S(12), t1: sn(12, 1).start, kind: 'world', level: (t) => 2.4 + 0.3 * Math.sin(t * 2), life: 'flood', cam: aerial, sepia: true },
  { id: 'notsure', t0: sn(12, 1).start, t1: sn(12, 3).start, kind: 'world', level: () => 0, cam: town },
  { id: 'today', t0: sn(12, 3).start, t1: S(13), kind: 'world', level: () => 0, cam: (k) => ({ pos: V(lerp(-6, -4, k), lerp(4, 16, k), lerp(44, 34, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'cta', t0: S(13), t1: sn(13, 2).start, kind: 'world', level: () => 0, cam: (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5, k), lerp(70, 64, k)), tgt: V(0, 8, -60), fov: 56 }) },
  { id: 'teaser', t0: sn(13, 2).start, t1: DURATION + 1, kind: 'world', level: () => 0, dark: true, cam: (k) => ({ pos: V(-4, 3, lerp(72, 68, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 }) },
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
    globe.update(t, g.spin, { markers: shot.markers || [], clouds: 0.3 });
    c = { ...g.cam, pos: g.cam.tgt.clone().add(g.cam.pos.clone().sub(g.cam.tgt).multiplyScalar(g.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = shot.level(t); world.moodT = 4; world.lifeMode = shot.life || 'calm';
    world.jumpP = null; world.freezeT = null;
    scene = world.scene;
  } else if (shot.kind === 'sub') {
    c = shot.cam(k);
    const o = shot.o(t);
    const surf = sub.update(t, o);
    wall.visible = !!shot.wall; wall.scale.y = 2.6; wall.position.set(20.2, surf + 1.3, 0);
    for (const q of leak) {
      const f = (q.ph + t * 0.8) % 1;
      q.m.visible = !!shot.leaking;
      q.m.position.set(20.2 - f * 6, surf + 1.6 - f * f * 1.5, q.z);
    }
    stack.forEach((p, i) => { p.root.visible = !!shot.stack; p.root.position.set(-23, surf + 0.0 + i * 2.0 - 4, 6.5); p.root.rotation.y = 0.3; p.pose(t, i ? 'wave' : 'idle', 1); });
    scene = sub.scene;
  } else if (shot.kind === 'sponge') {
    c = shot.cam(k);
    sponge.update(t, shot.sq(t));
    scene = sponge.scene;
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
  const q = t > sn(2, 2).start + 0.3 && t < S(11);
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 1.5;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: HENTIKAN SEDOT AIR TANAH' : 'APA YANG BISA MENYELAMATKAN JAKARTA?';
  show('big', shot.big ? pop(t, S(2) + 0.3, sn(2, 1).start, 0.3, 0.2) : 0);
  const rc = shot.race ? pop(t, sn(3, 2).start + 0.3, S(4), 0.3, 0.2) : 0;
  show('race', rc);
  if (rc) { $('r1').style.width = `${3.5 * smoothstep(sn(3, 2).start + 0.5, sn(3, 3).start, t)}%`; $('r2').style.width = `${100 * smoothstep(sn(3, 3).start, sn(3, 3).start + 2.5, t)}%`; }
  const yr = shot.year ? pop(t, S(7) + 0.2, sn(7, 2).start, 0.3, 0.2) : 0;
  show('year', yr);
  if (yr) { $('yV').textContent = Math.round(lerp(2025, 2050, smoothstep(S(7) + 0.3, sn(7, 1).start + 1, t))); $('yU').textContent = t < sn(7, 1).start ? 'kalau tanah terus turun…' : 'banjir rob setiap air pasang'; }
  const fx = shot.fix ? pop(t, sn(10, 1).start + 0.2, S(11), 0.3, 0.2) : 0;
  show('fix', fx);
  if (fx) { const ts = [sn(10, 1).start, sn(10, 1).start + 1.2, sn(10, 1).start + 2.4, sn(10, 2).start]; ['f1', 'f2', 'f3', 'f4'].forEach((f, i) => ($(f).style.opacity = t >= ts[i] ? 1 : 0.2)); }
  show('teaser', pop(t, sn(13, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'sub' || shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.sepia) filter = 'sepia(0.7) contrast(1.05)';
  if (shot.dark) filter = `brightness(${lerp(1, 0.15, smoothstep(sn(13, 3).start, END, t))})`;
  renderer.domElement.style.filter = filter;
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, sn(1, 1).start, tAnswer + 1.5]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const A = sub.anchors;
  if (id === 'mosque') tag('mq', 'MASJID WAL ADHUNA · MUARA BARU', V(-60, 32, 72.75), 'yellow', tin(0.5));
  if (id === 'before') tag('bf', 'DULU: DARATAN', V(-60, 32, 72.75), '', tin(0.1));
  if (id === 'under') tag('ud', 'JAWABANNYA DI BAWAH KAKI KITA', A.surface, 'yellow', tin(0.3));
  if (id === 'sea') tag('se', 'LAUT NAIK: BEBERAPA mm/TAHUN', V(4, 3, -8), 'blue', tin(0.5));
  if (id === 'four') tag('fm', 'TURUN ±4 m SEJAK 1970-AN', A.ruler, 'red', tin(0.5));
  if (id === 'stack') tag('st', '4 m ≈ 2 ORANG DEWASA', V(-23, sub.top.position.y + 1, 6.5), 'yellow', tin(0.3));
  if (id === 'sponge') tag('sp', 'TANAH = SPONS BASAH', sponge.anchors.sponge, 'yellow', tin(0.3));
  if (id === 'squeeze') tag('sq', 'AIR DISEDOT → MEMAMPAT', sponge.anchors.sponge, 'red', tin(0.6));
  if (id === 'noback') tag('nb', 'LAPISAN LEMPUNG MEMAMPAT', A.clay, 'red', tin(0.3));
  if (id === 'wells') tag('wl', 'SUMUR BOR MENYEDOT AIR TANAH', A.wells, 'blue', tin(0.3));
  if (id === 'weight') tag('wg', '+ BERAT BANGUNAN', V(40, 30, 90), 'yellow', tin(0.3));
  if (id === 'port') tag('pt', 'DI BAWAH PERMUKAAN LAUT', V(4, 5, -4), 'red', tin(0.3));
  if (id === 'wall') tag('tw', 'HANYA DILINDUNGI TANGGUL', V(20.2, sub.top.position.y + 4, 4), 'yellow', tin(0.3));
  if (id === 'leak') tag('lk', 'BOCOR · MUARA BARU 2019 & 2025', V(20.2, sub.top.position.y + 4, 4), 'red', tin(0.3));
  if (id === 'tokyo') tag('tk', 'TOKYO', globe.markerPos('tokyo', 1), 'yellow', tin(0.3));
  if (id === 'tokyo4') tag('t4', 'PERNAH TURUN ±4 m', globe.markerPos('tokyo', 1), 'red', tin(0.3));
  if (id === 'reservoir' || id === 'reservoir2') tag('rv', 'AIR SUNGAI & WADUK LEWAT PIPA', A.pipe, 'blue', tin(0.3));
  if (id === 'stopped') tag('sd', 'PENURUNAN TANAH HAMPIR BERHENTI', A.surface, 'green', tin(0.3));
  if (id === 'never') tag('nv', 'TIDAK BISA KEMBALI', sponge.anchors.sponge, 'red', tin(0.3));
  if (id === 'stop') tag('sp2', 'HENTIKAN, SECEPAT MUNGKIN', A.surface, 'green', tin(0.3));
  if (id === 'notsure') tag('ns', 'TIDAK PASTI: ITU PERKIRAAN', V(0, 9, 80), 'yellow big', tin(0.3));
  if (id === 'cta') tag('ct', 'AIR TANAH ATAU AIR PIPA? 👇', V(0, 10, 0), 'yellow', smoothstep(sn(13, 1).start, sn(13, 1).start + 0.3, t));
}

const CH = [S(3), S(5), S(7), S(9), S(12)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'world' ? (s.life === 'flood' ? 'flood' : 'calm') : s.kind === 'sub' ? 'ground' : s.kind === 'sponge' ? 'sponge' : 'none');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, answer: tAnswer + 1.5, mosquePos: (() => { const b = world.buildings.find((b) => b.mosque); return b ? [b.x, b.z, b.g0] : null; })(), before: sn(1, 1).start, squeeze: [sn(5, 2).start + 0.6, sn(5, 3).start - 0.3],
  leak: [S(8), sn(8, 1).start + 3], teaser: sn(13, 3).start, year: [S(7) + 0.3, sn(7, 1).start + 1], fix: [sn(10, 1).start, sn(10, 1).start + 1.2, sn(10, 1).start + 2.4, sn(10, 2).start],
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 3, 6, 9, 12, 16, 22, 24, 27, 32, 38, 44, 50, 54, 58, 62, 66, 70, 74, 78, 82, 85, 89, 94, 99, 102, 105, 110, 114, 117, 121, 127, 132, 136, 140, 148, 152, 156, 161, 166, 170, 176, 181]) renderAt(t);
renderAt(0);
