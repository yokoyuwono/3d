// Scenes for "Andai Bulan menghilang": a coral reef that spawns under the full moon,
// moon-sighting (rukyatul hilal) at sunset, a solar eclipse, and beach creatures
// (turtle hatchlings, crabs). Plus moon textures (full and crescent).
import * as THREE from 'three';
import { clamp, lerp, mulberry32, fbm } from './util.js';
import { Person, Flock } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export function moonTexture(phase = 1) {
  // phase 1 = full moon, small values = thin crescent (lit limb on the right)
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(128, 128, 70, 128, 128, 128);
  glow.addColorStop(0, `rgba(255,250,225,${0.35 * phase})`); glow.addColorStop(1, 'rgba(255,250,225,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(128, 128, 90, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#f2eedd'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(150,150,140,0.45)';
  for (const [x, y, r] of [[100, 100, 22], [150, 140, 16], [120, 165, 12], [165, 95, 10], [90, 150, 9]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  if (phase < 1) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.arc(128 - 180 * phase, 128, 92, 0, Math.PI * 2); g.fill(); }
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const glowTex = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ------------------------------------------------------------------ beach creatures
export function makeHatchling() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: lin(0.25, 0.22, 0.18) }));
  shell.scale.set(1, 0.6, 1.3);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshLambertMaterial({ color: lin(0.3, 0.28, 0.22) })); head.position.set(0, 0.03, 0.17);
  const fl = [];
  for (const [x, z] of [[-0.12, 0.06], [0.12, 0.06]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.05), new THREE.MeshLambertMaterial({ color: lin(0.3, 0.28, 0.22) })); f.position.set(x, 0.02, z); g.add(f); fl.push(f); }
  g.add(shell, head);
  g.userData = { fl };
  return g;
}
export function makeCrab() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: lin(0.85, 0.3, 0.12) });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), m); body.scale.set(1.3, 0.45, 1); body.position.y = 0.1;
  g.add(body);
  for (const s of [-1, 1]) { const cl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m); cl.position.set(s * 0.2, 0.12, 0.14); g.add(cl); for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4), m); l.rotation.z = s * 1.0; l.position.set(s * 0.2, 0.06, -0.08 + i * 0.07); g.add(l); } }
  return g;
}

// ------------------------------------------------------------------ coral reef
export class ReefScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0x0b3550);
    s.background = this.bg;
    s.fog = new THREE.FogExp2(0x0b3550, 0.035);
    s.add(new THREE.HemisphereLight(0x9fd6ff, 0x203030, 1.3));
    const d = new THREE.DirectionalLight(0xd8f0ff, 1.2); d.position.set(5, 30, 10); s.add(d);
    const R = mulberry32(51);
    const g = new THREE.PlaneGeometry(120, 120, 60, 60); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * 0.08, p.getY(i) * 0.08, 3) - 0.5) * 2.5);
    g.computeVertexNormals();
    const floor = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: lin(0.75, 0.7, 0.55) })); floor.rotation.x = -Math.PI / 2; s.add(floor);
    const colors = [[1, 0.45, 0.55], [0.95, 0.75, 0.2], [0.55, 0.35, 0.85], [0.2, 0.75, 0.7], [1, 0.55, 0.25], [0.9, 0.9, 0.95]];
    this.corals = [];
    for (let i = 0; i < 70; i++) {
      const x = -20 + R() * 40, z = -30 + R() * 34, col = lin(...colors[Math.floor(R() * colors.length)]);
      const grp = new THREE.Group();
      if (R() < 0.45) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.8 + R() * 1.2, 12, 8), new THREE.MeshLambertMaterial({ color: col })); b.scale.y = 0.6; grp.add(b); }
      else for (let j = 0; j < 6; j++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.4 + R() * 1.6, 6), new THREE.MeshLambertMaterial({ color: col })); br.position.set((R() - 0.5) * 0.8, 0.8, (R() - 0.5) * 0.8); br.rotation.set((R() - 0.5) * 0.9, 0, (R() - 0.5) * 0.9); grp.add(br); }
      grp.position.set(x, 0, z);
      s.add(grp);
      this.corals.push(grp);
    }
    // fish schools
    const fishGeo = new THREE.ConeGeometry(0.16, 0.6, 6); fishGeo.rotateX(Math.PI / 2);
    this.fish = Array.from({ length: 60 }, (_, i) => {
      const f = new THREE.Mesh(fishGeo, new THREE.MeshLambertMaterial({ color: lin(...[[1, 0.6, 0.1], [0.2, 0.5, 1], [1, 1, 0.3], [0.95, 0.95, 0.95]][i % 4]) }));
      s.add(f);
      return { f, c: new THREE.Vector3(-8 + (i % 3) * 8, 3 + R() * 3, -10 - R() * 10), r: 3 + R() * 4, sp: 0.4 + R() * 0.4, ph: R() * 6, h: R() * 2 };
    });
    // spawning: thousands of pink/white egg bundles rising
    const n = 2500;
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.eggs = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffc0d0, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false }));
    this.eggSeeds = Array.from({ length: n }, () => { const c = this.corals[Math.floor(R() * this.corals.length)].position; return { x: c.x + (R() - 0.5) * 1.5, z: c.z + (R() - 0.5) * 1.5, sp: 0.4 + R() * 0.8, ph: R() }; });
    s.add(this.eggs);
    // moonlight shafts from the surface
    this.shafts = [];
    for (let i = 0; i < 6; i++) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 40), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      sh.position.set(-12 + i * 5, 18, -14 + (i % 2) * 6); sh.rotation.z = 0.25; s.add(sh); this.shafts.push(sh);
    }
    this.anchors = { reef: new THREE.Vector3(0, 6, -12) };
  }
  update(t, spawn, moonlight) {
    for (const q of this.fish) {
      const a = t * q.sp + q.ph;
      q.f.position.set(q.c.x + Math.cos(a) * q.r, q.c.y + Math.sin(a * 2) * 0.4 + q.h, q.c.z + Math.sin(a) * q.r);
      q.f.rotation.y = -a;
    }
    const p = this.eggs.geometry.attributes.position;
    this.eggs.visible = spawn > 0.01;
    if (this.eggs.visible) this.eggSeeds.forEach((q, i) => { const k = (t * 0.12 * q.sp + q.ph) % 1; p.setXYZ(i, q.x + Math.sin(t + i) * 0.3 * k, 0.6 + k * 16, q.z); });
    p.needsUpdate = true;
    this.eggs.material.opacity = 0.9 * spawn;
    for (const sh of this.shafts) sh.material.opacity = 0.03 + 0.08 * moonlight;
    this.bg.copy(new THREE.Color(0x041522)).lerp(new THREE.Color(0x0b3550), moonlight);
    this.scene.fog.color.copy(this.bg);
  }
}

// ------------------------------------------------------------------ moon sighting at sunset
export class HilalScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.skyU = { uT: { value: 0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uT; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = mix(vec3(1.0,0.5,0.22), vec3(0.85,0.55,0.45), smoothstep(-0.02, 0.05, h));
          c = mix(c, vec3(0.32,0.30,0.48), smoothstep(0.03, 0.12, h)); c = mix(c, vec3(0.08,0.10,0.26), smoothstep(0.12, 0.6, h));
          float sunGlow = pow(max(dot(d, normalize(vec3(-0.25, 0.02, -1.0))), 0.0), 40.0); c += vec3(1.0,0.6,0.3) * sunGlow * 0.8;
          gl_FragColor = vec4(c,1.0);
          #include <colorspace_fragment>
        }`,
    }));
    s.add(sky);
    s.add(new THREE.HemisphereLight(0xffc89a, 0x40304a, 1.2));
    const d = new THREE.DirectionalLight(0xffa060, 1.4); d.position.set(-25, 6, -100); s.add(d);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshLambertMaterial({ color: lin(0.25, 0.25, 0.38) })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.5; s.add(sea);
    // rooftop / hill platform with observers and a telescope
    const deck = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 12), new THREE.MeshLambertMaterial({ color: lin(0.55, 0.5, 0.45) })); deck.position.set(0, 0, 8); s.add(deck);
    const R = mulberry32(61);
    this.people = [[-3, 6, 'point'], [-1, 7.5, 'idle'], [1.6, 6.5, 'lookUp'], [3.5, 8, 'idle'], [-5, 9, 'lookUp']].map(([x, z, pose]) => {
      const p = new Person(R, { hat: 'peci' }); p.root.position.set(x, 0.5, z); p.root.rotation.y = Math.PI + (R() - 0.5) * 0.4; s.add(p.root); return { p, pose };
    });
    const tri = new THREE.Group();
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), new THREE.MeshLambertMaterial({ color: 0x333333 })); const a = (i / 3) * Math.PI * 2; l.position.set(Math.cos(a) * 0.35, 0.75, Math.sin(a) * 0.35); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); tri.add(l); }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 12), new THREE.MeshLambertMaterial({ color: 0xf0f0f0 })); tube.rotation.x = -1.2; tube.position.set(0, 1.7, -0.2); tri.add(tube);
    tri.position.set(0, 0.5, 5.6); s.add(tri);
    // distant mosque silhouette
    const sil = new THREE.MeshLambertMaterial({ color: lin(0.18, 0.13, 0.17) });
    const base = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 10), sil); base.position.set(26, 3, -40);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), sil); dome.position.set(26, 6, -40);
    const min = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 18, 8), sil); min.position.set(36, 9, -38);
    s.add(base, dome, min);
    // crescent (hilal) low over the sunset
    this.moonMat = new THREE.SpriteMaterial({ map: moonTexture(0.16), transparent: true, depthWrite: false, fog: false });
    this.moon = new THREE.Sprite(this.moonMat); this.moon.scale.setScalar(13); this.moon.position.set(-14, 20, -120);
    s.add(this.moon);
    this.flock = new Flock(s, 7, { c: new THREE.Vector3(-10, 0, -60), r: 25, h: 22, color: [0.12, 0.1, 0.12], size: 2.5, seed: 3 });
    this.anchors = { moon: this.moon.position.clone().add(new THREE.Vector3(0, 7, 0)), group: new THREE.Vector3(0, 3.6, 7) };
  }
  update(t, crescent) {
    this.moonMat.opacity = crescent;
    for (const q of this.people) q.p.pose(t, crescent < 0.5 && q.pose === 'idle' ? 'lookUp' : q.pose, 1);
    this.flock.update(t, 1);
  }
}

// ------------------------------------------------------------------ eclipse
export class EclipseScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x02030a);
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,250,235,1)', 'rgba(255,200,120,0)'), blending: THREE.AdditiveBlending, depthWrite: false }));
    corona.scale.setScalar(18); s.add(corona);
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); s.add(this.sun);
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(4.15, 64), new THREE.MeshBasicMaterial({ color: 0x050505 })); this.moon.position.z = 0.1; s.add(this.moon);
    this.corona = corona;
  }
  // shrink: 0 = today's Moon (total eclipse), 1 = far future (annular only)
  update(t, shrink) {
    const r = lerp(1, 0.82, shrink);
    this.moon.scale.setScalar(r);
    this.corona.material.opacity = 1 - 0.6 * shrink;
  }
}

// ------------------------------------------------------------------ turtle beach at night
// moon = 1: the sea horizon is brighter than the land, hatchlings head for the water.
// moon = 0: the brightest thing is the street lamps inland, many hatchlings wander the wrong way.
export class TurtleBeach {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(); s.background = this.bg;
    s.fog = new THREE.Fog(0x0a1428, 40, 220);
    this.hemi = new THREE.HemisphereLight(0x8fa8d8, 0x1a1a22, 1.0); s.add(this.hemi);
    this.moonLight = new THREE.DirectionalLight(0xcfdcff, 1.2); this.moonLight.position.set(-10, 30, -80); s.add(this.moonLight);
    const g = new THREE.PlaneGeometry(200, 120, 80, 50); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = -p.getY(i); p.setZ(i, z * 0.06 + (fbm(p.getX(i) * 0.1, z * 0.1, 2) - 0.5) * 0.4); }
    g.computeVertexNormals();
    const sand = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: lin(0.85, 0.78, 0.62) })); sand.rotation.x = -Math.PI / 2; s.add(sand);
    this.seaMat = new THREE.MeshLambertMaterial({ color: lin(0.2, 0.32, 0.5) });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), this.seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.05, -1000); s.add(sea);
    // moon glitter path on the sea
    this.glitter = new THREE.Mesh(new THREE.PlaneGeometry(14, 260), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glitter.rotation.x = -Math.PI / 2; this.glitter.position.set(-4, 0.02, -140); s.add(this.glitter);
    // foam line
    this.foam = new THREE.Mesh(new THREE.PlaneGeometry(200, 1.2), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.6 }));
    this.foam.rotation.x = -Math.PI / 2; this.foam.position.set(0, 0.04, -1); s.add(this.foam);
    this.moonMat = new THREE.SpriteMaterial({ map: moonTexture(1), transparent: true, depthWrite: false, fog: false });
    const moon = new THREE.Sprite(this.moonMat); moon.scale.setScalar(26); moon.position.set(-8, 34, -200); s.add(moon);
    // town lights inland (the wrong "bright horizon")
    this.lamps = [];
    const lampTex = glowTex('rgba(255,200,120,1)', 'rgba(255,160,60,0)');
    for (let i = 0; i < 9; i++) {
      const x = -32 + i * 8;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), new THREE.MeshLambertMaterial({ color: 0x333333 })); pole.position.set(x, 2.5 + 1.6, 28); s.add(pole);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); gl.scale.setScalar(5); gl.position.set(x, 6.8, 28); s.add(gl);
      this.lamps.push(gl);
    }
    for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), new THREE.MeshLambertMaterial({ color: lin(0.25, 0.22, 0.22) })); h.position.set(-30 + i * 12, 3.6, 36); s.add(h); const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: 0xffc070 })); w.position.set(-30 + i * 12, 3.8, 33.45); w.rotation.y = Math.PI; s.add(w); }
    // nest + hatchlings
    const nest = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x5a4a35 })); nest.rotation.x = -Math.PI / 2; nest.position.set(0, 0.62, 10.2); s.add(nest);
    const R = mulberry32(81);
    this.hatch = Array.from({ length: 34 }, (_, i) => {
      const h = makeHatchling(); h.scale.setScalar(2.4); s.add(h);
      return { h, ph: R(), sp: 0.7 + R() * 0.5, spread: (R() - 0.5) * 0.7, wrong: R() < 0.6, wa: (R() - 0.5) * 2.4 };
    });
    this.crabs = Array.from({ length: 5 }, () => { const c = makeCrab(); s.add(c); return { c, x: -8 + R() * 16, z: 2 + R() * 6, ph: R() * 6 }; });
    // two conservation volunteers watching (red torches keep the beach dark)
    this.people = [[-7, 13], [7.5, 14]].map(([x, z], i) => { const pp = new Person(R, { hat: i ? 'hijab' : 'hair' }); pp.root.position.set(x, z * 0.06 + 0.1, z); pp.root.rotation.y = Math.PI + (i ? 0.5 : -0.5); s.add(pp.root); return pp; });
    this.anchors = { nest: new THREE.Vector3(0, 2.2, 10.2), sea: new THREE.Vector3(-2, 2, -2), lamps: new THREE.Vector3(0, 9, 28) };
  }
  update(t, moon) {
    const night = lin(0.01, 0.015, 0.04), moonlit = lin(0.06, 0.1, 0.2);
    this.bg.copy(night).lerp(moonlit, moon); this.scene.fog.color.copy(this.bg);
    this.hemi.intensity = 0.35 + 0.75 * moon; this.moonLight.intensity = 1.3 * moon;
    this.moonMat.opacity = moon; this.glitter.material.opacity = 0.35 * moon;
    this.seaMat.color.copy(lin(0.05, 0.07, 0.12)).lerp(lin(0.22, 0.34, 0.52), moon);
    this.foam.material.opacity = 0.2 + 0.4 * moon;
    for (const q of this.hatch) {
      const d = ((t * 0.09 * q.sp + q.ph) % 1) * 11;                // distance walked from the nest
      const lost = q.wrong ? 1 - moon : 0;
      const a = lerp(Math.PI + q.spread, q.wa, lost);               // heading: sea (-z) vs wandering inland
      const x = Math.sin(a) * d + Math.sin(t * 2 + q.ph * 9) * 0.15 * lost, z = 10.2 + Math.cos(a) * d * (lost ? 1 : 1);
      q.h.position.set(x, Math.max(0.05, z * 0.06) + 0.04, z);
      q.h.rotation.y = a + Math.sin(t * 9 + q.ph * 20) * 0.25;
      q.h.visible = z > -0.8;
      q.h.userData.fl.forEach((f, j) => (f.rotation.y = Math.sin(t * 10 + j * Math.PI + q.ph * 7) * 0.6));
    }
    for (const c of this.crabs) { const x = c.x + Math.sin(t * 0.7 + c.ph) * 2.5; c.c.position.set(x, c.z * 0.06 + 0.02, c.z); c.c.rotation.y = Math.PI / 2; }
    for (const p of this.people) p.pose(t, moon > 0.5 ? 'idle' : 'point', 1);
  }
}

// ------------------------------------------------------------------ mangrove at tide
export class MangroveScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xa8cbe6); s.fog = new THREE.Fog(0xa8cbe6, 60, 220);
    s.add(new THREE.HemisphereLight(0xffffff, 0x4a5a40, 1.4));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6); sun.position.set(30, 50, 20); s.add(sun);
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 60, 60), new THREE.MeshLambertMaterial({ color: lin(0.42, 0.35, 0.26) }));
    const mp = mud.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) mp.setZ(i, (fbm(mp.getX(i) * 0.05, mp.getY(i) * 0.05, 3) - 0.5) * 1.2 + mp.getY(i) * 0.015);
    mud.geometry.computeVertexNormals(); mud.rotation.x = -Math.PI / 2; s.add(mud);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: lin(0.32, 0.45, 0.42), transparent: true, opacity: 0.85 }));
    this.water.rotation.x = -Math.PI / 2; s.add(this.water);
    const R = mulberry32(91);
    const bark = new THREE.MeshLambertMaterial({ color: lin(0.35, 0.27, 0.2) });
    for (let i = 0; i < 26; i++) {
      const x = -40 + R() * 80, z = -10 - R() * 40, h = 3 + R() * 2;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, h, 6), bark); tr.position.y = h / 2 + 1.2; g.add(tr);
      for (let j = 0; j < 7; j++) { const a = (j / 7) * Math.PI * 2; const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 5), bark); r.position.set(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8); r.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); g.add(r); }
      for (let j = 0; j < 4; j++) { const c = new THREE.Mesh(new THREE.SphereGeometry(1.4 + R() * 0.8, 10, 8), new THREE.MeshLambertMaterial({ color: lin(0.18 + R() * 0.08, 0.42 + R() * 0.1, 0.18) })); c.position.set((R() - 0.5) * 2, h + 1.2 + R(), (R() - 0.5) * 2); g.add(c); }
      s.add(g);
    }
    this.crabs = Array.from({ length: 10 }, () => { const c = makeCrab(); c.scale.setScalar(1.6); s.add(c); return { c, x: -10 + R() * 20, z: 4 + R() * 10, ph: R() * 6 }; });
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, -20), r: 20, h: 10, color: [0.97, 0.97, 0.97], size: 2.2, seed: 9 });
    this.anchors = { roots: new THREE.Vector3(0, 4, -14), crabs: new THREE.Vector3(0, 2, 8) };
  }
  // level: water height (m) relative to the mud flat
  update(t, level) {
    this.water.position.y = level;
    for (const q of this.crabs) {
      const y = q.z * 0.015 + 0.05;
      const out = level < y - 0.1;
      q.c.visible = out;
      q.c.position.set(q.x + Math.sin(t * 0.8 + q.ph) * 1.4, y, q.z);
      q.c.rotation.y = Math.PI / 2;
    }
    this.flock.update(t, 1);
  }
}
