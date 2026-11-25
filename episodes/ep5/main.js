// ANDAI… Episode 5 (series finale): "Andai Bulan menghilang" — live web episode.
// Tides shrink to the solar part (~46%), nights darken, moon-timed life loses its clock,
// the axial tilt loses its stabiliser, and the hilal that starts Ramadan and Syawal is gone.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { OrbitScene } from '../../src/sunlight.js';
import { makeRowBoat } from '../../src/life.js';
import { ReefScene, HilalScene, EclipseScene, TurtleBeach, MangroveScene, moonTexture } from '../../src/moonscenes.js';

const BASE = './episodes/ep5/';
const KEY = /^(Bulan|Bulan,|Lebaran\.|Kenapa\?|laut\.|Pasang|surut|setengahnya\.|bakau|Nelayan|gelap\.|Purnama|Tukik,|tersesat\.|Great|Barrier|Reef,|serentak,|hilang\.|kemiringan|sumbu|derajat\.|sepuluh|liar\.|ekstrem\.|Hijriah|hilal,|hilal|isbat|nol\.|empat|sentimeter|enam|ratus|juta|total|beruntung|komentar\.|berikutnya\?)$/i;

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
const orbit = new OrbitScene(globe.u.uMap.value);
const reef = new ReefScene();
const hilal = new HilalScene();
const eclipse = new EclipseScene();
const beach = new TurtleBeach();
const mangrove = new MangroveScene();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// the Moon over the town (a sprite kept at a fixed direction from the camera)
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(1), fog: false, depthWrite: false, transparent: true }));
moon.scale.setScalar(200);
world.scene.add(moon);
const MOON_DIR = V(0.12, 0.42, -1).normalize();
// a fisherman with his boat at the water's edge
const R = mulberry32(55);
const fishBoat = makeRowBoat(R, 1);
fishBoat.position.set(4, 0, -3);
fishBoat.rotation.y = 0.5;
world.scene.add(fishBoat);
// the tidal bulge on the globe: an ocean shell stretched towards the Moon
const tideShell = new THREE.Mesh(new THREE.SphereGeometry(10.15, 64, 32), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.35, depthWrite: false }));
globe.scene.add(tideShell);

// ------------------------------------------------------------------ timeline
const END = E(14) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = S(11);                        // "Tanpa Bulan, tidak ada hilal..."
const tFar = sn(12, 2).start;                 // "Ia hanya menjauh..."
const moonGone = (t) => smoothstep(wT(1, /^Bulan/), E(1) + 0.2, t);   // opening: the Moon fades from the sky
const tideCycle = (t, amp) => amp * Math.sin((t * Math.PI * 2) / 3.2);    // time-lapse: one tide every 3.2 s
const tiltAt = (t) => {
  const amp = t < S(9) ? 0 : t < sn(9, 1).start ? lerp(0, 10, smoothstep(S(9), sn(9, 1).start, t)) : t < sn(9, 1).start + 3 ? 10 : lerp(10, 32, smoothstep(sn(9, 1).start + 3, sn(9, 2).start, t));
  return 23.5 + amp * Math.sin(((t - S(9)) * Math.PI * 2) / 2.4);
};

const nightCam = (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5.2, k), lerp(70, 60, k)), tgt: V(0, lerp(10, 15, k), -60), fov: 56 });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'hilal', cres: () => 1, cam: () => ({ pos: V(0.3, 2.7, 6.4), tgt: hilal.moon.position, fov: 16 }), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'eclipse', shrink: () => 0, cam: () => ({ pos: V(0, 0, 32), tgt: V(0, 0, 0), fov: 45 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'beach', moon: () => 0, cam: () => ({ pos: V(-3, 2.2, 3), tgt: V(0, 1.5, 20), fov: 55 }), glitch: true },
  // hook: the night the Moon is gone
  { id: 'night', t0: 1.7, t1: S(2), kind: 'world', moon: (t) => 1 - moonGone(t), cam: nightCam },
  { id: 'quiet', t0: S(2), t1: sn(2, 2).start, kind: 'world', moon: () => 0, cam: (k) => ({ pos: V(lerp(-6, -5, k), 2.4, lerp(70, 66, k)), tgt: V(0, 7, 0), fov: 52 }) },
  { id: 'slowly', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'globe', g: (t, k) => ({ spin: face(110) + k * 0.4, moonOrbit: 1.6 + k * 0.5, moonFade: 1 - smoothstep(sn(2, 2).start + 0.8, sn(2, 3).start - 0.3, t), tide: 1, cam: { pos: V(0, 9, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: 2.3 }) },
  { id: 'lebaran', t0: sn(2, 3).start, t1: sn(2, 4).start, kind: 'hilal', cres: () => 1, cam: (k) => ({ pos: V(lerp(5, 3.5, k), 3.4, lerp(17, 15, k)), tgt: V(-8, 9, -60), fov: 50 }) },
  { id: 'why', t0: sn(2, 4).start, t1: S(3), kind: 'hilal', cres: (t) => 1 - smoothstep(sn(2, 4).start + 0.2, sn(2, 5).start, t), cam: (k) => ({ pos: V(0.3, 2.7, 6.4), tgt: hilal.moon.position, fov: lerp(22, 16, k) }) },
  // 1. tides
  { id: 'tides', t0: S(3), t1: sn(3, 1).start + 1.6, kind: 'world', life: 'calm', level: (t) => tideCycle(t, 1.1), cam: (k) => ({ pos: V(lerp(22, 20, k), 3.2, lerp(14, 12, k)), tgt: V(4, 0, -4), fov: 50 }) },
  { id: 'pull', t0: sn(3, 1).start + 1.6, t1: S(4), kind: 'globe', g: (t, k) => ({ spin: face(115) + k * 0.6, moonOrbit: 0.9 + k * 0.4, tide: 1, cam: { pos: V(0, 10, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: 2.3 }) },
  { id: 'half', t0: S(4), t1: sn(4, 1).start, kind: 'globe', g: (t, k) => ({ spin: face(115) + k * 0.4, moonOrbit: 1.3, moonFade: 1 - smoothstep(S(4) + 0.4, S(4) + 1.4, t), tide: lerp(1, 0.46, smoothstep(S(4) + 0.6, S(4) + 2, t)), cam: { pos: V(0, 10, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: 2.3 }) },
  { id: 'bakau', t0: sn(4, 1).start, t1: sn(4, 2).start, kind: 'mangrove', level: (t) => lerp(0.2, 0.75, 0.5 + 0.5 * Math.sin(t * 1.4)) * lerp(1, 0.46, smoothstep(sn(4, 1).start + 1.2, sn(4, 1).start + 2.5, t)), cam: (k) => ({ pos: V(lerp(-7, -4, k), 2.6, lerp(18, 15, k)), tgt: V(0, 1.2, -8), fov: 50 }) },
  { id: 'fisher', t0: sn(4, 2).start, t1: S(5), kind: 'world', life: 'calm', level: (t) => tideCycle(t, 0.5), cam: (k) => ({ pos: V(lerp(10, 9, k), 2.0, lerp(5, 4, k)), tgt: V(4, 1, -3), fov: 50 }) },
  // 2. darker nights, lost hatchlings, coral spawning
  { id: 'dark', t0: S(5), t1: sn(5, 1).start, kind: 'world', moon: () => 0, cam: nightCam },
  { id: 'purnama', t0: sn(5, 1).start, t1: S(6), kind: 'world', moon: (t) => 1 - smoothstep(wT(5, /^tidak/), E(5), t), cam: (k) => ({ pos: V(lerp(-28, -24, k), 2.4, lerp(58, 54, k)), tgt: V(0, 9, -40), fov: 56 }) },
  { id: 'tukik', t0: S(6), t1: sn(6, 1).start, kind: 'beach', moon: () => 1, cam: (k) => ({ pos: V(lerp(3, 2.2, k), lerp(2.2, 1.7, k), lerp(14, 12.5, k)), tgt: V(-0.5, 0.2, 5), fov: 50 }) },
  { id: 'lost', t0: sn(6, 1).start, t1: S(7), kind: 'beach', moon: (t) => 1 - smoothstep(sn(6, 1).start, sn(6, 1).start + 0.8, t), cam: (k) => ({ pos: V(lerp(-4, -3, k), 2.2, lerp(2, 4, k)), tgt: V(0, 1.6, 22), fov: 55 }) },
  { id: 'reef', t0: S(7), t1: sn(7, 1).start, kind: 'reef', spawn: (t) => smoothstep(S(7) + 1.5, S(7) + 3, t), light: () => 1, cam: (k) => ({ pos: V(lerp(-3, 2, k), lerp(3, 4, k), lerp(8, 5, k)), tgt: V(0, 4, -14), fov: 55 }) },
  { id: 'noclock', t0: sn(7, 1).start, t1: S(8), kind: 'reef', spawn: (t) => 1 - smoothstep(sn(7, 1).start, sn(7, 1).start + 1.2, t), light: (t) => 1 - smoothstep(sn(7, 1).start, sn(7, 1).start + 1.2, t), cam: (k) => ({ pos: V(2, 4, lerp(5, 3, k)), tgt: V(0, 4, -14), fov: 55 }) },
  // 3. the tilt
  { id: 'bigger', t0: S(8), t1: sn(8, 1).start, kind: 'globe', g: (t, k) => ({ spin: face(110) + k, moonOrbit: 2 + k * 0.5, tide: 0, cam: { pos: V(0, 6, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: 2.3 }) },
  { id: 'tilt', t0: sn(8, 1).start, t1: S(9), kind: 'orbit', tilt: () => 23.5, cam: (k) => ({ pos: V(lerp(6, 4, k), 2, lerp(17, 18, k)), tgt: V(0, 0.4, 30), fov: 45 }) },
  { id: 'wobble', t0: S(9), t1: sn(9, 2).start, kind: 'orbit', tilt: tiltAt, cam: (k) => ({ pos: V(lerp(4, 2, k), 2, lerp(18, 16.5, k)), tgt: V(0, 0.4, 30), fov: 45 }) },
  { id: 'heat', t0: sn(9, 2).start, t1: sn(9, 2).start + 1.1, kind: 'world', life: 'heat', heat: true, cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 46, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'snow', t0: sn(9, 2).start + 1.1, t1: S(10), kind: 'world', life: 'snow', snow: true, cam: (k) => ({ pos: V(lerp(115, 108, k), lerp(60, 56, k), lerp(20, 28, k)), tgt: V(55, 26, 110), fov: 52 }) },
  // 4. Lebaran
  { id: 'rukyat', t0: S(10), t1: sn(10, 1).start, kind: 'hilal', cres: () => 1, cam: (k) => ({ pos: V(lerp(-11, -10, k), 3, lerp(0.5, 1.5, k)), tgt: V(-1, 2.3, 7.5), fov: 45 }) },
  { id: 'calendar', t0: sn(10, 1).start, t1: sn(10, 2).start, kind: 'hilal', cres: () => 1, cal: true, cam: (k) => ({ pos: V(5, 3.4, 18), tgt: V(-8, 9, -60), fov: 50 }) },
  { id: 'hilal', t0: sn(10, 2).start, t1: S(11), kind: 'hilal', cres: () => 1, scope: true, cam: (k) => ({ pos: V(0.3, 2.7, 6.4), tgt: hilal.moon.position, fov: lerp(30, 14, k) }) },
  { id: 'nohilal', t0: S(11), t1: sn(11, 1).start, kind: 'hilal', cres: (t) => 1 - smoothstep(S(11) + 0.6, S(11) + 1.8, t), cam: (k) => ({ pos: V(lerp(4, 3, k), 3.4, lerp(16, 14, k)), tgt: V(-8, 9, -60), fov: 50 }) },
  { id: 'isbat', t0: sn(11, 1).start, t1: sn(11, 2).start, kind: 'hilal', cres: () => 0, cam: (k) => ({ pos: V(lerp(10, 9, k), 3, lerp(0.5, 1.5, k)), tgt: V(0, 2.3, 7.5), fov: 45 }) },
  { id: 'rewrite', t0: sn(11, 2).start, t1: S(12), kind: 'hilal', cres: () => 0, cal: true, lost: true, cam: () => ({ pos: V(5, 3.4, 18), tgt: V(-8, 9, -60), fov: 50 }) },
  // 5. it only drifts away + finale
  { id: 'calm', t0: S(12), t1: tFar, kind: 'world', moon: () => 1, cam: nightCam },
  { id: 'drift', t0: tFar, t1: sn(12, 3).start, kind: 'globe', g: (t, k) => ({ spin: face(110) + k * 0.4, moonOrbit: 2.4, moonDist: lerp(1, 1.25, smoothstep(tFar + 0.5, sn(12, 3).start, t)), tide: 1, cam: { pos: V(0, 12, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: 2.5 }) },
  { id: 'eclipse', t0: sn(12, 3).start, t1: S(13), kind: 'eclipse', shrink: (t) => smoothstep(sn(12, 3).start + 2.2, E(12) - 0.4, t), cam: () => ({ pos: V(0, 0, 32), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'lookup', t0: S(13), t1: sn(13, 1).start, kind: 'world', moon: () => 1, cam: (k) => ({ pos: V(lerp(-6, -5, k), 2.2, lerp(36, 39, k)), tgt: V(0, lerp(3, 5, k), 62), fov: 52 }) },
  { id: 'lucky', t0: sn(13, 1).start, t1: DURATION + 1, kind: 'world', moon: () => 1, cam: (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 6, k), lerp(70, 54, k)), tgt: V(0, lerp(12, 20, k), -60), fov: 56 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
let curMoon = 0;
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c;
  curMoon = shot.moon ? val(shot.moon, t) : 0;
  if (shot.kind === 'globe') {
    const g = shot.g(t, k);
    const fade = g.moonFade ?? 1;
    globe.update(t, g.spin, { moon: fade > 0.01, moonAngle: g.moonOrbit ?? 0, clouds: 0.35 });
    globe.moon.position.multiplyScalar(g.moonDist ?? 1);
    globe.moon.material.transparent = true; globe.moon.material.opacity = fade;
    const dir = globe.moon.position.clone().setY(0).normalize();
    const tk = g.tide ?? 0;
    tideShell.visible = tk > 0.01;
    tideShell.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
    tideShell.scale.set(1 + 0.16 * tk, 1 - 0.03 * tk, 1 - 0.03 * tk);
    c = g.cam;
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = shot.level ? shot.level(t) : 0;
    world.moodT = 4;
    world.lifeMode = shot.life || 'moon';
    world.snow = shot.snow ? 1 : 0;
    world.snowCover = shot.snow ? 1 : 0;
    moon.visible = shot.moon != null && curMoon > 0.01;
    moon.material.opacity = curMoon;
    fishBoat.visible = shot.id === 'fisher' || shot.id === 'tides';
    fishBoat.position.y = Math.max(world.levelOverride, -0.2) + 0.1;
    fishBoat.userData.crew[0].pose(t, shot.id === 'fisher' ? 'point' : 'row', 1);
    scene = world.scene;
  } else if (shot.kind === 'hilal') {
    c = shot.cam(k);
    hilal.update(t, val(shot.cres, t));
    scene = hilal.scene;
  } else if (shot.kind === 'eclipse') {
    c = shot.cam(k);
    eclipse.update(t, val(shot.shrink, t));
    scene = eclipse.scene;
  } else if (shot.kind === 'beach') {
    c = shot.cam(k);
    beach.update(t, curMoon);
    scene = beach.scene;
  } else if (shot.kind === 'reef') {
    c = shot.cam(k);
    reef.update(t, val(shot.spawn, t), val(shot.light, t));
    scene = reef.scene;
  } else if (shot.kind === 'mangrove') {
    c = shot.cam(k);
    mangrove.update(t, val(shot.level, t));
    scene = mangrove.scene;
  } else if (shot.kind === 'orbit') {
    orbit.update(t, Math.PI / 2, t * 0.8, val(shot.tilt, t));
    c = shot.cam(k);
    scene = orbit.scene;
  }
  const sh = camShake(t, shot.glitch ? 0.3 : 0);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') {
    world.update(4, camera, size.h);
    moon.position.copy(camera.position).add(MOON_DIR.clone().multiplyScalar(900));
  }
  renderer.render(scene, camera);
  overlays(t, shot);
}

function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // open loops: why Lebaran? -> could the Moon really vanish?
  const q1 = t > sn(2, 3).start + 0.8 && t < tAnswer + 4;
  const q2 = t >= tAnswer + 4 && t < tFar + 4;
  show('pill', (q1 || q2) && t < END ? 1 : 0);
  const done1 = q1 && t >= tAnswer + 0.8, done2 = q2 && t >= tFar;
  $('pill').className = 'ov' + (done1 || done2 ? ' done' : '');
  $('pill').textContent = q1 ? (done1 ? 'TERJAWAB: TIDAK ADA HILAL' : 'KENAPA LEBARAN? (jawabannya nanti)') : (done2 ? 'TERJAWAB: TIDAK, HANYA MENJAUH' : 'BULAN BISA BENAR-BENAR HILANG?');
  // panels
  const tideK = id === 'half' ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('tide', tideK);
  if (tideK) { $('tf1').style.width = '100%'; $('tf2').style.width = `${46 * smoothstep(shot.t0 + 0.6, shot.t0 + 2, t)}%`; }
  const tiltK = id === 'tilt' || id === 'wobble' ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('tilt', tiltK);
  if (tiltK) {
    const d = id === 'tilt' ? 23.5 : tiltAt(t);
    $('tiltV').textContent = `${d.toFixed(1).replace('.', ',')}°`;
    $('tiltU').textContent = id === 'tilt' ? 'DIJAGA STABIL OLEH BULAN' : t < sn(9, 1).start ? 'TANPA BULAN: BERGOYANG…' : t < sn(9, 1).start + 3 ? 'PERKIRAAN: ±10°' : 'ATAU JAUH LEBIH LIAR?';
  }
  show('cal', shot.cal ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  $('cal').className = 'ov panel' + (shot.lost ? ' lost' : '');
  $('calH').textContent = shot.lost ? 'RAMADAN & SYAWAL: DIHITUNG DENGAN APA?' : 'KALENDER HIJRIAH = KALENDER BULAN';
  if (shot.lost) document.querySelectorAll('#cal .m i').forEach((e) => (e.textContent = '?'));
  else document.querySelectorAll('#cal .m i').forEach((e, i) => (e.textContent = '🌒🌓🌔🌕🌖🌗🌘🌑🌒🌓🌔🌕'.match(/./gu)[i]));
  show('isbat', id === 'isbat' ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0);
  const yrK = id === 'eclipse' ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('yr', yrK);
  if (yrK) {
    const late = t > sn(12, 3).start + 2.6;
    $('yrA').textContent = late ? '± 600 JUTA TAHUN LAGI' : 'HARI INI';
    $('yrV').textContent = late ? 'GERHANA CINCIN' : 'GERHANA TOTAL';
    $('yrS').textContent = late ? 'Bulan terlalu jauh untuk menutup Matahari' : 'Bulan pas menutup Matahari';
  }
  show('cta', pop(t, sn(14, 1).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'globe' || shot.kind === 'orbit' || shot.kind === 'eclipse' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (id === 'heat') filter = 'saturate(1.4) sepia(0.35) brightness(1.1)';
  if (shot.scope) filter = 'contrast(1.1)';
  renderer.domElement.style.filter = filter;
  // night: a blue multiply tint that gets much darker without the Moon
  const night = shot.kind === 'world' && shot.moon != null;
  const dark = 1 - curMoon;
  $('tint').style.background = night ? `rgba(${Math.round(lerp(40, 20, dark))},${Math.round(lerp(60, 26, dark))},${Math.round(lerp(130, 72, dark))},1)` : id === 'heat' ? 'rgba(255,170,110,1)' : 'transparent';
  show('tint', night ? 1 : id === 'heat' ? 0.6 : 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tAnswer + 0.8]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const sky = camera.position.clone().add(MOON_DIR.clone().multiplyScalar(900)).add(V(0, -110, 0));
  if (id === 'night') tag('nt', 'BULAN… HILANG?', sky, 'yellow big', smoothstep(wT(1, /^Bulan/), wT(1, /^Bulan/) + 0.3, t));
  if (id === 'slowly') tag('sl', 'PELAN-PELAN…', globe.moon.position.clone().add(V(0, 4, 0)), 'yellow', tin());
  if (id === 'lebaran') tag('lb', 'LEBARAN?', hilal.anchors.moon, 'yellow big', smoothstep(wT(2, /^Lebaran/), wT(2, /^Lebaran/) + 0.3, t));
  if (id === 'why') tag('wy', '???', hilal.anchors.moon.clone().add(V(0, -3, 0)), 'red big', tin(0.5));
  if (id === 'tides') tag('td', 'TIME-LAPSE: PASANG ↔ SURUT', V(4, 3.4, -4), 'blue', tin());
  if (id === 'pull') { tag('gm', 'TARIKAN BULAN', globe.moon.position.clone().add(V(0, 4, 0)), 'yellow', tin()); tag('bl', 'LAUT "MENGGEMBUNG"', V(0, 13, 0), 'blue', tin(0.8)); }
  if (id === 'bakau') tag('bk', 'BAKAU · KEPITING MENGIKUTI PASANG', mangrove.anchors.roots, 'green', tin());
  if (id === 'fisher') tag('fs', 'KAPAN PASANG? 🤔', fishBoat.position.clone().add(V(0, 3.2, 0)), 'yellow', tin());
  if (id === 'dark') tag('dk', 'MALAM TANPA BULAN', sky, 'red', tin());
  if (id === 'purnama') tag('pn', 'PURNAMA TERAKHIR', sky, 'yellow', tin() * (1 - smoothstep(wT(5, /^tidak/), E(5), t)));
  if (id === 'tukik') { tag('tk', 'TUKIK (BAYI PENYU)', beach.anchors.nest, 'green', tin()); tag('ls', 'LAUT YANG TERANG', beach.anchors.sea.clone().add(V(-4, 2, -30)), 'blue', tin(1.2)); }
  if (id === 'lost') tag('lt', 'SALAH ARAH: KE LAMPU KOTA', beach.anchors.lamps, 'red', tin(0.6));
  if (id === 'reef') tag('rf', 'KARANG BERTELUR SERENTAK', reef.anchors.reef, 'yellow', tin(1.5));
  if (id === 'noclock') tag('nc', 'JAM ALAM HILANG', reef.anchors.reef, 'red', tin(0.5));
  if (id === 'tilt') tag('tl', 'SUMBU BUMI', orbit.anchors.earth, 'yellow', tin());
  if (id === 'heat') tag('ht', 'MUSIM PANAS EKSTREM', V(0, 9, 20), 'red big', 1);
  if (id === 'snow') tag('sw', 'MUSIM DINGIN EKSTREM', V(70, 40, 100), 'blue big', 1);
  if (id === 'rukyat') tag('rk', 'RUKYATUL HILAL', V(0, 4.6, 7.5), 'green', tin());
  if (id === 'hilal') tag('hl', 'HILAL · BULAN SABIT PERTAMA', hilal.anchors.moon, 'yellow', tin(0.8));
  if (id === 'nohilal') tag('nh', 'TIDAK ADA HILAL', hilal.anchors.moon, 'red big', smoothstep(S(11) + 1.2, S(11) + 1.5, t));
  if (id === 'drift') tag('dr', 'MENJAUH ±3,8 cm / TAHUN', globe.moon.position.clone().add(V(0, 5, 0)), 'yellow', tin());
  if (id === 'lucky') tag('lk', 'MASIH ADA. LIHAT KE ATAS 🌕', sky, 'yellow', pop(t, shot.t0 + 0.3, sn(14, 1).start, 0.3, 0.3));
}

const CH = [S(3), S(5), S(8), S(10), S(12)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'world' ? (s.moon != null ? 'night' : s.life || 'calm') : s.kind === 'hilal' ? 'dusk' : s.kind === 'beach' ? 'beach' : s.kind === 'reef' ? 'reef' : s.kind === 'mangrove' ? 'mangrove' : 'none');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, answer: tAnswer + 0.8, far: tFar, moonGone: wT(1, /^Bulan/),
  hilalFade: S(11) + 0.6, eclipse: sn(12, 3).start, annular: sn(12, 3).start + 2.6, tilt: S(9), cta: sn(14, 1).start,
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 4, 8, 11, 14, 18, 22, 25, 28, 32, 36, 40, 44, 48, 53, 57, 62, 65, 70, 75, 84, 85, 87, 90, 95, 99, 102, 106, 110, 114, 120, 126, 130, 136]) renderAt(t);
renderAt(0);
