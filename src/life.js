// Signs of life for the ANDAI… episodes: stylised people with simple faces and poses,
// animals (birds, egrets, cats, chickens, water buffalo, butterflies), motorbikes (ojek),
// angkot, a snowman and a campfire. Everything is procedural and animated from time t.
import * as THREE from 'three';
import { clamp, lerp, mulberry32 } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const cache = new Map();
const mat = (rgb, extra = {}) => {
  const key = rgb.join(',') + JSON.stringify(extra);
  if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color: lin(...rgb), ...extra }));
  return cache.get(key);
};
const G = {
  leg: (() => { const g = new THREE.CapsuleGeometry(0.1, 0.62, 3, 8); g.translate(0, -0.42, 0); return g; })(),
  arm: (() => { const g = new THREE.CapsuleGeometry(0.075, 0.46, 3, 8); g.translate(0, -0.3, 0); return g; })(),
  torso: new THREE.CapsuleGeometry(0.21, 0.42, 4, 10),
  jacket: new THREE.CapsuleGeometry(0.26, 0.46, 4, 10),
  head: new THREE.SphereGeometry(0.17, 16, 12),
  eye: new THREE.SphereGeometry(0.024, 6, 6),
  hair: new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hijab: new THREE.SphereGeometry(0.205, 16, 12, Math.PI * 0.72, Math.PI * 1.56),
  caping: new THREE.ConeGeometry(0.42, 0.2, 18),
  beanie: new THREE.SphereGeometry(0.185, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  helmet: new THREE.SphereGeometry(0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
  scarf: new THREE.TorusGeometry(0.13, 0.05, 6, 14),
};
const SKINS = [[0.62, 0.43, 0.3], [0.55, 0.37, 0.25], [0.7, 0.5, 0.36], [0.47, 0.32, 0.22]];
const SHIRTS = [[0.9, 0.2, 0.2], [0.2, 0.45, 0.9], [0.95, 0.95, 0.95], [0.2, 0.7, 0.4], [0.95, 0.75, 0.15], [0.6, 0.3, 0.7], [0.95, 0.5, 0.6], [0.15, 0.6, 0.7]];
const PANTS = [[0.15, 0.15, 0.2], [0.25, 0.3, 0.45], [0.35, 0.28, 0.2], [0.5, 0.5, 0.55]];
const JACKETS = [[0.8, 0.15, 0.15], [0.15, 0.3, 0.7], [0.95, 0.6, 0.1], [0.2, 0.5, 0.3], [0.5, 0.5, 0.55]];

// ------------------------------------------------------------------ person
export class Person {
  constructor(R, o = {}) {
    const root = (this.root = new THREE.Group());
    const skin = mat(SKINS[Math.floor(R() * SKINS.length)]);
    const shirt = mat(o.shirt || SHIRTS[Math.floor(R() * SHIRTS.length)]);
    const pants = mat(PANTS[Math.floor(R() * PANTS.length)]);
    this.body = new THREE.Group(); this.body.position.y = 0.9; root.add(this.body);
    this.legs = [-0.11, 0.11].map((x) => { const l = new THREE.Mesh(G.leg, pants); l.position.set(x, 0.9, 0); root.add(l); return l; });
    this.torso = new THREE.Mesh(G.torso, shirt); this.torso.position.y = 0.33; this.body.add(this.torso);
    this.jacket = new THREE.Mesh(G.jacket, mat(JACKETS[Math.floor(R() * JACKETS.length)])); this.jacket.position.y = 0.33; this.jacket.visible = false; this.body.add(this.jacket);
    this.arms = [-0.29, 0.29].map((x) => { const a = new THREE.Mesh(G.arm, shirt); a.position.set(x, 0.56, 0); this.body.add(a); return a; });
    this.head = new THREE.Group(); this.head.position.y = 0.85; this.body.add(this.head);
    this.head.add(new THREE.Mesh(G.head, skin));
    for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(G.eye, mat([0.05, 0.05, 0.05])); e.position.set(x, 0.03, 0.155); this.head.add(e); }
    const hat = o.hat ?? (R() < 0.25 ? 'hijab' : R() < 0.15 ? 'caping' : 'hair');
    this.hat = hat;
    if (hat === 'hijab') this.head.add(new THREE.Mesh(G.hijab, mat(SHIRTS[Math.floor(R() * SHIRTS.length)])));
    else if (hat === 'caping') { const c = new THREE.Mesh(G.caping, mat([0.85, 0.72, 0.45])); c.position.y = 0.17; this.head.add(c); }
    else if (hat === 'peci') { const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.12, 16), mat([0.06, 0.06, 0.07])); pc.position.y = 0.12; this.head.add(pc); }
    else if (hat === 'sombrero') { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 18), mat([0.92, 0.85, 0.65])); br.position.y = 0.1; const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.2, 14), mat([0.92, 0.85, 0.65])); cr.position.y = 0.2; const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.05, 14), mat([0.1, 0.1, 0.1])); band.position.y = 0.14; this.head.add(br, cr, band); }
    else if (hat === 'helmet') { const c = new THREE.Mesh(G.helmet, mat([0.1, 0.5, 0.2])); c.position.y = 0.02; this.head.add(c); }
    else { const h = new THREE.Mesh(G.hair, mat([0.08, 0.06, 0.05])); h.rotation.x = -0.3; this.head.add(h); }
    this.beanie = new THREE.Mesh(G.beanie, mat(JACKETS[Math.floor(R() * JACKETS.length)])); this.beanie.position.y = 0.04; this.beanie.visible = false; this.head.add(this.beanie);
    this.scarf = new THREE.Mesh(G.scarf, mat([0.85, 0.1, 0.15])); this.scarf.rotation.x = Math.PI / 2; this.scarf.position.y = 0.68; this.scarf.visible = false; this.body.add(this.scarf);
    // umbrella (held in the right hand)
    this.umbrella = new THREE.Group();
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.3, 10, 1, true), mat(SHIRTS[Math.floor(R() * SHIRTS.length)], { side: THREE.DoubleSide }));
    canopy.position.y = 1.05;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 4), mat([0.2, 0.2, 0.2])); stick.position.y = 0.5;
    this.umbrella.add(canopy, stick);
    this.umbrella.position.set(0, -0.55, 0.1);
    this.umbrella.rotation.x = Math.PI;
    this.umbrella.visible = false;
    this.arms[1].add(this.umbrella);
    this.ph = R() * 10;
    this.scale = o.scale ?? (0.92 + R() * 0.16);
    root.scale.setScalar(this.scale);
  }
  winter(on) { this.jacket.visible = on; this.torso.visible = !on; this.beanie.visible = on && this.hat === 'hair'; this.scarf.visible = on; }
  // pose: walk | run | idle | wave | lookUp | shiver | fan | bend | sit | throw | point | umbrella | cheer
  pose(t, p, speed = 1) {
    const w = (t + this.ph) * speed;
    const L = this.legs, A = this.arms, B = this.body, Hd = this.head;
    L[0].rotation.set(0, 0, 0); L[1].rotation.set(0, 0, 0); A[0].rotation.set(0, 0, 0.12); A[1].rotation.set(0, 0, -0.12);
    B.rotation.set(0, 0, 0); B.position.y = 0.9; Hd.rotation.set(0, 0, 0);
    this.umbrella.visible = p === 'umbrella';
    if (p === 'walk' || p === 'umbrella') {
      const s = Math.sin(w * 7);
      L[0].rotation.x = 0.5 * s; L[1].rotation.x = -0.5 * s; A[0].rotation.x = -0.4 * s;
      if (p === 'walk') A[1].rotation.x = 0.4 * s; else { A[1].rotation.x = -1.25; A[1].rotation.z = -0.25; }
      B.position.y = 0.9 + Math.abs(Math.cos(w * 7)) * 0.04;
    } else if (p === 'run') {
      const s = Math.sin(w * 11);
      L[0].rotation.x = 0.9 * s; L[1].rotation.x = -0.9 * s; A[0].rotation.x = -0.9 * s; A[1].rotation.x = 0.9 * s;
      B.rotation.x = 0.22; B.position.y = 0.9 + Math.abs(Math.cos(w * 11)) * 0.08;
    } else if (p === 'wave') {
      A[1].rotation.z = -2.6 + 0.35 * Math.sin(w * 9); Hd.rotation.z = 0.08 * Math.sin(w * 2);
    } else if (p === 'lookUp') {
      Hd.rotation.x = -0.6; A[0].rotation.set(-1.0, 0, 0.5); A[1].rotation.set(-1.0, 0, -0.5); B.position.y = 0.9 + 0.02 * Math.sin(w * 2);
    } else if (p === 'shiver') {
      A[0].rotation.set(-0.9, 0, -0.9); A[1].rotation.set(-0.9, 0, 0.9); B.rotation.z = 0.03 * Math.sin(w * 40); Hd.rotation.x = 0.25;
    } else if (p === 'fan') {
      A[1].rotation.set(-2.2, 0, -0.3 + 0.35 * Math.sin(w * 14)); Hd.rotation.x = -0.1; B.rotation.z = 0.04 * Math.sin(w * 3);
    } else if (p === 'bend') {
      B.rotation.x = 1.05; B.position.y = 0.88; Hd.rotation.x = -0.6;
      A[0].rotation.x = -0.4 + 0.35 * Math.sin(w * 3); A[1].rotation.x = -0.4 - 0.35 * Math.sin(w * 3);
      L[0].rotation.x = -0.15; L[1].rotation.x = 0.1;
    } else if (p === 'sit') {
      L[0].rotation.x = -1.5; L[1].rotation.x = -1.5; B.position.y = 0.45; this.root.position.y -= 0.0;
      A[0].rotation.set(-0.7, 0, -0.5); A[1].rotation.set(-0.7, 0, 0.5); Hd.rotation.x = 0.05 * Math.sin(w * 1.5);
    } else if (p === 'throw') {
      const c = (w * 1.2) % 1;
      A[1].rotation.x = c < 0.6 ? lerp(0.6, -2.6, c / 0.6) : lerp(-2.6, 0.9, (c - 0.6) / 0.4);
      B.rotation.y = 0.3 * Math.sin(c * Math.PI * 2); L[0].rotation.x = 0.3; L[1].rotation.x = -0.2;
    } else if (p === 'point') {
      A[1].rotation.set(-1.9, 0, -0.1); Hd.rotation.x = -0.35;
    } else if (p === 'cheer') {
      const j = Math.abs(Math.sin(w * 6));
      A[0].rotation.z = 2.6; A[1].rotation.z = -2.6; B.position.y = 0.9 + j * 0.18; L[0].rotation.x = -0.3 * j; L[1].rotation.x = -0.3 * j;
    } else if (p === 'row') {
      const c = Math.sin(w * 4);
      A[0].rotation.set(-1.3 + 0.5 * c, 0, 0.35); A[1].rotation.set(-1.3 + 0.5 * c, 0, -0.35); B.rotation.x = 0.25 * c;
      L[0].rotation.x = -1.5; L[1].rotation.x = -1.5; B.position.y = 0.45;
    } else if (p === 'dig') {
      const c = (w * 1.1) % 1;
      B.rotation.x = 0.7 + 0.25 * Math.sin(c * Math.PI * 2); Hd.rotation.x = -0.4;
      A[0].rotation.x = -0.9 + 0.8 * Math.sin(c * Math.PI * 2); A[1].rotation.x = A[0].rotation.x; L[0].rotation.x = -0.6; L[1].rotation.x = 0.3; B.position.y = 0.75;
    } else if (p === 'crouch') {
      B.position.y = 0.7; B.rotation.x = 0.35; L[0].rotation.x = -0.9; L[1].rotation.x = -0.9; A[0].rotation.set(0.7, 0, 0.2); A[1].rotation.set(0.7, 0, -0.2);
    } else if (p === 'air') {
      A[0].rotation.z = 2.7; A[1].rotation.z = -2.7; L[0].rotation.x = -0.35; L[1].rotation.x = -0.25; Hd.rotation.x = -0.15;
    } else if (p === 'ears') {
      A[0].rotation.set(-0.6, 0, 2.25); A[1].rotation.set(-0.6, 0, -2.25); Hd.rotation.z = 0.12 * Math.sin(w * 9); B.rotation.x = 0.15;
    } else if (p === 'clap') {
      const c = Math.sin(w * 14);
      A[0].rotation.set(-1.2, 0, -0.35 + 0.3 * c); A[1].rotation.set(-1.2, 0, 0.35 - 0.3 * c);
    } else { // idle
      B.position.y = 0.9 + 0.012 * Math.sin(w * 2); Hd.rotation.y = 0.3 * Math.sin(w * 0.4);
    }
  }
}

// synchronized jump: p in [0,1) -> crouch, take-off, ~0.45 m in the air, landing
export function jumpState(p, h = 0.45) {
  if (p < 0 || p >= 1) return { y: 0, pose: null };
  if (p < 0.3) return { y: 0, pose: 'crouch' };
  if (p < 0.7) { const u = (p - 0.3) / 0.4; return { y: h * 4 * u * (1 - u), pose: 'air' }; }
  return { y: 0, pose: 'crouch' };
}

// ------------------------------------------------------------------ animals
export class Bird {
  constructor(color = [0.15, 0.15, 0.18], size = 1) {
    this.root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(color)); body.scale.set(1, 0.8, 2.2);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.7, 0, -0.05], 3)); wg.computeVertexNormals();
    this.w1 = new THREE.Mesh(wg, mat(color, { side: THREE.DoubleSide })); this.w2 = this.w1.clone(); this.w2.scale.x = -1;
    this.root.add(body, this.w1, this.w2);
    this.root.scale.setScalar(size);
  }
  flap(t, rate = 9) { const a = 0.7 * Math.sin(t * rate); this.w1.rotation.z = a; this.w2.rotation.z = -a; }
}

export class Flock {
  constructor(scene, n, o) {
    const R = mulberry32(o.seed || 1);
    this.o = o;
    this.birds = Array.from({ length: n }, () => { const b = new Bird(o.color, o.size || 1); scene.add(b.root); return { b, a: R() * 6.28, r: o.r * (0.7 + R() * 0.6), h: o.h + R() * 6, sp: 0.25 + R() * 0.15, ph: R() * 6, rate: 8 + R() * 3 }; });
  }
  update(t, vis = 1, scatter = 0) {
    for (const q of this.birds) {
      q.b.root.visible = vis > 0;
      if (!vis) continue;
      const a = q.a + t * q.sp;
      const out = 1 + scatter * 6;
      const x = this.o.c.x + Math.cos(a) * q.r * out, z = this.o.c.z + Math.sin(a) * q.r * out, y = q.h + Math.sin(t * 0.7 + q.ph) * 2 + scatter * 25;
      q.b.root.position.set(x, y, z);
      q.b.root.rotation.y = -a; // tangent of the circle
      q.b.flap(t + q.ph, q.rate * (1 + scatter));
    }
  }
}

export function makeCat(R) {
  const c = [[0.95, 0.6, 0.2], [0.2, 0.2, 0.2], [0.95, 0.95, 0.92], [0.55, 0.45, 0.4]][Math.floor(R() * 4)];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.32, 3, 8), mat(c)); body.rotation.z = Math.PI / 2; body.rotation.y = Math.PI / 2; body.position.y = 0.22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(c)); head.position.set(0, 0.34, 0.27);
  for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), mat(c)); e.position.set(x, 0.45, 0.27); g.add(e); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.3, 2, 4), mat(c)); tail.position.set(0, 0.35, -0.3); tail.rotation.x = -0.6;
  for (const [x, z] of [[-0.07, 0.14], [0.07, 0.14], [-0.07, -0.14], [0.07, -0.14]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), mat(c)); l.position.set(x, 0.1, z); g.add(l); }
  g.add(body, head, tail);
  g.userData = { tail, head };
  return g;
}

export function makeChicken(R) {
  const g = new THREE.Group();
  const c = R() < 0.5 ? [0.95, 0.93, 0.88] : [0.6, 0.32, 0.15];
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(c)); body.scale.set(0.9, 0.9, 1.2); body.position.y = 0.22;
  const head = new THREE.Group(); head.position.set(0, 0.38, 0.14);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(c)));
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.08), mat([0.85, 0.1, 0.1])); comb.position.y = 0.07; head.add(comb);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), mat([0.95, 0.7, 0.1])); beak.rotation.x = Math.PI / 2; beak.position.z = 0.08; head.add(beak);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), mat(c)); tail.position.set(0, 0.32, -0.18); tail.rotation.x = -0.8;
  g.add(body, head, tail);
  g.userData = { head };
  return g;
}

export function makeKerbau() {
  const g = new THREE.Group();
  const c = mat([0.28, 0.27, 0.28]);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 4, 10), c); body.rotation.x = Math.PI / 2; body.position.y = 1.05;
  const head = new THREE.Group(); head.position.set(0, 1.15, 1.15);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.6), c); skull.position.z = 0.15; head.add(skull);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 12, Math.PI * 0.8), mat([0.85, 0.8, 0.7])); h.position.set(s * 0.25, 0.25, 0); h.rotation.set(0, Math.PI / 2, s > 0 ? 0.3 : Math.PI - 0.3); head.add(h); }
  g.add(body, head);
  for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.8, 6), c); l.position.set(x, 0.4, z); g.add(l); }
  const snow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.4), mat([0.96, 0.97, 1])); snow.position.y = 1.62; snow.visible = false; g.add(snow);
  g.userData = { head, snow };
  return g;
}

export function makeEgret() {
  const g = new THREE.Group();
  const w = mat([0.97, 0.97, 0.95]);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), w); body.scale.set(0.8, 0.9, 1.5); body.position.y = 0.65;
  const neck = new THREE.Group(); neck.position.set(0, 0.72, 0.15);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 5), w); n.position.y = 0.2; neck.add(n);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), w); hd.position.y = 0.42; neck.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 4), mat([0.95, 0.75, 0.15])); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.42, 0.1); neck.add(bk);
  for (const x of [-0.05, 0.05]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4), mat([0.2, 0.2, 0.2])); l.position.set(x, 0.28, 0); g.add(l); }
  g.add(body, neck);
  g.userData = { neck };
  return g;
}

export function makeButterfly(R) {
  const g = new THREE.Group();
  const c = [[1, 0.8, 0.1], [1, 0.5, 0.1], [0.3, 0.6, 1], [1, 1, 1]][Math.floor(R() * 4)];
  const wg = new THREE.PlaneGeometry(0.12, 0.1); wg.translate(0.06, 0, 0);
  const w1 = new THREE.Mesh(wg, mat(c, { side: THREE.DoubleSide })), w2 = w1.clone(); w2.scale.x = -1;
  g.add(w1, w2);
  g.userData = { w1, w2 };
  return g;
}

export function makeMotorbike(R) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.3), mat([[0.85, 0.1, 0.1], [0.1, 0.1, 0.12], [0.1, 0.35, 0.85], [0.95, 0.95, 0.95]][Math.floor(R() * 4)]));
  body.position.y = 0.55;
  const wheel = new THREE.TorusGeometry(0.26, 0.07, 6, 12);
  for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(wheel, mat([0.08, 0.08, 0.08])); w.rotation.y = Math.PI / 2; w.position.set(0, 0.3, z); g.add(w); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), mat([0.2, 0.2, 0.2])); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.0, 0.45);
  g.add(body, bar);
  const rider = new Person(R, { hat: 'helmet', scale: 1 });
  rider.root.position.set(0, 0.2, -0.05);
  g.add(rider.root);
  g.userData = { rider };
  return g;
}

export function makeAngkot(R) {
  const g = new THREE.Group();
  const c = [[0.1, 0.45, 0.85], [0.15, 0.65, 0.3], [0.9, 0.2, 0.2], [0.95, 0.75, 0.1]][Math.floor(R() * 4)];
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 3.8), mat(c)); body.position.y = 1.1;
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.5, 3.0), mat([0.15, 0.2, 0.25])); win.position.set(0, 1.5, -0.2);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.05), mat([0.25, 0.32, 0.38])); ws.position.set(0, 1.45, 1.91);
  g.add(body, win, ws);
  for (const [x, z] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), mat([0.08, 0.08, 0.08])); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w); }
  return g;
}

export function makeSnowman() {
  const g = new THREE.Group();
  const w = mat([0.97, 0.98, 1]);
  [[0.55, 0.5], [0.4, 1.3], [0.28, 1.88]].forEach(([r, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), w); s.position.y = y; g.add(s); });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), mat([1, 0.5, 0.1])); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.88, 0.36); g.add(nose);
  for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), mat([0.05, 0.05, 0.05])); e.position.set(x, 1.97, 0.25); g.add(e); }
  const sc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 16), mat([0.85, 0.1, 0.15])); sc.rotation.x = Math.PI / 2; sc.position.y = 1.62; g.add(sc);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), mat([0.35, 0.22, 0.12])); a.rotation.z = s * 1.0; a.position.set(s * 0.65, 1.45, 0); g.add(a); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), mat([0.1, 0.1, 0.12])); hat.position.y = 2.25; g.add(hat);
  return g;
}

export function makeFire() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5), mat([0.35, 0.22, 0.12])); l.rotation.set(Math.PI / 2, 0, (i / 4) * Math.PI); l.position.y = 0.1; g.add(l); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 10), new THREE.MeshBasicMaterial({ color: 0xffa030 }));
  flame.position.y = 0.6;
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xffee90 }));
  core.position.y = 0.45;
  const light = new THREE.PointLight(0xff9a40, 0, 18, 1.5);
  light.position.y = 1.2;
  g.add(flame, core, light);
  g.userData = { flame, core, light };
  return g;
}

export function makePenguin() {
  const g = new THREE.Group();
  const black = mat([0.08, 0.08, 0.1]), white = mat([0.96, 0.96, 0.96]), orange = mat([1, 0.6, 0.1]);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 10), black); body.position.y = 0.42;
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10), white); belly.position.set(0, 0.4, 0.08);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), black); head.position.y = 0.82;
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.8, 0.16);
  for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), white); e.position.set(x, 0.86, 0.12); g.add(e); }
  const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 2, 6), black); w.position.set(s * 0.23, 0.48, 0); g.add(w); return w; });
  for (const x of [-0.08, 0.08]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.16), orange); f.position.set(x, 0.02, 0.06); g.add(f); }
  g.add(body, belly, head, beak);
  g.userData = { wings };
  return g;
}

export function makeRowBoat(R, n = 2) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 4.2, 1, 1, 4), mat([[0.75, 0.45, 0.2], [0.2, 0.45, 0.75], [0.85, 0.2, 0.15]][Math.floor(R() * 3)]));
  const hp = hull.geometry.attributes.position;
  for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i), y = hp.getY(i); let x = hp.getX(i); if (y < 0) x *= 0.5; x *= 1 - 0.7 * Math.max(0, Math.abs(z) - 1.2) / 0.9; hp.setX(i, x); }
  hull.geometry.computeVertexNormals();
  hull.position.y = 0.2;
  g.add(hull);
  const crew = [];
  for (let i = 0; i < n; i++) { const p = new Person(R, { scale: i === n - 1 && n > 2 ? 0.7 : 1 }); p.root.position.set(0, 0.05, -1.2 + i * 1.2); g.add(p.root); crew.push(p); }
  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), mat([0.5, 0.35, 0.2]));
  oar.rotation.z = Math.PI / 2.6; oar.position.set(0.6, 0.6, -1.2);
  g.add(oar);
  g.userData = { crew, oar };
  return g;
}

export function makeTent(R) {
  const t = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 4), mat([[0.95, 0.5, 0.1], [0.15, 0.5, 0.8], [0.2, 0.6, 0.3]][Math.floor(R() * 3)]));
  t.rotation.y = Math.PI / 4; t.position.y = 0.8; t.scale.z = 1.4;
  const g = new THREE.Group(); g.add(t); return g;
}

// ------------------------------------------------------------------ city lights for the globe night side
export const CITIES = [[-6.2, 106.8], [-7.25, 112.75], [3.6, 98.7], [-6.9, 107.6], [-5.1, 119.4], [-0.95, 100.35], [-8.65, 115.2], [-3.0, 104.75], [1.1, 104.0], [-0.5, 117.15],
  [35.7, 139.7], [34.7, 135.5], [37.5, 127.0], [39.9, 116.4], [31.2, 121.5], [22.3, 114.2], [23.1, 113.3], [30.6, 114.3], [25.0, 121.5], [14.6, 121.0], [13.75, 100.5], [10.8, 106.7], [21.0, 105.8], [1.35, 103.8], [3.15, 101.7], [16.8, 96.2],
  [28.6, 77.2], [19.1, 72.9], [13.1, 80.3], [22.6, 88.4], [12.97, 77.6], [23.8, 90.4], [24.9, 67.0], [31.5, 74.3], [35.7, 51.4], [25.2, 55.3], [24.7, 46.7], [30.0, 31.2], [41.0, 29.0],
  [51.5, -0.1], [48.9, 2.35], [52.5, 13.4], [40.4, -3.7], [41.9, 12.5], [55.75, 37.6], [59.9, 30.3], [50.45, 30.5], [52.2, 21.0], [45.5, 9.2], [53.5, 10.0], [59.3, 18.1],
  [6.5, 3.4], [-1.3, 36.8], [-26.2, 28.0], [-33.9, 18.4], [9.0, 38.7], [5.6, -0.2], [14.7, -17.4], [33.6, -7.6], [36.8, 3.0],
  [40.7, -74.0], [34.05, -118.25], [41.9, -87.6], [29.8, -95.4], [25.8, -80.2], [43.7, -79.4], [45.5, -73.6], [49.3, -123.1], [19.4, -99.1], [33.75, -84.4], [47.6, -122.3], [39.7, -105.0],
  [-23.5, -46.6], [-22.9, -43.2], [-34.6, -58.4], [-12.05, -77.05], [4.7, -74.1], [-33.45, -70.65], [10.5, -66.9], [-15.8, -47.9],
  [-33.9, 151.2], [-37.8, 145.0], [-27.5, 153.0], [-31.95, 115.9], [-36.85, 174.75]];
