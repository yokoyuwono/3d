// Explainers for "why the tropics are warm": a flashlight-style beam hitting the ground
// straight down vs at a slant, and the tilted Earth orbiting the Sun (seasons).
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.35, 'rgba(255,200,80,0.6)'); gr.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ beams
export class BeamScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x0c1420);
    s.add(new THREE.HemisphereLight(0xbfd4ff, 0x202020, 0.6));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshLambertMaterial({ color: lin(0.3, 0.42, 0.28) }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const grid = new THREE.GridHelper(120, 40, 0x6f8a6a, 0x4c6448);
    grid.position.y = 0.02;
    s.add(grid);
    const beamMat = () => new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    // equator: vertical beam, small bright spot
    this.b1 = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 40, 32, 1, true), beamMat());
    this.b1.position.set(-18, 20, 0);
    this.spot1 = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.95 }));
    this.spot1.rotation.x = -Math.PI / 2; this.spot1.position.set(-18, 0.05, 0);
    // high latitude: slanted beam, stretched dim spot (same energy, ~1.75x area at 55 degrees)
    const ang = THREE.MathUtils.degToRad(55);
    this.ang = ang;
    this.b2 = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 50, 32, 1, true), beamMat());
    this.b2.rotation.z = -ang;
    this.b2.position.set(22 + Math.sin(ang) * 25, Math.cos(ang) * 25, 0);
    this.spot2 = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.45 }));
    this.spot2.rotation.x = -Math.PI / 2; this.spot2.position.set(22, 0.05, 0); this.spot2.scale.set(1 / Math.cos(ang), 1, 1);
    s.add(this.b1, this.spot1, this.b2, this.spot2);
    // "energy units": the same 12 glowing squares inside each spot
    const R = mulberry32(3);
    const sq = new THREE.PlaneGeometry(1.1, 1.1);
    this.units = [];
    for (const [cx, sx, op] of [[-18, 1, 1], [22, 1 / Math.cos(ang), 0.55]]) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + R() * 0.3, r = 1.2 + (i % 3) * 1.1;
        const m = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: op }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(cx + Math.cos(a) * r * sx, 0.1, Math.sin(a) * r);
        s.add(m);
        this.units.push(m);
      }
    }
    this.anchors = { left: new THREE.Vector3(-18, 9, 0), right: new THREE.Vector3(22, 9, 0), sunL: new THREE.Vector3(-18, 36, 0), sunR: new THREE.Vector3(22 + Math.sin(ang) * 44, Math.cos(ang) * 44, 0) };
  }
  update(t, o = {}) {
    const l = o.left ?? 1, r = o.right ?? 1;
    this.b1.material.opacity = 0.22 * l; this.spot1.material.opacity = 0.95 * l;
    this.b2.material.opacity = 0.22 * r; this.spot2.material.opacity = 0.45 * r;
    this.units.forEach((u, i) => { u.visible = (i < 12 ? l : r) > 0.5 && (o.units ?? 0) > 0.5; });
  }
}

// ------------------------------------------------------------------ orbit / seasons
export class OrbitScene {
  constructor(colorMap) {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x02040a);
    const R = mulberry32(12);
    const sp = [];
    for (let i = 0; i < 1500; i++) { const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(300); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(26); sun.add(glow);
    s.add(sun);
    this.sun = sun; this.glow = glow;
    s.add(new THREE.PointLight(0xffffff, 3.2, 0, 0), new THREE.AmbientLight(0x303040, 0.5));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 0.08, 6, 160), new THREE.MeshBasicMaterial({ color: 0x5a7aa0 }));
    ring.rotation.x = Math.PI / 2;
    s.add(ring);
    // tilted Earth (23.4 degrees, axis fixed in space)
    this.tilt = new THREE.Group();
    this.tilt.rotation.z = THREE.MathUtils.degToRad(23.4);
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 32), new THREE.MeshLambertMaterial({ map: colorMap }));
    this.earth.rotation.y = -Math.PI / 2;
    const axisLine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const eq = new THREE.Mesh(new THREE.TorusGeometry(3.04, 0.05, 6, 80), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
    eq.rotation.x = Math.PI / 2;
    this.tilt.add(this.earth, axisLine, eq);
    this.holder = new THREE.Group();
    this.holder.add(this.tilt);
    s.add(this.holder);
    this.anchors = { earth: new THREE.Vector3(), sun: new THREE.Vector3(0, 6, 0) };
  }
  // a: orbit angle (rad); spin: Earth rotation
  update(t, a, spin = 0, tiltDeg = 23.4) {
    this.tilt.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
    this.holder.position.set(Math.cos(a) * 30, 0, Math.sin(a) * 30);
    this.earth.rotation.y = -Math.PI / 2 + spin;
    this.anchors.earth.copy(this.holder.position).add(new THREE.Vector3(0, 5.6, 0));
  }
}
