// Scenes for "Skala yang bikin merinding":
//  TsunamiScale  a 30 m wave next to a ten-storey building and a person (metres)
//  ReliefScale   Puncak Jaya, Everest and Olympus Mons side by side, and the Mariana Trench with Everest inside
//                (km, heights x5 so the shapes read; widths true)
//  SpaceScale    Earth, Jupiter (Great Red Spot), the Sun and a red supergiant with the planets' orbits
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person, Flock } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });
const VX = 5;

export class TsunamiScale {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x9ab8d0); s.fog = new THREE.Fog(0x9ab8d0, 80, 400);
    s.add(new THREE.HemisphereLight(0xffffff, 0x606050, 1.4));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.4); sun.position.set(30, 60, 40); s.add(sun);
    const R = mulberry32(3);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M([0.6, 0.58, 0.5])); ground.rotation.x = -Math.PI / 2; s.add(ground);
    // ten-storey building with window rows
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 30, 12), M([0.9, 0.88, 0.82])); body.position.y = 15; b.add(body);
    for (let f = 0; f < 10; f++) for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.6), new THREE.MeshBasicMaterial({ color: 0x334455 })); w.position.set(-5 + i * 3.3, 1.6 + f * 3, 6.02); b.add(w); }
    b.position.set(8, 0, 0); s.add(b);
    this.person = new Person(R, { hat: 'hijab' }); this.person.root.position.set(-1, 0, 6); s.add(this.person.root);
    // the wave: a tall curling wall of water moving in from the left
    const wg = new THREE.CylinderGeometry(16, 16, 80, 40, 1, true, 0, Math.PI * 0.9); wg.rotateZ(Math.PI / 2);
    this.wave = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: lin(0.15, 0.4, 0.55), side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
    s.add(this.wave);
    this.foam = new THREE.Mesh(new THREE.BoxGeometry(80, 1.5, 3), M([0.95, 0.97, 1])); s.add(this.foam);
    // tape measure
    this.tape = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 30, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd400 })); bar.position.y = 15; this.tape.add(bar);
    for (let i = 0; i <= 6; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0xffd400 })); t.position.y = i * 5; this.tape.add(t); }
    this.tape.position.set(-6, 0, 8); s.add(this.tape);
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, 0), r: 30, h: 36, color: [0.95, 0.95, 0.95], size: 2, seed: 2 });
    this.anchors = { top: new THREE.Vector3(-6, 32, 8), person: new THREE.Vector3(-1, 2.6, 6), building: new THREE.Vector3(8, 33, 0) };
  }
  update(t, approach = 0) {
    const x = lerp(-70, -30, approach);
    this.wave.position.set(0, 16 - 1, x); this.wave.rotation.set(0, Math.PI / 2, 0);
    this.foam.position.set(0, 31, x + 2); this.foam.rotation.y = Math.PI / 2;
    this.person.pose(t, approach > 0.3 ? 'lookUp' : 'idle', 1);
    this.flock.update(t, 1);
  }
}

function cone(h, w, col, cap) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(w / 2, h, 48, 6); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < h / 2 - 0.01) { const f = 1 + (fbm(p.getX(i) * 0.3, p.getZ(i) * 0.3, 2) - 0.5) * 0.15; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M(col)); m.position.y = h / 2; g.add(m);
  if (cap) { const c = new THREE.Mesh(new THREE.ConeGeometry(w * 0.09, h * 0.18, 32), M([0.96, 0.97, 1])); c.position.y = h * 0.91; g.add(c); }
  return g;
}

export class ReliefScale {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0xb8d4ec); s.background = this.bg;
    s.add(new THREE.HemisphereLight(0xffffff, 0x605048, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.position.set(-200, 300, 300); s.add(sun);
    // mountains group (land): Puncak Jaya, Everest, Olympus Mons (heights x5, widths true)
    this.mount = new THREE.Group(); s.add(this.mount);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(1400, 2, 120), M([0.55, 0.5, 0.42])); ground.position.y = -1; this.mount.add(ground);
    this.jaya = cone(4.884 * VX, 22, [0.45, 0.42, 0.38], true); this.jaya.position.set(-60, 0, 0); this.mount.add(this.jaya);
    this.everest = cone(8.849 * VX, 30, [0.5, 0.47, 0.44], true); this.everest.position.set(-20, 0, 0); this.mount.add(this.everest);
    this.olympus = cone(21.9 * VX, 600, [0.7, 0.38, 0.22], false); this.olympus.position.set(330, 0, -20); this.mount.add(this.olympus);
    const jet = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 1.2), M([0.95, 0.95, 0.95])); jet.position.set(-40, 10 * VX, 10); this.mount.add(jet); this.jet = jet;
    // ocean group: sea surface, Mariana trench, Everest inside
    this.ocean = new THREE.Group(); s.add(this.ocean);
    const water = new THREE.Mesh(new THREE.BoxGeometry(400, 11 * VX, 60), M([0.1, 0.3, 0.55], { transparent: true, opacity: 0.85 })); water.position.y = -11 * VX / 2; this.ocean.add(water);
    const shape = new THREE.Shape([[-200, 0], [-200, -6 * VX], [-60, -6 * VX], [-10, -10.935 * VX], [10, -10.935 * VX], [60, -6 * VX], [200, -6 * VX], [200, -14 * VX], [-200, -14 * VX]].map(([x, y]) => new THREE.Vector2(x, y)));
    const bed = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 70, bevelEnabled: false }), M([0.35, 0.3, 0.26])); bed.position.z = -35; this.ocean.add(bed);
    this.evIn = cone(8.849 * VX, 30, [0.5, 0.47, 0.44], true); this.evIn.position.set(0, -10.935 * VX, 0); this.ocean.add(this.evIn);
    const ship = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 3), M([0.9, 0.3, 0.2])); ship.position.set(30, 1, 0); this.ocean.add(ship);
    this.anchors = { jaya: new THREE.Vector3(-60, 4.884 * VX + 5, 0), everest: new THREE.Vector3(-20, 8.849 * VX + 5, 0), olympus: new THREE.Vector3(330, 21.9 * VX + 6, -20), jet: new THREE.Vector3(-40, 10 * VX + 4, 10), evIn: new THREE.Vector3(0, -2.09 * VX + 2, 0), surface: new THREE.Vector3(-40, 4, 0), gap: new THREE.Vector3(0, -1.0 * VX, 0) };
  }
  update(t, mode = 'land') {
    this.mount.visible = mode === 'land'; this.ocean.visible = mode === 'ocean';
    this.bg.set(mode === 'ocean' ? 0x9cc8ea : 0xb8d4ec);
    this.jet.position.x = -60 + ((t * 8) % 60);
  }
}

function bandTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  for (let y = 0; y < 256; y++) { const v = Math.sin(y * 0.18) * 0.5 + Math.sin(y * 0.05 + 1) * 0.5; g.fillStyle = `rgb(${200 + v * 30},${170 + v * 30},${130 + v * 25})`; g.fillRect(0, y, 512, 1); }
  g.fillStyle = '#c0503a'; g.beginPath(); g.ellipse(300, 165, 34, 18, 0, 0, 7); g.fill();
  g.strokeStyle = '#e8b090'; g.lineWidth = 4; g.beginPath(); g.ellipse(300, 165, 40, 22, 0, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex(a, b) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export class SpaceScale {
  constructor(earthMap) {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x020308);
    const R = mulberry32(8);
    const sp = []; for (let i = 0; i < 2500; i++) { const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(30000); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false })));
    s.add(new THREE.AmbientLight(0x404050, 0.8));
    this.light = new THREE.DirectionalLight(0xffffff, 2.2); this.light.position.set(-1, 0.4, 1); s.add(this.light);
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshLambertMaterial({ map: earthMap })); s.add(this.earth);
    this.jupiter = new THREE.Mesh(new THREE.SphereGeometry(11.2, 64, 32), new THREE.MeshLambertMaterial({ map: bandTex() })); s.add(this.jupiter);
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(109, 64, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,140,0.9)', 'rgba(255,160,40,0)'), blending: THREE.AdditiveBlending, depthWrite: false })); this.sunGlow.scale.setScalar(109 * 3.2); this.sun.add(this.sunGlow);
    s.add(this.sun);
    this.giant = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xff5a28, transparent: true, opacity: 0.45, depthWrite: false }));
    this.giantGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,120,60,0.8)', 'rgba(255,60,20,0)'), blending: THREE.AdditiveBlending, depthWrite: false })); this.giantGlow.scale.setScalar(3.2); this.giant.add(this.giantGlow);
    s.add(this.giant);
    // planet orbits in solar radii (for the supergiant comparison): Mercury..Saturn
    this.orbits = new THREE.Group();
    [[84, 0xbbbbbb], [156, 0xe8c070], [215, 0x4aa0ff], [328, 0xff6a40], [1118, 0xe0b080], [2049, 0xf0d890]].forEach(([r, c]) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.004 + 1.5, 6, 160), new THREE.MeshBasicMaterial({ color: c })); ring.rotation.x = Math.PI / 2; this.orbits.add(ring); });
    s.add(this.orbits);
    this.dot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a })); s.add(this.dot);
    this.anchors = { earth: new THREE.Vector3(), jupiter: new THREE.Vector3(), sun: new THREE.Vector3(), giant: new THREE.Vector3(), dot: new THREE.Vector3() };
  }
  // mode: 'jupiter' | 'sun' | 'giant'
  update(t, mode) {
    [this.earth, this.jupiter, this.sun, this.giant, this.orbits, this.dot].forEach((o) => (o.visible = false));
    this.earth.rotation.y = t * 0.2; this.jupiter.rotation.y = t * 0.15;
    if (mode === 'jupiter') {
      this.jupiter.visible = this.earth.visible = true;
      this.jupiter.position.set(0, 0, 0); this.earth.position.set(14.5, 0, 3);
      this.anchors.earth.set(14.5, 1.8, 3); this.anchors.jupiter.set(0, 12.5, 0);
    } else if (mode === 'sun') {
      this.sun.visible = this.earth.visible = this.jupiter.visible = true;
      this.sun.position.set(0, 0, 0); this.earth.position.set(125, 0, 30); this.jupiter.position.set(150, 0, 30);
      this.anchors.earth.set(125, 3, 30); this.anchors.jupiter.set(150, 14, 30); this.anchors.sun.set(0, 118, 0);
    } else if (mode === 'giant') {
      this.giant.visible = this.orbits.visible = this.dot.visible = true;
      this.giant.scale.setScalar(2150); this.giant.position.set(0, 0, 0);
      this.dot.scale.setScalar(12); this.dot.position.set(2400, 0, 0);
      this.anchors.giant.set(0, 2300, 0); this.anchors.dot.set(2400, 60, 0);
    }
  }
}
