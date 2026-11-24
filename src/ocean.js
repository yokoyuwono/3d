// Cross-section of the ocean from deep sea to the coast: how a tsunami travels
// (fast and low in deep water, slow and tall near the shore, trough first).
// Vertical scale is exaggerated.
import * as THREE from 'three';
import { Prism } from './crust.js';
import { clamp, lerp, mulberry32, smoothstep } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const XS = []; for (let x = -170; x <= 170 + 1e-6; x += 0.5) XS.push(x);
const ZF = 16, ZB = -16;
export const COAST = 128;
const REAL_DEEP = 4000; // metres represented by the deep floor (depth 40 units)

export function bed(x) {
  if (x < 25) return -40;
  if (x < 95) return lerp(-40, -5, smoothstep(25, 95, x));
  if (x < COAST) return lerp(-5, 0, (x - 95) / (COAST - 95));
  return Math.min(6, (x - COAST) * 0.18);
}
export const realDepth = (x) => Math.max(5, (-bed(x) / 40) * REAL_DEEP);

export class OceanSection {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x0c1a26);
    s.fog = new THREE.Fog(0x0c1a26, 150, 420);
    s.add(new THREE.HemisphereLight(0xdcecff, 0x2a2018, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.0);
    d.position.set(40, 120, 140);
    s.add(d);
    // sky backdrop panel behind the section
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), new THREE.ShaderMaterial({
      depthWrite: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec2 vU; void main(){ vec3 c = mix(vec3(0.55,0.66,0.74), vec3(0.16,0.27,0.40), smoothstep(0.5,1.0,vU.y)); c = mix(vec3(0.04,0.08,0.12), c, smoothstep(0.42,0.5,vU.y)); gl_FragColor = vec4(c,1.0); }`,
    }));
    sky.position.set(0, 0, ZB - 40);
    s.add(sky);

    const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.rock = new Prism(vmat, 6, XS, ZF, ZB);
    this.water = new Prism(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }), 3, XS, ZF, ZB);
    this.water.mesh.renderOrder = 2;
    s.add(this.rock.mesh, this.water.mesh);
    this.rock.update(bed, () => -62, (x, y, f, depth, c) => {
      if (x > COAST && depth < 0.6) c.setRGB(0.36, 0.58, 0.26);
      else if (depth < 0.8) c.setRGB(0.80, 0.70, 0.50);
      else c.setRGB(...[[0.50, 0.40, 0.30], [0.44, 0.35, 0.27], [0.38, 0.30, 0.24]][Math.floor(depth / 4) % 3]);
      c.multiplyScalar(lerp(0.7, 1, f));
      c.convertSRGBToLinear();
    });

    // town on the coast
    const R = mulberry32(5);
    for (let k = 0; k < 26; k++) {
      const x = COAST + 4 + R() * 36, z = ZB + 3 + R() * (ZF - ZB - 6);
      const h = 1.2 + R() * 2.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, h, 2.2), new THREE.MeshLambertMaterial({ color: lin(0.95, 0.9 - R() * 0.25, 0.8 - R() * 0.3) }));
      m.position.set(x, bed(x) + h / 2, z);
      s.add(m);
    }
    // a ship in deep water and fishing boats near the coast
    this.ships = [];
    const mk = (x, z, sc, col) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 2.2), new THREE.MeshLambertMaterial({ color: col }));
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 1.6), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
      cab.position.set(-1, 1.4, 0);
      g.add(hull, cab);
      g.scale.setScalar(sc);
      g.position.set(x, 0, z);
      s.add(g);
      this.ships.push({ g, x, sc });
    };
    mk(-55, ZF - 4, 1.2, lin(0.85, 0.2, 0.15));
    mk(112, ZF - 5, 0.45, lin(0.15, 0.4, 0.8));
    mk(118, 2, 0.45, lin(0.95, 0.75, 0.15));

    // wave position along x as a function of a travel parameter, with speed ~ sqrt(depth)
    this.track = [];
    let x = -150, tt = 0;
    while (x < COAST + 4) {
      this.track.push([tt, x]);
      const c = Math.sqrt(Math.max(0.3, -bed(x)));
      x += c * 0.05;
      tt += 0.05;
    }
    this.trackLen = tt;
    this.anchors = { wave: new THREE.Vector3(), ship: new THREE.Vector3(), coast: new THREE.Vector3(COAST - 6, 1, ZF) };
  }

  // X of the wave for a normalised travel time u (0..1)
  waveX(u) {
    const tt = clamp(u) * this.trackLen;
    const tr = this.track;
    let i = Math.min(tr.length - 2, Math.floor(tt / 0.05));
    const k = (tt - tr[i][0]) / 0.05;
    return lerp(tr[i][1], tr[i + 1][1], clamp(k));
  }

  eta(x, X, t) {
    const d = Math.max(0.35, -bed(X));
    const A = 1.3 * Math.pow(40 / d, 0.25) * (1 + 1.6 * smoothstep(8, 1, d));
    const w = Math.max(3.5, 18 * Math.sqrt(d / 40));
    const s = x - X;
    const trough = -0.75 * A * Math.exp(-(((s - 0.9 * w) / w) ** 2));
    const crest = A * Math.exp(-(((s + 0.9 * w) / w) ** 2));
    const swell = 0.12 * Math.sin(x * 0.25 - t * 1.4);
    return trough + crest + swell;
  }

  update(t, X) {
    const top = (x) => this.eta(x, X, t);
    this.water.update(top, (x) => Math.min(bed(x), top(x)), (x, y, f, depth, c) => {
      c.setRGB(0.25, 0.62, 0.85).lerp(new THREE.Color(0.04, 0.16, 0.36), 1 - f);
      c.convertSRGBToLinear();
    });
    for (const sh of this.ships) {
      const y = Math.max(this.eta(sh.x, X, t), bed(sh.x) + 0.3);
      sh.g.position.y = y + 0.3 * sh.sc;
      const slope = this.eta(sh.x + 1, X, t) - this.eta(sh.x - 1, X, t);
      sh.g.rotation.z = Math.atan(slope / 2) * (bed(sh.x) + 0.3 > this.eta(sh.x, X, t) ? 0 : 1) + (bed(sh.x) + 0.3 > this.eta(sh.x, X, t) ? 0.2 : 0);
    }
    this.anchors.wave.set(X - 0.9 * Math.max(3.5, 18 * Math.sqrt(Math.max(0.35, -bed(X)) / 40)), this.eta(X - 10, X, t) + 3, ZF);
    this.anchors.ship.set(this.ships[0].x, this.ships[0].g.position.y + 3.2, ZF - 4);
  }

  info(X) {
    const D = realDepth(X);
    const kmh = Math.sqrt(9.81 * D) * 3.6;
    const H = Math.pow(REAL_DEEP / D, 0.25) * (1 + 3 * smoothstep(100, 10, D));
    return { depth: D, kmh, H };
  }
}
