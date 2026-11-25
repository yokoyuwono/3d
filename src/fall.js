// Scenes for "Kalau kamu jatuh dari pesawat tanpa parasut":
//  SkyFall    the faller stays at the origin; the ground, clouds and the airliner move around them (units: metres)
//  SnowSlope  a forested snowy slope with a broken fuselage section (Vesna Vulović, 1972)
//  Jungle     Amazon rainforest by a river: a girl walking out, fishermen in a boat (Juliane Koepcke, 1971)
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person, Flock, makeRowBoat } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });
const puffTex = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) { const x = 40 + (i % 4) * 16, y = 54 + Math.floor(i / 4) * 18, r = 30 + (i % 3) * 8; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

function airliner() {
  const g = new THREE.Group();
  const white = M([0.95, 0.95, 0.97]), blue = M([0.15, 0.3, 0.7]);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 16), white); body.rotation.z = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 10), white); nose.scale.set(2, 1, 1); nose.position.x = 20; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 36), white); wing.position.set(2, -0.8, 0); wing.rotation.y = 0.15; g.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.4), blue); fin.position.set(-18, 4, 0); g.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 12), white); tail.position.set(-18, 0.5, 0); g.add(tail);
  for (const z of [-7, 7]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 12), M([0.6, 0.62, 0.66])); e.rotation.z = Math.PI / 2; e.position.set(4, -2, z); g.add(e); }
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 30, 16, 1, true, -0.5, 1), blue); stripe.rotation.z = Math.PI / 2; g.add(stripe);
  return g;
}
export function fuselageChunk() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 7, 18, 1, true, 0, Math.PI * 1.6), M([0.92, 0.92, 0.94], { side: THREE.DoubleSide })); shell.rotation.z = Math.PI / 2; g.add(shell);
  for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide })); w.position.set(-2.8 + i * 1.4, 0.6, 2.02); g.add(w); }
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), M([0.75, 0.76, 0.8])); trolley.position.set(0.8, -1.2, 0); g.add(trolley);
  return g;
}
function seat() {
  const g = new THREE.Group();
  const m = M([0.2, 0.3, 0.55]);
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), m); s.position.y = 0.45; g.add(s);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.15), m); b.position.set(0, 0.85, -0.28); g.add(b);
  return g;
}

export class SkyFall {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(); s.background = this.bg;
    s.fog = new THREE.Fog(0x9cc4ea, 2000, 14000);
    s.add(new THREE.HemisphereLight(0xffffff, 0x50607a, 1.4));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.8); sun.position.set(300, 600, 200); s.add(sun);
    // ground texture: fields, forests, rivers, a lake and the coast
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) {
      const n = fbm(x * 0.006, y * 0.006, 4), f = fbm(x * 0.03 + 5, y * 0.03, 2);
      g.fillStyle = x > 820 ? (x > 830 ? '#2c6a9a' : '#d9c79a') : n > 0.62 ? '#dfe6ea' : n > 0.5 ? `rgb(${50 + f * 30},${85 + f * 30},${45})` : f > 0.55 ? '#7f9a4a' : '#5f8a3c';
      g.fillRect(x, y, 4, 4);
    }
    g.strokeStyle = '#3a78a8'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= 830; x += 20) g.lineTo(x, 300 + Math.sin(x * 0.02) * 60 + x * 0.2); g.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshLambertMaterial({ map: tex })); this.ground.rotation.x = -Math.PI / 2; s.add(this.ground);
    // cloud layers (absolute altitude, metres)
    const R = mulberry32(5), pt = puffTex();
    this.clouds = [];
    for (const [alt, n, sz] of [[7500, 60, 900], [2200, 110, 700], [1200, 50, 400]]) for (let i = 0; i < n; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
      m.scale.set(sz * (0.7 + R() * 0.8), sz * 0.45, 1); s.add(m);
      this.clouds.push({ m, x: (R() - 0.5) * 9000, z: (R() - 0.5) * 9000, alt: alt + (R() - 0.5) * 300 });
    }
    // wind streaks rushing up past the faller
    const n = 300, sp = new Float32Array(n * 6);
    this.streakSeed = Array.from({ length: n }, () => ({ x: (R() - 0.5) * 30, z: (R() - 0.5) * 30, y: R() * 60 }));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.streaks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); s.add(this.streaks);
    this.plane = airliner(); s.add(this.plane);
    const Rp = mulberry32(3);
    this.faller = new Person(Rp, { hat: 'hair' }); s.add(this.faller.root);
    this.chunk = fuselageChunk(); this.chunk.scale.setScalar(1.2); s.add(this.chunk);
    this.seat = seat(); s.add(this.seat);
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, 0), r: 40, h: 0, color: [0.1, 0.1, 0.1], size: 3, seed: 2 });
    this.anchors = { faller: new THREE.Vector3(0, 2.6, 0) };
  }
  // o.alt metres, o.fall (0..1 speed for streaks), o.pose, o.plane (seconds since leaving), o.chunk / o.seat flags, o.tumble
  update(t, o = {}) {
    const alt = o.alt ?? 10000;
    const hi = clamp(alt / 10000);
    this.bg.copy(lin(0.62, 0.79, 0.95)).lerp(lin(0.16, 0.3, 0.62), hi); this.scene.fog.color.copy(this.bg);
    this.ground.position.y = -alt;
    for (const q of this.clouds) q.m.position.set(q.x, q.alt - alt, q.z);
    const p = this.streaks.geometry.attributes.position, f = o.fall ?? 1;
    this.streakSeed.forEach((q, i) => { const y = ((q.y + t * 55 * f) % 60) - 30; p.setXYZ(i * 2, q.x, y, q.z); p.setXYZ(i * 2 + 1, q.x, y + 2.5 * f, q.z); });
    p.needsUpdate = true; this.streaks.visible = f > 0.05;
    const pl = o.plane;
    this.plane.visible = pl != null;
    if (pl != null) { this.plane.position.set(60 + pl * 230, 25 + pl * 55, -40); this.plane.rotation.set(0, 0, 0.05); }
    const fr = this.faller;
    const tumble = o.tumble ?? 0;
    fr.root.position.set(0, 0, 0);
    fr.root.rotation.set(-Math.PI / 2 + tumble * Math.sin(t * 3.1) * 1.2, tumble * t * 2.3, tumble * Math.cos(t * 2.3));
    fr.pose(t, o.pose || 'spread', 1);
    fr.root.visible = !o.hideFaller;
    this.chunk.visible = !!o.chunk; this.chunk.position.set(0, 0.4, 0); this.chunk.rotation.set(t * 0.9, t * 0.4, 0.3);
    this.seat.visible = !!o.seat; if (o.seat) { fr.root.rotation.set(0.3 + Math.sin(t * 2) * 0.3, t * 1.1, 0); this.seat.position.set(0, -0.35, 0); this.seat.rotation.copy(fr.root.rotation); fr.pose(t, 'sit', 1); }
    this.flock.o.h = 600 - alt; this.flock.update(t, alt < 1500 ? 1 : 0);
  }
}

export class SnowSlope {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xc8d6e6); s.fog = new THREE.Fog(0xc8d6e6, 40, 220);
    s.add(new THREE.HemisphereLight(0xffffff, 0x708090, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-20, 40, 20); s.add(sun);
    const R = mulberry32(9);
    const g = new THREE.PlaneGeometry(300, 300, 80, 80); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, y * 0.35 + (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 6); }
    g.computeVertexNormals();
    const snow = new THREE.Mesh(g, M([0.94, 0.96, 1])); snow.rotation.x = -Math.PI / 2; s.add(snow);
    this.h = (x, z) => -z * 0.35;
    for (let i = 0; i < 160; i++) {
      const x = -90 + R() * 180, z = -90 + R() * 180; if (Math.hypot(x, z) < 10) continue;
      const tr = new THREE.Group(); const h = 5 + R() * 5;
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, h, 7), M([0.12, 0.28, 0.16])); c1.position.y = h / 2; tr.add(c1);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, h * 0.35, 7), M([0.95, 0.97, 1])); cap.position.y = h * 0.85; tr.add(cap);
      tr.position.set(x, this.h(x, z) - 0.3, z); s.add(tr);
    }
    this.chunk = fuselageChunk(); this.chunk.scale.setScalar(1.3); this.chunk.position.set(0, this.h(0, 0) + 1.6, 0); this.chunk.rotation.set(0.25, 0.6, 0.2); s.add(this.chunk);
    for (let i = 0; i < 20; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.3 + R(), 0.1, 0.3 + R()), M([0.8, 0.8, 0.82])); const x = -12 + R() * 24, z = -12 + R() * 24; d.position.set(x, this.h(x, z) + 0.1, z); d.rotation.y = R() * 3; s.add(d); }
    this.rescuers = Array.from({ length: 4 }, (_, i) => { const pp = new Person(R, { hat: i % 2 ? 'helmet' : 'hair' }); pp.winter(true); s.add(pp.root); return { p: pp, x: -6 + i * 3, z: 26 + i * 2 }; });
    this.anchors = { chunk: new THREE.Vector3(0, this.h(0, 0) + 5.5, 0) };
  }
  update(t) {
    for (const q of this.rescuers) { const z = q.z - ((t * 1.2) % 14); q.p.root.position.set(q.x, this.h(q.x, z), z); q.p.root.rotation.y = Math.PI; q.p.pose(t, 'walk', 1); }
  }
}

export class Jungle {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xa8c8b0); s.fog = new THREE.Fog(0xa8c8b0, 30, 160);
    s.add(new THREE.HemisphereLight(0xfff8e0, 0x2a4020, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.4); sun.position.set(20, 40, 10); s.add(sun);
    const R = mulberry32(14);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M([0.2, 0.32, 0.14])); ground.rotation.x = -Math.PI / 2; s.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 12), M([0.45, 0.38, 0.25])); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.05, -6); s.add(river);
    for (let i = 0; i < 220; i++) {
      const x = -100 + R() * 200, z = R() < 0.5 ? 2 + R() * 80 : -14 - R() * 80, h = 8 + R() * 14;
      const tr = new THREE.Group();
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, h, 6), M([0.35, 0.25, 0.15])); tk.position.y = h / 2; tr.add(tk);
      for (let j = 0; j < 3; j++) { const cr = new THREE.Mesh(new THREE.SphereGeometry(2.5 + R() * 2.5, 10, 8), M([0.12 + R() * 0.1, 0.35 + R() * 0.15, 0.12])); cr.position.set((R() - 0.5) * 3, h + R() * 2, (R() - 0.5) * 3); tr.add(cr); }
      tr.position.set(x, 0, z); s.add(tr);
    }
    for (let i = 0; i < 80; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.8 + R(), 8, 6), M([0.18, 0.42, 0.16])); b.position.set(-40 + R() * 80, 0.4, 1 + R() * 6); s.add(b); }
    this.girl = new Person(R, { hat: 'hair', shirt: [0.9, 0.9, 0.85] }); s.add(this.girl.root);
    this.boat = makeRowBoat(R, 2); this.boat.position.set(14, 0.05, -6); this.boat.rotation.y = Math.PI / 2; s.add(this.boat);
    this.flock = new Flock(s, 7, { c: new THREE.Vector3(0, 0, -6), r: 25, h: 18, color: [0.9, 0.2, 0.2], size: 2.2, seed: 6 });
    this.anchors = { girl: new THREE.Vector3(0, 2.4, -0.5), boat: new THREE.Vector3(14, 2.6, -6) };
  }
  update(t, walk = 1) {
    const x = -10 + ((t * 0.9) % 14);
    this.girl.root.position.set(x, 0, -0.8); this.girl.root.rotation.y = Math.PI / 2;
    this.girl.pose(t, walk ? 'walk' : 'wave', 0.8);
    this.anchors.girl.set(x, 2.4, -0.8);
    this.boat.userData.crew.forEach((p, i) => p.pose(t + i, i ? 'wave' : 'row', 1));
    this.flock.update(t, 1);
  }
}
