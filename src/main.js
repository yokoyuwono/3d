// Entry point for the 2:40 version: shots are laid out from the narration timing
// (assets/timing.json), so every picture lands on its words. Exposes renderAt(t)
// for the offline renderer and window.EVENTS for the sound design.
import * as THREE from 'three';
import { clamp, easeInOut, lerp, smoothstep } from './util.js';
import { World, terrainY } from './world.js';
import { Crust } from './crust.js';
import { MapScene, geo, SIMEULUE } from './map.js';
import { OceanSection, COAST } from './ocean.js';
import { Cubes, Ruler, ScaleShot } from './extras.js';
import { seaParams, shakeAt, T_QUAKE, T_IMPACT, HILL } from './timeline.js';

const W = 1080, H = 1920, DURATION = 160;
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
const map = new MapScene();
const ocean = new OceanSection();
const cubes = new Cubes();
const ruler = new Ruler();
const scaleShot = new ScaleShot();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);
const insetCam = new THREE.PerspectiveCamera(38, 580 / 400, 0.1, 200);

const dashes = new THREE.Group();
for (let x = -230; x <= 230; x += 8) {
  const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.25, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  d.position.set(x, terrainY(x, 0) + 0.25, 0);
  dashes.add(d);
}
world.scene.add(dashes);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const F = world.focus;
const HT = world.anchors.hilltop;
const CHAPTERS = ['', 'KENAPA INDONESIA?', 'LEMPENG TERKUNCI', 'GEMPA M 8,9', 'LAHIRNYA TSUNAMI', 'KENAPA LAUT SURUT?', 'HANTAMAN', 'KISAH SMONG'];

// ------------------------------------------------------------------ narration timing
let SEG = {}, CAPS = [], WORDS = {};
const KEY = /^(tanda,?|pulau|syair|kisah|patah!|delapan|koma|sembilan\.|seribu|terbesar|lembah|surut\.|fatal\.|tiga|puluh|meter\.|lima|belas|sentimeter|menjatuhkan|menghanyutkan|berikutnya,|Simeulue,|smong,|gunung\.|tinggi\.|Sekarang\.|melihatnya\.|tujuh|jet\.)$/i;
function wordsOf(seg) {
  const out = [];
  for (const s of seg.sentences) {
    const words = s.text.split(/\s+/);
    const wt = words.map((w) => w.length + 2 + (/[,.!?]$/.test(w) ? 4 : 0));
    const tot = wt.reduce((a, b) => a + b, 0);
    let acc = 0;
    words.forEach((w, i) => { const st = s.start + ((s.end - s.start) * acc) / tot; acc += wt[i]; out.push({ w, st, en: s.start + ((s.end - s.start) * acc) / tot, last: i === words.length - 1 }); });
  }
  return out;
}
// time a word starts in a segment (first match of a regex)
const wT = (id, re) => { const w = WORDS[id].find((x) => re.test(x.w)); if (!w) throw new Error(`word ${re} not in seg ${id}`); return w.st; };
async function loadTiming() {
  const timing = await (await fetch('./assets/timing.json')).json();
  for (const s of timing) { SEG[s.id] = s; WORDS[s.id] = wordsOf(s); }
  for (const s of timing) {
    let cur = [];
    WORDS[s.id].forEach((tw) => {
      cur.push(tw);
      if (/[,.!?:]$/.test(tw.w) || cur.length >= 3 || tw.last) { CAPS.push({ words: cur, st: cur[0].st, en: cur[cur.length - 1].en }); cur = []; }
    });
  }
  CAPS.forEach((c, i) => { c.hold = i + 1 < CAPS.length ? Math.min(CAPS[i + 1].st, c.en + 0.45) : c.en + 0.6; });
}

// ------------------------------------------------------------------ shots
let SHOTS = [], EV = {};
const S = (id) => SEG[id].start, E = (id) => SEG[id].end;
const chStart = (ch) => Object.values(SEG).find((s) => s.ch === ch).start;
const sentence = (id, i) => SEG[id].sentences[i];

// reusable world cameras
const CAM = {
  aerial: (k) => ({ pos: V(lerp(75, 22, k), lerp(95, 36, k), lerp(-210, -78, k)), tgt: V(lerp(0, -6, k), lerp(4, 9, k), lerp(100, 82, k)), fov: 52 }),
  sign: (k) => ({ pos: V(lerp(14, 4, k), lerp(9, 7, k), lerp(118, 126, k)), tgt: V(-12, 14, 175), fov: 50 }),
  quake: (k) => ({ pos: V(lerp(48, 40, k), lerp(52, 44, k), lerp(-5, 8, k)), tgt: V(-22, 4, lerp(90, 94, k)), fov: 54 }),
  quakeLow: (k) => ({ pos: V(lerp(62, 52, k), lerp(40, 35, k), lerp(-12, 0, k)), tgt: V(-20, 4, 92), fov: 54 }),
  topdown: (k) => ({ pos: V(lerp(40, 34, k), lerp(120, 108, k), lerp(70, 52, k)), tgt: V(0, 0, lerp(-70, -82, k)), fov: 55 }),
  beach: (k) => ({ pos: V(lerp(14, 8, k), lerp(8, 6.5, k), lerp(24, 12, k)), tgt: V(0, 0.5, -130), fov: 54 }),
  horizon: (k) => ({ pos: V(3, 4.2, lerp(-30, -45, k)), tgt: V(0, 5, -1200), fov: lerp(40, 13, easeInOut(clamp(k * 1.3))) }),
  wall: (k) => ({ pos: V(0, 7, lerp(14, 10, k)), tgt: V(0, lerp(8, 20, easeInOut(k)), -200), fov: 62 }),
  impact: (k) => ({ pos: V(lerp(-150, -135, k), lerp(85, 78, k), lerp(-300, -280, k)), tgt: V(lerp(-10, 0, k), 0, lerp(-20, 20, k)), fov: 50 }),
  flood: (k) => ({ pos: V(lerp(95, 62, k), lerp(58, 46, k), lerp(-35, 0, k)), tgt: V(-5, 2, lerp(85, 95, k)), fov: 52 }),
  ruin: (k) => ({ pos: V(lerp(-70, -45, k), lerp(75, 62, k), lerp(-95, -70, k)), tgt: V(0, 0, 100), fov: 54 }),
  runners: (k) => ({ pos: V(lerp(22, 12, k), lerp(20, 24, k), lerp(88, 112, k)), tgt: V(HILL.x + 5, 16, HILL.z - 10), fov: 52 }),
  hill: (k) => ({ pos: V(HT.x - 8 + lerp(-8, 6, k), HT.y + lerp(10, 7, k), HT.z + lerp(50, 40, k)), tgt: V(lerp(-14, -4, k), 0, 70), fov: 58 }),
};
const crustCam = (k, after = 0) => {
  const pos = V(lerp(12, 6, k), lerp(20, 2, k), lerp(240, 165, k)).lerp(V(8, 20, 225), after);
  const tgt = V(lerp(2, 5, k), lerp(-22, -17, k), 0).lerp(V(0, -16, 0), after);
  return { pos, tgt, fov: 50 };
};

function buildShots() {
  const tPatah = wT(7, /^patah/);
  const tCh = (c) => chStart(c) - 1.25;
  const s15 = S(15), e15 = E(15);
  const tWallEnd = s15 + 3.4;
  const tImpact = tWallEnd + (T_IMPACT - 39.4) / (41.4 - 39.4) * (e15 + 0.25 - tWallEnd);
  const tSurut = sentence(13, 1).start;
  const tRewind = S(20) - 0.6;
  const tSign = sentence(20, 1).start; // "Kamu sudah melihatnya."
  const tRun = sentence(20, 2).start; // "Saat laut tiba-tiba surut..."
  const tEnd = wT(20, /^Sekarang/) + 0.55;
  EV = {
    quake: tPatah, impact: tImpact, chapters: [1, 2, 3, 4, 5, 6, 7].map(tCh), rewind: tRewind, endcard: tEnd,
    finalHit: wT(20, /^Sekarang/), cubes: [S(8) + 0.2, wT(8, /^tiga/), wT(8, /^seribu/)],
    fall: wT(16, /^menjatuhkan/), float: wT(16, /^menghanyutkan/), level15: wT(16, /^lima/), level30: wT(16, /^Tiga/),
    retreat: [[tSurut, E(14) + 0.3], [S(19), E(19)], [tSign, tRun]], roar: [E(14) + 0.3, tImpact], rush: [tImpact, E(17) + 0.4],
    ocean: [S(11), tSurut], uplift: S(10), wave2: wT(17, /^berikutnya/), duration: DURATION,
  };
  const W_ = (fn, w0, w1) => ({ fn, w0, w1 }); // world shot helper
  SHOTS = [
    // hook: flash-forward montage, then the calm town
    { t0: 0, t1: 0.8, world: W_(CAM.wall, 38.6, 39.0), glitch: true },
    { t0: 0.8, t1: 1.6, world: W_(CAM.quake, 18.3, 18.9), glitch: true },
    { t0: 1.6, t1: 2.4, world: W_(CAM.flood, 45, 46), glitch: true },
    { t0: 2.4, t1: S(2) + 0.2, world: W_(CAM.aerial, 0, 4) },
    { t0: S(2) + 0.2, t1: tCh(1), world: W_(CAM.sign, 4, 10) },
    // 1. why Indonesia: plate map
    { t0: tCh(1), t1: tCh(2), map: 'plates', cam: (t, k) => {
        const e = easeInOut(k);
        return { pos: geo(lerp(113, 102, e), lerp(-24, -13.5, e), lerp(430, 150, e)), tgt: geo(lerp(113, 102, e), lerp(-3, -3.5, e), 0), fov: 50 };
      } },
    // 2. locked plates + ruler analogy
    { t0: tCh(2), t1: tPatah + 1.1, crust: (t) => lerp(8.4, T_QUAKE, clamp((t - tCh(2)) / (tPatah - tCh(2)))),
      cam: (t, k) => crustCam(easeInOut(clamp((t - tCh(2)) / (tPatah - tCh(2)))), easeInOut(clamp((t - tPatah - 0.1) / 0.7))),
      inset: { t0: S(6), t1: tPatah + 1.1, bend: (t) => smoothstep(S(6), tPatah, t), release: (t) => t - tPatah } },
    // 3. quake in the town, energy cubes, what to do
    { t0: tPatah + 1.1, t1: S(8) - 0.15, world: W_(CAM.quake, T_QUAKE + 1.1, null), live: tPatah },
    { t0: S(8) - 0.15, t1: S(9) - 0.2, cubes: true, cam: (t, k) => ({ pos: V(lerp(12, 18, k), lerp(13, 19, k), lerp(25, 31, k)), tgt: V(0, 2, -2), fov: 50 }) },
    { t0: S(9) - 0.2, t1: tCh(4), world: W_(CAM.quakeLow, 20.6, 23.0) },
    // 4. birth of the tsunami: uplift (slow motion), then the deep-ocean section
    { t0: tCh(4), t1: S(11) - 0.1, crust: (t) => T_QUAKE + 0.05 + Math.max(0, t - S(10) + 0.4) * 0.42, slowmo: true,
      cam: (t, k) => ({ pos: V(lerp(10, 4, k), lerp(26, 14, k), lerp(230, 200, k)), tgt: V(lerp(-2, 2, k), -12, 0), fov: 50 }) },
    { t0: S(11) - 0.1, t1: tCh(5), ocean: (t, k) => lerp(0.0, 0.46, k), info: 'deep' },
    // 5. why the sea retreats
    { t0: tCh(5), t1: S(13), ocean: (t, k) => lerp(0.46, 0.86, easeInOut(k)), info: 'deep' },
    { t0: S(13), t1: tSurut, ocean: (t, k) => lerp(0.86, 0.975, k), info: 'coast', trough: true },
    { t0: tSurut, t1: S(14) + 0.3, world: W_(CAM.topdown, 24.0, 27.0), dashes: true },
    { t0: S(14) + 0.3, t1: E(14) + 0.3, world: W_(CAM.beach, 27.0, 31.0) },
    // 6. impact: horizon, wall, aerial impact, human scale, flood
    { t0: E(14) + 0.3, t1: s15, world: W_(CAM.horizon, 31.5, 36.0), panel: true },
    { t0: s15, t1: tWallEnd, world: W_(CAM.wall, 36.0, 39.4), panel: true },
    { t0: tWallEnd, t1: e15 + 0.25, world: W_(CAM.impact, 39.4, 41.4), panel: true },
    { t0: e15 + 0.25, t1: E(16) + 0.2, scale: true, cam: (t, k) => ({ pos: V(lerp(-3.4, -2.8, k), lerp(2.0, 1.8, k), lerp(8.6, 7.8, k)), tgt: V(0.4, -0.5, -1.0), fov: 54 }) },
    { t0: E(16) + 0.2, t1: tCh(7), world: W_(CAM.flood, 42.5, 49), gauge: true },
    // 7. the smong story and the answer
    { t0: tCh(7), t1: S(19), map: 'simeulue', cam: (t, k) => {
        const e = easeInOut(k);
        return { pos: geo(lerp(104, SIMEULUE[0] + 1.2, e), lerp(-10, SIMEULUE[1] - 3.2, e), lerp(260, 32, e)), tgt: geo(lerp(101, SIMEULUE[0], e), lerp(-1, SIMEULUE[1], e), 0), fov: 50 };
      } },
    { t0: S(19), t1: tRewind, world: W_(CAM.runners, 24.0, 34.0), evac: true, vintage: true },
    { t0: tRewind, t1: tRun, world: W_(CAM.topdown, 24.2, 29.5), flashback: true, dashes: true, rewindFrom: 49 },
    { t0: tRun, t1: DURATION + 0.01, world: W_(CAM.hill, 50, 54) },
  ];
}

function shotAt(t) {
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s;
  return SHOTS[SHOTS.length - 1];
}

// world time inside a world shot
function worldTimeOf(shot, t, k) {
  const w = shot.world;
  if (shot.live !== undefined) return T_QUAKE + (t - shot.live);
  if (shot.rewindFrom) {
    const r = t - shot.t0;
    if (r < 0.6) return lerp(shot.rewindFrom, w.w0, easeInOut(r / 0.6));
    return w.w0 + (r - 0.6) * ((w.w1 - w.w0) / Math.max(0.1, shot.t1 - shot.t0 - 0.6));
  }
  return lerp(w.w0, w.w1, k);
}

function camShake(t, amp) {
  return V(amp * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7) * 0.4), amp * (Math.sin(t * 43.3 + 1) * 0.6 + Math.sin(t * 71.9) * 0.4), amp * Math.sin(t * 29.3 + 2) * 0.5);
}

// ------------------------------------------------------------------ overlays
const $ = (id) => document.getElementById(id);
const show = (id, o) => { const e = $(id); e.style.opacity = clamp(o).toFixed(3); e.style.display = o > 0.001 ? '' : 'none'; };
const pop = (t, a, b, fi = 0.25, fo = 0.25) => smoothstep(a, a + fi, t) * (1 - smoothstep(b - fo, b, t));
const capEl = $('cap');
let capKey = '';
function updateCaptions(t) {
  const c = CAPS.find((c) => t >= c.st - 0.05 && t < c.hold);
  if (!c || t > EV.endcard) { capEl.innerHTML = ''; capKey = ''; return; }
  const key = c.st + ':' + c.words.map((w) => (t >= w.st && t < w.en + 0.05 ? 1 : 0)).join('');
  if (key === capKey) return;
  capKey = key;
  capEl.innerHTML = c.words.map((w) => `<span class="${t >= w.st && t < w.en + 0.05 ? 'on' : KEY.test(w.w) ? 'key' : ''}">${w.w}</span>`).join(' ');
}
const tagsEl = $('tags');
const tagPool = {};
function tag(name, text, p3, cls, opacity = 1) {
  let el = tagPool[name];
  if (!el) { el = tagPool[name] = document.createElement('div'); tagsEl.appendChild(el); }
  if (!p3 || opacity <= 0.001) { el.style.display = 'none'; return; }
  const v = p3.clone().project(camera);
  if (v.z > 1 || v.z < -1) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.className = 'tag ' + (cls || '');
  if (el.textContent !== text) el.textContent = text;
  el.style.left = clamp((v.x * 0.5 + 0.5) * W, 170, W - 170).toFixed(1) + 'px';
  el.style.top = ((-v.y * 0.5 + 0.5) * H - 30).toFixed(1) + 'px';
  el.style.opacity = clamp(opacity).toFixed(3);
}
const fmtKm = (m) => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m');
function panel(head, rows, blue = false) {
  $('wHead').textContent = head;
  $('wHead').className = 'head' + (blue ? ' blue' : '');
  rows.forEach(([l, v], i) => { $('wL' + (i + 1)).textContent = l; $('wV' + (i + 1)).textContent = v; });
}

function updateOverlays(t, shot, ctx) {
  const ch = [...EV.chapters].reverse().findIndex((c) => t >= c + 0.6);
  const chap = ch < 0 ? 0 : 7 - ch;
  show('chap', chap > 0 && t < EV.endcard ? 1 : 0);
  if (chap > 0) { $('chapN').textContent = `BAB ${chap}/7`; $('chapT').textContent = CHAPTERS[chap]; }
  show('quest', pop(t, S(2), chStart(6) - 1.3, 0.3, 0.3));
  // chapter title cards
  let cc = 0;
  EV.chapters.forEach((c, i) => { const o = pop(t, c, c + 1.35, 0.12, 0.25); if (o > cc) { cc = o; $('ccN').textContent = `BAB ${i + 1}`; $('ccT').textContent = CHAPTERS[i + 1]; } });
  show('chcard', cc);
  const cs = EV.chapters.find((c) => t >= c && t < c + 1.4);
  $('chcard').style.transform = `scale(${cs !== undefined ? 1 + 0.15 * Math.exp(-(t - cs) * 8) : 1})`;

  // crust stress meter and magnitude
  const st = crust.stress(ctx.crustT || 0);
  show('meter', shot.crust && !shot.slowmo ? pop(t, chStart(2) - 0.5, EV.quake + 0.05, 0.3, 0.05) : 0);
  $('meterF').style.width = (st * 100).toFixed(1) + '%';
  $('meterV').textContent = Math.round(st * 100) + '%';
  show('mag', pop(t, EV.quake + 0.02, S(8) - 0.3, 0.05, 0.3));
  const shk = shakeAt(T_QUAKE + t - EV.quake);
  $('mag').style.transform = `translate(${shk * 10 * Math.sin(t * 50)}px, ${shk * 8 * Math.sin(t * 63)}px) scale(${1 + 0.6 * Math.exp(-(t - EV.quake) * 8)})`;
  show('slowmo', shot.slowmo ? 0.6 + 0.4 * (Math.sin(t * 8) > 0 ? 1 : 0) : 0);
  show('note', shot.map === 'plates' || shot.ocean || shot.cubes || (shot.crust && t > chStart(2)) ? 0.9 : 0);

  // ruler inset frame
  show('inset', shot.inset ? pop(t, shot.inset.t0, shot.inset.t1, 0.2, 0.2) : 0);

  // safety icons
  const iconsOn = t >= S(9) && t < sentence(9, 2).start + 0.2;
  show('icons', iconsOn ? 1 : 0);
  ['merunduk', 'berlindung', 'bertahan'].forEach((w, i) => {
    const tw = wT(9, new RegExp('^' + w));
    const o = smoothstep(tw - 0.1, tw + 0.1, t);
    $('ic' + (i + 1)).style.opacity = o.toFixed(3);
    $('ic' + (i + 1)).style.transform = `scale(${0.6 + 0.4 * o + 0.12 * Math.exp(-Math.max(0, t - tw) * 6) * o})`;
  });

  // info panel: ocean section, approach, or hidden
  let pv = 0;
  if (shot.ocean) {
    const inf = ocean.info(ctx.oceanX);
    pv = 1;
    panel('GELOMBANG TSUNAMI', [['Kedalaman laut', fmtKm(inf.depth)], ['Kecepatan', `${Math.round(inf.kmh / 10) * 10} km/jam`], ['Tinggi', `± ${inf.H < 3 ? inf.H.toFixed(1).replace('.', ',') : Math.round(inf.H)} m`]], true);
  } else if (shot.panel) {
    pv = t < EV.impact - 0.05 ? 1 : 0;
    const sp = ctx.sp;
    panel('TSUNAMI TERDETEKSI', [['Jarak', fmtKm(Math.max(0, -sp.F))], ['Tinggi', `${Math.round(sp.A)} m`], ['Tiba dalam', `${Math.max(0, EV.impact - t).toFixed(1).replace('.', ',')} dtk`]]);
  }
  show('wave', pv);
  show('gauge', shot.gauge ? pop(t, shot.t0, shot.t1, 0.3, 0.2) : 0);
  if (shot.gauge) {
    const depth = Math.max(0, ctx.sp.B - F.g0);
    $('gV').textContent = depth.toFixed(1).replace('.', ',') + ' m';
    $('gL').style.height = clamp(depth / 12) * 100 + '%';
  }

  // flashback / vintage looks
  const fb = shot.flashback ? 1 : 0;
  show('rewind', fb * (0.6 + 0.4 * (Math.sin(t * 12) > 0 ? 1 : 0)));
  show('scan', fb * 0.9 + (shot.vintage ? 0.5 : 0) + (shot.glitch ? 0.8 : 0));
  show('sign', pop(t, sentence(20, 1).start - 0.1, shot.t1, 0.2, 0.2) * fb);
  $('sign').style.transform = `scale(${1 + 0.25 * Math.exp(-Math.max(0, t - sentence(20, 1).start) * 9)})`;
  renderer.domElement.style.filter = fb ? 'sepia(0.85) contrast(1.15) brightness(0.95) saturate(1.2)'
    : shot.vintage ? 'sepia(0.55) saturate(0.85) contrast(1.08)' : shot.glitch ? 'contrast(1.25) saturate(1.3)' : 'none';
  show('quote', shot.vintage ? pop(t, sentence(19, 1).start - 0.2, shot.t1, 0.3, 0.2) : 0);

  // lower thirds
  let la = '', lb = '', lo = 0;
  if (shot.map === 'simeulue') { la = '26 DESEMBER 2004'; lb = 'Pulau Simeulue, Aceh'; lo = pop(t, S(18), shot.t1, 0.3, 0.2); }
  if (shot.vintage) { la = 'KISAH SMONG'; lb = 'Dari tsunami 1907'; lo = pop(t, shot.t0, sentence(19, 1).start - 0.2, 0.3, 0.2); }
  if (shot.glitch) { la = 'SIMULASI 3D'; lb = 'Gempa → Tsunami'; lo = 1; }
  $('lowA').textContent = la; $('lowB').textContent = lb;
  show('lower', lo);

  show('end', smoothstep(EV.endcard, EV.endcard + 0.35, t));
  show('cap', 1 - smoothstep(EV.endcard, EV.endcard + 0.2, t));

  let flash = 0;
  if (t >= EV.quake) flash = Math.max(flash, 0.9 * Math.exp(-(t - EV.quake) * 7));
  if (t >= EV.impact) flash = Math.max(flash, 0.85 * Math.exp(-(t - EV.impact) * 5));
  if (t >= EV.rewind && t < EV.rewind + 0.3) flash = Math.max(flash, 0.7 * (1 - (t - EV.rewind) / 0.3));
  for (const c of [0.8, 1.6, 2.4]) if (t >= c && t < c + 0.12) flash = Math.max(flash, 0.8 * (1 - (t - c) / 0.12));
  show('flash', flash);
  show('fade', 1 - smoothstep(0, 0.2, t));

  // 3D-anchored tags
  for (const n of Object.keys(tagPool)) tagPool[n].style.display = 'none';
  if (shot.map === 'plates') {
    const a = map.anchors, s3 = S(3), s4 = S(4);
    tag('eur', 'LEMPENG EURASIA', a.eurasia, '', pop(t, s3 + 1.5, shot.t1));
    tag('indo', 'LEMPENG INDO-AUSTRALIA', a.indo, 'yellow', pop(t, wT(4, /^Indo/), shot.t1));
    tag('pac', 'LEMPENG PASIFIK', a.pacific, '', pop(t, s3 + 2.2, s4 + 3));
    tag('trench', 'ZONA SUBDUKSI', a.trench, 'red', pop(t, wT(4, /^menyusup/), shot.t1));
    tag('rate', '± 5–7 cm/tahun', a.java, 'yellow', pop(t, wT(4, /^lima/), shot.t1));
  }
  if (shot.map === 'simeulue') tag('sim', 'PULAU SIMEULUE', map.anchors.simeulue, 'yellow', pop(t, S(18) + 0.4, shot.t1));
  if (shot.crust) {
    const ca = crust.anchors;
    const pre = t < EV.quake;
    tag('ocean', 'LEMPENG SAMUDRA', ca.ocean, '', pre ? pop(t, chStart(2), EV.quake) : 0);
    tag('cont', 'LEMPENG BENUA', ca.cont, '', pre ? pop(t, chStart(2), EV.quake) : 0);
    tag('lock', 'TERSANGKUT', ca.lock, 'red', pre ? pop(t, wT(5, /^tersangkut/), EV.quake, 0.2, 0.1) * (0.7 + 0.3 * Math.sin(t * 10)) : 0);
    tag('hypo', 'PATAH!', ca.hypo, 'yellow', pop(t, EV.quake, EV.quake + 1.1, 0.05, 0.2));
    if (shot.slowmo) tag('up', 'DASAR LAUT TERANGKAT', V(4, 4, 35), 'yellow', pop(t, S(10) + 0.6, shot.t1));
  }
  if (shot.cubes) {
    const a = cubes.anchors;
    tag('m7', 'M7 = 1×', a.m7, '', smoothstep(EV.cubes[0], EV.cubes[0] + 0.2, t));
    tag('m8', 'M8 = 32×', a.m8, 'yellow', smoothstep(EV.cubes[1], EV.cubes[1] + 0.2, t));
    tag('m9', 'M9 = ± 1.000×', a.m9, 'red', smoothstep(EV.cubes[2], EV.cubes[2] + 0.2, t));
  }
  if (shot.ocean) {
    tag('ship', 'KAPAL: TIDAK TERASA', ocean.anchors.ship, '', shot.info === 'deep' && t > wT(11, /^Kapal/) && t < S(12) ? 1 : 0);
    tag('lemb', 'LEMBAH DATANG DULUAN', ocean.anchors.coast, 'red', shot.trough ? pop(t, wT(13, /^lembah/) - 0.2, shot.t1) : 0);
  }
  if (shot.scale) {
    const a = scaleShot.anchors;
    tag('m15', '15 cm', a.m15, ctx.level >= 0.149 ? 'red' : '', smoothstep(EV.level15 - 0.3, EV.level15, t));
    tag('m30', '30 cm', a.m30, ctx.level >= 0.299 ? 'red' : '', smoothstep(EV.level30 - 0.3, EV.level30, t));
    tag('pp', 'ORANG DEWASA JATUH', a.person, 'red', pop(t, EV.fall + 0.3, EV.level30 - 0.1));
    tag('cc', 'MOBIL HANYUT', a.car, 'red', pop(t, EV.float + 0.3, shot.t1));
  }
  if (shot.world) {
    const sp = ctx.sp;
    const L = sp.L, shoreZ = L / 0.04;
    if (shot.dashes) tag('shore0', 'GARIS PANTAI NORMAL', V(18, 1.5, 0), '', 1);
    if ((shot.dashes || shot.world.fn === CAM.beach) && -shoreZ > 20) tag('shore1', `AIR MUNDUR ${Math.round(-shoreZ)} m`, V(10, L + 0.5, shoreZ), 'yellow', 1);
    if (shot.gauge) tag('w2', 'GELOMBANG KE-2 BISA LEBIH BESAR', V(-40, 6, 100), 'red', smoothstep(EV.wave2 - 0.2, EV.wave2, t));
    if (shot.world.fn === CAM.hill) tag('safe', 'AMAN: TEMPAT TINGGI', world.anchors.hilltop, 'green', pop(t, shot.t0 + 0.3, EV.endcard));
    if (shot.evac) tag('run', 'LARI KE BUKIT!', V(HILL.x + 4, terrainY(HILL.x + 4, HILL.z - 20) + 14, HILL.z - 20), 'green', pop(t, shot.t0 + 0.8, shot.t1));
    if (shot.world.fn === CAM.sign) tag('sg', '?', V(-6, 13, 147), 'yellow', pop(t, shot.t0 + 1, shot.t1) * (0.6 + 0.4 * Math.sin(t * 6)));
  }
}

// ------------------------------------------------------------------ render
const canvasH = Math.round(H * SCALE);
export function renderAt(t) {
  const shot = shotAt(t);
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  const ctx = {};
  let scene, c, shake = 0;
  if (shot.world) {
    const wt = worldTimeOf(shot, t, k);
    c = shot.world.fn(k);
    shake = shakeAt(wt) * 0.9 + (wt > T_IMPACT - 0.6 && wt < T_IMPACT + 1.5 ? 0.6 * Math.exp(-Math.abs(wt - T_IMPACT) * 2) : 0) + (wt > 36 && wt < 39.4 ? (wt - 36) * 0.03 : 0);
    if (shot.world.fn === CAM.quakeLow) shake *= 0.5;
    dashes.visible = !!shot.dashes;
    world.showEvac = !!shot.evac;
    ctx.wt = wt;
    scene = world.scene;
  } else if (shot.crust) {
    ctx.crustT = shot.crust(t);
    c = shot.cam(t, k);
    shake = t > EV.quake ? 2.2 * Math.exp(-(t - EV.quake) * 2.5) : crust.stress(ctx.crustT) * 0.06;
    crust.update(ctx.crustT);
    scene = crust.scene;
  } else if (shot.map) {
    c = shot.cam(t, k);
    map.update(t, shot.map, k);
    scene = map.scene;
  } else if (shot.ocean) {
    const u = shot.ocean(t, k);
    const X = ocean.waveX(u);
    ctx.oceanX = X;
    ocean.update(t, X);
    const cx = Math.min(X + 8, COAST - 4);
    c = shot.trough ? { pos: V(COAST - 2, 4, 86), tgt: V(COAST - 2, -6, 0), fov: 50 } : { pos: V(cx, 10, 96), tgt: V(cx - 2, -12, 0), fov: 50 };
    scene = ocean.scene;
  } else if (shot.cubes) {
    c = shot.cam(t, k);
    cubes.update(t, EV.cubes);
    scene = cubes.scene;
  } else if (shot.scale) {
    c = shot.cam(t, k);
    const level = Math.max(lerp(0.02, 0.06, smoothstep(shot.t0, EV.level15 - 0.2, t)), 0.15 * smoothstep(EV.level15 - 0.2, EV.level15 + 0.4, t), 0.15 + 0.17 * smoothstep(EV.level30 - 0.2, EV.level30 + 0.5, t));
    ctx.level = level;
    scaleShot.update(t, level, smoothstep(EV.fall, EV.fall + 0.9, t), t - EV.float);
    scene = scaleShot.scene;
  }
  const sh = camShake(t, shake);
  camera.position.copy(c.pos).add(sh);
  camera.fov = c.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(c.tgt.clone().add(sh.multiplyScalar(0.5)));
  if (shot.world) ctx.sp = world.update(ctx.wt, camera, canvasH);
  else ctx.sp = seaParams(0);

  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W * SCALE, H * SCALE);
  renderer.render(scene, camera);
  if (shot.inset && t >= shot.inset.t0) {
    ruler.update(shot.inset.bend(t), shot.inset.release(t));
    insetCam.position.set(4, 6, 22);
    insetCam.lookAt(5, -0.5, 0);
    const x = 255 * SCALE, w = 570 * SCALE, h = 390 * SCALE, y = (H - 435 - 390) * SCALE;
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, w, h);
    renderer.setViewport(x, y, w, h);
    renderer.render(ruler.scene, insetCam);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W * SCALE, H * SCALE);
  }
  updateOverlays(t, shot, ctx);
  updateCaptions(t);
}

// ------------------------------------------------------------------ boot
window.renderAt = renderAt;
window.DURATION = DURATION;
await loadTiming();
buildShots();
window.EVENTS = EV;
window.SHOT_TIMES = SHOTS.map((s) => s.t0);
await document.fonts.load('900 80px Inter');
for (const t of [0.5, 20, 40, 60, 80, 90, 112, 118, 136, 3]) renderAt(t); // compile every scene's shaders
window.READY = true;

if (!qs.has('render')) {
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; };
  fit();
  addEventListener('resize', fit);
  const audio = new Audio('./assets/soundtrack.m4a');
  let t0 = performance.now();
  const startT = parseFloat(qs.get('t') || '0');
  addEventListener('click', () => { audio.currentTime = startT; audio.play().catch(() => {}); t0 = performance.now(); });
  const loop = () => { renderAt((startT + (performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  loop();
}
