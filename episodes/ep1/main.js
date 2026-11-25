// ANDAI… Episode 1: "Andai Bumi berhenti berputar" — live web episode.
// Shots follow the narration word timing (assets/timing.json); the soundtrack is the clock.
import * as THREE from 'three';
import { clamp, easeInOut, easeOut, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, chapters, startPlayer } from '../../src/kit.js';
import { Globe, ll, R } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { MapScene, geo } from '../../src/map.js';
import { BusScene } from '../../src/bus.js';

const BASE = './episodes/ep1/';
const CH = ['KECEPATAN TAK TERASA', 'REM MENDADAK', 'SEHARI = SETAHUN', 'LAUT PINDAH KE KUTUB', 'BISAKAH TERJADI?'];
const KEY = /^(seribu|enam|ratus|tujuh|puluh|kilometer|jet\.|berhenti|Indonesia|paling|parah\.|Kenapa\?|nol\.|direm|mendadak\.|timur,|lima|badai|raksasa|tahun\.|memanggang|membekukan|kutub\.|tenggelam|surut\.|benua|raksasa|Bulan\.|delapan|belas|salju\.|bersalju\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch(BASE + 'assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence, chStart, CAPS } = T;
const globe = new Globe(rings);
const world = new World();
const map = new MapScene();
map.setTectonics(false);
const bus = new BusScene();
const caption = captions($('cap'), CAPS, KEY);

// ------------------------------------------------------------------ timeline
const tCh = (c) => chStart(c) - 1.25;
const CHS = [1, 2, 3, 4, 5].map(tCh);
const tStop1 = wT(2, /^berhenti/);            // hook: the globe stops
const tBrake = wT(6, /^direm/);
const tStop2 = wT(7, /^berhenti/);
const tWind = sentence(7, 1).start;           // "Tanah berhenti, tapi udara..."
const tBars = sentence(7, 2).start;
const tWave = S(8) + 3.6;
const tHeat = sentence(10, 1).start, tFrost = sentence(10, 2).start;
const tDrain = S(12), tFlood = sentence(12, 1).start;
const tIndo = S(13), tMega = sentence(13, 3).start;
const tClock2 = sentence(15, 1).start;
const tTeaser = sentence(16, 2).start;
const END = E(16) + 0.35;
const DURATION = Math.ceil(END + 2.6);

// globe facing helpers: rotation that puts longitude `lon` in front of a camera on +z (or toward the Sun)
const face = (lon) => -rad(lon);
const faceSun = (lon) => rad(59) - rad(lon);

// shots: each returns {scene, cam:{pos,tgt,fov}, ...}. Cuts follow the sentences so a
// new picture arrives every few seconds (retention: no static shot longer than ~6 s).
const s3b = sentence(3, 1).start, s4b = sentence(4, 1).start, s4c = sentence(4, 2).start;
const s9b = sentence(9, 1).start, tFrostTown = tFrost + 1.8;
const tFast = S(15), SUN_W = V(-0.38, 0.5, -0.78).normalize();
const SHOTS = [
  // hook: 1.6 s flash-forward montage before the first word, then the speed counter
  { id: 'm1', t0: 0, t1: 0.55, kind: 'world', wt: () => 5, wind: true, windStart: -1.5, cam: (k) => ({ pos: V(-160, 70, -65), tgt: V(20, 0, 80), fov: 55 }), glitch: true },
  { id: 'm2', t0: 0.55, t1: 1.1, kind: 'world', wt: (t, k) => lerp(39.9, 40.5, k), cam: (k) => ({ pos: V(-150, 85, -300), tgt: V(-10, 0, -20), fov: 50 }), glitch: true },
  { id: 'm3', t0: 1.1, t1: 1.6, kind: 'map', dry: () => 0.9, cam: (k) => ({ pos: geo(110, -16, 320), tgt: geo(110, -2, 0), fov: 50 }), glitch: true },
  { id: 'hook', t0: 1.6, t1: S(2), kind: 'globe', g: (t, k) => ({ zoom: 1.3, spin: face(118) + (t - 4) * 0.35, cam: { pos: V(0, 3, lerp(34, 24, easeOut(k))), tgt: V(0, 0, 0), fov: 45 }, equator: smoothstep(1.8, 3, t) }) },
  { id: 'stop1', t0: S(2), t1: tStop1 + 1.6, kind: 'globe', g: (t) => {
      const sp = t < tStop1 ? face(118) + (t - 4) * 0.35 + (t - S(2)) * (t - S(2)) * 0.25 : face(118) + (tStop1 - 4) * 0.35 + (tStop1 - S(2)) ** 2 * 0.25;
      return { spin: sp, cam: { pos: V(0, 2, 26), tgt: V(0, 0, 0), fov: 45 }, equator: 0.6 };
    }, shake: (t) => (t > tStop1 ? 1.2 * Math.exp(-(t - tStop1) * 3) : 0) },
  { id: 'm4', t0: tStop1 + 1.6, t1: tStop1 + 2.6, kind: 'world', wt: () => 5, wind: true, windStart: tStop1 + 1.0, cam: (k) => ({ pos: V(lerp(-170, -150, k), 70, -65), tgt: V(20, 0, 80), fov: 55 }), glitch: true },
  { id: 'm5', t0: tStop1 + 2.6, t1: tStop1 + 3.6, kind: 'map', dry: () => 0.85, cam: (k) => ({ pos: geo(110, -16, lerp(330, 300, k)), tgt: geo(110, -2, 0), fov: 50 }), glitch: true },
  { id: 'why', t0: tStop1 + 3.6, t1: CHS[0], kind: 'globe', g: (t, k) => ({ zoom: 1.35, spin: face(118), cam: { pos: V(0, 1, lerp(30, 19, easeInOut(k))), tgt: V(0, -0.5, 0), fov: 45 }, markers: ['indo'] }) },
  // 1. speed nobody feels: orbit, equator, Indonesia, Tokyo, the pole
  { id: 'orbit', t0: CHS[0], t1: s3b, kind: 'globe', g: (t, k) => { const a = lerp(-0.7, 0.3, easeInOut(k)); return { spin: face(118) + (t - CHS[0]) * 0.12, cam: { pos: V(Math.sin(a) * 30, lerp(16, 8, k), Math.cos(a) * 30), tgt: V(0, 0, 0), fov: 45 } }; } },
  { id: 'equator', t0: s3b, t1: S(4), kind: 'globe', g: (t, k) => ({ spin: face(60) + (t - s3b) * 0.45, cam: { pos: V(0, 1.2, 29), tgt: V(0, 0, 0), fov: 45 }, equator: smoothstep(s3b, s3b + 0.6, t) }) },
  { id: 'jkt', t0: S(4), t1: s4b, kind: 'globe', g: (t, k) => ({ zoom: 1.2, spin: face(lerp(100, 112, k)), cam: { pos: V(lerp(4, 0, k), -1, lerp(24, 19, k)), tgt: V(0, -1, 0), fov: 45 }, equator: 0.5, markers: ['jakarta'] }) },
  { id: 'tokyo', t0: s4b, t1: s4c, kind: 'globe', g: (t, k) => ({ zoom: 1.3, spin: face(lerp(135, 142, k)), cam: { pos: V(0, 13, 20), tgt: V(0, 4, 0), fov: 45 }, equator: 0.3, markers: ['jakarta', 'tokyo'] }) },
  { id: 'pole', t0: s4c, t1: S(5), kind: 'globe', g: (t, k) => ({ zoom: 1.35, spin: face(140) + k * 0.3, cam: { pos: V(0, 28, lerp(10, 5, k)), tgt: V(0, 0, 0), fov: 45 }, markers: ['pole'] }) },
  { id: 'all', t0: S(5), t1: CHS[1], kind: 'world', wt: (t) => 2 + (t - S(5)) * 0.5, cam: (k) => ({ pos: V(lerp(75, 30, k), lerp(90, 40, k), lerp(-200, -90, k)), tgt: V(0, 6, 85), fov: 52 }) },
  // 2. sudden brake
  { id: 'bus', t0: CHS[1], t1: S(7), kind: 'bus' },
  { id: 'stop2', t0: S(7), t1: tWind, kind: 'globe', g: (t) => {
      const base = face(118);
      const sp = t < tStop2 ? base + (t - tStop2) * 0.9 : base;
      return { spin: sp, cam: { pos: V(0, 3, 25), tgt: V(0, 0, 0), fov: 45 }, equator: 0.5 };
    }, shake: (t) => (t > tStop2 ? 1.0 * Math.exp(-(t - tStop2) * 3) : 0) },
  { id: 'wind', t0: tWind, t1: tWave, kind: 'world', wt: () => 5, wind: true, windStart: tWind, cam: (k) => ({ pos: V(lerp(-170, -150, k), lerp(72, 64, k), lerp(-70, -55, k)), tgt: V(20, 0, 80), fov: 55 }), shake: () => 0.25 },
  { id: 'wave', t0: tWave, t1: S(17), kind: 'world', wt: (t, k) => lerp(38.6, 41.6, k), wind: true, windStart: tWind, cam: (k) => ({ pos: V(lerp(-150, -135, k), lerp(85, 78, k), lerp(-300, -280, k)), tgt: V(lerp(-10, 0, k), 0, lerp(-20, 20, k)), fov: 50 }) },
  { id: 'tease', t0: S(17), t1: CHS[2], kind: 'map', dry: (t) => 0.25 * smoothstep(S(17) + 2, CHS[2], t), cam: (k) => ({ pos: geo(lerp(116, 112, k), lerp(-12, -14, k), lerp(240, 300, k)), tgt: geo(112, -2, 0), fov: 50 }) },
  // 3. one day = one year: still globe, the Sun frozen over the town, heat, then frozen night
  { id: 'still', t0: CHS[2], t1: s9b, kind: 'globe', g: (t, k) => ({ spin: faceSun(118), cam: { pos: V(-0.5 * 30, 4, 0.86 * 30).lerp(V(-0.2 * 27, 3, 0.98 * 27), k), tgt: V(0, 0, 0), fov: 45 }, markers: ['indo'] }) },
  { id: 'sunTown', t0: s9b, t1: S(10), kind: 'world', wt: () => 6, cam: (k) => ({ pos: V(lerp(16, 10, k), 5, lerp(34, 26, k)), tgt: V(10, 5, 30).add(SUN_W.clone().multiplyScalar(100)).add(V(0, -18, 0)), fov: 58 }) },
  { id: 'days', t0: S(10), t1: tHeat, kind: 'globe', g: (t, k) => ({ spin: faceSun(118), cam: { pos: V(-0.2 * 28, 5, 0.98 * 28), tgt: V(0, 0, 0), fov: 45 }, markers: ['indo'] }) },
  { id: 'heat', t0: tHeat, t1: tFrost, kind: 'world', wt: () => 6, tint: 'heat', cam: (k) => ({ pos: V(lerp(60, 40, k), lerp(55, 45, k), lerp(-60, -40, k)), tgt: V(-10, 4, 90), fov: 52 }) },
  { id: 'frost', t0: tFrost, t1: tFrostTown, kind: 'globe', g: (t, k) => ({ spin: faceSun(118), cam: { pos: V(-0.7 * 28, 5, 0.72 * 28), tgt: V(0, 0, 0), fov: 45 }, heat: 1, frost: smoothstep(tFrost, tFrost + 1.2, t), markers: ['indo'] }) },
  { id: 'iceTown', t0: tFrostTown, t1: CHS[3], kind: 'world', wt: () => 6, tint: 'night', snowAmt: 0.45, cam: (k) => ({ pos: V(lerp(40, 30, k), lerp(40, 32, k), lerp(-30, -15, k)), tgt: V(-15, 4, 95), fov: 52 }) },
  // 4. the oceans move to the poles
  { id: 'bulge', t0: CHS[3], t1: tDrain, kind: 'globe', g: (t, k) => ({ spin: face(60) - k * 0.2, cam: { pos: V(0, 4, 30), tgt: V(0, 0, 0), fov: 45 }, bulge: smoothstep(S(11) + 2, S(11) + 3.5, t) }) },
  { id: 'drain', t0: tDrain, t1: tIndo, kind: 'globe', g: (t, k) => ({ spin: face(lerp(60, 20, k)), cam: { pos: V(0, lerp(10, 22, easeInOut(k)), lerp(29, 21, easeInOut(k))), tgt: V(0, 2, 0), fov: 45 },
      bulge: lerp(1, -1, smoothstep(tDrain, tDrain + 3, t)), drain: smoothstep(tDrain + 1, tFlood + 2.5, t), markers: t > tFlood ? ['europe', 'canada', 'russia'] : [] }) },
  { id: 'indo', t0: tIndo, t1: tMega, kind: 'map', dry: (t) => smoothstep(sentence(13, 1).start, sentence(13, 2).start + 2.5, t), cam: (k) => ({ pos: geo(lerp(113, 112, k), lerp(-17, -21, k), lerp(300, 420, easeInOut(k))), tgt: geo(lerp(112, 112, k), lerp(-1, -3, k), 0), fov: 50 }) },
  { id: 'mega', t0: tMega, t1: CHS[4], kind: 'globe', g: (t, k) => ({ spin: face(lerp(100, 125, k)), cam: { pos: V(0, 5, lerp(32, 27, k)), tgt: V(0, 0, 0), fov: 45 }, drain: 1, markers: ['indo'] }) },
  // 5. could it happen? Moon, a fast-spinning young Earth, then the teaser
  { id: 'moon', t0: CHS[4], t1: tFast, kind: 'globe', g: (t, k) => ({ spin: face(118) + (t - CHS[4]) * 0.25, cam: { pos: V(lerp(18, 6, k), lerp(14, 8, k), lerp(52, 46, k)), tgt: V(-6, 0, 0), fov: 45 }, moon: true, moonAngle: 1.3 + (t - CHS[4]) * 0.08 }) },
  { id: 'fast', t0: tFast, t1: S(16), kind: 'globe', g: (t, k) => ({ spin: face(118) + (t - tFast) * (t < tClock2 ? 2.4 : 0.6), cam: { pos: V(lerp(-8, 8, k), 6, 30), tgt: V(0, 3, 0), fov: 45 }, moon: true, moonAngle: 2.2 + (t - tFast) * (t < tClock2 ? 0.5 : 0.12) }) },
  { id: 'safe', t0: S(16), t1: tTeaser, kind: 'globe', g: (t, k) => ({ spin: face(118) + (t - S(16)) * 0.2, cam: { pos: V(0, 2, lerp(30, 22, k)), tgt: V(0, 0, 0), fov: 45 }, markers: ['indo'] }) },
  { id: 'teaser', t0: tTeaser, t1: DURATION + 1, kind: 'world', wt: (t) => 3 + (t - tTeaser) * 0.5, snow: true, cam: (k) => ({ pos: V(lerp(60, 45, k), lerp(40, 32, k), lerp(-40, -20, k)), tgt: V(-10, 4, 90), fov: 52 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

const camShake = (t, a) => V(a * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7) * 0.4), a * (Math.sin(t * 43.3 + 1) * 0.6 + Math.sin(t * 71.9) * 0.4), a * Math.sin(t * 29.3 + 2) * 0.5);
const fmtN = (n) => Math.round(n).toLocaleString('id-ID');
const chapterUI = chapters(CH, CHS);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, shake = shot.shake ? shot.shake(t) : 0, g = null;
  world.wind = 0; world.snow = 0;
  if (shot.kind === 'globe') {
    g = shot.g(t, k);
    globe.update(t, g.spin, g);
    c = g.cam;
    // keep the whole globe inside the 9:16 frame: pull the camera back from its target
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    if (shot.wind) { world.wind = smoothstep(shot.windStart, shot.windStart + 0.6, t); world.windAge = t - shot.windStart; shake += 0.35 * world.wind; }
    if (shot.snow) world.snow = 1;
    if (shot.snowAmt) world.snow = shot.snowAmt;
    scene = world.scene;
  } else if (shot.kind === 'map') {
    c = shot.cam(k);
    map.update(t, 'none', k, shot.dry(t));
    scene = map.scene;
  } else if (shot.kind === 'bus') {
    const bx = bus.update(t, t - tBrake);
    c = { pos: V(bx + lerp(-5, 1, k), 5, 27), tgt: V(bx + 1, 1.2, 0), fov: 50 };
    if (t > tBrake) shake += 0.25 * Math.exp(-(t - tBrake) * 4);
    scene = bus.scene;
  }
  const sh = camShake(t, shake);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt.clone().add(sh.multiplyScalar(0.5)));
  if (shot.kind === 'world') {
    const wt = shot.wt(t, k);
    world.update(wt, camera, size.h);
  }
  renderer.render(scene, camera);
  overlays(t, shot, g);
}

function overlays(t, shot, g) {
  chapterUI(t, END);
  caption(t, t > END);
  tag.hideAll();
  // speed counter (hook) and the "stop" moment
  let cv = -1;
  if (shot.id === 'hook') cv = 1670 * easeInOut(smoothstep(2.0, 6.6, t));
  else if (shot.id === 'stop1') cv = t < tStop1 ? 1670 : 0;
  else if (shot.id === 'stop2') cv = t < tStop2 ? 1670 : 0;
  else if (shot.id === 'jkt') cv = 1670 * smoothstep(wT(4, /^tepat/), wT(4, /^tepat/) + 1.2, t);
  // open loop: the question stays on screen until it is answered
  const tAns = sentence(13, 1).start;
  show('pill', t > CHS[0] - 0.5 && t < tAns + 3 && t < END ? 1 : 0);
  $('pill').className = 'ov' + (t >= tAns ? ' done' : '');
  $('pill').textContent = t >= tAns ? 'TERJAWAB: LAUT INDONESIA MENGERING' : 'KENAPA INDONESIA PALING PARAH?';
  $('tint').style.background = shot.tint === 'heat' ? 'rgba(255,110,20,0.42)' : shot.tint === 'night' ? 'rgba(20,45,110,0.62)' : 'transparent';
  show('tint', shot.tint ? 1 : 0);
  show('counter', cv >= 0 ? 1 : 0);
  if (cv >= 0) { $('cntV').textContent = fmtN(cv); $('cntV').style.color = cv === 0 ? '#ff5a48' : '#fff'; $('cntU').textContent = shot.id === 'jkt' ? 'KM/JAM · INDONESIA' : 'KM/JAM'; }
  // wind comparison
  const bv = pop(t, tBars - 0.2, tWave, 0.3, 0.2);
  show('bars', bv);
  $('bar1').style.width = `${(345 / 1670) * 100 * smoothstep(tBars, tBars + 0.8, t)}%`;
  $('bar2').style.width = `${100 * smoothstep(tBars + 0.6, tBars + 1.8, t)}%`;
  // day counter
  const dv = pop(t, tHeat - 0.2, CHS[3], 0.3, 0.3);
  show('days', dv);
  if (dv > 0) {
    if (t < tFrost) { $('daysA').textContent = 'SIANG TANPA HENTI'; $('daysA').style.background = '#ff8a00'; $('daysV').textContent = `HARI KE-${Math.max(1, Math.round(182 * smoothstep(tHeat, tFrost - 0.3, t)))}`; }
    else { $('daysA').textContent = 'MALAM TANPA HENTI'; $('daysA').style.background = '#7fc8ff'; $('daysV').textContent = `HARI KE-${183 + Math.round(182 * smoothstep(tFrost, CHS[3] - 0.5, t))}`; }
  }
  // clock 18h vs 24h
  const cl = pop(t, S(15) + 0.2, S(16), 0.3, 0.3);
  show('clock', cl);
  if (cl > 0) {
    const arc = (h) => { const a = (h / 24) * Math.PI * 2; const x = 50 + 40 * Math.sin(a), y = 50 - 40 * Math.cos(a); return `M50 50 L50 10 A40 40 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`; };
    $('clkA1').setAttribute('d', arc(Math.min(18, 18 * smoothstep(S(15) + 0.3, S(15) + 2, t))));
    $('clkA2').setAttribute('d', arc(Math.min(23.99, 24 * smoothstep(tClock2, tClock2 + 1.5, t))));
    $('clk2').style.opacity = smoothstep(tClock2 - 0.2, tClock2 + 0.2, t);
  }
  show('teaser', pop(t, tTeaser, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'map' || (g && (g.bulge || g.drain)) ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  renderer.domElement.style.filter = shot.glitch ? 'contrast(1.25) saturate(1.3)' : shot.snow ? 'saturate(0.55) brightness(1.12) hue-rotate(-8deg)' : 'none';
  // flashes
  let fl = 0;
  for (const s of [tStop1, tStop2]) if (t >= s) fl = Math.max(fl, 0.85 * Math.exp(-(t - s) * 6));
  for (const s of [0.55, 1.1, 1.6, tStop1 + 1.6, tStop1 + 2.6, tStop1 + 3.6, tTeaser]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.8 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  const id = shot.id;
  if (id === 'why') tag('why', 'KENAPA INDONESIA?', globe.markerPos('indo', 1.2), 'red big', smoothstep(shot.t0 + 0.4, shot.t0 + 0.7, t));
  if (id === 'equator') tag('circ', 'KELILING KHATULISTIWA ± 40.075 km', V(0, -1.4, 10.4), 'yellow', smoothstep(s3b + 0.3, s3b + 0.6, t));
  if (id === 'jkt') tag('jkt', 'INDONESIA', globe.markerPos('jakarta'), 'red', smoothstep(wT(4, /^tepat/), wT(4, /^tepat/) + 0.3, t));
  if (id === 'tokyo') { tag('tky', 'TOKYO ≈ 1.360 km/jam', globe.markerPos('tokyo'), 'yellow big', smoothstep(s4b, s4b + 0.3, t)); tag('jk2', 'INDONESIA ≈ 1.670', globe.markerPos('jakarta'), 'red', 1); }
  if (id === 'pole') tag('pol', 'KUTUB ≈ 0 km/jam', globe.markerPos('pole'), 'big', smoothstep(s4c, s4c + 0.3, t));
  if (id === 'still') tag('ind3', 'INDONESIA', globe.markerPos('indo'), 'red', pop(t, S(9) + 0.5, shot.t1));
  if (id === 'sunTown') tag('sun', 'MATAHARI TIDAK BERGERAK', camera.position.clone().add(SUN_W.clone().multiplyScalar(300)).add(V(0, 30, 0)), 'yellow big', pop(t, shot.t0 + 0.3, shot.t1));
  if (id === 'days') tag('day', '±6 BULAN SIANG', globe.markerPos('indo', 3), 'red', pop(t, shot.t0 + 0.2, shot.t1));
  if (id === 'frost') tag('night', '±6 BULAN MALAM · BEKU', V(-6, 4, -6), 'blue big', pop(t, tFrost + 0.3, shot.t1));
  if (id === 'bulge') tag('bulge', 'TONJOLAN LAUT DI KHATULISTIWA', V(0, 0.5, 11.5), 'blue', pop(t, wT(11, /^menggembung/) - 0.3, shot.t1));
  if (id === 'drain') {
    tag('eu', 'EROPA', globe.markerPos('europe'), 'blue', smoothstep(wT(12, /^Eropa/), wT(12, /^Eropa/) + 0.2, t));
    tag('ca', 'KANADA', globe.markerPos('canada'), 'blue', smoothstep(wT(12, /^Kanada/), wT(12, /^Kanada/) + 0.2, t));
    tag('ru', 'RUSIA UTARA', globe.markerPos('russia'), 'blue', smoothstep(wT(12, /^Rusia/), wT(12, /^Rusia/) + 0.2, t));
    tag('pole2', 'SAMUDRA KUTUB', V(0, 11.5, 0), 'blue big', pop(t, wT(12, /^tenggelam/), shot.t1));
  }
  if (id === 'mega') tag('mega', 'BENUA RAKSASA KHATULISTIWA', globe.markerPos('indo', 2), 'yellow big', pop(t, shot.t0 + 0.3, shot.t1));
  if (id === 'moon') {
    tag('moon', 'BULAN', globe.moon.position.clone().add(V(0, 3.4, 0)), '', pop(t, wT(14, /^Bulan/) - 0.4, shot.t1));
    tag('slow', 'PUTARAN MELAMBAT PELAN', V(0, -12, 0), 'yellow', pop(t, wT(14, /^melambat/), shot.t1));
  }
  if (id === 'fast') tag('young', t < tClock2 ? 'BUMI MUDA: 1 HARI ±18 JAM' : 'SEKARANG: 24 JAM', V(0, -12, 0), t < tClock2 ? 'red' : 'blue', 1);
  if (id === 'safe') tag('safe', 'KAMU MASIH AMAN', V(0, -12, 0), 'green big', pop(t, S(16) + 0.2, shot.t1));
  if (id === 'tease') tag('tz', 'LAUT INDONESIA…?', geo(112, -4, 3), 'yellow big', pop(t, wT(17, /^laut/) - 0.2, shot.t1));
  if (shot.kind === 'bus') {
    tag('brake', t > tBrake ? 'DIREM!' : '18 m/detik', bus.anchors.bus, t > tBrake ? 'red big' : '', 1);
    tag('pax', 'TUBUH TETAP MELAJU →', bus.anchors.pax, 'yellow', smoothstep(tBrake + 0.25, tBrake + 0.5, t));
  }
  if (shot.kind === 'map' && shot.id === 'indo') {
    tag('sunda', 'DASAR LAUT JADI DARATAN', geo(108, -3, 3), 'yellow', shot.t0 === tIndo ? pop(t, sentence(13, 2).start, shot.t1) : 0);
    tag('asia', 'TERHUBUNG KE ASIA', geo(103, 4.5, 3), '', shot.t0 === tIndo ? pop(t, wT(13, /^Asia/), shot.t1) : 0);
    tag('aus', 'TERHUBUNG KE AUSTRALIA', geo(132, -12, 3), '', shot.t0 === tIndo ? pop(t, wT(13, /^Australia/), shot.t1) : 0);
  }
  if (shot.id === 'all') {
    const st = sentence(5, 1).start;
    tag('w1', 'TANAH →', V(10, 4, 60), 'yellow', smoothstep(wT(5, /^tanah/), wT(5, /^tanah/) + 0.2, t));
    tag('w2', 'UDARA →', V(-20, 35, 70), 'yellow', smoothstep(wT(5, /^udara/), wT(5, /^udara/) + 0.2, t));
    tag('w3', 'LAUT →', V(0, 2, -60), 'yellow', smoothstep(wT(5, /^laut/), wT(5, /^laut/) + 0.2, t));
    tag('w0', 'SEMUA IKUT BERGERAK 1.670 km/jam', V(-10, 50, 110), 'red', pop(t, st, shot.t1));
  }
  if (shot.id === 'wind') tag('wind', 'ANGIN → TIMUR', V(20, 30, 90), 'red big', pop(t, tWind + 0.4, tBars));
}

startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CHS });
window.EVENTS = { montage: [0, 0.55, 1.1, tStop1 + 1.6, tStop1 + 2.6], tease: S(17), sunTown: s9b, iceTown: tFrostTown, fast: tFast, duration: DURATION, chapters: CHS, stop1: tStop1, stop2: tStop2, brake: tBrake, wind: tWind, wave: tWave, heat: tHeat, frost: tFrost, drain: tDrain, indo: tIndo, mega: tMega, clock2: tClock2, teaser: tTeaser, end: END, shots: SHOTS.map((s) => s.t0) };
// warm-up: compile shaders of every scene
for (const t of [0.2, 0.8, 1.3, 13, 14, 52, 66, 90, 95, 120, 158]) renderAt(t);
renderAt(0);
