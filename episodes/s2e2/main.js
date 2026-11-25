// ANDAI… Season 2, Episode 2: "Andai Bumi kehilangan oksigen 5 detik" — myth-check of the viral claims.
// Air is ~78% N2 / ~21% O2: removing O2 drops pressure ~21% (≈ sea level -> ~2,000 m). Fire needs oxygen.
// Sunburn takes ~10+ min at high UV. Oxygen is ~46% of the crust, ~89% of water, ~65% of the body by mass.
// The ocean makes ~half of Earth's oxygen (NOAA).
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { MountainScene } from '../../src/mountain.js';
import { SawahScene } from '../../src/sawah.js';
import { ReefScene } from '../../src/moonscenes.js';
import { WarungScene } from '../../src/oxygen.js';

const BASE = './episodes/s2e2/';
const KEY = /^(Lima|detik\.|detik,|oksigen|gelap,|terbakar,|pecah,|runtuh\.|mitos,|fakta\.|mengerikan|napas\.|Mitos\.|biru\.|nitrogen\.|Nitrogen|ultraviolet\.|sepuluh|menit|singkat\.|setengah|benar\.|dua|puluh|satu|persen|seperlima\.|Dieng,|padam\.|Ini|serentak\.|mineral,|atom|kerak|debu\.|hidrogen|enam|lima|lima\.|plankton|separuh|komentar\.|melompat)$/i;

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
const dieng = new MountainScene('dieng');
const sawah = new SawahScene();
const reef = new ReefScene();
const warung = new WarungScene();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// globe debris + escaping gas for the "every oxygen atom" version
const R = mulberry32(3);
const puff = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const debris = Array.from({ length: 220 }, () => {
  const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.25 + R() * 0.35), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.07, 0.35, 0.25 + R() * 0.2) }));
  const d = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
  globe.scene.add(m); return { m, d, sp: 0.5 + R(), rot: R() * 6 };
});
const gas = Array.from({ length: 90 }, () => {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0xcfe6ff, transparent: true, depthWrite: false }));
  const d = new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.6, R() - 0.5).normalize();
  globe.scene.add(m); return { m, d, ph: R() };
});
const setDoom = (t, k, g) => {
  for (const q of debris) { q.m.visible = k > 0.01; if (!q.m.visible) continue; const r = 10 + k * 7 * q.sp; q.m.position.copy(q.d).multiplyScalar(r); q.m.rotation.set(t * q.sp + q.rot, t * 0.7, 0); }
  for (const q of gas) { q.m.visible = g > 0.01; if (!q.m.visible) continue; const f = (q.ph + t * 0.25) % 1; q.m.position.copy(q.d).multiplyScalar(10.5 + f * 9); q.m.scale.setScalar(1 + f * 3); q.m.material.opacity = 0.6 * (1 - f) * g; }
};

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tGone = sn(1, 1).start;
const tOff = wT(8, /^Kompor/) - 0.2, tOn = sn(8, 4).start + 0.6;
const tDoom = S(10);
const fireOn = (t) => (t < tOff ? 1 : t < tOn ? 0 : smoothstep(tOn, tOn + 1.2, t));
const travel = (t) => (t < tOff ? t : t < tOn ? tOff + 0.6 * (1 - Math.exp(-(t - tOff) * 2)) : tOff + 0.6 + (t - tOn));
// verdict stamps: [time, text, colour]
const STAMPS = [[sn(4, 1).start, 'MITOS', '#ff5a48'], [sn(5, 1).start, 'MITOS', '#ff5a48'], [sn(6, 1).start, 'SETENGAH BENAR', '#ffb020'], [sn(8, 1).start, 'FAKTA', '#2fd16a'], [sn(9, 1).start, 'MITOS', '#ff5a48']];
const town = (k, a = 0) => ({ pos: V(lerp(-6, -4, k) + a, 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 });
const street = (k) => ({ pos: V(lerp(-4, -3, k), lerp(4.2, 5, k), lerp(70, 64, k)), tgt: V(0, 8, -60), fov: 56 });
const skyCam = (k) => ({ pos: V(-4, 7, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 });
const wcam = (k) => ({ pos: V(lerp(-6.5, -5.5, k), 2.3, lerp(4.8, 4.2, k)), tgt: V(0, 1.4, 0), fov: 50 });
const stoveCam = (k) => ({ pos: V(lerp(0.6, 0.3, k), 2.0, lerp(2.4, 2.0, k)), tgt: V(-1.2, 1.4, -0.2), fov: 45 });
const cakeCam = (k) => ({ pos: V(lerp(6.2, 6.0, k), 1.6, lerp(-0.6, -0.8, k)), tgt: V(5, 1.1, -2), fov: 45 });
const roadCam = (k) => ({ pos: V(lerp(-8, -6, k), 1.6, lerp(12, 11, k)), tgt: V(4, 0.8, 6), fov: 50 });
const gcam = (z = 1.65) => ({ pos: V(0, 5, 30), tgt: V(0, 0, 0), fov: 45, zoom: z });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'warung', on: () => 0, cam: stoveCam, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'globe', doom: () => 1, gas: () => 1, spin: 1.9, cam: () => gcam(1.4), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'world', filter: 'brightness(0.3) contrast(1.3)', cam: (k) => skyCam(k), glitch: true },
  // hook
  { id: 'five', t0: 1.7, t1: tGone, kind: 'world', count: true, cam: (k) => street(k) },
  { id: 'gone', t0: tGone, t1: S(2), kind: 'world', count: true, cam: (k) => town(k) },
  { id: 'v1', t0: S(2), t1: wT(2, /^kulit/) - 0.1, kind: 'world', filter: 'brightness(0.3) contrast(1.2)', cam: skyCam },
  { id: 'v2', t0: wT(2, /^kulit/) - 0.1, t1: wT(2, /^telinga/) - 0.1, kind: 'world', filter: 'hue-rotate(250deg) saturate(1.6) brightness(1.15)', cam: (k) => street(k) },
  { id: 'v3', t0: wT(2, /^telinga/) - 0.1, t1: wT(2, /^gedung/) - 0.1, kind: 'warung', ears: true, cam: wcam },
  { id: 'v4', t0: wT(2, /^gedung/) - 0.1, t1: sn(2, 1).start, kind: 'world', crumble: true, cam: (k) => town(k) },
  { id: 'check', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'world', score: true, cam: (k) => street(k) },
  { id: 'check2', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'warung', score: true, cam: wcam },
  { id: 'worse', t0: sn(2, 3).start, t1: sn(2, 4).start, kind: 'globe', doom: (t) => smoothstep(sn(2, 3).start, sn(2, 4).start, t) * 0.5, spin: 1.9, cam: () => gcam(1.5) },
  { id: 'watch', t0: sn(2, 4).start, t1: S(3), kind: 'warung', cam: (k) => ({ pos: V(lerp(-9, -8, k), 3, lerp(9, 8, k)), tgt: V(1, 1.2, -1), fov: 50 }) },
  // 1. us
  { id: 'us', t0: S(3), t1: sn(3, 2).start, kind: 'warung', cam: (k) => ({ pos: V(lerp(-0.9, -1.1, k), 1.8, lerp(1.2, 1.0, k)), tgt: V(-1.6, 1.4, -1), fov: 45 }) },
  { id: 'hold', t0: sn(3, 2).start, t1: sn(3, 3).start, kind: 'world', count: true, cam: (k) => street(k) },
  { id: 'dont', t0: sn(3, 3).start, t1: sn(3, 4).start, kind: 'warung', cam: (k) => ({ pos: V(5.8, 1.1, lerp(-0.9, -1.1, k)), tgt: V(5, 0.9, -2.8), fov: 45 }) },
  { id: 'lungs', t0: sn(3, 4).start, t1: S(4), kind: 'world', cam: (k) => town(k) },
  // claim 1: dark sky
  { id: 'c1', t0: S(4), t1: sn(4, 1).start, kind: 'world', filter: 'brightness(0.3) contrast(1.2)', cam: skyCam },
  { id: 'c1b', t0: sn(4, 1).start, t1: sn(4, 2).start + 3, kind: 'world', cam: skyCam },
  { id: 'c1c', t0: sn(4, 2).start + 3, t1: sn(4, 3).start, kind: 'world', cam: (k) => street(k) },
  { id: 'c1d', t0: sn(4, 3).start, t1: S(5), kind: 'world', cam: (k) => ({ pos: V(-4, 2.2, lerp(56, 60, k)), tgt: V(0, 18, 0), fov: 56 }) },
  // claim 2: UV
  { id: 'c2', t0: S(5), t1: wT(5, /^kita/) - 0.2, kind: 'world', filter: 'hue-rotate(250deg) saturate(1.6) brightness(1.15)', cam: (k) => street(k) },
  { id: 'c2b', t0: wT(5, /^kita/) - 0.2, t1: sn(5, 2).start, kind: 'warung', filter: 'hue-rotate(250deg) saturate(1.4)', cam: wcam },
  { id: 'c2c', t0: sn(5, 2).start, t1: sn(5, 3).start, kind: 'world', uv: true, cam: (k) => town(k) },
  { id: 'c2d', t0: sn(5, 3).start, t1: S(6), kind: 'warung', cam: (k) => ({ pos: V(lerp(-9, -8, k), 3, lerp(9, 8, k)), tgt: V(1, 1.2, -1), fov: 50 }) },
  // claim 3: ears
  { id: 'c3', t0: S(6), t1: sn(6, 2).start, kind: 'warung', ears: true, cam: (k) => ({ pos: V(lerp(-0.9, -1.1, k), 1.8, lerp(1.2, 1.0, k)), tgt: V(-1.6, 1.4, -1), fov: 45 }) },
  { id: 'c3b', t0: sn(6, 2).start, t1: sn(6, 3).start, kind: 'world', cam: skyCam },
  { id: 'c3c', t0: sn(6, 3).start, t1: S(7), kind: 'world', press: true, cam: (k) => street(k) },
  { id: 'dieng', t0: S(7), t1: wT(7, /^dalam/) - 0.1, kind: 'dieng', press: true, cam: (k) => ({ pos: V(lerp(-120, -100, k), lerp(60, 52, k), lerp(140, 120, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'dieng2', t0: wT(7, /^dalam/) - 0.1, t1: sn(7, 1).start, kind: 'dieng', cam: (k) => ({ pos: V(lerp(-30, -20, k), lerp(28, 25, k), lerp(40, 30, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'ring', t0: sn(7, 1).start, t1: S(8), kind: 'warung', ears: true, cam: (k) => ({ pos: V(lerp(7, 6.5, k), 1.4, lerp(-4.5, -4.2, k)), tgt: V(5, 0.9, -2.5), fov: 45 }) },
  // claim 4: fire
  { id: 'c4', t0: S(8), t1: sn(8, 2).start, kind: 'warung', cam: wcam },
  { id: 'c4b', t0: sn(8, 2).start, t1: tOff, kind: 'warung', cam: stoveCam },
  { id: 'stove', t0: tOff, t1: tOff + 1.6, kind: 'warung', cam: stoveCam },
  { id: 'cake', t0: tOff + 1.6, t1: tOff + 3.4, kind: 'warung', cam: cakeCam },
  { id: 'road', t0: tOff + 3.4, t1: sn(8, 4).start, kind: 'warung', cam: roadCam },
  { id: 'relight', t0: sn(8, 4).start, t1: S(9), kind: 'warung', cam: (k) => ({ pos: V(lerp(-9, -8, k), 3, lerp(9, 8, k)), tgt: V(1, 1.2, -1), fov: 50 }) },
  // claim 5: concrete
  { id: 'c5', t0: S(9), t1: sn(9, 2).start, kind: 'world', cam: (k) => ({ pos: V(lerp(20, 17, k), 2, lerp(40, 38, k)), tgt: V(0, 8, 30), fov: 52 }) },
  { id: 'c5b', t0: sn(9, 2).start, t1: sn(9, 2).start + 3, kind: 'dieng', cam: (k) => ({ pos: V(lerp(-30, -24, k), lerp(28, 26, k), lerp(40, 34, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'c5c', t0: sn(9, 2).start + 3, t1: S(10), kind: 'world', cam: (k) => town(k) },
  // the doomsday version
  { id: 'atoms', t0: S(10), t1: sn(10, 1).start, kind: 'globe', spin: 1.9, cam: (k) => gcam(lerp(1.7, 1.3, k)) },
  { id: 'doom', t0: sn(10, 1).start, t1: S(11), kind: 'globe', doom: (t) => 0.1, spin: 1.9, filter: 'contrast(1.2) saturate(0.7)', cam: () => gcam(1.25) },
  { id: 'crust', t0: S(11), t1: sn(11, 1).start, kind: 'globe', doom: (t) => smoothstep(S(11), sn(11, 1).start, t) * 0.4, spin: 1.9, donut: 0, cam: () => gcam(1.5) },
  { id: 'dust', t0: sn(11, 1).start, t1: sn(11, 2).start, kind: 'world', crumble: true, cam: (k) => town(k) },
  { id: 'water', t0: sn(11, 2).start, t1: sn(11, 3).start, kind: 'world', donut: 1, level: (t) => -6 * smoothstep(sn(11, 2).start, sn(11, 3).start + 2, t), cam: (k) => ({ pos: V(lerp(22, 20, k), 3.2, lerp(14, 12, k)), tgt: V(4, 0, -4), fov: 50 }) },
  { id: 'gas', t0: sn(11, 3).start, t1: S(12), kind: 'globe', doom: () => 0.5, gas: () => 1, drain: 1, spin: 1.9, cam: () => gcam(1.6) },
  { id: 'body', t0: S(12), t1: sn(12, 1).start, kind: 'world', donut: 2, filter: 'grayscale(0.6) contrast(1.1)', cam: (k) => street(k) },
  { id: 'never', t0: sn(12, 1).start, t1: S(13), kind: 'world', count: true, filter: 'grayscale(1) brightness(0.6)', cam: (k) => town(k), fadeOut: true },
  // relief: where oxygen comes from
  { id: 'relief', t0: S(13), t1: sn(13, 1).start, kind: 'world', cam: (k) => street(k) },
  { id: 'plankton', t0: sn(13, 1).start, t1: sn(13, 1).start + 3.3, kind: 'reef', cam: (k) => ({ pos: V(lerp(-3, 2, k), lerp(3, 4, k), lerp(8, 5, k)), tgt: V(0, 4, -14), fov: 55 }) },
  { id: 'plankton2', t0: sn(13, 1).start + 3.3, t1: sn(13, 2).start, kind: 'reef', cam: (k) => ({ pos: V(2, 6, lerp(6, 3, k)), tgt: V(0, 5, -14), fov: 55 }) },
  { id: 'forest', t0: sn(13, 2).start, t1: S(14), kind: 'sawah', cam: (k) => ({ pos: V(lerp(-18, -14, k), 4, lerp(30, 26, k)), tgt: V(0, 1.5, 0), fov: 50 }) },
  // recap scoreboard
  { id: 'r1', t0: S(14), t1: sn(14, 3).start, kind: 'world', score: true, cam: (k) => street(k) },
  { id: 'r2', t0: sn(14, 3).start, t1: sn(14, 5).start, kind: 'warung', score: true, cam: wcam },
  { id: 'r3', t0: sn(14, 5).start, t1: S(15), kind: 'globe', score: true, doom: () => 0.2, spin: 1.9, cam: () => gcam(1.9) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'warung', cam: (k) => ({ pos: V(lerp(-9, -8, k), 3, lerp(9, 8, k)), tgt: V(1, 1.2, -1), fov: 50 }) },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'warung', jump: true, cam: (k) => ({ pos: V(lerp(9, 8, k), lerp(2, 3, k), lerp(4, 6, k)), tgt: V(2, 1.2, -1.5), fov: 50 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t, d = 0) => (typeof v === 'function' ? v(t) : v ?? d);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c;
  setDoom(t, 0, 0);
  if (shot.kind === 'globe') {
    globe.update(t, shot.spin + t * 0.03, { clouds: 0.35, drain: shot.drain || 0 });
    setDoom(t, val(shot.doom, t), val(shot.gas, t));
    globe.earth.scale.setScalar(1 - 0.06 * val(shot.doom, t));
    c = shot.cam(k);
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(c.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = shot.level ? shot.level(t) : 0; world.moodT = 4; world.lifeMode = 'calm';
    scene = world.scene;
  } else if (shot.kind === 'warung') {
    c = shot.cam(k);
    warung.update(t, val(shot.on, t, fireOn(t)), { ears: shot.ears, travel: travel(t), jump: shot.jump });
    scene = warung.scene;
  } else if (shot.kind === 'dieng') {
    c = shot.cam(k);
    dieng.update(t, { frost: 0 });
    scene = dieng.scene;
  } else if (shot.kind === 'sawah') {
    c = shot.cam(k);
    sawah.update(t, 0, size.h / (2 * Math.tan(rad(c.fov) / 2)));
    scene = sawah.scene;
  } else if (shot.kind === 'reef') {
    c = shot.cam(k);
    reef.update(t, 0.4, 1);
    scene = reef.scene;
  }
  const shake = (shot.glitch ? 0.3 : 0) + (shot.crumble ? 0.35 : 0) + (shot.ears ? 0.02 : 0);
  camera.position.copy(c.pos).add(camShake(t, shake));
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
  // open loop: the scarier version
  const q = t > sn(2, 3).start + 0.3 && t < S(11) + 3;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= S(10) + 0.8;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'VERSI KIAMAT: SEMUA ATOM OKSIGEN' : 'VERSI PALING MENGERIKAN? (di akhir)';
  // countdown
  let cnt = null;
  if (id === 'five' || id === 'gone') cnt = 5 - clamp((t - 2.7) / (S(2) - 0.4 - 2.7)) * 5;
  if (id === 'hold') cnt = 5 - clamp((t - shot.t0) / (shot.t1 - shot.t0)) * 5;
  if (id === 'never') cnt = 5 - clamp((t - shot.t0) / 3) * 2;
  show('count', cnt != null ? 1 : 0);
  if (cnt != null) $('cV').textContent = Math.max(0, Math.ceil(cnt - 0.001));
  // scoreboard: rows fill in as each verdict is given; the recap lights up the current row
  show('score', shot.score ? pop(t, shot.t0 + 0.1, shot.t1, 0.25, 0.15) : 0);
  if (shot.score) {
    const recap = t >= S(14);
    const rowT = [sn(14, 1).start, sn(14, 2).start, sn(14, 3).start, sn(14, 4).start, sn(14, 5).start];
    for (let i = 0; i < 5; i++) {
      const b = document.querySelector(`#r${i} b`);
      const known = recap && t >= rowT[i];
      b.textContent = known ? b.dataset.v : '?';
      b.style.opacity = known ? 1 : 0.6;
      $(`r${i}`).className = 'r' + (recap && t >= rowT[i] && (i === 4 || t < rowT[i + 1]) ? ' on' : '');
    }
  }
  let st = null;
  for (const [t0, txt, col] of STAMPS) if (t >= t0 && t < t0 + 1.6) st = [t0, txt, col];
  show('stamp', st ? smoothstep(st[0], st[0] + 0.12, t) * (1 - smoothstep(st[0] + 1.3, st[0] + 1.6, t)) : 0);
  if (st) { $('stV').textContent = st[1]; $('stV').style.color = st[2]; $('stamp').style.transform = `scale(${lerp(1.5, 1, smoothstep(st[0], st[0] + 0.15, t))})`; }
  show('press', shot.press ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  show('uv', shot.uv ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  const dn = shot.donut != null ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('donut', dn);
  if (dn) document.querySelectorAll('#donut .c').forEach((e, i) => (e.style.opacity = i <= shot.donut ? (i === shot.donut ? 1 : 0.45) : 0.15));
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = shot.filter || 'none';
  if (shot.glitch) filter = (shot.filter ? shot.filter + ' ' : '') + 'contrast(1.25) saturate(1.3)';
  if (shot.crumble) filter = 'grayscale(0.7) contrast(1.2) brightness(0.85)';
  renderer.domElement.style.filter = filter;
  show('tint', 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, tGone + 1.5, tOff, S(10)]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.75 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', Math.max(1 - smoothstep(0, 0.12, t), shot.fadeOut ? smoothstep(shot.t0 + 3.2, shot.t1 - 0.2, t) : 0));

  // tags
  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const W_ = warung.anchors;
  if (id === 'v1') tag('v1', 'LANGIT GELAP?', V(0, 40, -60), 'yellow big', tin(0.2));
  if (id === 'v2') tag('v2', 'KULIT TERBAKAR?', V(0, 14, 20), 'yellow big', tin(0.1));
  if (id === 'v3') tag('v3', 'TELINGA PECAH?', W_.seller, 'yellow big', tin(0.1));
  if (id === 'v4') tag('v4', 'GEDUNG RUNTUH?', V(0, 14, 90), 'yellow big', tin(0.1));
  if (id === 'us') tag('us', 'TAHAN NAPAS', V(-1, 2.4, 1.1), 'blue', tin());
  if (id === 'dont') tag('dt', 'JANGAN MENGHIRUP UDARA TANPA OKSIGEN', V(5, 1.8, -2.9), 'red', tin());
  if (id === 'c1') tag('c1', 'VERSI VIRAL: GELAP', V(0, 40, -60), 'red', tin(0.2));
  if (id === 'c1b' || id === 'c1c') tag('c1b', 'CAHAYA DIHAMBURKAN UDARA → BIRU', V(0, 40, -60), 'blue', tin(0.6));
  if (id === 'c1d') tag('c1d', 'NITROGEN ±78% MASIH ADA', V(0, 26, 0), 'green', tin());
  if (id === 'c2') tag('c2', 'SINAR UV?', V(0, 14, 20), 'yellow', tin());
  if (id === 'c3b') tag('c3b', 'UDARA: ±78% NITROGEN · ±21% OKSIGEN', V(0, 40, -60), 'blue', tin());
  if (id === 'dieng') tag('dg', 'DIENG ±2.000 m', V(0, 30, 0), 'green', tin());
  if (id === 'ring') tag('rg', 'NGIIING…', V(5, 2.2, -2.7), 'yellow', tin());
  if (id === 'stove') tag('sv', 'KOMPOR: PADAM', W_.stove, 'red', tin(0.1));
  if (id === 'cake') tag('ck', 'LILIN: PADAM', W_.cake, 'red', tin(0.1));
  if (id === 'road') tag('rd', 'MESIN: MATI', W_.road, 'red', tin(0.1));
  if (id === 'relight') tag('rl', 'NYALAKAN ULANG', W_.stove, 'green', tin(0.8));
  if (id === 'c5b') tag('mn', 'OKSIGEN TERKUNCI DALAM MINERAL', V(0, 26, 0), 'yellow', tin());
  if (id === 'atoms') tag('at', 'SEMUA ATOM OKSIGEN?', V(0, 13, 0), 'red big', tin(0.5));
  if (id === 'water') tag('wt', 'AIR = HIDROGEN + OKSIGEN', V(4, 3, -4), 'blue', tin());
  if (id === 'gas') tag('gs', 'LAUTAN → GAS HIDROGEN', V(0, 14, 0), 'red', tin());
  if (id === 'plankton') tag('pk', 'PLANKTON LAUT: ±SEPARUH OKSIGEN BUMI', V(0, 7, -14), 'green', tin(0.5));
  if (id === 'forest') tag('fr', 'HUTAN & TUMBUHAN', V(0, 6, 0), 'green', tin());
  if (id === 'cta') tag('ct', 'TULIS DI KOMENTAR 👇', W_.seller, 'yellow big', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}

const CH = [S(3), S(6), S(9), S(10), S(13)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
const lifeOf = (s) => (s.kind === 'warung' ? 'warung' : s.kind === 'world' ? (s.crumble || s.id === 'never' ? 'none' : 'calm') : s.kind === 'dieng' ? 'dieng' : s.kind === 'sawah' ? 'sawah' : s.kind === 'reef' ? 'reef' : 'none');
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, gone: tGone + 1.5, off: tOff, on: tOn, doom: S(10), doom2: sn(11, 1).start, gas: sn(11, 3).start,
  stamps: STAMPS.map((s) => [s[0], s[1]]), ticks: [...[0, 1, 2, 3, 4].map((i) => 2.7 + i * (S(2) - 3.1) / 5), ...[0, 1, 2, 3, 4].map((i) => sn(3, 2).start + i * (sn(3, 3).start - sn(3, 2).start) / 5)],
  recap: [1, 2, 3, 4, 5].map((i) => sn(14, i).start), teaser: sn(15, 3).start, ring: [sn(7, 1).start, S(8)],
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), lifeOf(s)]),
};
for (const t of [0.3, 0.9, 1.4, 4, 8, 10, 12, 15, 19, 22, 25, 33, 40, 45, 55, 62, 67, 75, 80, 85, 89, 95, 97, 100, 104, 113, 118, 125, 129, 132, 136, 140, 146, 150, 155, 160, 165, 175, 180]) renderAt(t);
renderAt(0);
