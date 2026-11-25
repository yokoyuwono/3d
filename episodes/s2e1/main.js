// ANDAI… Season 2, Episode 1: "Andai Gunung Toba meletus lagi" — live web episode.
// Real Toba terrain (AWS Terrain Tiles). Facts: ~74,000 years ago, ~2,800 km3 DRE, caldera ~100 x 30 km,
// Tambora 1815 ~160 km3, Pinatubo 1991 cooled the globe ~0.5 C for ~2 years, Toba ash found in India,
// cryptotephra with human occupation at Pinnacle Point (South Africa) and Shinfa-Metema 1 (Ethiopia).
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe, ll } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { SawahScene } from '../../src/sawah.js';
import { TobaTerrain, TobaVillage, AfricaScene } from '../../src/toba.js';

const BASE = './episodes/s2e1/';
const KEY = /^(letusan|terbesar|mati\.|Toba|takut\?|akhir\.|tujuh|puluh|empat|ribu|meledak\.|dua|delapan|ratus|kubik|Tambora|ember,|belas|ember\.|runtuh\.|seratus|Danau|abu|langit\.|malam\.|awan|panas|mobil\.|India,|berat\.|runtuh,|belerang|Matahari\.|Pinatubo|setengah|derajat,|beras|memusnahkan|Afrika|Ethiopia,|bertahan\.|ikan|magma,|Samosir|jarang,|puluhan|dekat\.|kawah|oksigen,|detik\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T, toba] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json'), TobaTerrain.load(BASE + 'assets/dem.png')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addMarker('toba', 2.6, 98.85, 0xff3b30);
globe.addMarker('india', 17, 78, 0xffd23a);
const village = new TobaVillage();
const africa = new AfricaScene();
const sawah = new SawahScene();
const world = new World({ life: true });
world.noQuake = true;
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// ash plume on the globe (Toba -> India and beyond) and a sulphur haze shell
const plumeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(120,112,104,0.9)'); gr.addColorStop(1, 'rgba(120,112,104,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const R = mulberry32(9);
const plume = Array.from({ length: 160 }, (_, i) => {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTex, transparent: true, depthWrite: false }));
  const u = R(), w = (R() - 0.5);
  globe.earth.add(m);
  return { m, u, w };
});
const setPlume = (p) => {
  for (const q of plume) {
    const u = q.u * p;
    const lat = lerp(2.6, 16, u) + q.w * lerp(3, 26, u), lon = lerp(98.85, 72, u) + q.w * 6;
    q.m.position.copy(ll(lat, lon, 10.25));
    q.m.scale.setScalar(lerp(0.9, 3.2, u));
    q.m.material.opacity = p > 0.01 ? 0.85 : 0;
    q.m.visible = p > 0.01;
  }
};
const haze = new THREE.Mesh(new THREE.SphereGeometry(10.6, 64, 32), new THREE.MeshBasicMaterial({ color: 0xd8cfa8, transparent: true, opacity: 0, depthWrite: false }));
globe.scene.add(haze);

// ------------------------------------------------------------------ timeline
const END = E(16) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = sn(14, 1).start;              // "Para ilmuwan tidak melihat tanda..."
const tPast = S(3), tBoom = S(3) + 2.4, tCollapse = S(5), tNow = sn(6, 1).start;
const sk = (a, b) => (t) => smoothstep(a, b, t);
const aerial = (k, from = 1) => ({ pos: V(lerp(-75, -60, k) * from, lerp(95, 80, k) * from, lerp(85, 70, k) * from), tgt: V(0, 4, 0), fov: 45 });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'toba', o: () => ({ erupt: 1, dark: 0.5, ash: 0.3 }), cam: () => ({ pos: V(-40, 30, 70), tgt: V(0, 30, 0), fov: 50 }), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'village', o: () => ({ ash: 0.85 }), cam: () => ({ pos: V(-6, 2, -2), tgt: V(0, 2.5, 12), fov: 55 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'globe', g: () => ({ spin: face(95), plume: 1, cam: { pos: V(0, 4, 30), tgt: V(0, 1, 0), fov: 45 } }), glitch: true },
  // hook: the beautiful lake is a crater
  { id: 'lake', t0: 1.7, t1: wT(1, /^lubang/), kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(lerp(-24, -20, k), lerp(10, 12, k), lerp(34, 30, k)), tgt: V(lerp(-2, 2, k), 1, -40), fov: 52 }) },
  { id: 'crater', t0: wT(1, /^lubang/), t1: S(2), kind: 'toba', o: () => ({}), cam: (k) => aerial(k, lerp(0.45, 1.05, k)) },
  { id: 'alive', t0: S(2), t1: sn(2, 1).start, kind: 'toba', o: () => ({ steam: 1 }), cam: (k) => ({ pos: V(lerp(-48, -44, k), 14, lerp(-8, -4, k)), tgt: V(-22, 3.6, -6), fov: 45 }) },
  { id: 'whatif', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'toba', o: (t) => ({ erupt: sk(sn(2, 1).start, sn(2, 1).start + 2)(t), dark: 0.3 * sk(sn(2, 1).start, sn(2, 2).start)(t) }), cam: (k) => ({ pos: V(-70, lerp(40, 50, k), 110), tgt: V(0, lerp(18, 30, k), 0), fov: 50 }) },
  { id: 'fear', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(lerp(-5, -4, k), 1.6, lerp(-17, -16, k)), tgt: V(0, 2.5, 8), fov: 50 }) },
  { id: 'answer', t0: sn(2, 3).start, t1: S(3), kind: 'globe', g: (t, k) => ({ spin: face(lerp(80, 100, k)), plume: 0.6, cam: { pos: V(0, 4, 30), tgt: V(0, 1, 0), fov: 45 }, markers: ['toba'] }) },
  // 1. 74,000 years ago
  { id: 'past', t0: S(3), t1: sn(3, 1).start, kind: 'toba', o: (t) => ({ collapse: 0, samosir: 0, fill: 0, erupt: sk(tBoom, tBoom + 2.5)(t), dark: 0.4 * sk(tBoom, sn(3, 1).start)(t) }), cam: (k) => ({ pos: V(lerp(-110, -90, k), lerp(45, 55, k), lerp(130, 110, k)), tgt: V(0, lerp(10, 25, k), 0), fov: 50 }), shake: (t) => 0.4 * sk(tBoom, tBoom + 0.3)(t) * (1 - sk(tBoom + 1, tBoom + 3)(t)) },
  { id: 'volume', t0: sn(3, 1).start, t1: S(4), kind: 'toba', o: () => ({ collapse: 0, samosir: 0, fill: 0, erupt: 1, flow: 0.5, dark: 0.55, ash: 0.4 }), cam: (k) => ({ pos: V(lerp(-80, -70, k), 30, lerp(120, 105, k)), tgt: V(0, 35, 0), fov: 52 }) },
  { id: 'tambora', t0: S(4), t1: wT(4, /^kehilangan/) - 0.2, kind: 'toba', o: () => ({ cubes: 1 }), cam: (k) => ({ pos: toba.cubeBase.clone().add(V(lerp(-26, -22, k), lerp(18, 16, k), lerp(30, 26, k))), tgt: toba.cubeBase.clone().add(V(0, 5, 0)), fov: 45 }) },
  { id: 'nosummer', t0: wT(4, /^kehilangan/) - 0.2, t1: sn(4, 1).start, kind: 'sawah', snow: 1, cam: (k) => ({ pos: V(lerp(-14, -12, k), 3, lerp(24, 22, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  { id: 'buckets', t0: sn(4, 1).start, t1: S(5), kind: 'toba', o: (t) => ({ cubes: 1 + 16 * sk(wT(4, /^Toba/) - 0.2, wT(4, /^Toba/) + 2.4)(t) }), cam: (k) => ({ pos: toba.cubeBase.clone().add(V(lerp(-34, -42, k), lerp(26, 32, k), lerp(42, 50, k))), tgt: toba.cubeBase.clone().add(V(0, 8, 0)), fov: 45 }) },
  { id: 'collapse', t0: S(5), t1: sn(5, 1).start, kind: 'toba', o: (t) => ({ collapse: sk(S(5) + 0.4, sn(5, 1).start - 0.2)(t), samosir: 0, fill: 0, erupt: 1 - sk(S(5), S(5) + 2)(t), dark: 0.4 * (1 - sk(S(5), sn(5, 1).start)(t)) }), cam: (k) => ({ pos: V(lerp(-70, -66, k), 55, lerp(80, 76, k)), tgt: V(0, 3, 0), fov: 45 }), shake: () => 0.2 },
  { id: 'hole', t0: sn(5, 1).start, t1: sn(5, 2).start, kind: 'toba', o: () => ({ samosir: 0, fill: 0 }), cam: (k) => ({ pos: V(lerp(-20, 10, k), 130, lerp(30, 25, k)), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'fill', t0: sn(5, 2).start, t1: S(6), kind: 'toba', o: (t) => ({ samosir: 0, fill: sk(sn(5, 2).start, E(5))(t) }), cam: (k) => aerial(k) },
  // 2. if it happened today
  { id: 'today', t0: S(6), t1: tNow, kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(-14, 2.4, -6), tgt: V(0, 4, 13), fov: 52 }), shake: (t) => 0.12 * sk(S(6) + 1.5, S(6) + 2)(t) },
  { id: 'column', t0: tNow, t1: sn(6, 2).start, kind: 'toba', o: (t) => ({ erupt: sk(tNow, tNow + 2.5)(t), dark: 0.5 * sk(tNow, sn(6, 2).start)(t), ash: 0.2 * sk(tNow, sn(6, 2).start)(t) }), cam: (k) => ({ pos: V(-110, lerp(40, 55, k), 140), tgt: V(0, lerp(20, 35, k), 0), fov: 52 }), shake: () => 0.25 },
  { id: 'night', t0: sn(6, 2).start, t1: S(7), kind: 'village', o: (t) => ({ ash: lerp(0.3, 0.7, sk(sn(6, 2).start, S(7))(t)) }), cam: (k) => ({ pos: V(lerp(-16, -14, k), 2.2, -4), tgt: V(0, 5, 13), fov: 52 }) },
  { id: 'flow', t0: S(7), t1: sn(7, 1).start, kind: 'toba', o: (t) => ({ erupt: 1, flow: sk(S(7), sn(7, 1).start + 2)(t), dark: 0.55, ash: 0.35 }), cam: (k) => ({ pos: V(lerp(-60, -55, k), 45, lerp(70, 62, k)), tgt: V(0, 5, 0), fov: 48 }) },
  { id: 'outrun', t0: sn(7, 1).start, t1: S(8), kind: 'toba', o: (t) => ({ erupt: 1, flow: lerp(0.6, 0.85, sk(sn(7, 1).start, S(8))(t)), dark: 0.6, ash: 0.45 }), cam: (k) => ({ pos: V(lerp(30, 26, k), 14, lerp(70, 64, k)), tgt: V(10, 4, 30), fov: 50 }) },
  { id: 'ashfall', t0: S(8), t1: sn(8, 1).start, kind: 'village', o: () => ({ ash: 0.8 }), cam: (k) => ({ pos: V(lerp(-12, -10, k), 2, lerp(-6, -4, k)), tgt: V(0, 4, 13), fov: 52 }) },
  { id: 'india', t0: sn(8, 1).start, t1: sn(8, 3).start, kind: 'globe', g: (t, k) => ({ spin: face(lerp(100, 85, k)), plume: sk(sn(8, 1).start, sn(8, 2).start + 1.5)(t), markers: ['toba', 'india'], cam: { pos: V(0, 7, 30), tgt: V(0, 2, 0), fov: 45 }, zoom: 1.4 }) },
  { id: 'heavy', t0: sn(8, 3).start, t1: S(9), kind: 'world', filter: 'grayscale(0.85) brightness(0.72) sepia(0.25)', cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  // 3. sulphur haze, cooling, harvests
  { id: 'sulfur', t0: S(9), t1: sn(9, 1).start, kind: 'globe', g: (t, k) => ({ spin: face(lerp(100, 70, k)), plume: 1, haze: sk(S(9) + 0.5, sn(9, 1).start + 2)(t), cam: { pos: V(0, 6, 30), tgt: V(0, 0, 0), fov: 45 } }) },
  { id: 'haze', t0: sn(9, 1).start, t1: S(10), kind: 'globe', g: (t, k) => ({ spin: face(lerp(120, 95, k)), plume: 1, haze: sk(S(9) + 0.5, sn(9, 1).start + 2)(t), dim: lerp(1, 0.8, k), cam: { pos: V(14, 3, 26), tgt: V(0, 0, 0), fov: 45 }, zoom: 1.3 }) },
  { id: 'pinatubo', t0: S(10), t1: wT(10, /^selama/) - 0.1, kind: 'globe', g: (t, k) => ({ spin: face(lerp(60, 30, k)), plume: 1, haze: 1, dim: 0.75, cam: { pos: V(0, 6, 30), tgt: V(0, 0, 0), fov: 45 } }), panel: 'cool' },
  { id: 'cold', t0: wT(10, /^selama/) - 0.1, t1: sn(10, 1).start, kind: 'world', panel: 'cool', filter: 'saturate(0.55) brightness(0.85) hue-rotate(-12deg)', cam: (k) => ({ pos: V(lerp(30, 26, k), 3, lerp(52, 48, k)), tgt: V(0, 4, 20), fov: 52 }) },
  { id: 'bigger', t0: sn(10, 1).start, t1: sn(10, 2).start, kind: 'globe', g: (t, k) => ({ spin: face(lerp(110, 90, k)), plume: 1, haze: 1, dim: 0.6, cam: { pos: V(0, 6, 30), tgt: V(0, 0, 0), fov: 45 }, zoom: lerp(1.65, 1.3, k) }), panel: 'cool' },
  { id: 'harvest', t0: sn(10, 2).start, t1: S(11), kind: 'sawah', filter: 'grayscale(0.75) brightness(0.78) sepia(0.2)', cam: (k) => ({ pos: V(lerp(-18, -14, k), 4, lerp(30, 26, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  // 4. did humanity nearly die out?
  { id: 'theory', t0: S(11), t1: sn(11, 1).start, kind: 'africa', ash: 0.5, filter: 'grayscale(0.5) brightness(0.75)', cam: (k) => ({ pos: V(lerp(-14, -12, k), 4, lerp(18, 16, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  { id: 'newfind', t0: sn(11, 1).start, t1: S(12), kind: 'africa', ash: 0.3, cam: (k) => ({ pos: V(lerp(10, 8, k), 3, lerp(14, 12, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  { id: 'shard', t0: S(12), t1: S(12) + 4.2, kind: 'africa', ash: 0.2, panel: 'shard', cam: (k) => ({ pos: V(lerp(-6, -4, k), 2.2, lerp(12, 10, k)), tgt: V(0, 1.4, 2), fov: 50 }) },
  { id: 'shard2', t0: S(12) + 4.2, t1: sn(12, 1).start, kind: 'africa', ash: 0.2, panel: 'shard', cam: (k) => ({ pos: V(lerp(9, 7, k), 3.2, lerp(9, 8, k)), tgt: V(0, 1.4, 2), fov: 50 }) },
  { id: 'survive', t0: sn(12, 1).start, t1: S(13), kind: 'africa', ash: 0.15, cam: (k) => ({ pos: V(lerp(-8, -6, k), 2.0, lerp(4, 3, k)), tgt: V(-3, 1.2, -4), fov: 50 }) },
  // 5. should we be afraid?
  { id: 'afraid', t0: S(13), t1: sn(13, 1).start, kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(lerp(20, 16, k), 3, lerp(-6, -4, k)), tgt: V(0, 4, 12), fov: 52 }) },
  { id: 'samosir', t0: sn(13, 1).start, t1: wT(13, /^Samosir/) - 0.4, kind: 'toba', o: (t) => ({ samosir: sk(sn(13, 2).start + 1.2, E(13) - 0.3)(t), steam: 1 }), cam: (k) => ({ pos: V(lerp(-55, -45, k), lerp(40, 34, k), lerp(55, 48, k)), tgt: V(-2, 3.6, 0), fov: 45 }) },
  { id: 'samosir', t0: wT(13, /^Samosir/) - 0.4, t1: S(14), kind: 'toba', o: (t) => ({ samosir: sk(sn(13, 2).start + 1.2, E(13) - 0.3)(t), steam: 1 }), cam: (k) => ({ pos: V(lerp(-30, -24, k), lerp(16, 13, k), lerp(26, 22, k)), tgt: V(-2, 4, 0), fov: 45 }) },
  { id: 'rare', t0: S(14), t1: sn(14, 1).start, kind: 'toba', o: () => ({ steam: 1 }), cam: (k) => aerial(k, lerp(1, 0.85, k)) },
  { id: 'calmlake', t0: sn(14, 1).start, t1: sn(14, 2).start, kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(lerp(-24, -20, k), lerp(10, 12, k), lerp(34, 30, k)), tgt: V(lerp(-2, 2, k), 1, -40), fov: 52 }) },
  { id: 'local', t0: sn(14, 2).start, t1: S(15), kind: 'world', cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'swim', t0: S(15), t1: S(15) + 4, kind: 'village', o: () => ({}), cam: (k) => ({ pos: V(lerp(-6, -2, k), lerp(1.6, 6, k), lerp(-18, -24, k)), tgt: V(0, lerp(2, 1, k), 2), fov: 50 }) },
  { id: 'swim2', t0: S(15) + 4, t1: S(16), kind: 'toba', o: () => ({}), cam: (k) => aerial(k, lerp(0.5, 1.1, k)) },
  { id: 'teaser', t0: S(16), t1: DURATION + 1, kind: 'world', filter: 'hue-rotate(160deg) saturate(1.4) contrast(1.15)', cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 50, k)), tgt: V(0, lerp(2.4, 8, k), 110), fov: 54 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, g = null;
  setPlume(0); haze.material.opacity = 0;
  if (shot.kind === 'globe') {
    g = shot.g(t, k);
    globe.update(t, g.spin, { markers: g.markers || [], clouds: 0.35 });
    setPlume(g.plume || 0);
    haze.material.opacity = 0.45 * (g.haze || 0);
    c = g.cam;
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'toba') {
    c = shot.cam(k);
    toba.update(t, shot.o(t));
    scene = toba.scene;
  } else if (shot.kind === 'village') {
    c = shot.cam(k);
    village.update(t, shot.o(t));
    scene = village.scene;
  } else if (shot.kind === 'africa') {
    c = shot.cam(k);
    africa.update(t, shot.ash ?? 0.3);
    scene = africa.scene;
  } else if (shot.kind === 'sawah') {
    c = shot.cam(k);
    sawah.update(t, 1, size.h / (2 * Math.tan(rad(c.fov) / 2)));
    scene = sawah.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = 0; world.moodT = 4; world.lifeMode = 'calm';
    world.showEvac = !!shot.evac;
    world.snow = shot.id === 'heavy' ? 1 : 0; world.snowCover = shot.id === 'heavy' ? 1 : 0;
    scene = world.scene;
  }
  const sh = camShake(t, (shot.glitch ? 0.3 : 0) + val(shot.shake, t, 0) * (shot.kind === 'village' ? 0.4 : 3));
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot, g);
}

const fmt = (n) => Math.round(n).toLocaleString('id-ID');
function overlays(t, shot, g) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // open loop: should we be afraid? (answered in the last chapter)
  const q = t > sn(2, 2).start + 0.4 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: TIDAK DALAM WAKTU DEKAT' : 'HARUS TAKUT? (jawaban di akhir)';
  // volume counter
  const vk = id === 'volume' ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : id === 'buckets' ? pop(t, wT(4, /^Toba/) - 0.2, shot.t1, 0.3, 0.2) : id === 'tambora' ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('vol', vk);
  if (vk) {
    if (id === 'volume') { $('volA').textContent = '74.000 TAHUN LALU'; $('volV').textContent = fmt(2800 * smoothstep(shot.t0 + 0.2, shot.t0 + 2.5, t)); $('volU').textContent = 'km³ batuan & abu'; }
    if (id === 'tambora') { $('volA').textContent = 'TAMBORA 1815'; $('volV').textContent = '1 ember'; $('volU').textContent = '±160 km³'; }
    if (id === 'buckets') { const n = Math.min(17, Math.floor(1 + 16 * smoothstep(wT(4, /^Toba/) - 0.2, wT(4, /^Toba/) + 2.4, t))); $('volA').textContent = 'TOBA'; $('volV').textContent = `${n} ember`; $('volU').textContent = '±2.800 km³'; }
  }
  const ck = shot.panel === 'cool' ? pop(t, S(10) + 0.3, sn(10, 2).start, 0.3, 0.2) : 0;
  show('cool', ck);
  if (ck) {
    const a = smoothstep(S(10) + 0.4, S(10) + 1.6, t), b = smoothstep(S(10) + 1.4, S(10) + 2.6, t), cc = smoothstep(sn(10, 1).start, sn(10, 1).start + 1.2, t);
    $('c1').style.width = `${18 * a}%`; $('c2').style.width = `${36 * b}%`; $('c3').style.width = `${100 * cc}%`;
  }
  show('rice', id === 'harvest' ? pop(t, wT(10, /^harga/) - 0.3, shot.t1, 0.3, 0.2) : 0);
  show('shard', shot.panel === 'shard' ? pop(t, S(12) + 0.8, sn(12, 1).start, 0.3, 0.2) : 0);
  show('teaser', pop(t, S(16), END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'toba' || shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = shot.filter || 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (g && g.dim) filter = `brightness(${g.dim})`;
  renderer.domElement.style.filter = filter;
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tBoom, tNow, tAnswer]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const A = toba.anchors;
  if (id === 'lake') tag('lk', 'DANAU TOBA', village.anchors.lake, 'blue', tin(0.6));
  if (id === 'crater') tag('cr', 'KAWAH RAKSASA ±100 km', A.rim, 'red big', tin(0.8));
  if (id === 'alive') tag('al', 'BELUM MATI', A.pangururan.clone().add(V(0, 5, 0)), 'red', tin());
  if (id === 'whatif') tag('wf', 'ANDAI MELETUS LAGI?', V(0, 40, 0), 'yellow big', tin(0.6));
  if (id === 'answer') tag('ab', 'TOBA', globe.markerPos('toba', 1), 'red', tin());
  if (id === 'past') tag('ps', '±74.000 TAHUN LALU · ILUSTRASI', V(0, 20, 0), 'yellow', tin(0.5));
  if (id === 'nosummer') tag('ns', '1816: TAHUN TANPA MUSIM PANAS', V(0, 5, 0), 'blue', tin(0.2));
  if (id === 'tambora') tag('tb', 'TAMBORA 1815', toba.cubeBase.clone().add(V(0, toba.groundAt(toba.cubeBase.x, toba.cubeBase.z) + 8, 0)), 'yellow', tin(0.5));
  if (id === 'buckets') tag('lk2', 'DANAU TOBA →', A.lake, 'blue', tin(0.5));
  if (id === 'hole') { tag('hl', '±100 km', A.rim, 'red big', tin()); tag('hw', '±30 km', A.pangururan, 'yellow', tin(0.8)); }
  if (id === 'fill') tag('fl', 'TERISI AIR → DANAU TOBA', A.lake, 'blue', tin(1));
  if (id === 'column') tag('cl', 'TIANG ABU PULUHAN KM', V(0, 55, 0), 'red', tin(1));
  if (id === 'flow') tag('aw', 'AWAN PANAS', V(30, 10, 25), 'red big', tin(0.8));
  if (id === 'outrun') tag('or', 'LEBIH CEPAT DARI MOBIL', V(20, 9, 44), 'red', tin(0.3));
  if (id === 'ashfall') tag('as', 'HUJAN ABU', village.anchors.houses, '', tin());
  if (id === 'india') { tag('in', 'ABU SAMPAI INDIA', globe.markerPos('india', 1), 'yellow', smoothstep(wT(8, /^India/) - 0.2, wT(8, /^India/) + 0.1, t)); tag('tb2', 'TOBA', globe.markerPos('toba', 1), 'red', tin()); }
  if (id === 'heavy') { tag('hv', 'ABU BASAH = BERAT', V(0, 12, 70), 'red', tin()); tag('ap', '✈ BANDARA DITUTUP', V(0, 22, 100), 'yellow', smoothstep(sn(8, 4).start, sn(8, 4).start + 0.3, t)); }
  if (id === 'sulfur') tag('sf', 'KABUT BELERANG MEMANTULKAN SINAR MATAHARI', V(0, 14, 0), 'yellow', tin(1.5));
  if (id === 'bigger') tag('bg', 'TOBA ±17× TAMBORA', V(0, -12, 0), 'red', tin(0.2));
  if (id === 'theory') tag('th', 'TEORI LAMA: MANUSIA HAMPIR PUNAH?', africa.anchors.group, 'red', tin());
  if (id === 'newfind') tag('nf', '±74.000 TAHUN LALU · AFRIKA', africa.anchors.group, 'yellow', tin());
  if (id === 'survive') tag('sv', 'MEREKA BERTAHAN · MENANGKAP IKAN', africa.anchors.river, 'green', tin(0.6));
  if (id === 'samosir') {
    tag('mg', 'MAGMA MASIH ADA DI BAWAH', A.vent.clone().add(V(0, 4, 0)), 'red', smoothstep(sn(13, 2).start, sn(13, 2).start + 0.3, t));
    tag('hs', 'MATA AIR PANAS', A.pangururan.clone().add(V(0, 6, 0)), 'yellow', smoothstep(wT(13, /^mata/) - 0.1, wT(13, /^mata/) + 0.2, t));
    tag('sm', 'SAMOSIR TERANGKAT ±700 m', A.samosir.clone().add(V(0, 4, 0)), 'green', smoothstep(wT(13, /^Samosir/) - 0.1, wT(13, /^Samosir/) + 0.2, t));
  }
  if (id === 'rare') tag('rr', 'LETUSAN SUPER: PULUHAN RIBU TAHUN SEKALI', A.lake, 'yellow', tin(0.5));
  if (id === 'local') tag('lc', 'KENALI GUNUNG API & JALUR EVAKUASI', V(0, 12, 80), 'green', tin(0.4));
  if (id === 'swim2') tag('sw2', 'DANAU TOBA = KAWAH', toba.anchors.lake, 'blue', tin(0.5));
  if (id === 'swim') tag('sw', 'BERENANG DI KAWAH LETUSAN TERBESAR', village.anchors.swim, 'yellow', tin(1));
}

const CH = [S(3), S(6), S(9), S(11), S(13)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'village' ? (s.o && s.o(s.t0 + 0.01).ash > 0.2 ? 'ash' : 'lake') : s.kind === 'world' ? (s.id === 'heavy' ? 'ash' : 'calm') : s.kind === 'africa' ? 'savanna' : s.kind === 'sawah' ? 'sawah' : s.kind === 'toba' && s.o(s.t1 - 0.01).erupt > 0.5 ? 'erupt' : 'none');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, answer: tAnswer, boom: tBoom, now: tNow, collapse: [S(5) + 0.4, sn(5, 1).start],
  flow: S(7), cubes: wT(4, /^Toba/) - 0.2, tambora: S(4) + 0.3, teaser: S(16), rumble: S(6) + 1.5,
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 4, 8, 12, 16, 18, 22, 28, 35, 41, 45, 49, 53, 57, 61, 64, 68, 72, 74, 80, 85, 92, 100, 108, 114, 118, 124, 130, 135, 140, 145, 150, 155, 162, 170]) renderAt(t);
renderAt(0);
