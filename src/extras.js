// Small explainer scenes: energy cubes (magnitude scale), the bent ruler (elastic
// rebound analogy) and the human/car scale shot for moving flood water.
import * as THREE from 'three';
import { clamp, easeOut, lerp, mulberry32, smoothstep } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

function studio(bg = 0x0b1520) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  s.add(new THREE.HemisphereLight(0xe8f2ff, 0x30281e, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.4);
  d.position.set(30, 60, 40);
  s.add(d);
  return s;
}

// ------------------------------------------------------------------ energy cubes
// M7 = 1 cube, M8 = 32 cubes (4x4x2), M9 = 1024 cubes (16x8x8)
export class Cubes {
  constructor() {
    this.scene = studio(0x0d1117);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshLambertMaterial({ color: 0x1b2430 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const box = new THREE.BoxGeometry(0.88, 0.88, 0.88);
    this.groups = [];
    const mk = (dims, origin, color) => {
      const [nx, ny, nz] = dims;
      const n = nx * ny * nz;
      const m = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: lin(...color) }), n);
      const cells = [];
      for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) cells.push([x, y, z]);
      this.scene.add(m);
      this.groups.push({ m, cells, origin, dims, t0: 1e9 });
    };
    mk([1, 1, 1], new THREE.Vector3(-0.5, 0, 9), [1.0, 0.85, 0.2]);
    mk([4, 2, 4], new THREE.Vector3(-2, 0, 2), [1.0, 0.55, 0.1]);
    mk([16, 8, 8], new THREE.Vector3(-8, 0, -10), [0.95, 0.2, 0.12]);
    this.dummy = new THREE.Object3D();
    this.anchors = { m7: new THREE.Vector3(0, 2.2, 9.5), m8: new THREE.Vector3(0, 3.2, 4), m9: new THREE.Vector3(0, 9.5, -6) };
  }
  // times at which each group starts appearing
  update(t, times) {
    this.groups.forEach((g, gi) => {
      g.t0 = times[gi];
      const n = g.cells.length;
      const spread = gi === 2 ? 1.4 : gi === 1 ? 0.6 : 0.01;
      g.cells.forEach(([x, y, z], i) => {
        const delay = (i / n) * spread;
        const k = easeOut(clamp((t - g.t0 - delay) / 0.25));
        this.dummy.position.set(g.origin.x + x + 0.5, y + 0.5 + (1 - k) * 4, g.origin.z + z + 0.5);
        this.dummy.scale.setScalar(Math.max(0.0001, k));
        this.dummy.updateMatrix();
        g.m.setMatrixAt(i, this.dummy.matrix);
      });
      g.m.instanceMatrix.needsUpdate = true;
    });
  }
}

// ------------------------------------------------------------------ ruler analogy
export class Ruler {
  constructor() {
    this.scene = studio(0x1a1f26);
    const table = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 8), new THREE.MeshLambertMaterial({ color: lin(0.45, 0.30, 0.18) }));
    table.position.set(-7, -0.5, 0);
    this.scene.add(table);
    const geo = new THREE.BoxGeometry(20, 0.18, 2.4, 80, 1, 1);
    geo.translate(10 - 6, 0.09, 0); // 6 units rest on the table, 14 stick out
    this.base = geo.attributes.position.array.slice();
    const tex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#f2d35b'; g.fillRect(0, 0, 1024, 128);
      g.fillStyle = '#222';
      for (let i = 0; i <= 100; i++) { const x = 8 + i * 10; g.fillRect(x, 0, 2, i % 10 === 0 ? 46 : i % 5 === 0 ? 32 : 20); if (i % 10 === 0) { g.font = 'bold 26px Inter'; g.fillText(String(i / 10), x + 4, 80); } }
      return c;
    })());
    tex.colorSpace = THREE.SRGBColorSpace;
    this.ruler = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    this.scene.add(this.ruler);
    // finger pressing the tip
    this.finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.2, 4, 10), new THREE.MeshLambertMaterial({ color: lin(0.72, 0.5, 0.38) }));
    this.scene.add(this.finger);
    // clamp block on the table end
    const clampM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 3), new THREE.MeshLambertMaterial({ color: 0x555b66 }));
    clampM.position.set(-3.5, 0.75, 0);
    this.scene.add(clampM);
    this.anchors = { tip: new THREE.Vector3(14, 1, 0) };
  }
  // bend: 0..1 while loading; release: seconds since snap (<0 before)
  update(bend, release) {
    let amp = -3.2 * bend;
    if (release >= 0) amp = 3.2 * Math.exp(-release * 2.2) * Math.cos(release * 18) * -1 * (release < 0.02 ? 1 : 1);
    const p = this.ruler.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = this.base[i * 3];
      const u = Math.max(0, x) / 14; // 0 at the table edge, 1 at the tip
      p.setY(i, this.base[i * 3 + 1] + amp * u * u * (3 - u) / 2);
    }
    p.needsUpdate = true;
    this.ruler.geometry.computeVertexNormals();
    const tipY = amp;
    this.finger.visible = release < 0;
    this.finger.position.set(13, tipY + 1.6, 0);
    this.anchors.tip.set(13, tipY + 3.5, 0);
  }
}

// ------------------------------------------------------------------ human / car scale
export class ScaleShot {
  constructor() {
    const s = (this.scene = studio(0x9aa6ad));
    s.fog = new THREE.Fog(0x9aa6ad, 20, 60);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ color: lin(0.30, 0.30, 0.31) }));
    road.rotation.x = -Math.PI / 2;
    s.add(road);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 3), new THREE.MeshLambertMaterial({ color: lin(0.6, 0.6, 0.58) }));
    walk.position.set(0, 0.075, -5.5);
    s.add(walk);
    const R = mulberry32(3);
    for (let k = 0; k < 8; k++) {
      const h = 5 + R() * 6, w = 4 + R() * 3;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), new THREE.MeshLambertMaterial({ color: lin(0.9, 0.85 - R() * 0.2, 0.75 - R() * 0.2) }));
      b.position.set(-14 + k * 4.5, h / 2, -9);
      s.add(b);
    }
    // person
    const skin = new THREE.MeshLambertMaterial({ color: lin(0.62, 0.43, 0.30) });
    const shirt = new THREE.MeshLambertMaterial({ color: lin(0.15, 0.45, 0.85) });
    const pants = new THREE.MeshLambertMaterial({ color: lin(0.2, 0.2, 0.25) });
    const P = (this.person = new THREE.Group());
    const leg = new THREE.CapsuleGeometry(0.11, 0.7, 3, 8);
    for (const lx of [-0.12, 0.12]) { const l = new THREE.Mesh(leg, pants); l.position.set(lx, 0.46, 0); P.add(l); }
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), shirt);
    torso.position.y = 1.15;
    P.add(torso);
    const arm = new THREE.CapsuleGeometry(0.07, 0.55, 3, 6);
    this.arms = [];
    for (const ax of [-0.32, 0.32]) { const a = new THREE.Mesh(arm, shirt); a.position.set(ax, 1.15, 0); P.add(a); this.arms.push(a); }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skin);
    head.position.y = 1.62;
    P.add(head);
    P.position.set(-1.4, 0, 0.6);
    P.rotation.y = 0.5;
    s.add(P);
    // car
    const C = (this.car = new THREE.Group());
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 4.1), new THREE.MeshLambertMaterial({ color: lin(0.85, 0.12, 0.10) }));
    body.position.y = 0.62;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.1), new THREE.MeshLambertMaterial({ color: lin(0.2, 0.25, 0.3) }));
    cab.position.set(0, 1.18, -0.2);
    C.add(body, cab);
    const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
    wheel.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) {
      const w = new THREE.Mesh(wheel, new THREE.MeshLambertMaterial({ color: 0x111111 }));
      w.position.set(wx, 0.32, wz);
      C.add(w);
    }
    C.position.set(2.0, 0, -2.6);
    C.rotation.y = -0.5;
    s.add(C);
    // measuring pole
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    pole.position.set(-0.1, 0.6, 1.6);
    s.add(pole);
    for (const y of [0.15, 0.3]) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
      tick.position.set(-0.1, y, 1.6);
      s.add(tick);
    }
    // flowing muddy water
    this.waterU = { uTime: { value: 0 } };
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 1, 1), new THREE.ShaderMaterial({
      uniforms: this.waterU, transparent: true,
      vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec3 vW;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 q = vW.xz * vec2(0.8, 2.0) - vec2(uTime * 2.6, 0.0);
          float n = vn(q) * 0.6 + vn(q * 2.3) * 0.4;
          vec3 c = mix(vec3(0.20, 0.15, 0.09), vec3(0.42, 0.34, 0.22), n);
          c = mix(c, vec3(0.85, 0.80, 0.70), smoothstep(0.72, 0.9, n) * 0.6);
          gl_FragColor = vec4(c, 0.9);
          #include <colorspace_fragment>
        }`,
    }));
    this.water.rotation.x = -Math.PI / 2;
    s.add(this.water);
    this.anchors = { m15: new THREE.Vector3(-0.1, 0.15, 1.6), m30: new THREE.Vector3(-0.1, 0.3, 1.6), person: new THREE.Vector3(), car: new THREE.Vector3() };
  }
  // level in metres; fall: 0..1 person losing balance; float: seconds the car has been floating (<0 none)
  update(t, level, fall, float) {
    this.waterU.uTime.value = t;
    this.water.position.y = Math.max(0.01, level);
    this.water.visible = level > 0.005;
    const P = this.person;
    P.rotation.z = -0.55 * easeOut(fall);
    P.rotation.x = 0.15 * easeOut(fall);
    P.position.x = -1.4 + 0.8 * easeOut(fall);
    this.arms[0].rotation.z = -1.2 * fall; this.arms[1].rotation.z = 1.2 * fall;
    const C = this.car;
    if (float > 0) {
      C.position.set(2.0 + float * 0.9, 0.1 * Math.min(1, float) + 0.03 * Math.sin(t * 3), -2.2);
      C.rotation.set(0.03 * Math.sin(t * 2.3), -0.5 - float * 0.35, 0.04 * Math.sin(t * 1.7));
    } else { C.position.set(2.0, 0, -2.6); C.rotation.set(0, -0.5, 0); }
    this.anchors.person.set(P.position.x, 2.2, P.position.z);
    this.anchors.car.set(C.position.x, 1.9, C.position.z);
  }
}
