// KALAU KAMU… Episode 2: "Kalau kamu tersambar petir".
// ~90% of people struck survive (CDC/NWS); a bolt heats air to ~50,000 °F (~27,800 °C), several times the Sun's surface;
// only ~3-5% of injuries are direct strikes, side flashes ~20-30%; thunder: count seconds / 3 = km; wait 30 min after
// the last thunder; victims carry no charge — give CPR. Bogor & Depok among Indonesia's most lightning-prone areas
// (BMKG); 20,731 strikes recorded around Bogor on 27 Feb 2012.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../../src/util.js';
import { W, H, $, show, pop, createRenderer, loadTiming, captions, tagger, startPlayer } from '../../src/kit.js';
import { Globe } from '../../src/globe.js';
import { World } from '../../src/world.js';
import { StormScene } from '../../src/storm.js';

const BASE = './episodes/k2/';
const KEY = /^(kilatan\.|Ratusan|juta|volt|petir\.|sembilan|sepuluh|selamat\.|berbahaya\.|tujuh|ribu|Celsius\.|Matahari\.|meledak\.|guntur\.|tiga\.|kilometer\.|petir\.|Bogor|Depok|dua|puluh|kali\.|singkat,|kulit,|jantung\.|berhenti|Lichtenberg,|tanah,|pohon|bola|perahu,|mobil|logam\.|menit|listrik\.|pijat|nyawa\.|komentar\.|Palung|Jawa\.)$/i;

const stage = $('stage');
const { renderer, size } = createRenderer(stage);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
const tag = tagger($('tags'), camera);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

const [rings, T] = await Promise.all([(await fetch('./episodes/ep1/assets/land.json')).json(), loadTiming(BASE + 'assets/timing.json')]);
const { S, E, wT, sentence: sn, CAPS } = T;
const globe = new Globe(rings);
globe.addMarker('bogor', -6.6, 106.8, 0xffd23a);
globe.addMarker('depok', -6.4, 106.82, 0xff8a00);
const storm = new StormScene();
const world = new World({ life: true });
world.noQuake = true;
const caption = captions($('cap'), CAPS, KEY);
const face = (lon) => -rad(lon);

// ------------------------------------------------------------------ timeline
const END = E(15) + 0.4;
const DURATION = Math.ceil(END + 2.6);
const tAnswer = S(10) + 0.2;                       // the dangerous habit: sheltering under a tree
const STRIKES = [[0.05, 'tree'], [1.75, 'body'], [S(2) - 0.2, 'far'], [S(3) + 0.4, 'tree'], [sn(4, 0).start, 'pitch'], [sn(4, 2).start, 'far'], [S(6) + 0.3, 'body'], [S(9) + 0.2, 'tree'], [sn(9, 1).start, 'tree'], [sn(10, 2).start, 'tree'], [sn(10, 2).start + 0.15, 'side'], [S(11) + 0.6, 'pitch'], [S(11) + 4.5, 'far'], [S(12) + 0.4, 'far']];
const strikesAt = (t) => { const o = {}; for (const [t0, n] of STRIKES) { const k = (t - t0) / 0.6; if (k >= 0 && k <= 1) o[n] = k; } return o; };
const ringsAt = (t) => { for (const [t0, n] of STRIKES) if (n === 'tree' && t >= t0 && t < t0 + 1.4) return (t - t0) / 1.4; return -1; };
const wide = (k) => ({ pos: V(lerp(-30, -24, k), lerp(14, 12, k), lerp(58, 52, k)), tgt: V(0, 8, 0), fov: 52 });
const treeCam = (k) => ({ pos: V(lerp(10, 8, k), lerp(4, 3.5, k), lerp(14, 12, k)), tgt: V(0, 6, 0), fov: 52 });
const under = (k) => ({ pos: V(lerp(6, 5, k), 2.2, lerp(6, 5.4, k)), tgt: V(0, 2, 1), fov: 50 });
const victimCam = (k) => ({ pos: V(lerp(7.5, 7, k), lerp(3, 2.6, k), lerp(7, 6.4, k)), tgt: V(4.6, 1, 3.8), fov: 45 });
const gJava = (k) => ({ spin: face(107) + k * 0.08, cam: { pos: V(0, 0, 30), tgt: V(0, -1, 0), fov: 45 }, zoom: lerp(1.0, 0.85, k) });
const SHOTS = [
  { id: 'm1', t0: 0, t1: 0.6, kind: 'storm', cam: treeCam, glitch: true },
  { id: 'm2', t0: 0.6, t1: 1.15, kind: 'storm', o: () => ({ victim: true, skin: 1 }), cam: victimCam, glitch: true },
  { id: 'm3', t0: 1.15, t1: 1.7, kind: 'storm', cam: (k) => ({ pos: V(40, 4, 30), tgt: V(45, 2, 5), fov: 50 }), glitch: true },
  // hook
  { id: 'flash', t0: 1.7, t1: sn(1, 1).start, kind: 'storm', o: () => ({ victim: true }), cam: (k) => ({ pos: V(12, 20, 20), tgt: V(4, 2, 4), fov: 50 }) },
  { id: 'volts', t0: sn(1, 1).start, t1: sn(1, 2).start, kind: 'storm', o: (t) => ({ victim: true, skin: 1 - smoothstep(sn(1, 1).start, sn(1, 2).start, t) * 0.7 }), cam: victimCam },
  { id: 'hit', t0: sn(1, 2).start, t1: S(2), kind: 'storm', o: () => ({ victim: true }), cam: (k) => ({ pos: V(4.6, lerp(6, 4, k), 4.2), tgt: V(4.6, 0.8, 4), fov: 50 }) },
  { id: 'nine', t0: S(2), t1: sn(2, 1).start, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.5 }), cam: victimCam, big: 'nine' },
  { id: 'how', t0: sn(2, 1).start, t1: sn(2, 2).start, kind: 'storm', cam: wide },
  { id: 'habit', t0: sn(2, 2).start, t1: sn(2, 3).start, kind: 'storm', cam: under },
  { id: 'watch', t0: sn(2, 3).start, t1: S(3), kind: 'world', cam: (k) => ({ pos: V(-4, 3, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 }) },
  // 1. what lightning is
  { id: 'what', t0: S(3), t1: sn(3, 1).start, kind: 'storm', cam: (k) => ({ pos: V(lerp(-40, -34, k), lerp(30, 26, k), lerp(70, 64, k)), tgt: V(-4, 30, -4), fov: 52 }) },
  { id: 'hot', t0: sn(3, 1).start, t1: sn(3, 2).start, kind: 'storm', cam: treeCam, big: 'hot' },
  { id: 'hot2', t0: sn(3, 2).start, t1: S(4), kind: 'storm', cam: (k) => ({ pos: V(lerp(-20, -16, k), lerp(6, 5, k), lerp(26, 22, k)), tgt: V(0, 12, 0), fov: 52 }), big: 'hot' },
  { id: 'boom', t0: S(4), t1: sn(4, 2).start, kind: 'storm', cam: (k) => ({ pos: V(lerp(20, 16, k), 5, lerp(36, 30, k)), tgt: V(45, 6, 5), fov: 52 }) },
  { id: 'count', t0: sn(4, 2).start, t1: sn(4, 3).start, kind: 'storm', o: () => ({ farmerUp: true }), cam: (k) => ({ pos: V(-34, 3, 14), tgt: V(-60, 12, -110), fov: 52 }), count: true },
  { id: 'count2', t0: sn(4, 3).start, t1: S(5), kind: 'storm', o: () => ({ farmerUp: true }), cam: (k) => ({ pos: V(lerp(-46, -44, k), 2.4, lerp(10, 8, k)), tgt: V(-40, 2, 4), fov: 50 }), count: true },
  { id: 'indo', t0: S(5), t1: sn(5, 1).start, kind: 'world', storm: true, cam: (k) => ({ pos: V(lerp(115, 100, k), lerp(60, 52, k), lerp(20, 32, k)), tgt: V(55, 26, 110), fov: 52 }) },
  { id: 'bogor', t0: sn(5, 1).start, t1: sn(5, 2).start, kind: 'globe', g: gJava, markers: ['bogor', 'depok'] },
  { id: 'record', t0: sn(5, 2).start, t1: sn(5, 2).start + 3.6, kind: 'world', storm: true, big: 'record', cam: (k) => ({ pos: V(-4, 3, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 }) },
  // 2. inside the body
  { id: 'record2', t0: sn(5, 2).start + 3.6, t1: S(6), kind: 'storm', big: 'record', cam: wide },
  { id: 'body', t0: S(6), t1: sn(6, 1).start, kind: 'storm', o: () => ({ victim: true, skin: 0.8 }), cam: victimCam },
  { id: 'short', t0: sn(6, 1).start, t1: sn(6, 2).start, kind: 'storm', o: (t) => ({ victim: true, skin: Math.sin(t * 30) > 0 ? 1 : 0.3 }), cam: (k) => ({ pos: V(4.6, lerp(5, 3.5, k), lerp(5.5, 5, k)), tgt: V(4.6, 0.8, 4), fov: 50 }) },
  { id: 'skin', t0: sn(6, 2).start, t1: sn(6, 3).start, kind: 'storm', o: () => ({ victim: true, skin: 1 }), cam: (k) => ({ pos: V(lerp(3.2, 3.6, k), 1.7, lerp(5.6, 5.2, k)), tgt: V(4.6, 0.8, 4), fov: 45 }) },
  { id: 'survive', t0: sn(6, 3).start, t1: S(7), kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.5 }), cam: victimCam },
  { id: 'heart', t0: S(7), t1: sn(7, 2).start, kind: 'storm', o: () => ({ victim: true, rain: 0.6 }), cam: (k) => ({ pos: V(4.6, lerp(4, 3, k), 5), tgt: V(4.6, 0.8, 4), fov: 50 }), ecg: true },
  { id: 'heart2', t0: sn(7, 2).start, t1: S(8), kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.5 }), cam: (k) => ({ pos: V(lerp(2, 2.6, k), 2.4, lerp(6, 6.4, k)), tgt: V(4.6, 0.9, 3.8), fov: 48 }), ecg: true },
  { id: 'burns', t0: S(8), t1: S(8) + 3.9, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.3 }), cam: (k) => ({ pos: V(lerp(8, 7, k), 3, lerp(2, 2.6, k)), tgt: V(4.6, 1, 3.8), fov: 48 }) },
  { id: 'burns2', t0: S(8) + 3.9, t1: sn(8, 1).start, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.3, skin: 0.4 }), cam: victimCam },
  { id: 'lich', t0: sn(8, 1).start, t1: S(9), kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.2 }), cam: victimCam, lich: true },
  // 3. how people get hit + the dangerous habit
  { id: 'direct', t0: S(9), t1: sn(9, 1).start, kind: 'storm', cam: treeCam },
  { id: 'ground', t0: sn(9, 1).start, t1: S(10), kind: 'storm', cam: (k) => ({ pos: V(lerp(0, 4, k), lerp(30, 26, k), lerp(26, 22, k)), tgt: V(0, 0, 0), fov: 50 }) },
  { id: 'tree', t0: S(10), t1: sn(10, 1).start, kind: 'storm', cam: under },
  { id: 'shelter', t0: sn(10, 1).start, t1: sn(10, 2).start, kind: 'storm', cam: (k) => ({ pos: V(lerp(-6, -5, k), 1.8, lerp(6, 5, k)), tgt: V(1, 2, 1), fov: 50 }) },
  { id: 'side', t0: sn(10, 2).start, t1: S(11), kind: 'storm', o: (t) => ({ after: t > sn(10, 2).start + 0.3 }), cam: treeCam },
  { id: 'farmer', t0: S(11), t1: S(11) + 3.2, kind: 'storm', cam: (k) => ({ pos: V(lerp(-32, -30, k), 3, lerp(14, 12, k)), tgt: V(-40, 1.5, 4), fov: 50 }) },
  { id: 'football', t0: S(11) + 3.2, t1: S(11) + 6.2, kind: 'storm', cam: (k) => ({ pos: V(lerp(30, 34, k), 4, lerp(26, 24, k)), tgt: V(45, 2, 5), fov: 50 }) },
  { id: 'angler', t0: S(11) + 6.2, t1: S(12), kind: 'storm', cam: (k) => ({ pos: V(lerp(14, 12, k), 3, lerp(-44, -46, k)), tgt: V(4, 1.2, -58), fov: 50 }) },
  // 4. what to do
  { id: 'todo', t0: S(12), t1: sn(12, 1).start, kind: 'storm', cam: wide, safe: 1 },
  { id: 'inside', t0: sn(12, 1).start, t1: sn(12, 2).start, kind: 'storm', cam: (k) => ({ pos: V(lerp(-14, -12, k), 4, lerp(44, 40, k)), tgt: V(2, 2, 30), fov: 50 }), safe: 1 },
  { id: 'away', t0: sn(12, 2).start, t1: sn(12, 3).start, kind: 'storm', cam: wide, safe: 2 },
  { id: 'wait', t0: sn(12, 3).start, t1: S(13), kind: 'world', storm: true, cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }), safe: 3 },
  { id: 'help', t0: S(13), t1: sn(13, 2).start, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.2 }), cam: victimCam, safe: 4 },
  { id: 'cpr', t0: sn(13, 2).start, t1: sn(13, 3).start, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.1 }), cam: (k) => ({ pos: V(lerp(6.5, 6, k), 2, lerp(1.6, 2.2, k)), tgt: V(4.8, 1, 3.6), fov: 45 }), ecg: 'cpr' },
  // 5. answer
  { id: 'cpr2', t0: sn(13, 3).start, t1: S(14), kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.05 }), cam: (k) => ({ pos: V(lerp(9, 10, k), lerp(4, 5, k), lerp(9, 10, k)), tgt: V(4.8, 1, 3.6), fov: 48 }), ecg: 'cpr' },
  { id: 'why', t0: S(14), t1: sn(14, 1).start, kind: 'storm', o: () => ({ victim: true, helper: true, rain: 0.1 }), cam: victimCam },
  { id: 'reasons', t0: sn(14, 1).start, t1: sn(14, 2).start, kind: 'storm', o: () => ({ rain: 0.1 }), cam: wide },
  { id: 'best', t0: sn(14, 2).start, t1: S(15), kind: 'world', cam: (k) => ({ pos: V(lerp(-6, -4, k), 4, lerp(44, 48, k)), tgt: V(0, 2.4, 110), fov: 54 }) },
  { id: 'cta', t0: S(15), t1: sn(15, 2).start, kind: 'world', storm: true, cam: (k) => ({ pos: V(-4, 3, lerp(74, 70, k)), tgt: V(0, lerp(26, 34, k), -60), fov: 56 }) },
  { id: 'teaser', t0: sn(15, 2).start, t1: DURATION + 1, kind: 'storm', deep: true, o: () => ({ rain: 0 }), cam: (k) => ({ pos: V(0, lerp(30, 4, k), lerp(-30, -50, k)), tgt: V(0, 0, -60), fov: 55 }) },
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
    globe.update(t, g.spin, { markers: shot.markers || [], clouds: 0.6 });
    c = { ...g.cam, pos: g.cam.tgt.clone().add(g.cam.pos.clone().sub(g.cam.tgt).multiplyScalar(g.zoom ?? 1.65)) };
    scene = globe.scene;
  } else if (shot.kind === 'storm') {
    c = shot.cam(k);
    const o = { strikes: strikesAt(t), rings: ringsAt(t), cx: c.tgt.x, cz: c.tgt.z, ...(shot.o ? shot.o(t) : {}) };
    storm.update(t, o);
    scene = storm.scene;
  } else if (shot.kind === 'world') {
    c = shot.cam(k);
    world.levelOverride = 0; world.moodT = 4; world.lifeMode = shot.storm ? 'storm' : 'calm'; world.jumpP = null; world.freezeT = null;
    scene = world.scene;
  }
  const fl = shot.kind === 'storm' ? storm.flash || 0 : 0;
  camera.position.copy(c.pos).add(camShake(t, (shot.glitch ? 0.3 : 0) + fl * 0.15));
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt);
  if (shot.kind === 'world') world.update(4, camera, size.h);
  renderer.render(scene, camera);
  overlays(t, shot);
}

const ecgPath = (t, mode) => {
  let d = '';
  for (let i = 0; i <= 180; i++) {
    const tt = t - (180 - i) * 0.012;
    let y = 0;
    const flat = mode === true ? tt > S(7) + 2.6 : mode === 'cpr' ? tt < sn(13, 3).start : false;
    if (!flat) { const p = (tt * 1.2) % 1; y = p < 0.04 ? -90 * Math.sin(p / 0.04 * Math.PI) : p < 0.08 ? 30 * Math.sin((p - 0.04) / 0.04 * Math.PI) : 0; }
    d += `${i ? 'L' : 'M'}${i * 5},${130 + y + Math.sin(tt * 40) * 1.5}`;
  }
  return d;
};
function overlays(t, shot) {
  caption(t, t > END);
  tag.hideAll();
  const id = shot.id;
  const q = t > sn(2, 2).start + 0.3 && t < tAnswer + 4;
  show('pill', q && t < END ? 1 : 0);
  const done = t >= tAnswer + 3;
  $('pill').className = 'ov' + (done ? ' done' : '');
  $('pill').textContent = done ? 'TERJAWAB: BERTEDUH DI BAWAH POHON' : 'KEBIASAAN BERBAHAYA SAAT HUJAN? (nanti)';
  const bg = shot.big ? pop(t, shot.t0 + 0.3, shot.t1, 0.3, 0.2) : 0;
  show('big', bg);
  if (bg) {
    if (shot.big === 'nine') { $('bA').textContent = 'TERSAMBAR PETIR'; $('bV').textContent = '9 dari 10'; $('bU').textContent = 'selamat (CDC/NWS)'; }
    if (shot.big === 'hot') { $('bA').textContent = 'SUHU PETIR'; $('bV').textContent = '±27.000°C'; $('bU').textContent = '±5× permukaan Matahari'; }
    if (shot.big === 'record') { $('bA').textContent = 'BOGOR · 27 FEB 2012'; $('bV').textContent = `${Math.round(20731 * smoothstep(shot.t0 + 0.4, shot.t0 + 3, t)).toLocaleString('id-ID')}`; $('bU').textContent = 'sambaran petir dalam sehari'; }
  }
  const cn = shot.count ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('count', cn);
  if (cn) { const sec = Math.min(9, Math.floor((t - shot.t0) * 3)); $('cV').textContent = `${sec} detik`; $('cU').textContent = sec >= 9 ? '÷ 3 = ±3 km' : '÷ 3 = jarak (km)'; }
  const ec = shot.ecg ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0;
  show('ecg', ec);
  if (ec) { $('eP').setAttribute('d', ecgPath(t, shot.ecg)); const flat = shot.ecg === true ? t > S(7) + 2.6 : t < sn(13, 3).start; $('eM').textContent = flat ? 'BERHENTI!' : 'berdetak lagi'; $('eM').style.color = flat ? '#ff5a48' : '#3aff7a'; }
  show('lich', shot.lich ? pop(t, shot.t0 + 0.2, shot.t1, 0.3, 0.2) : 0);
  const sf = shot.safe ? pop(t, S(12) + 0.3, sn(13, 2).start, 0.3, 0.2) : 0;
  show('safe', sf);
  if (sf) ['s1', 's2', 's3', 's4'].forEach((s, i) => ($(s).style.opacity = shot.safe > i ? 1 : 0.15));
  show('teaser', pop(t, sn(15, 3).start, END, 0.3, 0.2));
  show('end', smoothstep(END, END + 0.4, t));
  show('note', shot.kind === 'globe' ? 0.9 : 0);
  show('scan', shot.glitch ? 0.8 : 0);
  let filter = 'none';
  if (shot.glitch) filter = 'contrast(1.25) saturate(1.3)';
  if (shot.kind === 'world' && shot.storm) filter = `brightness(${0.45 + (Math.sin(t * 7.3) > 0.97 ? 1.2 : 0)}) saturate(0.5)`;
  if (shot.deep) filter = `brightness(${lerp(0.6, 0.1, k(t, shot))}) hue-rotate(${lerp(0, 40, k(t, shot))}deg)`;
  renderer.domElement.style.filter = filter;
  show('tint', 0);
  let fl = 0;
  for (const [s] of STRIKES) if (t >= s && t < s + 0.12) fl = Math.max(fl, 0.55 * (1 - (t - s) / 0.12));
  show('flash', fl);
  show('fade', 1 - smoothstep(0, 0.12, t));

  const tin = (a = 0.3) => smoothstep(shot.t0 + a, shot.t0 + a + 0.3, t);
  const A = storm.anchors;
  if (id === 'volts') tag('vt', 'RATUSAN JUTA VOLT', A.victim, 'yellow', tin(0.2));
  if (id === 'habit') tag('hb', 'KEBIASAAN BERBAHAYA?', A.shelter, 'red', tin(0.3));
  if (id === 'what') tag('wh', 'LONCATAN LISTRIK AWAN → TANAH', A.tree.clone().add(V(-4, 18, -4)), 'yellow', tin(0.3));
  if (id === 'boom') tag('bm', 'UDARA MEMUAI → GUNTUR', A.pitch.clone().add(V(0, 8, 0)), 'yellow', tin(0.3));
  if (id === 'bogor') { tag('bg', 'BOGOR', globe.markerPos('bogor', 1), 'yellow', tin(0.3)); tag('dp', 'DEPOK', globe.markerPos('depok', 2.5), '', tin(0.6)); }
  if (id === 'skin') tag('sk', 'ARUS LEWAT PERMUKAAN KULIT', A.victim, 'blue', tin(0.3));
  if (id === 'burns') tag('br', 'LUKA BAKAR · TELINGA BERDENGING', A.victim, 'yellow', tin(0.3));
  if (id === 'direct') tag('dr', 'SAMBARAN LANGSUNG: ±3–5% KASUS', A.tree, 'yellow', tin(0.3));
  if (id === 'ground') tag('gr', 'ARUS MERAMBAT DI TANAH', V(8, 1, 6), 'red', tin(0.3));
  if (id === 'shelter') tag('sh', 'BERTEDUH DI BAWAH POHON ❌', A.shelter, 'red big', tin(0.2));
  if (id === 'side') tag('sd', 'LISTRIK MELONCAT KE ORANG', A.shelter, 'red', tin(0.4));
  if (id === 'farmer') tag('fm', 'TITIK TERTINGGI DI SAWAH', A.farmer, 'red', tin(0.3));
  if (id === 'football') tag('fb', 'LAPANGAN TERBUKA', A.pitch, 'red', tin(0.3));
  if (id === 'angler') tag('an', 'DI ATAS AIR', A.boat, 'red', tin(0.3));
  if (id === 'inside') { tag('ic', 'MOBIL BERATAP LOGAM ✅', A.car, 'green', tin(0.3)); tag('ih', 'BANGUNAN ✅', A.house, 'green', tin(0.6)); }
  if (id === 'help') tag('hp', 'AMAN DISENTUH', A.victim, 'green', tin(0.6));
  if (id === 'cpr' || id === 'cpr2') tag('cp', 'PIJAT JANTUNG', A.victim, 'yellow', tin(0.3));
  if (id === 'cta') tag('ct', 'DAERAHMU SERING PETIR? 👇', V(0, 10, 0), 'yellow', smoothstep(sn(15, 1).start, sn(15, 1).start + 0.3, t));
}
const k = (t, s) => clamp((t - s.t0) / (s.t1 - s.t0));

const CH = [S(3), S(6), S(9), S(12), S(14)].map((x) => x - 0.4);
startPlayer({ renderAt, duration: DURATION, audioUrl: BASE + 'assets/soundtrack.mp3', chapters: CH });
window.EVENTS = {
  duration: DURATION, montage: [0, 0.6, 1.15, 1.7], end: END, answer: tAnswer + 3, strikes: STRIKES.map((s) => s[0]), teaser: sn(15, 3).start,
  flat: S(7) + 2.6, cprBack: sn(13, 3).start, count: [sn(4, 2).start, S(5)],
  chapters: CH, shots: SHOTS.map((s) => s.t0),
  life: SHOTS.filter((s) => s.t0 >= 1.7).map((s) => [s.t0, Math.min(s.t1, DURATION), s.kind === 'storm' ? (s.deep ? 'deep' : 'storm') : s.kind === 'world' ? (s.storm ? 'storm' : 'calm') : 'none']),
};
for (const t of [0.3, 0.9, 1.4, 3, 6, 8, 12, 16, 20, 23, 26, 31, 38, 44, 48, 51, 54, 58, 65, 69, 73, 77, 82, 86, 92, 98, 103, 107, 112, 115, 119, 124, 127, 130, 134, 137, 141, 144, 149, 155, 159, 163, 168, 172, 176, 180]) renderAt(t);
renderAt(0);
