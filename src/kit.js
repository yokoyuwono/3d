// Shared toolkit for the "ANDAI…" episodes: a live web player driven by the
// soundtrack clock, word-timed captions, 3D-anchored tags and overlay helpers.
// Each episode page (ep1.html, ep2.html, ...) builds its own scenes and shots on top.
import * as THREE from 'three';
import { clamp, smoothstep } from './util.js';

export const W = 1080, H = 1920;
export const qs = new URLSearchParams(location.search);
export const RENDER = qs.has('render');
export const $ = (id) => document.getElementById(id);
export const show = (id, o) => { const e = typeof id === 'string' ? $(id) : id; e.style.opacity = clamp(o).toFixed(3); e.style.display = o > 0.001 ? '' : 'none'; };
export const pop = (t, a, b, fi = 0.25, fo = 0.25) => smoothstep(a, a + fi, t) * (1 - smoothstep(b - fo, b, t));

// ------------------------------------------------------------------ renderer
export function createRenderer(stage) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: RENDER, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);
  const size = { w: W, h: H };
  const resize = () => {
    let scale = parseFloat(qs.get('scale') || '1');
    if (!RENDER) {
      // live: fit the 9:16 stage to the window, render at the displayed resolution
      const s = Math.min(innerWidth / W, innerHeight / H);
      stage.style.transform = `scale(${s})`;
      stage.parentElement.style.width = `${W * s}px`;
      stage.parentElement.style.height = `${H * s}px`;
      scale = Math.min(1, s * Math.min(devicePixelRatio || 1, 2));
    }
    size.w = Math.round(W * scale); size.h = Math.round(H * scale);
    renderer.setSize(size.w, size.h, false);
  };
  resize();
  addEventListener('resize', resize);
  return { renderer, size };
}

// ------------------------------------------------------------------ narration timing
export async function loadTiming(url) {
  const timing = await (await fetch(url)).json();
  const SEG = {}, WORDS = {}, CAPS = [];
  for (const s of timing) {
    SEG[s.id] = s;
    const out = [];
    for (const se of s.sentences) {
      const words = se.text.split(/\s+/);
      const wt = words.map((w) => w.length + 2 + (/[,.!?]$/.test(w) ? 4 : 0));
      const tot = wt.reduce((a, b) => a + b, 0);
      let acc = 0;
      words.forEach((w, i) => { const st = se.start + ((se.end - se.start) * acc) / tot; acc += wt[i]; out.push({ w, st, en: se.start + ((se.end - se.start) * acc) / tot, last: i === words.length - 1 }); });
    }
    WORDS[s.id] = out;
  }
  for (const s of timing) {
    let cur = [];
    WORDS[s.id].forEach((tw) => {
      cur.push(tw);
      if (/[,.!?:]$/.test(tw.w) || cur.length >= 3 || tw.last) { CAPS.push({ words: cur, st: cur[0].st, en: cur[cur.length - 1].en }); cur = []; }
    });
  }
  CAPS.forEach((c, i) => { c.hold = i + 1 < CAPS.length ? Math.min(CAPS[i + 1].st, c.en + 0.45) : c.en + 0.6; });
  const wT = (id, re) => { const w = WORDS[id].find((x) => re.test(x.w)); if (!w) throw new Error(`word ${re} not in seg ${id}`); return w.st; };
  return {
    SEG, WORDS, CAPS, wT,
    S: (id) => SEG[id].start, E: (id) => SEG[id].end,
    sentence: (id, i) => SEG[id].sentences[i],
    chStart: (ch) => Object.values(SEG).find((s) => s.ch === ch).start,
  };
}

export function captions(el, CAPS, KEY) {
  let key = '';
  return (t, hide = false) => {
    const c = !hide && CAPS.find((c) => t >= c.st - 0.05 && t < c.hold);
    if (!c) { if (key) { el.innerHTML = ''; key = ''; } return; }
    const k = c.st + ':' + c.words.map((w) => (t >= w.st && t < w.en + 0.05 ? 1 : 0)).join('');
    if (k === key) return;
    key = k;
    el.innerHTML = c.words.map((w) => `<span class="${t >= w.st && t < w.en + 0.05 ? 'on' : KEY.test(w.w) ? 'key' : ''}">${w.w}</span>`).join(' ');
  };
}

// 3D-anchored labels
export function tagger(container, camera) {
  const pool = {};
  const fn = (name, text, p3, cls = '', opacity = 1) => {
    let el = pool[name];
    if (!el) { el = pool[name] = document.createElement('div'); container.appendChild(el); }
    if (!p3 || opacity <= 0.001) { el.style.display = 'none'; return; }
    const v = p3.clone().project(camera);
    if (v.z > 1 || v.z < -1) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.className = 'tag ' + cls;
    if (el.textContent !== text) el.textContent = text;
    el.style.left = clamp((v.x * 0.5 + 0.5) * W, 170, W - 170).toFixed(1) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * H - 30).toFixed(1) + 'px';
    el.style.opacity = clamp(opacity).toFixed(3);
  };
  fn.hideAll = () => { for (const n in pool) pool[n].style.display = 'none'; };
  return fn;
}

// chapter pill + title cards
export function chapters(names, starts) {
  return (t, endT) => {
    let chap = 0;
    starts.forEach((c, i) => { if (t >= c + 0.6) chap = i + 1; });
    show('chap', chap > 0 && t < endT ? 1 : 0);
    if (chap > 0) { $('chapN').textContent = `BAB ${chap}/${names.length}`; $('chapT').textContent = names[chap - 1]; }
    let cc = 0, cs;
    starts.forEach((c, i) => { const o = pop(t, c, c + 1.35, 0.12, 0.25); if (o > cc) { cc = o; cs = c; $('ccN').textContent = `BAB ${i + 1}`; $('ccT').textContent = names[i]; } });
    show('chcard', cc);
    $('chcard').style.transform = `scale(${cs !== undefined ? 1 + 0.15 * Math.exp(-(t - cs) * 8) : 1})`;
  };
}

// ------------------------------------------------------------------ live player
// The soundtrack is the clock: frames follow audio.currentTime, so picture and
// narration stay in sync even if the device drops frames.
export function startPlayer({ renderAt, duration, audioUrl, chapters: chs = [] }) {
  window.renderAt = renderAt;
  window.DURATION = duration;
  if (RENDER) { window.READY = true; return; }
  const ui = $('player');
  ui.style.display = '';
  $('bigPlay').style.display = '';
  const btn = $('playBtn'), bar = $('pBar'), fill = $('pFill'), tl = $('pTime'), big = $('bigPlay');
  bar.insertAdjacentHTML('beforeend', chs.map((c) => `<i style="left:${(c / duration) * 100}%"></i>`).join(''));
  const audio = new Audio();
  audio.preload = 'auto';
  let ready = false, clock0 = null, clockT = 0, playing = false;
  fetch(audioUrl).then((r) => r.blob()).then((b) => { audio.src = URL.createObjectURL(b); ready = true; $('loadMsg').textContent = ''; })
    .catch(() => { $('loadMsg').textContent = 'Suara gagal dimuat, animasi tetap bisa diputar.'; });
  const now = () => (ready && !audio.paused ? audio.currentTime : playing ? clockT + (performance.now() - clock0) / 1000 : clockT);
  const play = () => {
    playing = true; clock0 = performance.now();
    if (ready) { audio.currentTime = clockT; audio.play().catch(() => {}); }
    big.style.display = 'none'; btn.textContent = '❚❚';
  };
  const pause = () => { clockT = now(); playing = false; audio.pause(); btn.textContent = '▶'; };
  const seek = (t) => { clockT = clamp(t, 0, duration - 0.01); clock0 = performance.now(); if (ready) audio.currentTime = clockT; };
  big.addEventListener('click', (e) => { e.stopPropagation(); play(); });
  big.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); play(); } });
  btn.addEventListener('click', (e) => { e.stopPropagation(); playing ? pause() : play(); });
  $('stage').addEventListener('click', (e) => { if (e.target.closest('#player')) return; if (big.style.display !== 'none') play(); else (playing ? pause() : play()); });
  bar.addEventListener('click', (e) => { const r = bar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration); });
  addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'ArrowRight') seek(now() + 5);
    if (e.key === 'ArrowLeft') seek(now() - 5);
  });
  audio.addEventListener('ended', () => { pause(); clockT = 0; big.style.display = ''; });
  const start = parseFloat(qs.get('t') || '0');
  if (start) seek(start);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const loop = () => {
    let t = now();
    if (playing && t >= duration) { pause(); clockT = 0; t = 0; big.style.display = ''; }
    renderAt(t);
    fill.style.width = `${(t / duration) * 100}%`;
    tl.textContent = `${fmt(t)} / ${fmt(duration)}`;
    requestAnimationFrame(loop);
  };
  loop();
  window.READY = true;
}
