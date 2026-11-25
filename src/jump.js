// Scenes for "Andai semua orang Indonesia melompat bersamaan":
//  StadiumScene  a concert crowd (instanced fans) jumping to the beat
//  BridgeScene   a long footbridge that sways when people walk in step (Millennium Bridge, 2000)
//  AtomScene     a nucleus with electron orbits, to show how tiny the Earth's recoil is
import * as THREE from 'three';
import { clamp, lerp, mulberry32 } from './util.js';
import { Person, Flock, jumpState } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class StadiumScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x0a0c18); s.fog = new THREE.Fog(0x0a0c18, 80, 260);
    s.add(new THREE.HemisphereLight(0x9aa8ff, 0x303030, 1.5));
    const R = mulberry32(12);
    // pitch / floor and the bowl of stands
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshLambertMaterial({ color: lin(0.12, 0.25, 0.12) })); floor.rotation.x = -Math.PI / 2; s.add(floor);
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(62 + i * 6, 62 + i * 6, 2, 64, 1, true, 0.35, Math.PI * 2 - 0.7), new THREE.MeshLambertMaterial({ color: lin(0.25, 0.26, 0.3), side: THREE.DoubleSide }));
      ring.position.y = 1 + i * 3.2; s.add(ring);
    }
    // stage with lights
    const stage = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 12), new THREE.MeshLambertMaterial({ color: lin(0.1, 0.1, 0.12) })); stage.position.set(0, 1, -50); s.add(stage);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ color: 0x3050ff })); screen.position.set(0, 10, -55); s.add(screen); this.screen = screen;
    this.beams = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: [0xff3070, 0x30a0ff, 0xffd030][i % 3], transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      b.position.set(-12 + i * 5, 30, -50); s.add(b); this.beams.push(b);
    }
    // the crowd: instanced bodies + heads, on the floor and in the stands
    const N = 2600;
    this.N = N;
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.25, 0.8, 3, 6), new THREE.MeshLambertMaterial(), N);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshLambertMaterial({ color: lin(0.55, 0.38, 0.26) }), N);
    this.fans = [];
    const cols = [[0.9, 0.2, 0.3], [0.2, 0.5, 0.9], [0.95, 0.95, 0.95], [0.95, 0.75, 0.2], [0.3, 0.8, 0.5], [0.6, 0.3, 0.8]];
    for (let i = 0; i < N; i++) {
      let x, z, y;
      if (i < 1400) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 40; x = Math.cos(a) * r; z = Math.sin(a) * r * 0.9 - 8; y = 0; }
      else { const ring = Math.floor(R() * 6), a = 0.35 + R() * (Math.PI * 2 - 0.7) - Math.PI / 2; const r = 63 + ring * 6; x = Math.cos(a) * r; z = -Math.sin(a) * r; y = 2 + ring * 3.2; }
      body.setColorAt(i, lin(...cols[Math.floor(R() * cols.length)]));
      this.fans.push({ x, y, z, ph: R() * 0.15 });
    }
    s.add(body, head);
    this.body = body; this.head = head;
    this.m = new THREE.Matrix4();
    this.anchors = { crowd: new THREE.Vector3(0, 4, -8), stage: new THREE.Vector3(0, 18, -52) };
  }
  // beat: jumps per second; amp: jump height
  update(t, beat = 2.2, amp = 0.4) {
    const m = this.m;
    this.fans.forEach((f, i) => {
      const p = ((t + f.ph) * beat) % 1;
      const y = f.y + Math.max(0, Math.sin(p * Math.PI * 2)) * amp;
      m.makeTranslation(f.x, y + 0.65, f.z); this.body.setMatrixAt(i, m);
      m.makeTranslation(f.x, y + 1.35, f.z); this.head.setMatrixAt(i, m);
    });
    this.body.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true;
    this.beams.forEach((b, i) => { b.rotation.z = 0.5 * Math.sin(t * 0.8 + i); b.rotation.x = 0.3 * Math.cos(t * 0.6 + i * 2); });
    this.screen.material.color.setHSL((t * 0.1) % 1, 0.7, 0.5);
  }
}

export class BridgeScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xb8cde0); s.fog = new THREE.Fog(0xb8cde0, 80, 400);
    s.add(new THREE.HemisphereLight(0xffffff, 0x506070, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.position.set(30, 50, 20); s.add(sun);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshLambertMaterial({ color: lin(0.35, 0.42, 0.45) })); river.rotation.x = -Math.PI / 2; river.position.y = -8; s.add(river);
    // banks with buildings
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(400, 10, 120), new THREE.MeshLambertMaterial({ color: lin(0.55, 0.52, 0.48) })); bank.position.set(0, -4, side * 130); s.add(bank);
      for (let i = 0; i < 14; i++) { const h = 10 + (i * 7) % 25; const b = new THREE.Mesh(new THREE.BoxGeometry(14, h, 14), new THREE.MeshLambertMaterial({ color: lin(0.75 - (i % 3) * 0.08, 0.72 - (i % 2) * 0.06, 0.66) })); b.position.set(-100 + i * 16, h / 2 + 1, side * 100); s.add(b); }
    }
    // the bridge deck (moves sideways) with railings
    this.deck = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 150), new THREE.MeshLambertMaterial({ color: lin(0.7, 0.72, 0.75) })); this.deck.add(deck);
    for (const x of [-2, 2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 150), new THREE.MeshLambertMaterial({ color: lin(0.8, 0.82, 0.85) })); rail.position.set(x, 0.8, 0); this.deck.add(rail); }
    s.add(this.deck);
    for (const z of [-25, 25]) { const pier = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 3), new THREE.MeshLambertMaterial({ color: lin(0.6, 0.6, 0.62) })); pier.position.set(0, -4.5, z); s.add(pier); }
    const R = mulberry32(7);
    this.walkers = Array.from({ length: 26 }, (_, i) => { const p = new Person(R); this.deck.add(p.root); return { p, x: -1.3 + R() * 2.6, z0: -70 + R() * 140, dir: R() < 0.5 ? 1 : -1, ph: R() * 6 }; });
    this.flock = new Flock(s, 8, { c: new THREE.Vector3(0, 0, 0), r: 30, h: 12, color: [0.95, 0.95, 0.95], size: 2.2, seed: 5 });
    this.anchors = { mid: new THREE.Vector3(0, 3, 0) };
  }
  // sway: 0..1 sideways amplitude; sync: 0 random steps .. 1 everyone in step
  update(t, sway = 0, sync = 0) {
    const ox = Math.sin(t * Math.PI * 2 * 1.0) * 0.45 * sway;
    this.deck.position.x = ox; this.deck.rotation.z = -ox * 0.02;
    for (const w of this.walkers) {
      const z = ((w.z0 + t * 1.3 * w.dir + 75) % 150 + 150) % 150 - 75;
      w.p.root.position.set(w.x + ox * 0.3, 0.25, z);
      w.p.root.rotation.y = w.dir > 0 ? 0 : Math.PI;
      w.p.pose(lerp(t + w.ph, t, sync), 'walk', 1);
      w.p.body.rotation.z = -ox * 0.3;
    }
    this.flock.update(t, 1);
  }
}

export class AtomScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x05060d);
    s.add(new THREE.AmbientLight(0x8090b0, 0.6));
    const l = new THREE.PointLight(0xffffff, 60, 0, 1.5); l.position.set(5, 8, 10); s.add(l);
    this.nucleus = new THREE.Group();
    const R = mulberry32(2);
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff5a48 : 0x8fa8c8, roughness: 0.5 }));
      p.position.set((R() - 0.5) * 1.2, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2); this.nucleus.add(p);
    }
    s.add(this.nucleus);
    this.orbits = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); g.rotation.set(i * 1.05, i * 0.6, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.03, 6, 120), new THREE.MeshBasicMaterial({ color: 0x5a7ab0 })); g.add(ring);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0x8fd3ff })); g.add(e);
      s.add(g); this.orbits.push({ g, e, sp: 1.2 + i * 0.4 });
    }
    // the "Earth moved this much" marker: a short arrow at nucleus scale
    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(2.2, 0.6, 0), 0.6, 0xffd400, 0.25, 0.2);
    s.add(this.arrow);
    this.anchors = { nucleus: new THREE.Vector3(0, 1.6, 0), arrow: new THREE.Vector3(2.2, 1.2, 0) };
  }
  update(t) {
    this.nucleus.rotation.y = t * 0.3;
    for (const o of this.orbits) { const a = t * o.sp; o.e.position.set(Math.cos(a) * 7, Math.sin(a) * 7, 0); }
  }
}
