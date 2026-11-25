// "Bus brakes suddenly" analogy: the bus stops, the passengers keep moving forward.
import * as THREE from 'three';
import { clamp, easeOut, mulberry32 } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class BusScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x9ec9ec);
    s.fog = new THREE.Fog(0x9ec9ec, 60, 200);
    s.add(new THREE.HemisphereLight(0xffffff, 0x6a5a40, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(-30, 60, 40);
    s.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 400), new THREE.MeshLambertMaterial({ color: lin(0.45, 0.62, 0.32) }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(2000, 9), new THREE.MeshLambertMaterial({ color: lin(0.28, 0.28, 0.3) }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.02;
    s.add(road);
    const dash = new THREE.BoxGeometry(3, 0.03, 0.25);
    const dm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let x = -1000; x < 1000; x += 8) { const d = new THREE.Mesh(dash, dm); d.position.set(x, 0.04, 0); s.add(d); }
    // roadside trees and poles to sell the speed
    const R = mulberry32(4);
    const trunk = new THREE.CylinderGeometry(0.2, 0.3, 3, 6), crown = new THREE.SphereGeometry(1.6, 10, 8);
    const tm = new THREE.MeshLambertMaterial({ color: lin(0.4, 0.3, 0.2) }), cm = new THREE.MeshLambertMaterial({ color: lin(0.2, 0.5, 0.2) });
    for (let x = -1000; x < 1000; x += 9 + R() * 8) {
      const z = -(8 + R() * 10);
      const a = new THREE.Mesh(trunk, tm); a.position.set(x, 1.5, z);
      const b = new THREE.Mesh(crown, cm); b.position.set(x, 3.6, z); b.scale.y = 1.2;
      s.add(a, b);
    }
    // bus
    const B = (this.bus = new THREE.Group());
    const paint = new THREE.MeshLambertMaterial({ color: lin(0.95, 0.65, 0.1) });
    const box = (w, h, d, x, y, z, m = paint) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); B.add(o); return o; };
    box(12, 1.7, 2.6, 0, 1.25, 0);                // lower body
    box(12, 0.35, 2.6, 0, 3.45, 0);               // roof
    box(0.2, 2.0, 2.6, -5.9, 2.6, 0);             // rear wall
    box(0.2, 0.6, 2.6, 5.9, 3.0, 0);              // above the windscreen
    box(12.02, 0.35, 2.62, 0, 1.2, 0, new THREE.MeshLambertMaterial({ color: lin(0.1, 0.35, 0.75) }));
    for (let x = -5.8; x <= 5.8; x += 2.3) for (const z of [1.25, -1.25]) box(0.22, 1.25, 0.1, x, 2.75, z); // window pillars
    box(11.6, 1.25, 0.05, 0, 2.75, -1.27, new THREE.MeshLambertMaterial({ color: lin(0.18, 0.2, 0.24) })); // far-side shade
    box(11.6, 1.25, 0.04, 0, 2.75, 1.29, new THREE.MeshLambertMaterial({ color: lin(0.6, 0.8, 0.9), transparent: true, opacity: 0.18, depthWrite: false }));
    const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
    wheel.rotateX(Math.PI / 2);
    this.wheels = [];
    for (const [x, z] of [[-3.8, 1.3], [3.8, 1.3], [-3.8, -1.3], [3.8, -1.3]]) {
      const w = new THREE.Mesh(wheel, new THREE.MeshLambertMaterial({ color: 0x111111 }));
      w.position.set(x, 0.55, z); B.add(w); this.wheels.push(w);
    }
    // passengers (heads and shoulders visible through the windows)
    this.pax = [];
    const shirts = [[0.9, 0.2, 0.2], [0.2, 0.5, 0.9], [0.95, 0.95, 0.95], [0.2, 0.7, 0.4], [0.6, 0.3, 0.7]];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 8), new THREE.MeshLambertMaterial({ color: lin(...shirts[i % 5]) }));
      torso.position.y = 0.9;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshLambertMaterial({ color: lin(0.6, 0.42, 0.3) }));
      head.position.y = 1.75;
      p.add(torso, head);
      p.position.set(-4.2 + i * 1.7, 1.1, 0.2);
      B.add(p);
      this.pax.push({ p, x0: p.position.x, ph: i * 0.7 });
    }
    s.add(B);
    this.anchors = { bus: new THREE.Vector3(), pax: new THREE.Vector3() };
  }

  // tBrake: seconds since the brake (negative before). Returns the bus x position.
  update(t, tBrake) {
    const v = 18; // m/s before braking
    let x;
    if (tBrake < 0) x = v * tBrake;
    else x = v * 0.35 * (1 - Math.exp(-tBrake / 0.35)); // hard stop within ~1 s
    this.bus.position.x = x;
    this.bus.rotation.z = tBrake > 0 ? -0.035 * Math.exp(-tBrake * 3) * Math.sin(tBrake * 12 + 1.2) - 0.02 * Math.exp(-tBrake * 4) : 0;
    for (const w of this.wheels) w.rotation.z = -x / 0.55;
    // passengers keep their momentum, lurch forward, then settle
    const lurch = tBrake > 0 ? easeOut(clamp(tBrake / 0.45)) * Math.exp(-Math.max(0, tBrake - 0.9) * 1.2) : 0;
    for (const q of this.pax) {
      q.p.position.x = q.x0 + 0.9 * lurch;
      q.p.rotation.z = -0.55 * lurch;
      q.p.position.y = 1.1 + (tBrake < 0 ? 0.03 * Math.abs(Math.sin(t * 9 + q.ph)) : 0);
    }
    this.anchors.bus.set(x + 6.5, 4.6, 0);
    this.anchors.pax.set(x + 1, 4.4, 0.5);
    return x;
  }
}
