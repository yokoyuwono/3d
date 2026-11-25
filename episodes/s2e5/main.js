// ANDAI… Season 2, Episode 5: "Andai Matahari tiba-tiba padam".
// Light (and gravity changes) take ~8 min 20 s to reach Earth; the Moon goes dark ~1.3 s later. Average surface temperature
// below 0 °C within ~a week, ~-70 °C within a year (popular estimates); the ocean surface freezes and insulates deep water.
// Hydrothermal-vent ecosystems run on chemosynthesis. Indonesia has one of the world's largest geothermal potentials
// (Kamojang, Dieng). The Sun has ~5 billion years left and will swell into a red giant.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { OrbitScene } from '../../src/sunlight.js';
import { SawahScene } from '../../src/sawah.js';
import { ReefScene, moonTexture } from '../../src/moonscenes.js';
import { MountainScene } from '../../src/mountain.js';
import { IceOcean, VentScene, GeoPlant } from '../../src/sunout.js';

const BASE = './episodes/s2e5/';
const KEY = /^(padam,|delapan|menit,|menit|kegelapan|membeku\.|rahasia|dua|puluh|detik|lalu\.|gravitasi|cahaya\.|lurus|Bulan|bintang,|makanan\.|plankton|runtuh|nol|minus|tujuh|Celsius\.|es\.|selimut\.|cair|Matahari|kimia|cincin|api\.|panas|bumi|Kamojang|Dieng\.|listrik,|tanah\.|mungkin\.|lima|miliar|raksasa|merah\.|wajahmu,|komentar\.|parasut\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addMarker('kamojang', -7.14, 107.79, 0xff8a00);
globe.addMarker('dieng', -7.2, 109.9, 0xff8a00);
const world = new World({ life: true });
world.noQuake = true;
const orbit = new OrbitScene(globe.u.uMap.value);
const sawah = new SawahScene();
const reef = new ReefScene();
const dieng = new MountainScene('dieng');
const ice = new IceOcean();
const vent = new VentScene();
const geo = new GeoPlant();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// stars over the town (visible once the sky is dark), and the Moon
const R = mulberry32(4);
const sp = [];
// (THREE points were hidden by the town's sky dome; draw the stars as an overlay instead)
const starDiv = document.createElement('div'); starDiv.className = 'ov'; starDiv.style.cssText = 'left:0;top:0;width:2px;height:2px;border-radius:50%;opacity:0;';
{ const Rs = mulberry32(21); const sh = []; for (let i = 0; i < 420; i++) { const y = Math.pow(Rs(), 1.6) * 1000, a = 0.35 + Rs() * 0.65 * (1 - y / 1100), sz = Rs() < 0.1 ? 2 : 0; sh.push(`${Math.round(Rs() * 1080)}px ${Math.round(y)}px 0 ${sz}px rgba(255,255,255,${a.toFixed(2)})`); } starDiv.style.boxShadow = sh.join(','); }
$('vignette').after(starDiv);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(1), fog: false, depthWrite: false, transparent: true }));
moon.scale.setScalar(150); world.scene.add(moon);
const MOON_DIR = V(0.15, 0.42, -1).normalize();
// orbit: light pulse travelling Sun -> Earth and the path Earth follows
const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
orbit.scene.add(pulse);
const pathPts = []; for (let i = 0; i <= 64; i++) pathPts.push(new THREE.Vector3());
const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPts), new THREE.LineBasicMaterial({ color: 0xff5a48 }));
orbit.scene.add(path);
orbit.holder.scale.setScalar(2.2);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tOff = sn(1, 0).start + 1.2;                  // "padam, tepat sekarang" (the Sun goes out, unseen)
const tDark = S(2);                                 // "Lalu kegelapan datang" (8 min 20 s later, compressed)
const tAnswer = sn(11, 1).start;
const tFly = sn(4, 2).start;                        // Earth flies off in a straight line
const town = (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 });
const skyward = (k) => ({ pos: V(-4, 3, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 });
const aerial = (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 });
const coast = (k) => ({ pos: V(lerp(22, 20, k), 3.2, lerp(14, 12, k)), tgt: V(4, 0, -4), fov: 50 });
const top = (k) => ({ pos: V(lerp(0, 6, k), lerp(62, 58, k), lerp(46, 42, k)), tgt: V(0, 0, 6), fov: 45 });
const gIndo = (lon = 112, z = 1.15) => (k) => ({ spin: face(lon) + k * 0.1, cam: { pos: V(0, 0, 30), tgt: V(0, -1, 0), fov: 45 }, zoom: z });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'world', state: 'frozen', cam: aerial, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'orbit', sunOn: 0, cam: top, glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'vent', cam: (k) => ({ pos: V(9, 4, 12), tgt: V(0, 4, 0), fov: 50 }), glitch: true },
  // hook: the Sun goes out... and nobody notices
  { id: 'now', t0: 1.7, t1: sn(1, 1).start, kind: 'world', state: 'day', cam: town },
  { id: 'unaware', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'world', state: 'day', cam: coast },
  { id: 'still', t0: sn(1, 2).start, t1: S(2), kind: 'world', state: 'day', timer: true, cam: skyward },
  { id: 'dark', t0: S(2), t1: sn(2, 1).start, kind: 'world', state: 'dark', cam: skyward },
  { id: 'freeze', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'world', state: 'frozen', cam: aerial },
  { id: 'secret', t0: sn(2, 2).start, t1: sn(2, 4).start, kind: 'globe', g: gIndo(112, 1.1), markers: ['kamojang', 'dieng'], dim: 0.5 },
  { id: 'watch', t0: sn(2, 4).start, t1: S(3), kind: 'geo', cam: (k) => ({ pos: V(lerp(30, 24, k), 14, lerp(40, 34, k)), tgt: V(0, 8, -6), fov: 50 }) },
  // 1. eight minutes
  { id: 'why8', t0: S(3), t1: sn(3, 1).start, kind: 'orbit', sunOn: 1, pulse: false, cam: top },
  { id: 'light', t0: sn(3, 1).start, t1: sn(3, 2).start, kind: 'orbit', sunOn: 1, pulse: (t) => smoothstep(sn(3, 1).start, sn(3, 2).start, t), cam: (k) => ({ pos: V(lerp(-20, -16, k), 14, lerp(30, 26, k)), tgt: V(0, 0, 14), fov: 50 }), timer: true },
  { id: 'old', t0: sn(3, 2).start, t1: S(4), kind: 'world', state: 'day', cam: skyward },
  { id: 'gravity', follow: true, t0: S(4), t1: sn(4, 1).start, kind: 'orbit', sunOn: 0, orbitOn: true, cam: top },
  { id: 'orbiting', follow: true, t0: sn(4, 1).start, t1: tFly, kind: 'orbit', sunOn: 0, orbitOn: true, cam: (k) => ({ pos: V(lerp(30, 20, k), 30, lerp(50, 44, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'fly', follow: true, t0: tFly, t1: tFly + 3.4, kind: 'orbit', sunOn: 0, fly: true, cam: (k) => ({ pos: V(lerp(0, -10, k), lerp(85, 110, k), lerp(55, 80, k)), tgt: V(lerp(0, -25, k), 0, lerp(8, 30, k)), fov: 45 }) },
  { id: 'fly2', t0: tFly + 3.4, t1: S(5), kind: 'orbit', sunOn: 0, fly: true, cam: (k) => ({ pos: V(lerp(-20, -40, k), lerp(110, 130, k), lerp(80, 100, k)), tgt: V(-20, 0, 30), fov: 50 }) },
  { id: 'moon', t0: S(5), t1: sn(5, 1).start, kind: 'world', state: 'dark', moon: (t) => 1 - smoothstep(S(5) + 0.8, S(5) + 1.4, t), cam: skyward },
  { id: 'reflect', t0: sn(5, 1).start, t1: sn(5, 2).start, kind: 'world', state: 'dark', cam: (k) => ({ pos: V(lerp(-28, -24, k), 2.4, lerp(58, 54, k)), tgt: V(0, 9, -40), fov: 56 }) },
  { id: 'stars', t0: sn(5, 2).start, t1: S(6), kind: 'world', state: 'dark', starsBoost: true, cam: (k) => ({ pos: V(-4, 3, 72), tgt: V(0, lerp(40, 70, k), -60), fov: 60 }) },
  // 2. food and cold
  { id: 'plants', t0: S(6), t1: sn(6, 1).start, kind: 'sawah', filter: 'brightness(0.35) saturate(0.6)', cam: (k) => ({ pos: V(lerp(-18, -14, k), 4, lerp(30, 26, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  { id: 'plankton', t0: sn(6, 1).start, t1: sn(6, 2).start, kind: 'reef', cam: (k) => ({ pos: V(lerp(-3, 2, k), lerp(3, 4, k), lerp(8, 5, k)), tgt: V(0, 4, -14), fov: 55 }) },
  { id: 'chain', t0: sn(6, 2).start, t1: S(7), kind: 'sawah', filter: 'brightness(0.25) saturate(0.4)', cam: (k) => ({ pos: V(lerp(6, 4, k), 2.5, lerp(14, 12, k)), tgt: V(0, 1.4, 0), fov: 50 }) },
  { id: 'cold', t0: S(7), t1: sn(7, 2).start, kind: 'world', state: 'dark', temp: true, cam: town },
  { id: 'week', t0: sn(7, 2).start, t1: sn(7, 3).start, kind: 'world', state: 'frost', temp: true, cam: (k) => ({ pos: V(lerp(-28, -24, k), 2.4, lerp(58, 54, k)), tgt: V(0, 9, -40), fov: 56 }) },
  { id: 'year', t0: sn(7, 3).start, t1: S(8), kind: 'world', state: 'frozen', temp: true, cam: aerial },
  { id: 'icecountry', t0: S(8), t1: sn(8, 1).start, kind: 'world', state: 'frozen', cam: town },
  { id: 'rivers', t0: sn(8, 1).start, t1: S(9), kind: 'dieng', frost: 1, cam: (k) => ({ pos: V(lerp(-30, -20, k), lerp(28, 25, k), lerp(40, 30, k)), tgt: V(0, 20, 0), fov: 48 }) },
  // 3. the ocean and the vents
  { id: 'ocean', t0: S(9), t1: sn(9, 1).start, kind: 'world', state: 'frozen', cam: coast },
  { id: 'lid', t0: sn(9, 1).start, t1: sn(9, 2).start, kind: 'ice', thick: (t) => smoothstep(sn(9, 1).start, sn(9, 2).start, t), cam: (k) => ({ pos: V(lerp(-14, -10, k), lerp(4, 1, k), lerp(36, 32, k)), tgt: V(0, -4, 0), fov: 48 }) },
  { id: 'below', t0: sn(9, 2).start, t1: S(10), kind: 'ice', thick: () => 1, cam: (k) => ({ pos: V(lerp(4, 0, k), -10, 34), tgt: V(0, -12, 0), fov: 48 }) },
  { id: 'vent', t0: S(10), t1: S(10) + 3.8, kind: 'vent', cam: (k) => ({ pos: V(lerp(14, 10, k), lerp(8, 6, k), lerp(18, 14, k)), tgt: V(0, 5, 0), fov: 50 }) },
  { id: 'worms', t0: S(10) + 3.8, t1: sn(10, 1).start, kind: 'vent', cam: (k) => ({ pos: V(lerp(5, 4, k), 2.2, lerp(7, 6, k)), tgt: V(2, 1.4, 2), fov: 50 }) },
  { id: 'chem', t0: sn(10, 1).start, t1: S(11), kind: 'vent', cam: (k) => ({ pos: V(lerp(-8, -10, k), 4, lerp(10, 12, k)), tgt: V(0, 4, 0), fov: 50 }) },
  // 4. Indonesia's secret weapon
  { id: 'humans', t0: S(11), t1: sn(11, 1).start, kind: 'world', state: 'frozen', cam: town },
  { id: 'ring', t0: sn(11, 1).start, t1: sn(11, 3).start, kind: 'globe', g: gIndo(115, 1.1), markers: ['kamojang', 'dieng'], big: 'secret' },
  { id: 'heat', t0: sn(11, 3).start, t1: sn(11, 4).start, kind: 'dieng', frost: 1, cam: (k) => ({ pos: V(lerp(-120, -100, k), lerp(60, 52, k), lerp(140, 120, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'plant', t0: sn(11, 4).start, t1: sn(11, 4).start + 3.4, kind: 'geo', cam: (k) => ({ pos: V(lerp(34, 26, k), lerp(16, 12, k), lerp(44, 36, k)), tgt: V(0, 8, -6), fov: 50 }) },
  { id: 'plant2', t0: sn(11, 4).start + 3.4, t1: S(12), kind: 'globe', g: gIndo(108, 0.95), markers: ['kamojang', 'dieng'] },
  { id: 'cave', t0: S(12), t1: S(12) + 3.6, kind: 'geo', cam: (k) => ({ pos: V(lerp(-8, -5, k), -37.6, lerp(56, 53, k)), tgt: V(0, -39, 40), fov: 55 }) },
  { id: 'cave2', t0: S(12) + 3.6, t1: sn(12, 1).start, kind: 'geo', cam: (k) => ({ pos: V(lerp(22, 18, k), lerp(14, 12, k), lerp(30, 26, k)), tgt: V(0, 4, -6), fov: 50 }) },
  { id: 'hard', t0: sn(12, 1).start, t1: S(13), kind: 'geo', cam: (k) => ({ pos: V(lerp(4, 2, k), -37.5, lerp(52, 50, k)), tgt: V(0, -38.4, 46), fov: 50 }) },
  // 5. relax
  { id: 'calm', t0: S(13), t1: sn(13, 2).start, kind: 'world', state: 'day', cam: town },
  { id: 'billions', t0: sn(13, 2).start, t1: sn(13, 3).start, kind: 'orbit', sunOn: 1, orbitOn: true, big: 'life', cam: top },
  { id: 'redgiant', t0: sn(13, 3).start, t1: sn(13, 3).start + 3.4, kind: 'orbit', sunOn: 1, giant: (t) => smoothstep(sn(13, 3).start, E(13), t), orbitOn: true, cam: (k) => ({ pos: V(0, lerp(85, 120, k), lerp(55, 80, k)), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'redgiant2', t0: sn(13, 3).start + 3.4, t1: S(14), kind: 'orbit', sunOn: 1, giant: () => 1, orbitOn: true, cam: (k) => ({ pos: V(lerp(-40, -30, k), 20, lerp(60, 50, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'sunrise', t0: S(14), t1: sn(14, 1).start, kind: 'world', state: 'day', filter: 'sepia(0.35) saturate(1.5) brightness(1.05)', cam: (k) => ({ pos: V(-4, 3, 72), tgt: V(0, lerp(4, 12, k), -60), fov: 56 }) },
  { id: 'face', t0: sn(14, 1).start, t1: sn(14, 1).start + 3.5, kind: 'world', state: 'day', filter: 'sepia(0.3) saturate(1.4)', cam: (k) => ({ pos: V(lerp(-6, -5, k), 2.3, lerp(52, 50, k)), tgt: V(0, 2, 70), fov: 50 }) },
  { id: 'face2', t0: sn(14, 1).start + 3.5, t1: S(15), kind: 'orbit', sunOn: 1, pulse: (t) => smoothstep(sn(14, 1).start + 3.5, S(15), t), cam: (k) => ({ pos: V(lerp(-20, -16, k), 14, lerp(30, 26, k)), tgt: V(0, 0, 14), fov: 50 }) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'geo', cam: (k) => ({ pos: V(lerp(-8, -5, k), -37.6, lerp(56, 53, k)), tgt: V(0, -39, 40), fov: 55 }) },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'world', state: 'day', cam: (k) => ({ pos: V(lerp(60, 30, k), lerp(160, 90, k), lerp(200, 140, k)), tgt: V(20, 0, 60), fov: 52 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
const SUN_C = new THREE.Color(0xffe9a8), RED = new THREE.Color(0xff4a20);
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
    const st = shot.state;
    world.levelOverride = 0; world.moodT = 4;
    world.lifeMode = st === 'frozen' || st === 'frost' ? 'snow' : st === 'dark' ? 'moon' : 'calm';
    world.snow = st === 'frozen' ? 0.6 : 0; world.snowCover = st === 'frozen' ? 1 : st === 'frost' ? 0.5 : 0;
    world.jumpP = null; world.freezeT = null;
    moon.visible = !!shot.moon; moon.material.opacity = val(shot.moon, t);
    scene = world.scene;
  } else if (shot.kind === 'orbit') {
    c = shot.cam(k);
    const on = shot.sunOn ?? 1;
    orbit.sun.material.color.copy(on ? SUN_C : new THREE.Color(0x111111)).lerp(RED, val(shot.giant, t));
    orbit.glow.visible = !!on; orbit.sun.scale.setScalar(1 + 3 * val(shot.giant, t));
    // Earth keeps orbiting for 8 min 20 s after the Sun is gone, then leaves on the tangent
    const a0 = 1.2, w = 0.25;
    const aAt = (tt) => Math.PI / 2 + 0.5 + 0.06 * (tt - S(4));
    let pos;
    if (shot.fly) { const a = aAt(tFly); const p0 = V(Math.cos(a) * 30, 0, Math.sin(a) * 30), dir = V(-Math.sin(a), 0, Math.cos(a)); pos = p0.add(dir.multiplyScalar(30 * 0.06 * (t - tFly) * 2.5)); }
    else { const a = aAt(t); pos = V(Math.cos(a) * 30, 0, Math.sin(a) * 30); }
    orbit.update(t, 0, t * 0.8, 23.4);
    orbit.holder.position.copy(pos); orbit.anchors.earth.copy(pos).add(V(0, 5.6, 0));
    if (shot.follow) { const mid = pos.clone().multiplyScalar(0.5), dir = pos.clone().setY(0).normalize(); c = { pos: mid.clone().sub(dir.multiplyScalar(lerp(34, 30, k))).add(V(0, lerp(52, 46, k), 0)), tgt: mid, fov: 50 }; }
    pulse.visible = !!shot.pulse;
    if (shot.pulse) pulse.position.copy(pos).multiplyScalar(val(shot.pulse, t));
    path.visible = !!(shot.fly || shot.orbitOn);
    const pts = path.geometry.attributes.position;
    for (let i = 0; i <= 64; i++) {
      const tt = (shot.fly ? tFly : t) - (64 - i) * 0.4;
      const a = aAt(tt);
      pts.setXYZ(i, Math.cos(a) * 30, 0, Math.sin(a) * 30);
    }
    if (shot.fly) pts.setXYZ(64, pos.x, 0, pos.z);
    pts.needsUpdate = true;
    scene = orbit.scene;
  } else if (shot.kind === 'sawah') {
    c = shot.cam(k);
    sawah.update(t, 0, size.h / (2 * Math.tan(rad(c.fov) / 2)));
    scene = sawah.scene;
  } else if (shot.kind === 'reef') {
    c = shot.cam(k);
    reef.update(t, 0, 1 - smoothstep(shot.t0, shot.t1, t));
    scene = reef.scene;
  } else if (shot.kind === 'dieng') {
    c = shot.cam(k);
    dieng.update(t, { frost: shot.frost || 0 });
    scene = dieng.scene;
  } else if (shot.kind === 'ice') {
    c = shot.cam(k);
    ice.update(t, val(shot.thick, t));
    scene = ice.scene;
  } else if (shot.kind === 'vent') {
    c = shot.cam(k);
    vent.update(t);
    scene = vent.scene;
  } else if (shot.kind === 'geo') {
    c = shot.cam(k);
    geo.update(t);
    scene = geo.scene;
  }
  camera.position.copy(c.pos).add(camShake(t, shot.glitch ? 0.3 : 0));
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

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  const q = t > sn(2, 2).start + 0.4 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 0.8;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: PANAS BUMI' : 'SENJATA RAHASIA INDONESIA? (di akhir)';
  // timer: 08:20 counting down in compressed time
  const tm = shot.timer ? pop(t, shot.t0 + 0.1, shot.t1, 0.25, 0.15) : 0;
  show('timer', tm);
  if (tm) {
    if (id === 'still') { const u = clamp((t - sn(1, 2).start) / (S(2) - sn(1, 2).start)); $('tA').textContent = 'MATAHARI SUDAH PADAM · LANGIT MASIH TERANG'; $('tV').textContent = mmss(500 * (1 - u)); }
    else { const u = clamp((t - shot.t0) / (shot.t1 - shot.t0 - 0.3)); $('tA').textContent = 'PERJALANAN CAHAYA MATAHARI → BUMI'; $('tV').textContent = mmss(500 * u); }
  }
  const tp = shot.temp ? pop(t, S(7) + 0.2, S(8), 0.3, 0.2) : 0;
  show('temp', tp);
  if (tp) {
    const v = t < sn(7, 2).start ? 15 : t < sn(7, 3).start ? lerp(15, -18, smoothstep(sn(7, 2).start, sn(7, 2).start + 2, t)) : lerp(-18, -70, smoothstep(sn(7, 3).start, sn(7, 3).start + 2.5, t));
    $('mA').textContent = t < sn(7, 2).start ? 'SUHU RATA-RATA BUMI · HARI 1' : t < sn(7, 3).start ? '±1 MINGGU' : '±1 TAHUN';
    $('mV').textContent = `${v > 0 ? '' : '−'}${Math.abs(Math.round(v))}°C`;
  }
  const bg = shot.big ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('big', bg);
  if (bg) {
    if (shot.big === 'secret') { $('bA').textContent = 'SENJATA RAHASIA'; $('bV').textContent = 'PANAS BUMI'; $('bU').textContent = 'tidak bergantung pada Matahari'; }
    if (shot.big === 'life') { $('bA').textContent = 'MATAHARI MASIH BERSINAR'; $('bV').textContent = '±5 miliar thn'; $('bU').textContent = 'lalu membesar jadi raksasa merah'; }
  }
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'orbit' || shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = shot.filter || 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.kind === 'world' && (shot.state === 'dark' || shot.state === 'frozen' || shot.state === 'frost')) filter = shot.state === 'dark' ? 'brightness(0.32) saturate(0.4)' : 'brightness(0.4) saturate(0.35) hue-rotate(-15deg)';
  if (shot.id === 'dark') filter = `brightness(${lerp(1, 0.32, smoothstep(S(2), S(2) + 1.2, t))}) saturate(${lerp(1, 0.4, smoothstep(S(2), S(2) + 1.2, t))})`;
  if (shot.dim) filter = `brightness(${shot.dim})`;
  if (shot.kind === 'dieng' && shot.frost) filter = 'brightness(0.45) saturate(0.4) hue-rotate(-10deg)';
  renderer.domElement.style.filter = filter;
  const darkWorld = shot.kind === 'world' && shot.state !== 'day';
  starDiv.style.opacity = darkWorld ? (shot.starsBoost ? 1 : shot.id === 'dark' ? smoothstep(S(2) + 0.6, S(2) + 1.6, t) * 0.8 : 0.7) : 0;
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tFly, tAnswer + 0.8]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const sky = camera.position.clone().add(MOON_DIR.clone().multiplyScalar(900)).add(V(0, -120, 0));
  if (id === 'now') tag('nw', 'MATAHARI PADAM… TIDAK ADA YANG TAHU', V(0, 9, 80), 'yellow', smoothstep(tOff, tOff + 0.3, t));
  if (id === 'freeze') tag('fz', 'BUMI MEMBEKU', V(55, 30, 110), 'blue big', tin());
  if (id === 'light') tag('lt', 'CAHAYA ±8 MENIT 20 DETIK', orbit.anchors.earth, 'yellow', tin(0.5));
  if (id === 'gravity') tag('gv', 'GRAVITASI JUGA BUTUH ±8 MENIT', orbit.anchors.earth, 'yellow', tin(0.3));
  if (id === 'fly') tag('fl', 'MELESAT LURUS', orbit.holder.position.clone().add(V(0, 5, 0)), 'red big', tin(0.2));
  if (id === 'moon') tag('mn', 'BULAN IKUT GELAP', sky, 'yellow', smoothstep(S(5) + 1.2, S(5) + 1.5, t));
  if (id === 'stars') tag('st', 'HANYA BINTANG', camera.position.clone().add(V(0, 0.9, -1).normalize().multiplyScalar(900)), 'blue', tin(0.5));
  if (id === 'plants') tag('pl', 'TUMBUHAN BERHENTI MEMBUAT MAKANAN', V(0, 6, 0), 'red', tin());
  if (id === 'plankton') tag('pk', 'PLANKTON PADAM', V(0, 7, -14), 'red', tin());
  if (id === 'lid') tag('ld', 'LAPISAN ES = SELIMUT', ice.anchors.ice, 'blue', tin(0.6));
  if (id === 'below') tag('bl', 'AIR DI BAWAHNYA TETAP CAIR', ice.anchors.water, 'blue', tin());
  if (id === 'vent') tag('vt', 'SUMBER AIR PANAS DASAR LAUT', vent.anchors.vent, 'yellow', tin(0.4));
  if (id === 'worms') tag('wm', 'HIDUP TANPA MATAHARI', vent.anchors.worms, 'green', tin(0.3));
  if (id === 'heat') tag('ht', 'CINCIN API: PANAS DARI DALAM BUMI', V(0, 30, 0), 'red', tin());
  if (id === 'plant') tag('pp', 'PLTP · PANAS BUMI (seperti Kamojang & Dieng)', geo.anchors.plant, 'yellow', tin(0.3));
  if (id === 'cave') tag('cv', 'KEBUN BAWAH TANAH · LAMPU', geo.anchors.cave, 'green', tin(0.3));
  if (id === 'ring') { tag('kj', 'KAMOJANG', globe.markerPos('kamojang', 1), 'yellow', tin(0.3)); tag('dg', 'DIENG', globe.markerPos('dieng', 1), 'yellow', tin(0.6)); }
  if (id === 'face') tag('fc', '8 MENIT PERJALANAN', V(0, 3.2, 70), 'yellow', tin(0.5));
  if (id === 'cta') tag('ct', 'KAMU BERLINDUNG DI MANA? 👇', geo.anchors.cave, 'yellow', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}

const CH = [S(3), S(6), S(9), S(11), S(13)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'world' ? (s.state === 'day' ? 'calm' : s.state === 'dark' ? 'night' : 'wind') : s.kind === 'sawah' ? 'night' : s.kind === 'vent' || s.kind === 'ice' || s.kind === 'reef' ? 'deep' : s.kind === 'geo' ? 'machine' : s.kind === 'dieng' ? 'wind' : 'none');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, off: tOff, dark: tDark, fly: tFly, answer: tAnswer + 0.8, moonOff: S(5) + 0.8, teaser: sn(15, 3).start,
  timer: [sn(1, 2).start, S(2)], temp: [S(7), S(8)], sunrise: S(14),
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 3, 7, 11, 12.5, 15, 19, 22, 25, 30, 35, 40, 45, 52, 55, 59, 64, 68, 71, 75, 80, 85, 89, 94, 98, 102, 106, 110, 114, 117, 120, 125, 129, 133, 140, 145, 149, 152, 157, 163, 168, 173, 179]) renderAt(t);
renderAt(0);
