// The physical "story" of the simulation as pure functions of world time t (seconds).
// Everything (JS objects and GLSL water) reads from here so the frames are deterministic.
import { clamp, kf, lerp, smoothstep } from './util.js';

// ---------------------------------------------------------------- terrain
// z < 0 is the sea, z > 0 is land. The town sits on z = 25..160, an evacuation
// hill rises behind it at (-45, 215).
export const HILL = { x: -45, z: 215, h: 40, rx: 58, rz: 46 };

export function hillH(x, z) {
  const dx = (x - HILL.x) / HILL.rx, dz = (z - HILL.z) / HILL.rz;
  return HILL.h * Math.exp(-(dx * dx + dz * dz));
}

export function baseH(x, z) {
  let h;
  if (z < 0) h = Math.max(-30, z * 0.04); // gentle seabed: z=-175 -> -7 m
  else h = Math.min(1.6, z * 0.12) + Math.max(0, z - 20) * 0.012;
  if (z > 240) h += (z - 240) * 0.18; // hills far behind town
  const side = Math.max(0, Math.abs(x) - 175); // headlands framing the bay
  h += Math.min(70, side * side * 0.006) * smoothstep(-420, -80, z);
  return h + hillH(x, z);
}

// Same shape in GLSL (no noise) for shoreline foam in the water shader.
export const GLSL_TERRAIN = /* glsl */ `
float hillH(vec2 p){ vec2 d = (p - vec2(${HILL.x.toFixed(1)}, ${HILL.z.toFixed(1)})) / vec2(${HILL.rx.toFixed(1)}, ${HILL.rz.toFixed(1)}); return ${HILL.h.toFixed(1)} * exp(-dot(d,d)); }
float terrainH(vec2 p){
  float h = p.y < 0.0 ? max(-30.0, p.y * 0.04) : min(1.6, p.y * 0.12) + max(0.0, p.y - 20.0) * 0.012;
  if (p.y > 240.0) h += (p.y - 240.0) * 0.18;
  float side = max(0.0, abs(p.x) - 175.0);
  h += min(70.0, side * side * 0.006) * smoothstep(-420.0, -80.0, p.y);
  return h + hillH(p);
}`;

// ---------------------------------------------------------------- tsunami
// Front position F (z of the bore front), crest amplitude A, sea level ahead of the
// front L (the draw-down), water level behind the front B.
export const T_QUAKE = 16.55; // fault rupture ("patah!")
export const T_IMPACT = 40.8; // wave hits the shoreline

export function seaParams(t) {
  // draw-down: the sea retreats before the wave arrives
  const L = -7.2 * smoothstep(23.6, 30.2, t) + 0.0;
  let F;
  if (t < 30.75) F = -4000;
  else if (t < T_IMPACT) {
    const k = (t - 30.75) / (T_IMPACT - 30.75);
    F = -1500 + 1500 * Math.pow(k, 0.85);
  } else F = 270 * (1 - Math.pow(1 - clamp((t - T_IMPACT) / 6.0), 2.2));
  const A = kf(t, [[30.75, 5], [34, 8], [37.5, 16], [40.2, 30], [40.9, 26], [41.8, 10], [43.5, 4.5], [46, 1.6], [48, 0.6]]);
  const Wf = kf(t, [[30.75, 40], [38, 14], [40.5, 9]]);
  const Wb = kf(t, [[30.75, 120], [38, 45], [40.5, 26], [43, 40]]);
  // flood level (absolute height of the water inside the town)
  const P = kf(t, [[40.6, 5.5], [42.4, 3.7], [45.4, 4.0], [46.25, 4.9], [47.1, 7.9], [47.95, 10.6], [50.5, 12.0], [60, 12.6]]);
  const B = lerp(1.2, P, smoothstep(40.4, 41.3, t));
  const chop = 1 + 1.6 * smoothstep(40.5, 42.5, t);
  const mud = smoothstep(40.6, 43.5, t);
  return { L, F, A, Wf, Wb, B, chop, mud };
}

// front is slightly curved / wobbly along x so it does not look like a ruler
export const frontAt = (F, x) => F - 0.00025 * x * x + 6 * Math.sin(x * 0.013 + 1.7);

export function ripple(x, z, t, chop) {
  const fade = 1 - smoothstep(350, 700, Math.hypot(x, z + 100));
  return fade * chop * (0.22 * Math.sin(0.08 * x + 0.11 * z - 1.3 * t) +
    0.15 * Math.sin(-0.13 * x + 0.07 * z - 1.7 * t) +
    0.09 * Math.sin(0.21 * x + 0.19 * z - 2.3 * t));
}

export function waterH(x, z, t, sp = seaParams(t)) {
  const u = z - frontAt(sp.F, x);
  const s = 1 / (1 + Math.exp(clamp(u / 7, -40, 40)));
  const w = u > 0 ? sp.Wf : sp.Wb;
  const crest = sp.A * Math.exp(-(u / w) * (u / w));
  return sp.L + (sp.B - sp.L) * s + crest + ripple(x, z, t, sp.chop);
}

export const GLSL_WATER = /* glsl */ `
uniform float uTime, uL, uF, uA, uWf, uWb, uB, uChop;
float frontAt(float x){ return uF - 0.00025 * x * x + 6.0 * sin(x * 0.013 + 1.7); }
float ripple(vec2 p){
  float fade = 1.0 - smoothstep(350.0, 700.0, length(p + vec2(0.0, 100.0)));
  return fade * uChop * (0.22 * sin(0.08 * p.x + 0.11 * p.y - 1.3 * uTime) +
    0.15 * sin(-0.13 * p.x + 0.07 * p.y - 1.7 * uTime) +
    0.09 * sin(0.21 * p.x + 0.19 * p.y - 2.3 * uTime));
}
// returns height, writes crest factor (0..1)
float waterH(vec2 p, out float crestK){
  float u = p.y - frontAt(p.x);
  float s = 1.0 / (1.0 + exp(clamp(u / 7.0, -40.0, 40.0)));
  float w = u > 0.0 ? uWf : uWb;
  float g = exp(-(u / w) * (u / w));
  crestK = g * smoothstep(2.0, 12.0, uA);
  return uL + (uB - uL) * s + uA * g + ripple(p);
}`;

// ---------------------------------------------------------------- mood / light
// keyframed palette: sky zenith, sky horizon, sun color, sun intensity, fog density, cloud cover
export function mood(t) {
  const keys = (sel) => kf(t, MOOD.map(([tt, m]) => [tt, m[sel]]));
  return {
    zenith: keys('zenith'), horizon: keys('horizon'), sun: keys('sun'),
    sunI: keys('sunI'), hemi: keys('hemi'), fog: keys('fog'), clouds: keys('clouds'),
  };
}
const MOOD = [
  [0, { zenith: [0.22, 0.45, 0.78], horizon: [1.0, 0.80, 0.62], sun: [1.0, 0.86, 0.66], sunI: 2.7, hemi: 1.05, fog: 0.00055, clouds: 0.25 }],
  [17, { zenith: [0.22, 0.45, 0.78], horizon: [1.0, 0.80, 0.62], sun: [1.0, 0.86, 0.66], sunI: 2.7, hemi: 1.05, fog: 0.00055, clouds: 0.3 }],
  [22, { zenith: [0.30, 0.40, 0.55], horizon: [0.90, 0.78, 0.66], sun: [1.0, 0.82, 0.65], sunI: 2.2, hemi: 1.0, fog: 0.0009, clouds: 0.45 }],
  [30, { zenith: [0.30, 0.38, 0.50], horizon: [0.80, 0.76, 0.72], sun: [0.95, 0.85, 0.75], sunI: 1.9, hemi: 0.95, fog: 0.0006, clouds: 0.6 }],
  [38, { zenith: [0.20, 0.25, 0.33], horizon: [0.58, 0.62, 0.66], sun: [0.85, 0.88, 0.95], sunI: 1.4, hemi: 0.9, fog: 0.0006, clouds: 0.85 }],
  [50, { zenith: [0.24, 0.29, 0.37], horizon: [0.62, 0.65, 0.68], sun: [0.9, 0.9, 0.95], sunI: 1.5, hemi: 0.95, fog: 0.0008, clouds: 0.8 }],
  [60, { zenith: [0.30, 0.38, 0.50], horizon: [0.85, 0.75, 0.65], sun: [1.0, 0.85, 0.7], sunI: 1.9, hemi: 1.0, fog: 0.0007, clouds: 0.6 }],
];

// ground shaking intensity in the town (0..1)
export function shakeAt(t) {
  if (t < T_QUAKE) return 0;
  return clamp(smoothstep(T_QUAKE, T_QUAKE + 0.4, t) * (1 - smoothstep(19.5, 23.3, t)) + 0.0);
}
