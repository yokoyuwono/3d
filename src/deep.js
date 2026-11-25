// Scenes for "Kalau kamu terjebak di dasar Palung Jawa":
//  DeepSea   a deep submersible at the origin; the water column, marine snow, trench walls, the seafloor and its residents
//            are placed relative to the current depth (metres)
//  SubInside the pilot inside the titanium sphere: dials, screens and the small viewport
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });
const BOTTOM = 7192;

function submersible() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 4.6), M([0.95, 0.95, 0.96])); frame.position.y = 0.4; g.add(frame);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.4, 4.62), M([0.1, 0.1, 0.12])); stripe.position.y = -0.4; g.add(stripe);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), M([0.55, 0.57, 0.6])); sphere.position.set(0, -0.6, 1.6); g.add(sphere);
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), new THREE.MeshBasicMaterial({ color: 0xffd27a })); port.position.set(0, -0.5, 2.62); g.add(port);
  for (const x of [-1, 1]) { const th = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), M([0.15, 0.15, 0.16])); th.rotation.x = Math.PI / 2; th.position.set(x * 1.4, 0.2, -2.2); g.add(th); }
  // lights
  const lamps = [];
  for (const x of [-0.9, 0.9]) {
    const l = new THREE.SpotLight(0xfff2d8, 260, 60, 0.45, 0.5, 1.2); l.position.set(x, -0.2, 2.4); l.target.position.set(x * 2, -6, 30); g.add(l, l.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 30, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cone.rotation.x = -Math.PI / 2 + 0.2; cone.position.set(x, -2.5, 17); g.add(cone);
    lamps.push(l, cone);
  }
  // drop weights + the crush test cup and can on the frame
  const weights = [-0.7, 0.7].map((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.6), M([0.12, 0.12, 0.12])); w.position.set(x, -1.6, -0.4); g.add(w); return w; });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.5, 16), M([0.98, 0.98, 0.96])); cup.position.set(1.45, 0.2, 1.2); g.add(cup);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 16), M([0.85, 0.15, 0.15])); can.position.set(1.45, 0.2, 0.4); g.add(can);
  g.userData = { lamps, weights, cup, can };
  return g;
}

export class DeepSea {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(); s.background = this.bg;
    s.fog = new THREE.FogExp2(0x06121c, 0.02);
    this.amb = new THREE.HemisphereLight(0x80b0e0, 0x102030, 1.0); s.add(this.amb);
    this.sub = submersible(); s.add(this.sub);
    this.fill = new THREE.PointLight(0xbfd8ff, 18, 14, 1.2); this.fill.position.set(3, 4, 5); this.sub.add(this.fill);
    const R = mulberry32(31);
    // marine snow drifting past
    const n = 2500, sp = new Float32Array(n * 3);
    this.snowSeed = Array.from({ length: n }, () => ({ x: (R() - 0.5) * 60, y: R() * 60, z: (R() - 0.5) * 60 }));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8f0, size: 0.08, transparent: true, opacity: 0.8 })); s.add(this.snow);
    // bioluminescent sparks
    const m = 300, bp = new Float32Array(m * 3);
    this.bioSeed = Array.from({ length: m }, () => ({ x: (R() - 0.5) * 50, y: (R() - 0.5) * 30, z: (R() - 0.5) * 50, ph: R() * 6 }));
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    this.bio = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x5affd8, size: 0.25, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); s.add(this.bio);
    // surface: sea surface, support ship
    this.surface = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x8fc8ee, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); this.surface.rotation.x = -Math.PI / 2; s.add(this.surface);
    this.ship = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 50), M([0.2, 0.25, 0.32])); hull.position.y = 1; this.ship.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 14), M([0.95, 0.95, 0.95])); deck.position.set(0, 5, 8); this.ship.add(deck);
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 14), M([0.95, 0.6, 0.1])); crane.position.set(0, 9, -24); crane.rotation.x = 0.5; this.ship.add(crane);
    s.add(this.ship);
    // trench walls and seafloor (relative to the bottom)
    this.floorGroup = new THREE.Group(); s.add(this.floorGroup);
    const fg = new THREE.PlaneGeometry(400, 400, 60, 60); const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, (fbm(fp.getX(i) * 0.05, fp.getY(i) * 0.05, 3) - 0.5) * 3);
    fg.computeVertexNormals();
    const floor = new THREE.Mesh(fg, M([0.38, 0.34, 0.3])); floor.rotation.x = -Math.PI / 2; this.floorGroup.add(floor);
    for (const sx of [-1, 1]) {
      const wg = new THREE.PlaneGeometry(400, 600, 40, 60); const wp = wg.attributes.position;
      for (let i = 0; i < wp.count; i++) wp.setZ(i, (fbm(wp.getX(i) * 0.03 + sx * 9, wp.getY(i) * 0.03, 4) - 0.5) * 30);
      wg.computeVertexNormals();
      const wall = new THREE.Mesh(wg, M([0.3, 0.28, 0.26], { side: THREE.DoubleSide })); wall.rotation.y = sx * Math.PI / 2; wall.position.set(sx * 45, 300, 0); this.floorGroup.add(wall);
    }
    // residents: a bait cage with swarming amphipods, snailfish, glowing jellies
    const cage = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), M([0.75, 0.6, 0.2], { wireframe: true })); cage.position.set(2, 0.4, 10); this.floorGroup.add(cage);
    this.amph = Array.from({ length: 70 }, () => { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 2, 5), M([0.95, 0.9, 0.85])); a.rotation.z = Math.PI / 2; this.floorGroup.add(a); return { a, r: 0.4 + R() * 1.2, ph: R() * 6, h: 0.1 + R() * 1, sp: 1 + R() * 2 }; });
    this.fish = Array.from({ length: 5 }, (_, i) => {
      const f = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshLambertMaterial({ color: lin(0.95, 0.85, 0.88), transparent: true, opacity: 0.8 })); body.scale.set(1, 0.8, 2.6); f.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), new THREE.MeshLambertMaterial({ color: lin(0.95, 0.85, 0.88), transparent: true, opacity: 0.7 })); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.6; f.add(tail);
      this.floorGroup.add(f); return { f, x0: -6 + i * 3, z0: 6 + i * 2, ph: R() * 6 };
    });
    this.jellies = Array.from({ length: 10 }, (_, i) => { const j = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4a6a : 0x4ab0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); s.add(j); return { j, x: (R() - 0.5) * 30, y: (R() - 0.5) * 16, z: 6 + R() * 24, ph: R() * 6 }; });
    // rescue ROV with a tether
    this.rov = new THREE.Group();
    const rb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2), M([0.95, 0.75, 0.1])); this.rov.add(rb);
    const rl = new THREE.PointLight(0xffffff, 30, 20, 1.5); rl.position.set(0, 0, 1.2); this.rov.add(rl);
    this.tether = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 200, 5), M([0.95, 0.95, 0.95])); this.tether.position.y = 100; this.rov.add(this.tether);
    s.add(this.rov);
    this.anchors = { sub: new THREE.Vector3(0, 2.4, 0), cup: new THREE.Vector3(1.45, 1, 1.2), floor: new THREE.Vector3(2, 1.5, 10) };
  }
  // o.depth (m), o.speed (descent m/s for the drifting snow; negative when rising), o.press (0..1 crush test), o.drop (0..1 weights falling),
  // o.rov (0..1 approach), o.lights
  update(t, o = {}) {
    const d = o.depth ?? 0;
    const dark = clamp(d / 900);
    this.bg.copy(lin(0.18, 0.5, 0.75)).lerp(lin(0.01, 0.02, 0.04), dark); this.scene.fog.color.copy(this.bg);
    this.scene.fog.density = lerp(0.012, 0.035, dark);
    this.amb.intensity = lerp(1.4, 0.35, dark);
    const L = o.lights ?? (d > 200 ? 1 : 0);
    this.sub.userData.lamps.forEach((l) => { if (l.isLight) l.intensity = 260 * L; else l.material.opacity = 0.06 * L; });
    // surface + ship
    this.surface.visible = d < 120; this.surface.position.y = d;
    this.ship.visible = d < 120; this.ship.position.set(0, d, -10);
    // drifting snow
    const sp = o.speed ?? 0, p = this.snow.geometry.attributes.position;
    this.snowSeed.forEach((q, i) => p.setXYZ(i, q.x + Math.sin(t * 0.2 + i) * 0.3, ((q.y + t * (0.4 + sp) ) % 60 + 60) % 60 - 30, q.z));
    p.needsUpdate = true; this.snow.material.opacity = 0.2 + 0.7 * dark;
    const bp = this.bio.geometry.attributes.position;
    this.bioSeed.forEach((q, i) => bp.setXYZ(i, q.x, q.y + Math.sin(t * 0.3 + q.ph) * 0.5, q.z));
    bp.needsUpdate = true; this.bio.material.opacity = 0.9 * clamp((d - 600) / 800) * (0.6 + 0.4 * Math.sin(t * 3));
    // the bottom
    const toBottom = BOTTOM - d;
    this.floorGroup.visible = toBottom < 600;
    this.floorGroup.position.y = -toBottom - 2.4;
    for (const q of this.amph) { const a = t * q.sp + q.ph; q.a.position.set(2 + Math.cos(a) * q.r, 0.4 + q.h + Math.sin(a * 3) * 0.1, 10 + Math.sin(a) * q.r); q.a.rotation.y = -a; }
    for (const q of this.fish) { const a = t * 0.15 + q.ph; q.f.position.set(q.x0 + Math.sin(a) * 4, 1 + Math.sin(a * 2) * 0.4, q.z0 + Math.cos(a) * 3); q.f.rotation.y = a + Math.PI / 2; }
    for (const q of this.jellies) { q.j.visible = d > 800; q.j.position.set(q.x, q.y + Math.sin(t * 0.8 + q.ph), q.z); q.j.scale.set(1, 1 + 0.2 * Math.sin(t * 3 + q.ph), 1); }
    // crush test: foam cup shrinks, can collapses
    const pr = o.press ?? clamp(d / BOTTOM);
    const { cup, can, weights } = this.sub.userData;
    cup.scale.setScalar(lerp(1, 0.55, pr));
    const crush = pr > 0.15 ? 1 : 0;
    can.scale.set(1 + 0.4 * crush, lerp(1, 0.25, crush), lerp(1, 0.5, crush));
    // drop weights
    const dr = o.drop ?? 0;
    weights.forEach((w, i) => { w.position.y = -1.6 - dr * 25 - i * dr * 3; w.rotation.x = dr * 2; w.visible = dr < 0.98; });
    // rescue ROV
    const rv = o.rov ?? -1;
    this.rov.visible = rv >= 0;
    if (rv >= 0) this.rov.position.set(lerp(6, 1.8, rv), lerp(14, 2.6, rv), lerp(8, 1, rv));
  }
}

export class SubInside {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x050608);
    s.add(new THREE.AmbientLight(0x404858, 1.2));
    const l = new THREE.PointLight(0xffc890, 18, 10, 1.4); l.position.set(0, 1.6, 1.2); s.add(l);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 20), M([0.42, 0.44, 0.48], { side: THREE.BackSide })); s.add(shell);
    const R = mulberry32(2);
    this.pilot = new Person(R, { hat: 'hair' }); this.pilot.root.position.set(0, -1.6, -0.6); s.add(this.pilot.root);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), M([0.15, 0.15, 0.17])); seat.position.set(0, -1.4, -0.75); s.add(seat);
    this.screens = [];
    for (let i = 0; i < 4; i++) { const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), new THREE.MeshBasicMaterial({ color: [0x3aff7a, 0x3aa0ff, 0xffb020, 0xff3b30][i] })); const a = -0.9 + i * 0.6; sc.position.set(Math.sin(a) * 1.9, -0.2 + (i % 2) * 0.4, Math.cos(a) * 1.6 + 0.2); sc.lookAt(0, 0.3, 0); s.add(sc); this.screens.push(sc); }
    this.port = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x081420 })); this.port.position.set(0, -0.6, 2.36); this.port.rotation.y = Math.PI; s.add(this.port);
    this.anchors = { pilot: new THREE.Vector3(0, 0.2, -0.6) };
  }
  update(t, calm = 1) {
    this.pilot.pose(t, 'sit', calm > 0.5 ? 1 : 3); this.pilot.head.rotation.y = calm > 0.5 ? 0 : 0.5 * Math.sin(t * 2.5);
    this.screens.forEach((sc, i) => { sc.material.opacity = 1; sc.scale.setScalar(1 + (i === 3 && calm < 0.5 ? 0.15 * Math.sin(t * 10) : 0)); });
  }
}
