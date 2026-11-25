// ANDAI… Episode 2: "Andai Indonesia bersalju" — live web episode.
// Retention design: 1.7 s flash-forward before the first word, a new picture on every
// sentence, an open-loop question pinned on screen until it is answered, a comment
// prompt mid-video, a twist (the glacier is disappearing) and a teaser for episode 3.
import * as THREE from 'three';
import { clamp, easeInOut, easeOut, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { ISLANDS, ELLIPSES } from '../../src/map.js';
import { MountainScene } from '../../src/mountain.js';
import { BeamScene, OrbitScene } from '../../src/sunlight.js';
import { SawahScene } from '../../src/sawah.js';

const BASE = './episodes/ep2/';
const KEY = /^(salju\.|salju|sungguhan\.|hilang,|mana\?|matahari\.|tegak|miring\.|dingin\.|musim\.|kemarau\.|utara,|Jepang\.|nol\.|membeku\.|sekali\.|komentar\.|ketinggian\.|enam|derajat\.|nol\.|upas\.|Puncak|Jaya,|gletser,|empat|kilometer|persegi\.|sepersepuluh|belasan|Venezuela|berikutnya\.|mencair\?|tenggelam\?)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addOutline(ISLANDS, ELLIPSES);
const world = new World({ monument: true, life: true });
const jaya = new MountainScene('jaya');
const dieng = new MountainScene('dieng');
const beams = new BeamScene();
const orbit = new OrbitScene(globe.u.uMap.value);
const sawah = new SawahScene();
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// ------------------------------------------------------------------ timeline (all from narration timing)
const END = E(18) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = sn(13, 1).start;                 // "Di Puncak Jaya, Papua..."
const tSnowStart = S(8);
const tMos = sn(9, 2).start;
const tBack = sn(10, 2).start;                   // "Tapi tunggu dulu"
const tFrost = sn(12, 1).start;
const tShrink = S(15), tFields = sn(15, 1).start, tTooSmall = sn(15, 2).start;
const tVen = S(16), tIndoNext = sn(16, 1).start;
const tTeaser = S(18);
const iceAt = (t) => lerp(1, 0.1, smoothstep(tShrink, tFields - 0.3, t));
const yearAt = (t) => Math.round(lerp(1988, 2025, smoothstep(tShrink, tFields - 0.3, t)));

const snowTown = (k) => ({ pos: V(lerp(115, 92, k), lerp(60, 48, k), lerp(20, 50, k)), tgt: V(55, 26, 110), fov: 52 });
const SHOTS = [
  // hook montage (before the first word)
  { id: 'm1', t0: 0, t1: 0.6, kind: 'world', snow: 1, cover: 1, wt: () => 3, cam: () => snowTown(0.3), glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'jaya', ice: 0.35, cam: () => ({ pos: V(-95, 68, 135), tgt: V(0, 40, 0), fov: 45 }), glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'sawah', snow: 1, cam: () => ({ pos: V(10, 16, 26), tgt: V(0, 4, -20), fov: 50 }), glitch: true },
  // S1 snowy city, S2 "impossible?" then a hidden location
  { id: 'city', t0: 1.7, t1: S(2), kind: 'world', snow: 1, cover: (t) => smoothstep(1.7, 3.5, t), wt: (t) => 3 + t * 0.2, cam: (k) => ({ pos: V(lerp(86, 83, k), lerp(4.2, 6.5, k), lerp(84, 80, k)), tgt: V(lerp(72, 66, k), lerp(3, 22, easeInOut(k)), lerp(96, 104, k)), fov: 56 }) },
  { id: 'tropic', t0: S(2), t1: sn(2, 1).start, kind: 'world', life: 'heat', wt: () => 4, cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'hidden', t0: sn(2, 1).start, t1: sn(2, 3).start, kind: 'jaya', ice: (t) => lerp(0.6, 0.3, smoothstep(sn(2, 2).start, sn(2, 3).start, t)), blur: true, cam: (k) => ({ pos: V(lerp(-150, -110, k), lerp(70, 62, k), lerp(150, 120, k)), tgt: V(0, 38, 0), fov: 45 }) },
  { id: 'where', t0: sn(2, 3).start, t1: S(3), kind: 'globe', g: (t, k) => ({ zoom: 1.4, spin: face(lerp(60, 118, easeInOut(k))), cam: { pos: V(0, 2, 30), tgt: V(0, 0, 0), fov: 45 } }) },
  // why no snow: sun angle
  { id: 'rays', t0: S(3), t1: S(4), kind: 'globe', g: (t, k) => ({ spin: face(118) + k * 0.2, sun: true, cam: { pos: V(-0.55 * 30, 3, 0.83 * 30), tgt: V(0, 0, 0), fov: 45 }, equator: smoothstep(sn(3, 1).start, sn(3, 1).start + 0.6, t) }) },
  { id: 'equator', t0: S(4), t1: sn(4, 1).start, kind: 'globe', g: (t, k) => ({ zoom: 1.2, spin: face(lerp(108, 118, k)), cam: { pos: V(0, 0, 22), tgt: V(0, 0, 0), fov: 45 }, equator: 0.8, markers: ['indo'] }) },
  { id: 'beamL', t0: sn(4, 1).start, t1: S(5), kind: 'beams', left: 1, right: 0, units: (t) => (t > sn(4, 2).start ? 1 : 0), cam: (k) => ({ pos: V(lerp(-30, -22, k), lerp(26, 20, k), lerp(44, 36, k)), tgt: V(-18, 4, 0), fov: 45 }) },
  { id: 'beamR', t0: S(5), t1: S(6), kind: 'beams', left: 1, right: 1, units: (t) => (t > sn(5, 1).start ? 1 : 0), cam: (k) => ({ pos: V(lerp(4, 8, k), lerp(55, 50, k), lerp(104, 96, k)), tgt: V(lerp(5, 8, k), 6, 0), fov: 45 }) },
  { id: 'orbit', t0: S(6), t1: sn(6, 2).start, kind: 'orbit', a: (t) => (t - S(6)) * 0.55, cam: (k) => ({ pos: V(0, lerp(55, 40, k), lerp(55, 60, k)), tgt: V(0, 0, 0), fov: 45 }) },
  { id: 'orbitZoom', t0: sn(6, 2).start, t1: S(7), kind: 'orbit', a: (t) => (sn(6, 2).start - S(6)) * 0.55 + (t - sn(6, 2).start) * 0.1, follow: true },
  // what if Indonesia moved north
  { id: 'shift', t0: S(7), t1: S(8), kind: 'globe', g: (t, k) => ({ spin: face(125), cam: { pos: V(0, lerp(4, 10, k), 30), tgt: V(0, lerp(0, 3, k), 0), fov: 45 }, outline: smoothstep(S(7), S(7) + 0.6, t), shift: 36 * easeInOut(smoothstep(S(7) + 1.2, E(7), t)), markers: ['tokyo'] }) },
  { id: 'winter', t0: S(8), t1: sn(8, 2).start, kind: 'world', life: 'snow', snow: (t) => smoothstep(S(8), S(8) + 1.5, t), cover: (t) => smoothstep(S(8) + 1, sn(8, 2).start + 1.5, t), wt: (t) => 4, cam: (k) => ({ pos: V(lerp(-5, -3, k), lerp(3.8, 4.4, k), lerp(42, 50, k)), tgt: V(0, lerp(2.4, 7, k), 110), fov: 54 }) },
  { id: 'roofs', t0: sn(8, 2).start, t1: wT(8, /^sawah/), kind: 'world', snow: 1, cover: 1, wt: () => 4, cam: (k) => ({ pos: V(lerp(60, 70, k), lerp(70, 60, k), lerp(140, 150, k)), tgt: V(40, 10, 90), fov: 52 }) },
  { id: 'sawahSnow', t0: wT(8, /^sawah/), t1: S(9), kind: 'sawah', snow: (t) => smoothstep(wT(8, /^sawah/) - 0.3, S(9), t), cam: (k) => ({ pos: V(lerp(0, 6, k), 14, lerp(30, 24, k)), tgt: V(0, 4, -20), fov: 50 }) },
  { id: 'palms', t0: S(9), t1: sn(9, 1).start, kind: 'sawah', snow: 1, cam: (k) => ({ pos: V(lerp(-14, -18, k), 9, lerp(22, 18, k)), tgt: V(-28, 9, 3), fov: 50 }) },
  { id: 'harvest', t0: sn(9, 1).start, t1: tMos, kind: 'sawah', snow: (t) => smoothstep(wT(9, /^kini/) - 0.4, wT(9, /^kini/) + 0.6, t), cam: (k) => ({ pos: V(lerp(6, 2, k), lerp(5, 4.4, k), lerp(5, 2, k)), tgt: V(-10, 2, -10), fov: 52 }) },
  { id: 'mosq', t0: tMos, t1: S(10), kind: 'world', life: 'snow', snow: 1, cover: 1, wt: () => 4, cam: (k) => ({ pos: V(lerp(78, 80, k), lerp(5, 4.4, k), lerp(86, 88, k)), tgt: V(72, 2.2, 97), fov: 50 }) },
  { id: 'poll', t0: S(10), t1: tBack, kind: 'world', snow: 1, cover: 1, wt: () => 4, cam: (k) => snowTown(0.6 + 0.4 * k) },
  { id: 'back', t0: tBack, t1: S(11), kind: 'globe', g: (t, k) => ({ spin: face(125), cam: { pos: V(0, lerp(10, 4, k), 30), tgt: V(0, lerp(3, 0, k), 0), fov: 45 }, outline: 1, shift: 36 * (1 - easeInOut(smoothstep(tBack, tBack + 2.2, t))), markers: ['papua'] }) },
  // altitude: lapse rate, Dieng frost, Puncak Jaya
  { id: 'lapse', t0: S(11), t1: S(12), kind: 'jaya', ice: 0.5, climb: (t) => smoothstep(sn(11, 1).start - 0.2, E(11), t), cam: (k) => ({ pos: V(lerp(30, 40, k), 30, 230), tgt: V(-20, 22, 0), fov: 45 }) },
  { id: 'dieng', t0: S(12), t1: tFrost, kind: 'dieng', frost: 0, cam: (k) => ({ pos: V(lerp(-120, -90, k), lerp(60, 48, k), lerp(140, 110, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'frost', t0: tFrost, t1: S(13), kind: 'dieng', frost: (t) => smoothstep(tFrost, tFrost + 1.5, t), cam: (k) => ({ pos: V(lerp(-30, -20, k), lerp(28, 25, k), lerp(40, 30, k)), tgt: V(0, 20, 0), fov: 48 }) },
  { id: 'rise', t0: S(13), t1: tAnswer, kind: 'jaya', ice: 0.55, cam: (k) => ({ pos: V(-30, lerp(10, 45, easeInOut(k)), lerp(230, 180, k)), tgt: V(0, lerp(20, 42, k), 0), fov: 45 }) },
  { id: 'reveal', t0: tAnswer, t1: S(14), kind: 'jaya', ice: 0.55, cam: (k) => ({ pos: V(lerp(-120, -85, k), lerp(72, 66, k), lerp(150, 120, k)), tgt: V(0, 42, 0), fov: 45 }) },
  // twist: the ice is disappearing
  { id: 'y1988', t0: S(14), t1: tShrink, kind: 'jaya', ice: 1, cam: (k) => ({ pos: V(lerp(-70, -50, k), lerp(90, 86, k), lerp(115, 100, k)), tgt: V(0, 44, 0), fov: 45 }) },
  { id: 'shrink', t0: tShrink, t1: tFields, kind: 'jaya', ice: iceAt, cam: (k) => ({ pos: V(lerp(-50, -30, k), lerp(86, 82, k), lerp(100, 90, k)), tgt: V(0, 44, 0), fov: 45 }) },
  { id: 'fields', t0: tFields, t1: tTooSmall, kind: 'jaya', ice: 0.1, cam: (k) => ({ pos: V(-30, 82, 90), tgt: V(0, 44, 0), fov: 45 }) },
  { id: 'patches', t0: tTooSmall, t1: tVen, kind: 'jaya', ice: (t) => lerp(0.1, 0.07, smoothstep(tTooSmall, tVen, t)), cam: (k) => ({ pos: V(lerp(-40, -28, k), lerp(70, 64, k), lerp(60, 48, k)), tgt: V(0, 46, 0), fov: 45 }) },
  { id: 'ven', t0: tVen, t1: S(17), kind: 'globe', g: (t, k) => ({ spin: face(lerp(-71, 137, easeInOut(smoothstep(tIndoNext - 0.6, tIndoNext + 0.8, t)))), cam: { pos: V(0, 6, 30), tgt: V(0, 0, 0), fov: 45 }, markers: t < tIndoNext ? ['venezuela'] : ['papua'] }) },
  // wrap-up + teaser
  { id: 'hero', t0: S(17), t1: sn(17, 1).start, kind: 'jaya', ice: 0.08, warm: 1, cam: (k) => ({ pos: V(lerp(-160, -120, k), lerp(70, 64, k), lerp(-60, -30, k)), tgt: V(0, 40, 0), fov: 45 }) },
  { id: 'notnorth', t0: sn(17, 1).start, t1: sn(17, 2).start, kind: 'world', snow: 1, cover: 1, wt: () => 4, fadeOut: true, cam: (k) => snowTown(k) },
  { id: 'vanish', t0: sn(17, 2).start, t1: tTeaser, kind: 'jaya', ice: (t) => lerp(0.08, 0.0, smoothstep(sn(17, 2).start, tTeaser, t)), warm: 1, cam: (k) => ({ pos: V(lerp(-60, -35, k), lerp(78, 72, k), lerp(85, 70, k)), tgt: V(0, 45, 0), fov: 45 }) },
  { id: 'teaser', t0: tTeaser, t1: DURATION + 1, kind: 'world', life: 'none', wt: (t) => lerp(44, 49, smoothstep(tTeaser, END, t)), tint: 'blue', cam: (k) => ({ pos: V(lerp(95, 70, k), lerp(58, 50, k), lerp(-35, -10, k)), tgt: V(-5, 2, 90), fov: 52 }) },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
const val = (v, t) => (typeof v === 'function' ? v(t) : v ?? 0);
const camShake = (t, a) => V(a * Math.sin(t * 37.1), a * Math.sin(t * 43.3 + 1), a * Math.sin(t * 29.3 + 2) * 0.5);

// ------------------------------------------------------------------ render
function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  let scene, c, g = null;
  world.wind = 0; world.snow = 0; world.snowCover = 0;
  if (shot.kind === 'globe') {
    g = shot.g(t, k);
    globe.update(t, g.spin, g);
    c = g.cam;
    const z = g.zoom ?? 1.65;
    c = { ...c, pos: c.tgt.clone().add(c.pos.clone().sub(c.tgt).multiplyScalar(z)) };
    scene = globe.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.snow = val(shot.snow, t);
    world.snowCover = val(shot.cover, t);
    world.lifeMode = shot.life || (world.snow > 0.3 ? 'snow' : 'calm');
    scene = world.scene;
  } else if (shot.kind === 'jaya' || shot.kind === 'dieng') {
    const m = shot.kind === 'jaya' ? jaya : dieng;
    c = shot.cam(k);
    m.update(t, { ice: val(shot.ice, t), frost: val(shot.frost, t), warm: shot.warm || 0, climber: shot.climb ? shot.climb(t) : undefined });
    scene = m.scene;
  } else if (shot.kind === 'beams') {
    c = shot.cam(k);
    beams.update(t, { left: shot.left, right: shot.right, units: shot.units(t) });
    scene = beams.scene;
  } else if (shot.kind === 'orbit') {
    const a = shot.a(t);
    orbit.update(t, a, t * 2);
    if (shot.follow) { const e = orbit.holder.position; c = { pos: e.clone().add(V(-6, 3, 14)), tgt: e.clone(), fov: 45 }; }
    else c = shot.cam(k);
    scene = orbit.scene;
  } else if (shot.kind === 'sawah') {
    c = shot.cam(k);
    sawah.update(t, val(shot.snow, t), size.h / (2 * Math.tan(rad(c.fov) / 2)));
    scene = sawah.scene;
  }
  const sh = camShake(t, shot.glitch ? 0.3 : 0);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(shot.wt(t, k), camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot, g);
}

const fmt1 = (x) => x.toFixed(x < 1 ? 2 : 1).replace('.', ',');
function overlays(t, shot, g) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  // temperature
  let temp = null, tu = '';
  if (id === 'city') { temp = -2; tu = 'KOTAMU, PAGI INI'; }
  if (id === 'tropic') { temp = 31; tu = 'KENYATAANNYA'; }
  if (id === 'winter') { temp = Math.round(lerp(30, 0, smoothstep(sn(8, 1).start - 0.5, sn(8, 1).start + 1.5, t))); tu = 'MUSIM DINGIN'; }
  show('temp', temp !== null ? 1 : 0);
  if (temp !== null) { $('tempV').textContent = `${temp}°C`; $('tempV').style.color = temp <= 0 ? '#9fdcff' : '#ffb347'; $('tempU').textContent = tu; }
  // open loop pill
  show('pill', t > S(3) - 0.6 && t < tAnswer + 3.2 && t < END ? 1 : 0);
  $('pill').className = 'ov' + (t >= tAnswer ? ' done' : '');
  $('pill').textContent = t >= tAnswer ? 'TERJAWAB: PUNCAK JAYA, PAPUA' : 'DI MANA SALJU INDONESIA?';
  // impact cards
  const cardsOn = t >= S(9) && t < S(10);
  show('cards', cardsOn ? 1 : 0);
  [[S(9), 'cd1'], [sn(9, 1).start, 'cd2'], [tMos, 'cd3']].forEach(([ta, idc]) => { const o = smoothstep(ta - 0.1, ta + 0.2, t); $(idc).style.opacity = o; $(idc).style.transform = `scale(${0.7 + 0.3 * o})`; });
  show('poll', pop(t, S(10) + 0.1, tBack, 0.25, 0.25));
  // altitude thermometer
  const thOn = id === 'lapse' || id === 'dieng' || id === 'frost' || id === 'rise' || (id === 'reveal' && t < tAnswer + 0.2);
  show('thermo', thOn ? 1 : 0);
  if (thOn) {
    let alt = 0;
    if (id === 'lapse') alt = 4884 * smoothstep(sn(11, 1).start - 0.2, E(11), t);
    else if (id === 'dieng' || id === 'frost') alt = 2000;
    else alt = lerp(2000, 4884, smoothstep(S(13), tAnswer + 0.5, t));
    const deg = id === 'frost' ? -2 : 30 - 6.5 * (alt / 1000);
    $('thAlt').textContent = `${Math.round(alt).toLocaleString('id-ID')} m`;
    $('thDeg').textContent = `${Math.round(deg)}°C`;
    $('thDeg').style.color = deg <= 0 ? '#9fdcff' : '#ffe14d';
    $('thermo').querySelector('.s:last-child').textContent = id === 'frost' ? 'suhu permukaan rumput (BMKG)' : '±6°C lebih dingin / 1.000 m';
  }
  // glacier counter
  const glOn = id === 'y1988' || id === 'shrink';
  show('glacier', glOn ? 1 : 0);
  if (glOn) {
    const ice = id === 'y1988' ? 1 : iceAt(t);
    const area = lerp(4.3, 0.09, (1 - ice) / 0.9);
    $('glY').textContent = id === 'y1988' ? '1988' : String(yearAt(t));
    $('glA').textContent = `±${fmt1(area)} km² es`;
    $('glB').style.width = `${(area / 4.3) * 100}%`;
  }
  const fOn = id === 'fields';
  show('fields', fOn ? 1 : 0); show('fieldsT', fOn ? 1 : 0);
  if (fOn) [...$('fields').children].forEach((d, i) => { d.style.opacity = smoothstep(tFields + i * 0.1, tFields + i * 0.1 + 0.2, t); });
  show('blurNote', id === 'hidden' ? 1 : 0);
  show('teaser', pop(t, tTeaser + 0.2, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', id === 'beamL' || id === 'beamR' || id === 'orbit' || id === 'orbitZoom' || id === 'shift' || id === 'back' || id === 'lapse' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  // looks
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.blur) filter = 'blur(10px) brightness(0.8)';
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  if (shot.fadeOut) filter = `saturate(${lerp(1, 0.2, k)}) brightness(${lerp(1, 0.75, k)})`;
  renderer.domElement.style.filter = filter;
  $('tint').style.background = shot.tint === 'blue' ? 'rgba(40,110,220,0.35)' : 'transparent';
  show('tint', shot.tint ? 1 : 0);
  let fl = 0;
  for (const s of [0.6, 1.15, 1.7, S(2), tAnswer, tTeaser]) if (t >= s && t < s + 0.15) fl = Math.max(fl, 0.8 * (1 - (t - s) / 0.15));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  // tags
  if (id === 'city' && world.anchors.monument) tag('mon', 'MONAS BERSALJU?', world.anchors.monument, 'blue', smoothstep(3.6, 4.0, t));
  if (id === 'mosq') tag('kid', 'ANAK-ANAK MAIN SALJU', world.life.anchors.plaza, 'blue', smoothstep(tMos + 1.2, tMos + 1.5, t));
  if (id === 'harvest') tag('farm', 'PETANI', sawah.anchors.farmer, 'yellow', smoothstep(shot.t0 + 0.4, shot.t0 + 0.7, t));
  if (id === 'hidden') tag('q', '???', V(0, 62, 0), 'yellow big', 1);
  if (id === 'where') tag('w', 'DI MANA?', globe.markerPos('indo', 1.5), 'red big', smoothstep(shot.t0 + 0.3, shot.t0 + 0.6, t));
  if (id === 'rays') tag('sun', 'SUDUT SINAR MATAHARI', globe.sun.position.clone().multiplyScalar(0.11), 'yellow', pop(t, sn(3, 1).start, shot.t1));
  if (id === 'equator') tag('eq', 'KHATULISTIWA', globe.markerPos('indo', 1), 'red', 1);
  if (id === 'beamL') { tag('bl', 'KHATULISTIWA: TEGAK LURUS', beams.anchors.left, 'yellow', 1); tag('bl2', 'ENERGI TERKUMPUL → PANAS', V(-18, 1, 8), 'red', smoothstep(sn(4, 2).start, sn(4, 2).start + 0.3, t)); }
  if (id === 'beamR') { tag('br', 'JEPANG/EROPA: MIRING', beams.anchors.right, 'blue', smoothstep(S(5) + 0.4, S(5) + 0.7, t)); tag('br2', 'ENERGI TERSEBAR → DINGIN', V(24, 1, 8), 'blue', smoothstep(sn(5, 1).start, sn(5, 1).start + 0.3, t)); }
  if (id === 'orbit') tag('tilt', 'SUMBU MIRING 23,4°', orbit.anchors.earth, 'yellow', 1);
  if (id === 'orbitZoom') tag('rk', t < sn(6, 3).start ? 'INDONESIA: PERUBAHAN KECIL' : 'HANYA HUJAN & KEMARAU', orbit.anchors.earth.clone().add(V(0, -1.5, 0)), 'red', 1);
  if (id === 'shift') { tag('id', 'INDONESIA DIGESER KE UTARA', V(0, -12, 0), 'yellow', smoothstep(S(7) + 0.8, S(7) + 1.1, t)); tag('jp', 'JEPANG', globe.markerPos('tokyo'), '', 1); }
  if (id === 'back') tag('bk', 'TIDAK PERLU PINDAH…', V(0, -12, 0), 'yellow big', smoothstep(tBack + 0.3, tBack + 0.6, t));
  if (id === 'lapse') tag('cl', 'NAIK GUNUNG', jaya.climber.position.clone().add(V(0, 4, 0)), 'red', 1);
  if (id === 'dieng' || id === 'frost') tag('dg', id === 'frost' ? 'EMBUN UPAS: EMBUN MEMBEKU' : 'DATARAN TINGGI DIENG ±2.000 m', V(0, 32, 0), id === 'frost' ? 'blue big' : 'yellow', 1);
  if (id === 'reveal') tag('pj', 'PUNCAK JAYA, PAPUA · 4.884 m', jaya.summit.clone().add(V(0, 8, 0)), 'green big', smoothstep(tAnswer + 0.2, tAnswer + 0.5, t));
  if (id === 'reveal') tag('gl', 'GLETSER TROPIS', jaya.summit.clone().add(V(-12, 2, 10)), 'blue', smoothstep(sn(13, 2).start, sn(13, 2).start + 0.3, t));
  if (id === 'patches') tag('ps', 'TERLALU KECIL UNTUK MENGALIR', jaya.summit.clone().add(V(0, 6, 0)), 'red', smoothstep(tTooSmall + 0.3, tTooSmall + 0.6, t));
  if (id === 'ven') {
    if (t < tIndoNext) tag('ve', 'VENEZUELA · 2024: GLETSER TERAKHIR HILANG', globe.markerPos('venezuela'), 'yellow', smoothstep(tVen + 0.3, tVen + 0.6, t));
    else tag('in', 'INDONESIA: BERIKUTNYA?', globe.markerPos('papua'), 'red big', smoothstep(tIndoNext + 0.6, tIndoNext + 0.9, t));
  }
  if (id === 'notnorth') tag('nn', 'BUKAN INI…', world.anchors.monument || V(0, 40, 100), '', 1);
  if (id === 'vanish') tag('vn', 'MENGHILANG', jaya.summit.clone().add(V(0, 6, 0)), 'red big', smoothstep(shot.t0 + 0.5, shot.t0 + 0.8, t));
}

// fields grid: 12 football pitches
$('fields').innerHTML = Array.from({ length: 12 }, () => '<div></div>').join('');

startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: [S(3), S(7), S(11), S(14), S(17)].map((x) => x - 0.4) });
window.EVENTS = {
  life: SHOTS.filter((s) => s.kind === 'world' || s.kind === 'sawah' || s.kind === 'bus' || s.kind === 'dieng').map((s) => [s.t0, s.t1, s.kind === 'world' ? (s.life || (s.snow ? 'snow' : 'calm')) : s.kind]),
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], snow: tSnowStart, answer: tAnswer, back: tBack, frost: tFrost, shrink: tShrink, fields: tFields, ven: tVen, indoNext: tIndoNext,
  teaser: tTeaser, end: END, poll: S(10), beams: sn(4, 1).start, orbit: S(6), shift: S(7), lapse: S(11), mosq: tMos, hidden: sn(2, 1).start, vanish: sn(17, 2).start,
  chapters: [S(3), S(7), S(11), S(14), S(17)].map((x) => x - 0.4), shots: SHOTS.map((s) => s.t0),
};
for (const t of [0.3, 0.9, 1.4, 8, 20, 30, 40, 48, 62, 66, 76, 100, 105, 112, 120, 150, 170]) renderAt(t);
renderAt(0);
