// Scenes for "Andai Bumi kehilangan oksigen 5 detik": a street-side warung with a wok stove, a birthday table
// with candles and motorbikes passing — every flame and engine depends on oxygen.
import * as THREE from 'three';
import { clamp, lerp, mulberry32 } from './util.js';
import { Person, makeMotorbike, makeCat, makeChicken, jumpState } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c) => new THREE.MeshLambertMaterial({ color: lin(...c) });
const puff = (() => { if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

function flame(r, h) {
  const g = new THREE.Group();
  const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0.9 }));
  const i = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xffef9a }));
  o.position.y = h / 2; i.position.y = h * 0.3; g.add(o, i);
  return g;
}

export class WarungScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xa9d2f2); s.fog = new THREE.Fog(0xa9d2f2, 40, 160);
    s.add(new THREE.HemisphereLight(0xffffff, 0x706050, 1.35));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.7); sun.position.set(20, 30, 15); s.add(sun);
    this.light = new THREE.PointLight(0xff9a40, 4, 8, 1.5); this.light.position.set(-1.2, 2.2, 0.5); s.add(this.light);
    const R = mulberry32(44);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 7), M([0.25, 0.25, 0.27])); road.rotation.x = -Math.PI / 2; road.position.z = 6; s.add(road);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), M([0.72, 0.68, 0.6])); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, -4.5); s.add(walk);
    for (let i = -10; i <= 10; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.15), M([0.95, 0.95, 0.9])); d.rotation.x = -Math.PI / 2; d.position.set(i * 5, 0.02, 6); s.add(d); }
    // shop houses behind
    for (let i = 0; i < 8; i++) { const h = 6 + R() * 5; const b = new THREE.Mesh(new THREE.BoxGeometry(7, h, 6), M([[0.9, 0.85, 0.7], [0.8, 0.88, 0.9], [0.95, 0.8, 0.75], [0.85, 0.9, 0.78]][i % 4])); b.position.set(-28 + i * 8, h / 2, -12); s.add(b); }
    // warung: counter, posts, striped tarp, sign
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.0, 1.0), M([0.55, 0.38, 0.22])); counter.position.set(-1, 0.5, 0); s.add(counter);
    for (const [x, z] of [[-3, -1.4], [1, -1.4], [-3, 0.6], [1, 0.6]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), M([0.4, 0.4, 0.42])); p.position.set(x, 1.3, z); s.add(p); }
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 2.4), M(i % 2 ? [0.95, 0.95, 0.95] : [0.12, 0.4, 0.8])); st.position.set(-3 + 0.36 + i * 0.68, 2.65, -0.4); st.rotation.x = 0.12; s.add(st); }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.05), M([0.85, 0.12, 0.1])); sign.position.set(-1, 2.35, 0.85); s.add(sign);
    // stove + wok + flame
    const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 12), M([0.2, 0.2, 0.22])); stove.position.set(-1.2, 1.15, -0.2); s.add(stove);
    const wok = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M([0.15, 0.15, 0.16])); wok.position.set(-1.2, 1.62, -0.2); s.add(wok);
    this.stoveFlame = flame(0.3, 0.35); this.stoveFlame.position.set(-1.2, 1.28, -0.2); s.add(this.stoveFlame);
    this.steam = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false })); s.add(m); return { m, ph: i / 8 }; });
    this.seller = new Person(R, { hat: 'hijab' }); this.seller.root.position.set(-1.6, 0, -1.0); s.add(this.seller.root);
    // customers on a bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.4), M([0.5, 0.35, 0.2])); bench.position.set(-1, 0.45, 1.1); s.add(bench);
    this.customers = [-2.2, -1, 0.2].map((x, i) => { const p = new Person(R, { hat: i === 1 ? 'caping' : 'hair' }); p.root.position.set(x, 0, 1.15); p.root.rotation.y = Math.PI; s.add(p.root); return p; });
    // birthday table with a cake and candles, kids around it
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), M([0.95, 0.95, 0.95])); table.position.set(5, 0.8, -2); s.add(table);
    for (const [x, z] of [[4.3, -2.4], [5.7, -2.4], [4.3, -1.6], [5.7, -1.6]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), M([0.6, 0.6, 0.6])); l.position.set(x, 0.4, z); s.add(l); }
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 20), M([0.98, 0.75, 0.8])); cake.position.set(5, 0.97, -2); s.add(cake);
    this.candles = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), M([0.4, 0.7, 1])); c.position.set(5 + Math.cos(a) * 0.17, 1.15, -2 + Math.sin(a) * 0.17); s.add(c);
      const f = flame(0.02, 0.06); f.position.set(c.position.x, 1.21, c.position.z); s.add(f);
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0xdddddd, transparent: true, depthWrite: false })); s.add(sm);
      this.candles.push({ f, sm, x: c.position.x, z: c.position.z, ph: i * 0.2 });
    }
    this.kids = [[4.2, -2.9, 0.4], [5.8, -2.9, -0.4], [5, -3.1, 0], [3.9, -1.5, 1.6]].map(([x, z, r], i) => { const p = new Person(R, { scale: 0.72, hat: i % 2 ? 'hair' : 'hijab' }); p.root.position.set(x, 0, z); p.root.rotation.y = r; s.add(p.root); return p; });
    // traffic
    this.bikes = Array.from({ length: 4 }, (_, i) => { const b = makeMotorbike(R); b.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; s.add(b); const ex = Array.from({ length: 4 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0x999999, transparent: true, depthWrite: false })); s.add(m); return m; }); return { b, ex, lane: i % 2 ? 4.6 : 7.4, dir: i % 2 ? -1 : 1, x0: -30 + i * 17, sp: 6 + R() * 3 }; });
    this.cat = makeCat(R); this.cat.position.set(2.2, 0, -0.5); s.add(this.cat);
    this.chick = makeChicken(R); this.chick.position.set(3, 0, 1.6); s.add(this.chick);
    this.anchors = { stove: new THREE.Vector3(-1.2, 2.3, -0.2), cake: new THREE.Vector3(5, 1.7, -2), road: new THREE.Vector3(0, 2.4, 6), seller: new THREE.Vector3(-1.6, 2.3, -1) };
  }
  // on: 1 fire burning / engines running, 0 everything out; ears: people hold their heads
  update(t, on = 1, o = {}) {
    const fl = (g, k, s0) => { g.visible = k > 0.02; g.scale.set(1, (0.85 + 0.2 * Math.sin(t * 23 + s0)) * k, 1); };
    fl(this.stoveFlame, on, 0);
    this.light.intensity = 4 * on;
    this.steam.forEach((q) => { const k = (q.ph + t * 0.4) % 1; q.m.position.set(-1.2 + Math.sin(t + q.ph * 6) * 0.1, 1.8 + k * 1.6, -0.2); q.m.scale.setScalar(0.3 + k * 0.8); q.m.material.opacity = 0.5 * (1 - k) * on; });
    this.candles.forEach((c) => { fl(c.f, on, c.ph * 9); const k = (t * 0.5 + c.ph) % 1; c.sm.position.set(c.x + Math.sin(t * 3 + c.ph * 7) * 0.05 * k, 1.25 + k * 0.6, c.z); c.sm.scale.setScalar(0.05 + k * 0.25); c.sm.material.opacity = 0.6 * (1 - k) * (1 - on); });
    const ears = !!o.ears, jump = !!o.jump;
    this.seller.pose(t, jump ? 'cheer' : ears ? 'ears' : on > 0.5 ? 'fan' : 'point', 1);
    this.customers.forEach((p, i) => p.pose(t + i * 0.1, jump ? 'cheer' : ears ? 'ears' : 'sit', 1));
    this.kids.forEach((p, i) => p.pose(t + i * 0.1, jump ? 'cheer' : ears ? 'ears' : on > 0.5 ? 'clap' : 'lookUp', 1));
    if (o.jumpP != null) {
      const J = jumpState(o.jumpP);
      [this.seller, ...this.customers, ...this.kids].forEach((p, i) => { p.root.position.y = J.y * (i > 3 ? 0.8 : 1); if (J.pose) p.pose(t, J.pose, 1); });
    } else [this.seller, ...this.customers, ...this.kids].forEach((p) => (p.root.position.y = 0));
    for (const q of this.bikes) {
      // engines: cruise when on; with no oxygen the engine dies and the bike rolls to a stop
      const x = ((q.x0 + q.dir * q.sp * (o.travel ?? t)) % 70 + 70) % 70 - 35;
      q.b.position.set(x, 0, q.lane);
      q.b.userData.rider.pose(t, ears ? 'ears' : 'sit', 1);
      q.ex.forEach((m, j) => { const k = (t * 1.5 + j / 4) % 1; m.position.set(x - q.dir * (0.9 + k * 1.2), 0.4 + k * 0.3, q.lane); m.scale.setScalar(0.2 + k * 0.5); m.material.opacity = 0.45 * (1 - k) * on; });
    }
  }
}
