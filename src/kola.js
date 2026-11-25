// The Kola Superdeep Borehole site (illustrative): snowy tundra, a drilling tower,
// the rusty welded cap over the hole, and workers in winter gear.
import * as THREE from 'three';
import { fbm, mulberry32 } from './util.js';
import { Person } from './life.js';
import { particleMaterial } from './world.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class KolaScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xc6d2dc);
    s.fog = new THREE.Fog(0xc6d2dc, 40, 220);
    s.add(new THREE.HemisphereLight(0xe8f0ff, 0x8090a0, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-30, 25, 20); s.add(sun);
    const g = new THREE.PlaneGeometry(500, 500, 80, 80);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * 0.02, p.getY(i) * 0.02, 3) - 0.5) * 4);
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: lin(0.92, 0.94, 0.97) }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const steel = new THREE.MeshLambertMaterial({ color: lin(0.45, 0.42, 0.4) });
    const rust = new THREE.MeshLambertMaterial({ color: lin(0.55, 0.28, 0.14) });
    // drilling tower (lattice)
    const tower = new THREE.Group();
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 34, 6), steel); leg.position.set(x * 0.7, 17, z * 0.7); leg.rotation.z = -x * 0.045; leg.rotation.x = z * 0.045; tower.add(leg); }
    for (let y = 2; y < 34; y += 4) { const ring = new THREE.Mesh(new THREE.BoxGeometry(4.6 - y * 0.06, 0.18, 4.6 - y * 0.06), steel); ring.position.y = y; tower.add(ring); const d = new THREE.Mesh(new THREE.BoxGeometry(5.4 - y * 0.06, 0.12, 0.12), steel); d.position.y = y + 2; d.rotation.z = 0.7; d.position.z = 2.1 - y * 0.03; tower.add(d); }
    tower.position.set(-14, 0, -10);
    s.add(tower);
    // buildings
    for (const [x, z, w, h, d] of [[10, -14, 16, 7, 10], [-30, -6, 12, 5, 8], [24, 4, 8, 4, 6]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: lin(0.62, 0.6, 0.55) }));
      b.position.set(x, h / 2, z); s.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), new THREE.MeshLambertMaterial({ color: lin(0.95, 0.96, 0.98) })); roof.position.set(x, h + 0.2, z); s.add(roof);
    }
    // the famous rusty cap over the borehole
    this.cap = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.3, 20), rust); plate.position.y = 0.15;
    for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), rust); const a = (i / 10) * Math.PI * 2; b.position.set(Math.cos(a) * 0.6, 0.35, Math.sin(a) * 0.6); this.cap.add(b); }
    const concrete = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 24), new THREE.MeshLambertMaterial({ color: lin(0.55, 0.55, 0.55) }));
    this.cap.add(concrete, plate);
    this.cap.position.set(2, 0, 6);
    s.add(this.cap);
    // workers in winter gear
    const R = mulberry32(40);
    this.workers = [[-1, 8.5, 2.6, 'point'], [4.4, 7.6, -2.4, 'idle'], [5.6, 3, -1.3, 'shiver'], [-8, -2, 0.4, 'wave']].map(([x, z, yaw, pose]) => {
      const w = new Person(R, { hat: 'hair' }); w.winter(true); w.root.position.set(x, 0, z); w.root.rotation.y = yaw; s.add(w.root); return { w, pose };
    });
    // snowfall
    const n = 2000;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(0.22), 1));
    sg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n).fill(0.9), 1));
    this.snow = new THREE.Points(sg, particleMaterial([1, 1, 1]));
    this.snow.frustumCulled = false;
    this.seeds = Array.from({ length: n }, () => ({ x: R() * 80 - 40, y: R() * 30, z: R() * 60 - 30, sp: 1 + R() }));
    s.add(this.snow);
    this.anchors = { cap: new THREE.Vector3(2, 2.6, 6), tower: new THREE.Vector3(-14, 36, -10) };
  }
  update(t, scaleY) {
    for (const q of this.workers) q.w.pose(t, q.pose, 1);
    const p = this.snow.geometry.attributes.position;
    this.seeds.forEach((q, i) => p.setXYZ(i, q.x + Math.sin(t + q.y) * 0.8, 30 - ((q.y + t * q.sp * 2) % 30), q.z));
    p.needsUpdate = true;
    this.snow.material.uniforms.uScale.value = scaleY;
    this.snow.material.uniforms.uFogCol.value.set(0xc6d2dc);
  }
}
