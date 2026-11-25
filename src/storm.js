// Scenes for "Kalau kamu tersambar petir":
//  makeBolt(seed, from, to)  a jagged, branching lightning bolt (tube meshes, additive)
//  StormScene  an open landscape under a thunderstorm: a lone tree with people sheltering, a farmer in the rice field,
//              footballers on a pitch, an angler in a boat, a house and a car; rain; strikes, side flash and ground current
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person, makeRowBoat, makeAngkot } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });

class Poly extends THREE.Curve {
  constructor(pts) { super(); this.pts = pts; }
  getPoint(u, out = new THREE.Vector3()) {
    const f = u * (this.pts.length - 1), i = Math.min(this.pts.length - 2, Math.floor(f));
    return out.copy(this.pts[i]).lerp(this.pts[i + 1], f - i);
  }
}
function jag(R, a, b, depth, amp) {
  if (depth === 0) return [a, b];
  const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3((R() - 0.5) * amp, (R() - 0.5) * amp * 0.3, (R() - 0.5) * amp));
  return [...jag(R, a, m, depth - 1, amp / 2).slice(0, -1), ...jag(R, m, b, depth - 1, amp / 2)];
}
export function makeBolt(seed, from, to, r = 0.35) {
  const R = mulberry32(seed);
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7aa8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const main = jag(R, from, to, 6, from.distanceTo(to) * 0.35);
  const add = (pts, rad) => {
    const c = new Poly(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 2, rad, 5), mat));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 2, rad * 4, 5), glowMat));
  };
  add(main, r);
  for (let i = 0; i < 5; i++) {
    const s = main[2 + Math.floor(R() * (main.length * 0.6))];
    const e = s.clone().add(new THREE.Vector3((R() - 0.5) * 40, -10 - R() * 25, (R() - 0.5) * 40));
    add(jag(R, s, e, 4, 12), r * 0.45);
  }
  g.userData = { mat, glowMat };
  return g;
}

export class StormScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0x4a5568); s.background = this.bg;
    s.fog = new THREE.Fog(0x4a5568, 60, 340);
    this.hemi = new THREE.HemisphereLight(0xb8c4dc, 0x40483a, 1.8); s.add(this.hemi);
    const dl = new THREE.DirectionalLight(0xc8d4ec, 0.8); dl.position.set(-30, 50, 40); s.add(dl);
    this.flashLight = new THREE.PointLight(0xc8d8ff, 0, 0, 1.2); this.flashLight.position.set(0, 60, 0); s.add(this.flashLight);
    const R = mulberry32(23);
    const g = new THREE.PlaneGeometry(500, 500, 80, 80); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * 0.02, p.getY(i) * 0.02, 3) - 0.5) * 2);
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, M([0.25, 0.4, 0.18])); ground.rotation.x = -Math.PI / 2; s.add(ground);
    // rice field (left), football pitch (right), pond (back)
    const sawah = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), M([0.32, 0.52, 0.22])); sawah.rotation.x = -Math.PI / 2; sawah.position.set(-45, 0.6, 0); s.add(sawah);
    for (let i = 0; i < 400; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), M([0.4, 0.65, 0.25])); r.position.set(-73 + (i % 20) * 2.8, 0.9, -23 + Math.floor(i / 20) * 2.4); s.add(r); }
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), M([0.2, 0.5, 0.2])); pitch.rotation.x = -Math.PI / 2; pitch.position.set(45, 0.62, 5); s.add(pitch);
    for (const x of [26, 64]) { const gp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 7), M([0.95, 0.95, 0.95])); gp.position.set(x, 1.8, 5); s.add(gp); }
    const pond = new THREE.Mesh(new THREE.CircleGeometry(22, 32), M([0.2, 0.28, 0.36])); pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.63, -60); s.add(pond);
    // the lone tree
    this.tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 12, 8), M([0.35, 0.25, 0.16])); trunk.position.y = 6; this.tree.add(trunk);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(4 + R() * 2, 12, 8), M([0.15, 0.32, 0.14])); c.position.set((R() - 0.5) * 5, 12 + R() * 3, (R() - 0.5) * 5); this.tree.add(c); }
    this.tree.position.set(0, 0.5, 0); s.add(this.tree);
    // people
    this.shelter = [[2.2, 1.8], [-2.4, 1.2]].map(([x, z], i) => { const pp = new Person(R, { hat: i ? 'hijab' : 'hair' }); pp.root.position.set(x, 0.55, z); pp.root.rotation.y = i ? 2.2 : -2.0; s.add(pp.root); return pp; });
    this.farmer = new Person(R, { hat: 'caping' }); this.farmer.root.position.set(-40, 0.6, 4); this.farmer.root.rotation.y = 0.8; s.add(this.farmer.root);
    this.players = Array.from({ length: 6 }, (_, i) => { const pp = new Person(R, { hat: 'hair', shirt: i % 2 ? [0.9, 0.2, 0.2] : [0.2, 0.4, 0.9] }); s.add(pp.root); return { p: pp, x0: 30 + (i % 3) * 12, z0: -3 + Math.floor(i / 3) * 14, ph: R() * 6 }; });
    this.boat = makeRowBoat(R, 1); this.boat.position.set(4, 0.65, -58); s.add(this.boat);
    const house = new THREE.Group();
    const hb = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 7), M([0.9, 0.85, 0.75])); hb.position.y = 2.5; house.add(hb);
    const hr = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.6, 4), M([0.7, 0.3, 0.2])); hr.position.y = 5.8; hr.rotation.y = Math.PI / 4; house.add(hr);
    house.position.set(14, 0.5, 30); s.add(house);
    this.car = makeAngkot(R); this.car.position.set(-6, 0.55, 30); this.car.rotation.y = Math.PI / 2; s.add(this.car);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 6), M([0.25, 0.25, 0.27])); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.62, 34); s.add(road);
    // the victim and the helper (aftermath)
    this.victim = new Person(R, { hat: 'hair' }); this.victim.root.position.set(4.5, 0.75, 4); this.victim.root.rotation.set(-Math.PI / 2, 0, 0.3); s.add(this.victim.root);
    this.helper = new Person(R, { hat: 'hijab' }); this.helper.root.position.set(5.2, 0.55, 3.0); this.helper.root.rotation.y = -0.4; s.add(this.helper.root);
    this.skin = []; this.victim.root.traverse((o) => { if (o.material && o.material.emissive) { o.material = o.material.clone(); this.skin.push(o.material); } });
    // clouds, rain
    const ct = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g2 = c.getContext('2d'); for (let i = 0; i < 8; i++) { const gr = g2.createRadialGradient(30 + i * 9, 64 + (i % 3) * 8, 0, 30 + i * 9, 64, 40); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.clouds = Array.from({ length: 40 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, color: 0x3a4050, transparent: true, depthWrite: false })); m.scale.set(80, 30, 1); m.position.set((R() - 0.5) * 300, 60 + R() * 20, (R() - 0.5) * 300); s.add(m); return m; });
    const n = 3000, rp = new Float32Array(n * 6);
    this.rainSeed = Array.from({ length: n }, () => ({ x: (R() - 0.5) * 120, z: (R() - 0.5) * 120, y: R() * 50 }));
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaab4c8, transparent: true, opacity: 0.45 })); s.add(this.rain);
    // bolts: tree strike, side flash to a sheltering person, the pitch, the pond
    const top = (x, z) => new THREE.Vector3(x, 70, z);
    this.bolts = {
      tree: makeBolt(3, top(-8, -10), new THREE.Vector3(0, 16, 0)),
      side: makeBolt(8, new THREE.Vector3(0.6, 7, 0.4), new THREE.Vector3(2.0, 1.6, 1.6), 0.12),
      pitch: makeBolt(11, top(50, -20), new THREE.Vector3(42, 0.7, 2)),
      far: makeBolt(17, top(-60, -120), new THREE.Vector3(-40, 0.6, -110)),
      body: makeBolt(21, top(10, 0), new THREE.Vector3(4.5, 1.6, 4), 0.25),
    };
    Object.values(this.bolts).forEach((b) => { b.visible = false; s.add(b); });
    // ground current: expanding rings around the strike point
    this.rings = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 48), new THREE.MeshBasicMaterial({ color: 0x9ac0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.7, 0); s.add(m); return m; });
    this.anchors = { tree: new THREE.Vector3(0, 19, 0), shelter: new THREE.Vector3(0, 3, 1.5), farmer: new THREE.Vector3(-40, 3, 4), pitch: new THREE.Vector3(45, 4, 5), boat: new THREE.Vector3(4, 3, -58), car: new THREE.Vector3(-6, 4.5, 30), house: new THREE.Vector3(14, 9, 30), victim: new THREE.Vector3(4.5, 2.2, 4) };
  }
  // o.strike: name of the bolt and 0..1 progress of the flash; o.rings 0..1; o.rain 0..1; o.after (people down / helping); o.skin 0..1 surface current glow
  update(t, o = {}) {
    for (const [n, b] of Object.entries(this.bolts)) b.visible = false;
    let flash = 0;
    for (const [n, k] of Object.entries(o.strikes || {})) {
      if (k == null || k < 0 || k > 1) continue;
      const b = this.bolts[n]; const on = k < 0.35 && Math.sin(k * 60) > -0.3;
      b.visible = on; b.userData.mat.opacity = 1 - k * 2; b.userData.glowMat.opacity = 0.35 * (1 - k * 2);
      flash = Math.max(flash, on ? 1 - k * 2 : 0);
    }
    this.flash = flash;
    this.flashLight.intensity = flash * 60000;
    this.hemi.intensity = 1.8 + flash * 2;
    this.bg.copy(lin(0.29, 0.33, 0.41)).lerp(lin(0.75, 0.8, 0.95), flash * 0.6); this.scene.fog.color.copy(this.bg);
    // rain
    const rain = o.rain ?? 1, rp = this.rain.geometry.attributes.position;
    this.rain.visible = rain > 0.02;
    this.rainSeed.forEach((q, i) => { const y = ((q.y - t * 30) % 50 + 50) % 50; rp.setXYZ(i * 2, q.x + (o.cx || 0), y, q.z + (o.cz || 0)); rp.setXYZ(i * 2 + 1, q.x + (o.cx || 0) - 0.15, y + 1.2, q.z + (o.cz || 0)); });
    rp.needsUpdate = true; this.rain.material.opacity = 0.45 * rain;
    // ground current rings
    const rk = o.rings ?? -1;
    this.rings.forEach((m, i) => { const k = rk - i * 0.12; m.visible = k > 0 && k < 1; m.scale.setScalar(1 + k * 14); m.material.opacity = 0.8 * (1 - k); });
    // people
    const after = !!o.after;
    this.shelter.forEach((p, i) => { p.root.rotation.x = after && i === 0 ? -1.3 : 0; p.pose(t + i, after ? (i ? 'ears' : 'idle') : 'shiver', 1); });
    this.farmer.pose(t, o.farmerUp ? 'lookUp' : 'bend', 1);
    this.players.forEach((q) => { q.p.root.position.set(q.x0 + Math.sin(t * 0.8 + q.ph) * 6, 0.62, q.z0 + Math.cos(t * 0.6 + q.ph) * 3); q.p.root.rotation.y = Math.sin(t * 0.8 + q.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; q.p.pose(t, 'run', 1); });
    this.boat.userData.crew[0].pose(t, 'row', 1); this.boat.rotation.z = Math.sin(t * 1.3) * 0.05;
    this.victim.root.visible = !!o.victim; this.helper.root.visible = !!o.helper;
    if (o.victim) this.victim.pose(t, 'idle', 0);
    if (o.helper) this.helper.pose(t, 'bend', 2.2);
    const sk = o.skin ?? 0;
    for (const m of this.skin) m.emissive.setRGB(0.12 * sk, 0.25 * sk, 0.55 * sk);
  }
}
