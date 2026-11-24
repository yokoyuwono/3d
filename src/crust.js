// Cut-away diorama of the subduction zone: locked plates, stress build-up, rupture.
import * as THREE from 'three';
import { clamp, lerp, mulberry32, smoothstep, easeOut } from './util.js';
import { T_QUAKE } from './timeline.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const X0 = -70, X1 = 70, ZF = 35, ZB = -35;
const XS = []; for (let x = X0; x <= X1 + 1e-6; x += 1) XS.push(x);
const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

export const slabTop = (x) => { const d = Math.max(0, x + 8); return -12 - 0.42 * (d * d / (d + 8)) - 2.5 * g(x, -9, 4); };
const contTop0 = (x) => -12 + 12 * smoothstep(-8, 22, x) + 3 * smoothstep(22, 45, x);

// a vertical prism between bottom(x) and top(x), extruded from ZB to ZF
class Prism {
  constructor(mat, rows = 8) {
    this.rows = rows;
    const nx = XS.length;
    this.front = nx * (rows + 1);
    this.topN = nx * 2;
    this.capN = (rows + 1) * 2;
    const n = this.front + this.topN + this.capN;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = [];
    for (let i = 0; i < nx - 1; i++) for (let r = 0; r < rows; r++) {
      const a = i * (rows + 1) + r, b = a + 1, c = a + rows + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const t0 = this.front;
    for (let i = 0; i < nx - 1; i++) { const a = t0 + i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const c0 = this.front + this.topN;
    for (let r = 0; r < rows; r++) { const a = c0 + r * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }
  update(top, bot, colorFn) {
    const p = this.mesh.geometry.attributes.position, c = this.mesh.geometry.attributes.color;
    const col = new THREE.Color();
    let k = 0;
    XS.forEach((x) => {
      const yt = top(x), yb = bot(x);
      for (let r = 0; r <= this.rows; r++) {
        const f = r / this.rows, y = lerp(yb, yt, f);
        p.setXYZ(k, x, y, ZF);
        colorFn(x, y, f, yt - y, col);
        c.setXYZ(k, col.r, col.g, col.b);
        k++;
      }
    });
    XS.forEach((x) => {
      const yt = top(x);
      colorFn(x, yt, 1, 0, col);
      col.multiplyScalar(1.12);
      p.setXYZ(k, x, yt, ZF); c.setXYZ(k++, col.r, col.g, col.b);
      p.setXYZ(k, x, yt, ZB); c.setXYZ(k++, col.r, col.g, col.b);
    });
    const xr = X1;
    for (let r = 0; r <= this.rows; r++) {
      const f = r / this.rows, y = lerp(bot(xr), top(xr), f);
      colorFn(xr, y, f, top(xr) - y, col);
      col.multiplyScalar(0.8);
      p.setXYZ(k, xr, y, ZF); c.setXYZ(k++, col.r, col.g, col.b);
      p.setXYZ(k, xr, y, ZB); c.setXYZ(k++, col.r, col.g, col.b);
    }
    p.needsUpdate = c.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

export class Crust {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.fog = new THREE.Fog(0x0a1622, 160, 420);
    // background gradient
    const bg = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.012,0.025,0.045), vec3(0.05,0.12,0.20), smoothstep(-0.4,0.6,h)); gl_FragColor = vec4(c,1.0); }`,
    }));
    s.add(bg);
    this.bg = bg;
    s.add(new THREE.HemisphereLight(0xcfe3ff, 0x30241a, 1.3));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(60, 120, 120);
    s.add(d);

    const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.mantle = new Prism(vmat, 10);
    this.slab = new Prism(vmat, 6);
    this.cont = new Prism(vmat, 12);
    this.water = new Prism(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide }), 4);
    this.water.mesh.renderOrder = 2;
    s.add(this.mantle.mesh, this.slab.mesh, this.cont.mesh, this.water.mesh);

    // glowing locked zone on the plate interface
    const n = 40;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 2 * 3), 3));
    const li = [];
    for (let i = 0; i < n; i++) li.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    lg.setIndex(li);
    for (let i = 0; i <= n; i++) {
      const x = lerp(-7, 22, i / n), y = slabTop(x), w = 1.6 * Math.sin((i / n) * Math.PI) + 0.3;
      lg.attributes.position.setXYZ(2 * i, x, y + w, ZF + 0.15);
      lg.attributes.position.setXYZ(2 * i + 1, x, y - w, ZF + 0.15);
    }
    this.lockMat = new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.lock = new THREE.Mesh(lg, this.lockMat);
    s.add(this.lock);

    // seismic rings + flash at the hypocenter
    this.hypo = new THREE.Vector3(8, slabTop(8), ZF + 0.3);
    this.rings = [];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.copy(this.hypo);
      s.add(m);
      this.rings.push(m);
    }
    this.flash = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.flash.position.copy(this.hypo);
    this.flash.position.z += 0.1;
    s.add(this.flash);

    // motion arrows
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-6, -1.1); arrowShape.lineTo(2, -1.1); arrowShape.lineTo(2, -2.6); arrowShape.lineTo(6.5, 0);
    arrowShape.lineTo(2, 2.6); arrowShape.lineTo(2, 1.1); arrowShape.lineTo(-6, 1.1); arrowShape.closePath();
    const ag = new THREE.ShapeGeometry(arrowShape);
    this.arrowA = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }));
    this.arrowB = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.9, depthTest: false }));
    this.arrowA.renderOrder = this.arrowB.renderOrder = 5;
    s.add(this.arrowA, this.arrowB);

    // tiny town + boat on the surface
    const R = mulberry32(7);
    this.props = [];
    const house = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const tree = new THREE.ConeGeometry(0.8, 2.4, 6);
    for (let k = 0; k < 70; k++) {
      const x = 26 + R() * 42, z = ZB + 3 + R() * (ZF - ZB - 6);
      const isTree = R() < 0.45;
      const m = new THREE.Mesh(isTree ? tree : house, new THREE.MeshLambertMaterial({ color: isTree ? lin(0.2, 0.5, 0.2) : lin(0.95, 0.9 - R() * 0.3, 0.8 - R() * 0.4) }));
      m.scale.y = isTree ? 1 : 1 + R() * 1.5;
      this.props.push({ m, x, z, h: (isTree ? 1.2 : 0.7 * m.scale.y), ph: R() * 6 });
      s.add(m);
    }
    const boat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1), new THREE.MeshLambertMaterial({ color: lin(0.9, 0.2, 0.15) }));
    this.props.push({ m: boat, x: -30, z: 10, h: 0.3, ph: 0, boat: true });
    s.add(boat);

    this.anchors = {
      ocean: new THREE.Vector3(-24, -18, ZF), cont: new THREE.Vector3(26, -9, ZF), lock: new THREE.Vector3(6, -17, ZF),
      mantle: new THREE.Vector3(-10, -50, ZF), sea: new THREE.Vector3(-28, -5, ZF), hypo: this.hypo,
    };
  }

  stress(t) { return smoothstep(8.4, T_QUAKE, t); }

  // continental deformation (exaggerated elastic rebound)
  deform(x, t) {
    const st = this.stress(t);
    const tr = t - T_QUAKE;
    const pre = -3.2 * g(x, 4, 12) + 1.3 * g(x, 34, 12);
    if (tr < 0) return st * pre;
    const k = easeOut(clamp(tr / 0.35));
    const post = 2.6 * g(x, 4, 12) - 0.6 * g(x, 34, 12);
    const ring = Math.exp(-tr * 3) * Math.sin(tr * 30) * 0.6 * g(x, 4, 14);
    return lerp(pre, post, k) + ring;
  }

  hump(x, t) {
    const tr = t - T_QUAKE;
    if (tr < 0) return -0.8 * this.stress(t) * g(x, 4, 12);
    const rise = easeOut(clamp(tr / 0.4));
    const c = 9 * Math.max(0, tr - 0.25);
    return 3.2 * rise * (0.5 * g(x, 4 - c, 9) + 0.5 * g(x, 4 + c, 9));
  }

  update(t) {
    const st = this.stress(t);
    const contTop = (x) => contTop0(x) + this.deform(x, t);
    const slabBot = (x) => slabTop(x) - 11;
    const lava = new THREE.Color();
    this.mantle.update(slabBot, () => -66, (x, y, f, depth, c) => {
      c.setRGB(0.95, 0.42, 0.10).lerp(lava.setRGB(0.55, 0.08, 0.03), 1 - f);
      c.multiplyScalar(0.85 + 0.15 * Math.sin(x * 0.2 + y * 0.3 + t));
      c.convertSRGBToLinear();
    });
    this.slab.update(slabTop, slabBot, (x, y, f, depth, c) => {
      c.setRGB(0.30, 0.33, 0.38).lerp(lava.setRGB(0.20, 0.21, 0.25), 1 - f);
      if (depth < 1.2) c.setRGB(0.45, 0.42, 0.36);
      c.convertSRGBToLinear();
    });
    this.cont.update(contTop, slabTop, (x, y, f, depth, c) => {
      const band = ((Math.floor(Math.max(0, depth) / 2.2) % 3) + 3) % 3;
      if (depth < 0.9 && x > 22) c.setRGB(0.32, 0.55, 0.25);
      else c.setRGB(...[[0.62, 0.46, 0.30], [0.70, 0.55, 0.36], [0.55, 0.40, 0.27]][band]);
      c.multiplyScalar(lerp(0.75, 1.0, f));
      c.convertSRGBToLinear();
    });
    this.water.update((x) => this.hump(x, t), (x) => (x < -8 ? slabTop(x) : Math.min(0, contTop(x))), (x, y, f, depth, c) => {
      c.setRGB(0.20, 0.55, 0.85).lerp(lava.setRGB(0.05, 0.18, 0.40), 1 - f);
      c.convertSRGBToLinear();
    });

    // lock glow: pulses faster as stress grows, blows out at rupture
    const tr = t - T_QUAKE;
    const pulse = 0.5 + 0.5 * Math.sin(t * lerp(3, 16, st));
    this.lockMat.opacity = tr < 0 ? st * (0.35 + 0.65 * pulse) : Math.max(0, 1 - tr * 1.2);
    this.lock.scale.y = 1;

    for (let k = 0; k < this.rings.length; k++) {
      const a = tr - k * 0.18;
      const r = this.rings[k];
      if (a < 0) { r.material.opacity = 0; continue; }
      const rad = 3 + a * 55;
      r.scale.setScalar(rad);
      r.material.opacity = Math.max(0, 0.9 - a * 0.55);
    }
    const fl = tr < 0 ? 0 : Math.exp(-tr * 4);
    this.flash.material.opacity = fl;
    this.flash.scale.setScalar(2 + (1 - fl) * 14);

    // arrows glide in the plate motion direction
    const slide = (t * 0.9) % 1;
    const ax = -50 + slide * 8;
    this.arrowA.position.set(ax, slabTop(ax) - 5.5, ZF + 0.4);
    this.arrowA.rotation.z = Math.atan2(slabTop(ax + 1) - slabTop(ax - 1), 2);
    this.arrowA.material.opacity = 0.9 * Math.sin(Math.PI * slide) * (tr < 0 ? 1 : Math.max(0, 1 - tr));
    const bx = 50 - slide * 6;
    this.arrowB.position.set(bx, -13, ZF + 0.4);
    this.arrowB.rotation.z = Math.PI;
    this.arrowB.material.opacity = 0.9 * Math.sin(Math.PI * slide) * (tr < 0 ? 1 : Math.max(0, 1 - tr));

    const shake = tr > 0 ? Math.exp(-tr * 1.5) : 0;
    for (const p of this.props) {
      const y = p.boat ? this.hump(p.x, t) + p.h : contTop(p.x) + p.h;
      p.m.position.set(p.x + shake * 0.6 * Math.sin(t * 40 + p.ph), y, p.z);
      p.m.rotation.z = shake * 0.25 * Math.sin(t * 33 + p.ph);
    }
  }
}
