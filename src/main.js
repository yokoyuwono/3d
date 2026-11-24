// Entry point: camera direction (shots), overlays, captions and the renderAt(t) API
// used by the offline renderer (tools/render.mjs).
import * as THREE from 'three';
import { clamp, easeInOut, kf, lerp, smoothstep } from './util.js';
import { World, terrainY } from './world.js';
import { Crust } from './crust.js';
import { seaParams, shakeAt, T_QUAKE, T_IMPACT, HILL } from './timeline.js';

const W = 1080, H = 1920, DURATION = 60;
const qs = new URLSearchParams(location.search);
const SCALE = parseFloat(qs.get('scale') || '1');

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(Math.round(W * SCALE), Math.round(H * SCALE), false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);

const world = new World();
const crust = new Crust();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);

// shoreline markers (dashed line at the normal shoreline) shown while the sea retreats
const dashes = new THREE.Group();
for (let x = -230; x <= 230; x += 8) {
  const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.25, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  d.position.set(x, terrainY(x, 0) + 0.25, 0);
  dashes.add(d);
}
world.scene.add(dashes);

// ------------------------------------------------------------------ shots
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const F = world.focus;
const HT = world.anchors.hilltop;
const SHOTS = [
  { t0: 0, t1: 8.4, cam: (t, k) => ({ pos: V(lerp(75, 22, k), lerp(95, 36, k), lerp(-210, -78, k)), tgt: V(lerp(0, -6, k), lerp(4, 9, k), lerp(100, 82, k)), fov: 52 }) },
  { t0: 8.4, t1: 17.3, scene: 'crust', cam: (t) => {
      const k = easeInOut(clamp((t - 8.4) / (T_QUAKE - 8.4)));
      const b = easeInOut(clamp((t - T_QUAKE - 0.1) / 0.7));
      const pos = V(lerp(12, 6, k), lerp(20, 2, k), lerp(240, 165, k)).lerp(V(8, 20, 225), b);
      const tgt = V(lerp(2, 5, k), lerp(-22, -17, k), 0).lerp(V(0, -16, 0), b);
      return { pos, tgt, fov: 50 };
    } },
  { t0: 17.3, t1: 23.3, cam: (t, k) => ({ pos: V(lerp(48, 40, k), lerp(52, 44, k), lerp(-5, 8, k)), tgt: V(-22, 4, lerp(90, 94, k)), fov: 54 }) },
  { t0: 23.3, t1: 26.6, cam: (t, k) => ({ pos: V(lerp(40, 34, k), lerp(120, 110, k), lerp(70, 55, k)), tgt: V(0, 0, lerp(-70, -80, k)), fov: 55 }) },
  { t0: 26.6, t1: 30.75, cam: (t, k) => ({ pos: V(lerp(14, 8, k), lerp(8, 6.5, k), lerp(24, 12, k)), tgt: V(0, 0.5, -130), fov: 54 }) },
  { t0: 30.75, t1: 36.0, cam: (t, k) => ({ pos: V(3, 4.2, lerp(-30, -45, k)), tgt: V(0, 5, -1200), fov: lerp(40, 13, easeInOut(clamp(k * 1.4))) }) },
  { t0: 36.0, t1: 39.4, cam: (t, k) => ({ pos: V(0, 7, lerp(14, 10, k)), tgt: V(0, lerp(8, 20, easeInOut(k)), -200), fov: 62 }) },
  { t0: 39.4, t1: 41.35, cam: (t, k) => ({ pos: V(lerp(-150, -135, k), lerp(85, 78, k), lerp(-300, -280, k)), tgt: V(lerp(-10, 0, k), 0, lerp(-20, 20, k)), fov: 50 }) },
  { t0: 41.35, t1: 45.6, cam: (t, k) => ({ pos: V(lerp(95, 62, k), lerp(58, 46, k), lerp(-35, 0, k)), tgt: V(-5, 2, lerp(85, 95, k)), fov: 52 }) },
  { t0: 45.6, t1: 48.95, cam: (t, k) => ({ pos: V(F.x - lerp(25, 20, k), F.g0 + lerp(9, 10, k), F.z - lerp(34, 28, k)), tgt: V(F.x - 1, F.g0 + 1.0, F.z), fov: 52 }) },
  { t0: 48.95, t1: 51.3, cam: (t, k) => ({ pos: V(lerp(-70, -45, k), lerp(75, 62, k), lerp(-95, -70, k)), tgt: V(0, 0, 100), fov: 54 }) },
  { t0: 51.3, t1: 55.65, flashback: true, cam: (t, k) => ({ pos: V(lerp(40, 34, k), lerp(120, 108, k), lerp(70, 52, k)), tgt: V(0, 0, lerp(-70, -82, k)), fov: 55 }) },
  { t0: 55.65, t1: 60.01, cam: (t, k) => {
      return { pos: V(HT.x - 8 + lerp(-8, 6, k), HT.y + lerp(10, 7, k), HT.z + lerp(50, 40, k)), tgt: V(lerp(-14, -4, k), 0, 70), fov: 58 };
    } },
];

// world time: the flashback replays the sea retreat (with a fast rewind first)
function worldTime(t) {
  if (t >= 51.3 && t < 55.65) {
    const r = t - 51.3;
    if (r < 0.5) return lerp(51.3, 24.2, easeInOut(r / 0.5));
    return 24.2 + (r - 0.5) * 1.25;
  }
  return t;
}

function shotAt(t) {
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s;
  return SHOTS[SHOTS.length - 1];
}

function camShake(t, amp) {
  return V(
    amp * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7) * 0.4),
    amp * (Math.sin(t * 43.3 + 1) * 0.6 + Math.sin(t * 71.9) * 0.4),
    amp * (Math.sin(t * 29.3 + 2) * 0.5),
  );
}

// ------------------------------------------------------------------ captions
let CAPS = [];
const KEY = /^(enam|puluh|detik\.|tanda,?|patah!|delapan|koma|sembilan\.|terburuk\.|mundur\.|fatal\.|tiga|meter,|jet\.|sungai\.|atap\.|surut,|tinggi\.|Sekarang\.|melihatnya\.)$/i;
async function loadCaptions() {
  const timing = await (await fetch('./assets/timing.json')).json();
  const chunks = [];
  for (const seg of timing) for (const s of seg.sentences) {
    const words = s.text.split(/\s+/);
    const wt = words.map((w) => w.length + 2 + (/[,.!?]$/.test(w) ? 4 : 0));
    const tot = wt.reduce((a, b) => a + b, 0);
    let acc = 0;
    const timed = words.map((w, i) => { const st = s.start + ((s.end - s.start) * acc) / tot; acc += wt[i]; return { w, st, en: s.start + ((s.end - s.start) * acc) / tot }; });
    let cur = [];
    timed.forEach((tw, i) => {
      cur.push(tw);
      const brk = /[,.!?]$/.test(tw.w) || cur.length >= 3 || i === timed.length - 1;
      if (brk) { chunks.push({ words: cur, st: cur[0].st, en: cur[cur.length - 1].en }); cur = []; }
    });
  }
  chunks.forEach((c, i) => { c.hold = i + 1 < chunks.length ? Math.min(chunks[i + 1].st, c.en + 0.45) : c.en + 0.6; });
  CAPS = chunks;
}
const capEl = document.getElementById('cap');
let capKey = '';
function updateCaptions(t) {
  const c = CAPS.find((c) => t >= c.st - 0.05 && t < c.hold);
  if (!c) { capEl.innerHTML = ''; capKey = ''; return; }
  const key = c.st + ':' + c.words.map((w) => (t >= w.st && t < w.en + 0.05 ? 1 : 0)).join('');
  if (key === capKey) return;
  capKey = key;
  capEl.innerHTML = c.words.map((w) => {
    const on = t >= w.st && t < w.en + 0.05;
    return `<span class="${on ? 'on' : KEY.test(w.w) ? 'key' : ''}">${w.w}</span>`;
  }).join(' ');
}

// ------------------------------------------------------------------ overlays
const $ = (id) => document.getElementById(id);
const show = (id, o) => { const e = $(id); e.style.opacity = clamp(o).toFixed(3); e.style.display = o > 0.001 ? '' : 'none'; };
const tagsEl = $('tags');
const tagPool = {};
function tag(name, text, p3, cls, opacity = 1, cam = camera) {
  let el = tagPool[name];
  if (!el) { el = tagPool[name] = document.createElement('div'); tagsEl.appendChild(el); }
  if (!p3 || opacity <= 0.001) { el.style.display = 'none'; return; }
  const v = p3.clone().project(cam);
  if (v.z > 1 || v.z < -1) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.className = 'tag ' + (cls || '');
  if (el.textContent !== text) el.textContent = text;
  el.style.left = ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px';
  el.style.top = ((-v.y * 0.5 + 0.5) * H - 30).toFixed(1) + 'px';
  el.style.opacity = clamp(opacity).toFixed(3);
}
const pop = (t, a, b, fi = 0.25, fo = 0.25) => smoothstep(a, a + fi, t) * (1 - smoothstep(b - fo, b, t));

function updateOverlays(t, wt, sp, shot) {
  // countdown
  const left = Math.max(0, Math.ceil(DURATION - t - 1e-6));
  $('tval').textContent = '00:' + String(left).padStart(2, '0');
  $('timer').classList.toggle('urgent', t > 30.75 && t < 58);
  $('tdot').style.opacity = (Math.sin(t * 6.28) > 0 ? 1 : 0.25).toString();
  show('timer', 1 - smoothstep(57.8, 58.2, t));
  show('quest', pop(t, 2.2, 23.2, 0.3, 0.3));

  // crust meter + magnitude
  const st = crust.stress(t);
  show('meter', pop(t, 9.0, T_QUAKE + 0.05, 0.4, 0.05));
  $('meterF').style.width = (st * 100).toFixed(1) + '%';
  $('meterV').textContent = Math.round(st * 100) + '%';
  const mag = pop(t, T_QUAKE + 0.05, 20.2, 0.05, 0.4);
  show('mag', mag);
  const ms = 1 + 0.6 * Math.exp(-(t - T_QUAKE) * 8);
  const jx = shakeAt(t) * 10 * Math.sin(t * 50), jy = shakeAt(t) * 8 * Math.sin(t * 63);
  $('mag').style.transform = `translate(${jx}px, ${jy}px) scale(${ms})`;

  // tsunami panel
  const wv = pop(t, 31.6, 40.75, 0.3, 0.1);
  show('wave', wv);
  if (wv > 0) {
    const dist = Math.max(0, -sp.F);
    $('wDist').textContent = dist >= 1000 ? (dist / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(dist) + ' m';
    $('wH').textContent = Math.round(sp.A) + ' m';
    $('wEta').textContent = Math.max(0, T_IMPACT - t).toFixed(1).replace('.', ',') + ' dtk';
  }
  // flood gauge
  const gv = pop(t, 41.6, 48.95, 0.3, 0.15);
  show('gauge', gv);
  if (gv > 0) {
    const depth = Math.max(0, sp.B - F.g0);
    $('gV').textContent = depth.toFixed(1).replace('.', ',') + ' m';
    $('gL').style.height = clamp(depth / 12) * 100 + '%';
  }
  // flashback
  const fb = shot.flashback ? 1 : 0;
  show('rewind', fb * (0.6 + 0.4 * (Math.sin(t * 12) > 0 ? 1 : 0)));
  show('scan', fb * 0.9);
  show('sign', pop(t, 51.9, 55.6, 0.2, 0.2));
  $('sign').style.transform = `scale(${1 + 0.25 * Math.exp(-(t - 51.9) * 9)})`;
  renderer.domElement.style.filter = fb ? 'sepia(0.85) contrast(1.15) brightness(0.95) saturate(1.2)' : 'none';

  // end card
  show('end', smoothstep(58.0, 58.35, t));
  show('cap', 1 - smoothstep(58.0, 58.2, t));

  // flashes / fades
  let flash = 0;
  flash = Math.max(flash, Math.exp(-Math.max(0, t - T_QUAKE) * 7) * (t >= T_QUAKE ? 0.9 : 0));
  flash = Math.max(flash, t >= T_IMPACT ? 0.85 * Math.exp(-(t - T_IMPACT) * 5) : 0);
  flash = Math.max(flash, t >= 51.3 && t < 51.6 ? 0.7 * (1 - (t - 51.3) / 0.3) : 0);
  show('flash', flash);
  show('fade', Math.max(1 - smoothstep(0, 0.35, t), 0));

  // 3D-anchored tags
  const inCrust = shot.scene === 'crust';
  const ca = crust.anchors;
  const ct = inCrust ? pop(t, 9.4, T_QUAKE, 0.4, 0.2) : 0;
  tag('ocean', 'LEMPENG SAMUDRA', ca.ocean, '', ct);
  tag('cont', 'LEMPENG BENUA', ca.cont, '', ct);
  tag('lock', 'ZONA TERKUNCI', ca.lock, 'red', inCrust ? pop(t, 12.6, T_QUAKE, 0.3, 0.1) * (0.7 + 0.3 * Math.sin(t * 10)) : 0);
  tag('hypo', 'PATAH!', ca.hypo, 'yellow', inCrust ? pop(t, T_QUAKE, 17.3, 0.05, 0.2) : 0);

  // retreat markers (also in the flashback)
  const retreat = dashes.visible;
  const retreatLbl = (t >= 23.3 && t < 30.75) || shot.flashback;
  const L = sp.L;
  const shoreZ = L / 0.04;
  tag('shore0', 'GARIS PANTAI NORMAL', V(18, 1.5, 0), '', retreat ? smoothstep(23.8, 24.3, t) + fb : 0);
  tag('shore1', `AIR MUNDUR ${Math.round(-shoreZ)} m`, V(10, L + 0.5, shoreZ), 'yellow', retreatLbl && -shoreZ > 20 ? 1 : 0);

  // floors of the focus house
  const fh = shot.t0 === 45.6 ? 1 : 0;
  const lv = world.focusLevels;
  tag('f1', sp.B > lv[0] ? 'LANTAI 1 TERENDAM' : 'LANTAI 1', world.anchors.floor1, sp.B > lv[0] ? 'red' : '', fh);
  tag('f2', sp.B > lv[1] ? 'LANTAI 2 TERENDAM' : 'LANTAI 2', world.anchors.floor2, sp.B > lv[1] ? 'red' : '', fh * smoothstep(46.4, 46.6, t));
  tag('f3', sp.B > lv[2] - 0.3 ? 'ATAP TENGGELAM' : 'ATAP', world.anchors.roof, sp.B > lv[2] - 0.3 ? 'red' : '', fh * smoothstep(47.3, 47.5, t));
  tag('safe', 'AMAN: TEMPAT TINGGI', world.anchors.hilltop, 'green', shot.t0 === 55.65 ? smoothstep(55.9, 56.2, t) * (1 - smoothstep(57.9, 58.1, t)) : 0);
}

// ------------------------------------------------------------------ render
const canvasH = Math.round(H * SCALE);
export function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  const c = shot.cam(t, k);
  const wt = worldTime(t);
  let shake = 0;
  if (shot.scene === 'crust') shake = t > T_QUAKE ? 2.2 * Math.exp(-(t - T_QUAKE) * 2.5) : crust.stress(t) * 0.06;
  else shake = shakeAt(wt) * 0.9 + (wt > T_IMPACT - 0.6 && wt < T_IMPACT + 1.5 ? 0.6 * Math.exp(-Math.abs(wt - T_IMPACT) * 2) : 0) + (wt > 36 && wt < 39.4 ? (wt - 36) * 0.03 : 0);
  const sh = camShake(t, shake);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt.clone().add(sh.multiplyScalar(0.5)));
  let sp;
  if (shot.scene === 'crust') {
    crust.update(t);
    sp = seaParams(wt);
    renderer.render(crust.scene, camera);
  } else {
    dashes.visible = (t >= 23.3 && t < 26.6) || !!shot.flashback;
    sp = world.update(wt, camera, canvasH);
    renderer.render(world.scene, camera);
  }
  updateOverlays(t, wt, sp, shot);
  updateCaptions(t);
}

// ------------------------------------------------------------------ boot
window.renderAt = renderAt;
window.DURATION = DURATION;
await loadCaptions();
await document.fonts.load('900 80px Inter');
// warm-up: compile every shader for both scenes
renderAt(9);
renderAt(42);
renderAt(0);
window.READY = true;

if (!qs.has('render')) {
  // live preview: fit to window, loop, optional audio
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; };
  fit();
  addEventListener('resize', fit);
  const audio = new Audio('./assets/soundtrack.m4a');
  let t0 = performance.now();
  const startT = parseFloat(qs.get('t') || '0');
  addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); t0 = performance.now(); });
  const loop = () => {
    const t = (startT + (performance.now() - t0) / 1000) % DURATION;
    renderAt(t);
    requestAnimationFrame(loop);
  };
  loop();
}
