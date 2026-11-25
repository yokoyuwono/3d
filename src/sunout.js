// Scenes for "Andai Matahari tiba-tiba padam":
//  IceOcean    a cut-away of a frozen sea: an ice lid on top, dark liquid water below with fish
//  VentScene   a deep-sea hydrothermal vent: black smokers, tube worms, crabs and shrimp living without sunlight
//  GeoPlant    a geothermal plant in volcanic hills with steam, and a lamp-lit underground greenhouse with people
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });
const puffTex = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export class IceOcean {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x03050b);
    s.add(new THREE.HemisphereLight(0x6080b0, 0x101018, 0.9));
    const l = new THREE.DirectionalLight(0xb0c8ff, 0.8); l.position.set(5, 20, 10); s.add(l);
    const R = mulberry32(3);
    this.ice = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 20), M([0.85, 0.92, 1.0], { transparent: true, opacity: 0.95 })); s.add(this.ice);
    for (let i = 0; i < 30; i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + R() * 1.2), M([0.9, 0.95, 1])); b.position.set(-28 + R() * 56, 0.5, -9 + R() * 18); b.scale.y = 0.4; this.ice.add(b); }
    this.water = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 20), M([0.03, 0.12, 0.25], { transparent: true, opacity: 0.92 })); this.water.position.y = -15.5; s.add(this.water);
    const fishGeo = new THREE.ConeGeometry(0.25, 0.9, 6); fishGeo.rotateZ(-Math.PI / 2);
    this.fish = Array.from({ length: 30 }, (_, i) => { const f = new THREE.Mesh(fishGeo, M([0.6, 0.7, 0.8])); s.add(f); return { f, y: -4 - R() * 20, x0: -28 + R() * 56, sp: 1 + R() * 2, z: 10.5 }; });
    this.anchors = { ice: new THREE.Vector3(0, 2, 10), water: new THREE.Vector3(0, -12, 10.5) };
  }
  // thick: 0..1 ice thickness
  update(t, thick = 1) {
    const h = lerp(0.2, 4, thick);
    this.ice.scale.y = h; this.ice.position.y = -h / 2 + 0.5;
    for (const q of this.fish) { const x = ((q.x0 + t * q.sp + 30) % 60 + 60) % 60 - 30; q.f.position.set(x, q.y + Math.sin(t + q.x0) * 0.4, q.z); }
  }
}

export class VentScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x010308); s.fog = new THREE.FogExp2(0x010308, 0.05);
    s.add(new THREE.HemisphereLight(0x204060, 0x100808, 0.6));
    const glow = new THREE.PointLight(0xff7a30, 30, 30, 1.6); glow.position.set(0, 3, 0); s.add(glow); this.glow = glow;
    const R = mulberry32(6);
    const g = new THREE.PlaneGeometry(120, 120, 60, 60); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * 0.08, p.getY(i) * 0.08, 3) - 0.5) * 3);
    g.computeVertexNormals();
    const floor = new THREE.Mesh(g, M([0.18, 0.15, 0.13])); floor.rotation.x = -Math.PI / 2; s.add(floor);
    this.smokers = [[0, 0, 7], [-5, -3, 5], [4, -5, 6]].map(([x, z, h]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, h, 9), M([0.15, 0.13, 0.12])); c.position.set(x, h / 2, z); s.add(c);
      const plume = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0x1a1a1a, transparent: true, depthWrite: false })); s.add(m); return { m, ph: i / 16 }; });
      return { x, z, h, plume };
    });
    // tube worms (white tubes, red plumes), crabs, shrimp
    this.worms = [];
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, r = 1.5 + R() * 4, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.8 + R() * 1.6;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), M([0.92, 0.9, 0.85])); tube.position.set(x, h / 2, z); s.add(tube);
      const plume = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0xd8202a, emissive: 0x400000 })); plume.position.set(x, h + 0.05, z); s.add(plume);
      this.worms.push({ plume, ph: R() * 6, h });
    }
    this.crabs = Array.from({ length: 8 }, () => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), M([0.92, 0.9, 0.85])); c.scale.set(1.4, 0.5, 1); s.add(c); return { c, x: -5 + R() * 10, z: -4 + R() * 8, ph: R() * 6 }; });
    this.shrimp = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), M([0.95, 0.75, 0.6])); m.scale.set(2, 1, 1); s.add(m); return { m, a: R() * 6, r: 1 + R() * 2, y: 1 + R() * 5, sp: 0.5 + R() }; });
    this.anchors = { vent: new THREE.Vector3(0, 8, 0), worms: new THREE.Vector3(3, 3, 3) };
  }
  update(t) {
    for (const sm of this.smokers) for (const q of sm.plume) { const k = (q.ph + t * 0.2) % 1; q.m.position.set(sm.x + Math.sin(t + q.ph * 9) * k, sm.h + k * 12, sm.z); q.m.scale.setScalar(1 + k * 5); q.m.material.opacity = 0.8 * (1 - k); }
    for (const w of this.worms) w.plume.scale.setScalar(1 + 0.25 * Math.sin(t * 2 + w.ph));
    for (const c of this.crabs) c.c.position.set(c.x + Math.sin(t * 0.4 + c.ph) * 1.2, 0.15, c.z);
    for (const q of this.shrimp) { const a = q.a + t * q.sp; q.m.position.set(Math.cos(a) * q.r, q.y + Math.sin(a * 2) * 0.3, Math.sin(a) * q.r); q.m.rotation.y = -a; }
    this.glow.intensity = 26 + 6 * Math.sin(t * 3);
  }
}

export class GeoPlant {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0x06070d); s.background = this.bg;
    s.fog = new THREE.Fog(0x06070d, 60, 260);
    s.add(new THREE.HemisphereLight(0x7a8ab0, 0x202020, 1.3));
    const R = mulberry32(13);
    const g = new THREE.PlaneGeometry(400, 400, 80, 80); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.max(0, (fbm(x * 0.012, y * 0.012, 4) - 0.35)) * 70 * Math.min(1, Math.hypot(x, y) / 80)); }
    g.computeVertexNormals();
    this.groundMat = M([0.78, 0.82, 0.88]);
    const ground = new THREE.Mesh(g, this.groundMat); ground.rotation.x = -Math.PI / 2; s.add(ground);
    // plant: cooling towers, pipes, buildings with lights
    for (let i = 0; i < 3; i++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.2, 12, 20, 1, true), M([0.75, 0.75, 0.78], { side: THREE.DoubleSide })); tw.position.set(-10 + i * 8, 6, -6); s.add(tw); }
    this.steam = Array.from({ length: 36 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xe8eef8, transparent: true, depthWrite: false })); s.add(m); return { m, tw: i % 3, ph: (i / 36 * 3) % 1 }; });
    for (let i = 0; i < 6; i++) { const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 8), M([0.6, 0.62, 0.65])); pp.rotation.z = Math.PI / 2; pp.position.set(10, 0.6 + i * 0.01, 4 + i * 1.2); s.add(pp); }
    const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 8), M([0.5, 0.52, 0.56])); hall.position.set(14, 3, -6); s.add(hall);
    this.lights = [];
    for (let i = 0; i < 10; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1), new THREE.MeshBasicMaterial({ color: 0xffd27a })); w.position.set(8 + i * 1.3, 3.6, -1.95); s.add(w); this.lights.push(w); }
    // underground greenhouse: a lit cavern with crops under purple grow lamps and people working
    this.cave = new THREE.Group(); this.cave.position.set(0, -40, 40); s.add(this.cave);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M([0.3, 0.26, 0.24], { side: THREE.BackSide })); this.cave.add(shell);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 32), M([0.3, 0.22, 0.16])); floor.rotation.x = -Math.PI / 2; this.cave.add(floor);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) { const pl = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), M([0.2, 0.65, 0.25])); pl.position.set(-8 + c * 2, 0.45, -6 + r * 2.4); this.cave.add(pl); }
    for (let i = 0; i < 4; i++) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xd070ff })); lamp.position.set(0, 6, -6 + i * 3.2); this.cave.add(lamp); }
    const cl = new THREE.PointLight(0xe090ff, 40, 40, 1.4); cl.position.set(0, 6, 0); this.cave.add(cl);
    this.people = Array.from({ length: 5 }, (_, i) => { const pp = new Person(R, { hat: ['hijab', 'hair', 'caping'][i % 3] }); pp.winter(true); pp.root.position.set(-6 + i * 3, 0, 6); pp.root.rotation.y = Math.PI; this.cave.add(pp.root); return pp; });
    this.anchors = { plant: new THREE.Vector3(-2, 20, -6), cave: new THREE.Vector3(0, -33, 40) };
  }
  update(t) {
    for (const q of this.steam) { const k = (q.ph + t * 0.15) % 1; q.m.position.set(-10 + q.tw * 8 + Math.sin(t * 0.5 + q.ph * 7) * k * 2, 12 + k * 22, -6); q.m.scale.setScalar(3 + k * 8); q.m.material.opacity = 0.45 * (1 - k); }
    this.people.forEach((p, i) => p.pose(t + i, i % 2 ? 'bend' : 'dig', 1));
  }
}
