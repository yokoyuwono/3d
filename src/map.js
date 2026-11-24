// Stylised (illustrative, not to scale) map of the Indonesian archipelago with the
// Sunda megathrust and plate motion arrows. Units: 10 per degree; x = lon, z = -lat.
import * as THREE from 'three';
import { clamp, smoothstep } from './util.js';

const K = 10, LON0 = 116, LAT0 = -2;
export const geo = (lon, lat, y = 0) => new THREE.Vector3((lon - LON0) * K, y, -(lat - LAT0) * K);
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

const ISLANDS = {
  sumatra: [[95.3, 5.6], [97.5, 5.2], [98.7, 3.8], [100.5, 2.1], [103.5, -1.0], [104.6, -2.4], [106.0, -3.2], [105.8, -5.8], [104.6, -5.9], [102.3, -4.0], [100.4, -1.1], [98.6, 1.7], [97.1, 3.0]],
  java: [[105.2, -6.8], [106.0, -6.0], [108.3, -6.3], [110.4, -6.9], [112.6, -6.9], [114.4, -7.7], [114.4, -8.6], [111.0, -8.2], [108.5, -7.8], [106.4, -7.4]],
  borneo: [[109.0, 1.5], [109.6, 2.0], [111.0, 1.7], [113.0, 3.1], [115.5, 5.0], [117.0, 7.0], [119.0, 5.2], [118.0, 4.3], [117.6, 2.0], [119.0, 0.8], [117.5, 0.0], [116.5, -2.5], [116.0, -3.9], [114.6, -4.0], [113.0, -3.2], [111.0, -3.0], [110.0, -1.7], [109.0, 0.0]],
  sulawesi: [[119.4, -5.6], [120.4, -5.5], [120.6, -3.0], [121.1, -4.7], [122.8, -4.6], [121.4, -2.0], [123.4, -0.9], [121.3, -0.8], [120.4, 0.5], [124.9, 1.6], [125.2, 1.2], [121.0, 0.3], [119.9, 0.0], [119.0, -2.0], [118.9, -3.5]],
  papua: [[131.0, -1.0], [132.5, -0.4], [135.0, -3.2], [137.8, -1.5], [141, -2.6], [145, -4.5], [147.5, -6.5], [150, -10.5], [146, -8.5], [143, -9.2], [141, -9.1], [138.5, -8.3], [137.6, -5.0], [135, -4.4], [133, -4.0], [132, -2.9]],
  malaya: [[100.3, 6.5], [101, 6.8], [102.3, 6.2], [103.4, 4.0], [104.2, 1.4], [103.5, 1.3], [101.3, 2.8], [100.3, 5.0]],
  mindanao: [[122, 7.0], [124, 8.2], [126.3, 9.0], [126.5, 6.3], [125.4, 5.6], [124, 6.5]],
  luzon: [[120.0, 16.0], [121.5, 18.5], [122.3, 17.0], [122.0, 14.0], [124.0, 13.0], [121.0, 13.6]],
  australia: [[113, -22], [114, -21.8], [122, -17], [126, -14], [129, -14.8], [131, -12.2], [137, -12.2], [136, -15], [140, -17.5], [142, -10.7], [146, -19], [153, -26], [153, -35], [113, -35]],
  halmahera: [[127.5, 2.0], [128.2, 1.5], [128.0, 0.5], [128.7, -0.8], [127.9, -0.5], [127.4, 0.8]],
};
const ELLIPSES = [[115.1, -8.4, 0.6, 0.3, 0], [116.3, -8.6, 0.5, 0.3, 0], [117.9, -8.7, 1.3, 0.35, 0.1], [121.0, -8.6, 1.9, 0.4, 0.05], [125.2, -9.3, 1.7, 0.45, -0.5], [119.9, -9.7, 1.0, 0.4, 0.2], [129.9, -3.2, 1.6, 0.4, 0.1], [126.6, -3.4, 0.8, 0.4, 0], [133.3, -5.7, 0.4, 0.8, 0], [98.0, -1.3, 0.6, 0.25, -0.8], [99.2, -2.0, 0.4, 0.2, -0.8], [102.4, -5.3, 0.3, 0.15, -0.8]];
export const SIMEULUE = [96.15, 2.6];
// Sunda megathrust (illustrative trace) + Banda arc
const TRENCH = [[92.5, 13], [93.0, 8.5], [94.3, 4.0], [96.6, 0.2], [99.5, -3.3], [102.4, -6.4], [106.0, -8.9], [110.0, -10.0], [115.0, -10.6], [120.0, -10.9], [124.5, -10.4], [127.5, -8.6], [131.0, -6.8], [131.8, -4.6], [130.0, -3.0]];
const TRENCH2 = [[127.0, 13.0], [126.8, 9.0], [127.6, 5.0], [128.5, 2.0]];

export class MapScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.fog = new THREE.Fog(0x081a2c, 900, 2600);
    s.background = new THREE.Color(0x081a2c);
    s.add(new THREE.HemisphereLight(0xdfeeff, 0x223344, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 2.0);
    d.position.set(-200, 400, 300);
    s.add(d);

    // ocean with lat/lon grid and depth glow near the trench
    this.oceanU = { uTime: { value: 0 } };
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShaderMaterial({
      uniforms: this.oceanU,
      vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec3 vW;
        void main(){
          vec3 c = vec3(0.035, 0.12, 0.22);
          vec2 g = abs(fract(vW.xz / 50.0 + 0.5) - 0.5) * 50.0;
          float line = 1.0 - smoothstep(0.0, 0.45, min(g.x, g.y));
          c += line * vec3(0.05, 0.10, 0.14);
          float d = length(vW.xz) / 900.0;
          c *= 1.0 - d * 0.6;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    ocean.rotation.x = -Math.PI / 2;
    s.add(ocean);

    // islands
    const landMat = new THREE.MeshLambertMaterial({ color: lin(0.42, 0.62, 0.32) });
    const sideMat = new THREE.MeshLambertMaterial({ color: lin(0.80, 0.70, 0.48) });
    const ext = (shape, h = 2.2) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.8, bevelSegments: 2, curveSegments: 6 });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const shapeOf = (pts) => new THREE.Shape(pts.map(([lo, la]) => { const v = geo(lo, la); return new THREE.Vector2(v.x, -v.z); }));
    const addLand = (shape, h) => { const m = new THREE.Mesh(ext(shape, h), [landMat, sideMat]); s.add(m); return m; };
    for (const pts of Object.values(ISLANDS)) addLand(shapeOf(pts));
    const ellipse = (lo, la, rx, ry, rot) => {
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        pts.push([lo + x * Math.cos(rot) - y * Math.sin(rot), la + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      return shapeOf(pts);
    };
    for (const e of ELLIPSES) addLand(ellipse(...e));
    this.simeulue = addLand(ellipse(SIMEULUE[0], SIMEULUE[1], 0.55, 0.17, -0.75), 2.4);
    this.simeulueMat = new THREE.MeshLambertMaterial({ color: lin(0.95, 0.75, 0.2), emissive: lin(0.6, 0.35, 0.0), emissiveIntensity: 0 });
    this.simeulue.material = [this.simeulueMat, sideMat];

    // plate boundary: glowing tube
    const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([lo, la]) => geo(lo, la, 0.6))), 200, r, 6, false);
    this.trenchMat = new THREE.MeshBasicMaterial({ color: 0xff3a1f, transparent: true, opacity: 0.95 });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a20, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const tr of [TRENCH, TRENCH2]) {
      s.add(new THREE.Mesh(tube(tr, 0.9), this.trenchMat));
      s.add(new THREE.Mesh(tube(tr, 3.2), this.glowMat));
    }
    // teeth marks along the Sunda trench (subduction symbol)
    const curve = new THREE.CatmullRomCurve3(TRENCH.map(([lo, la]) => geo(lo, la, 0.6)));
    const tooth = new THREE.ConeGeometry(1.8, 4, 3);
    tooth.rotateX(Math.PI / 2);
    for (let i = 1; i < 40; i++) {
      const p = curve.getPointAt(i / 40), tg = curve.getTangentAt(i / 40);
      const m = new THREE.Mesh(tooth, this.trenchMat);
      m.position.copy(p);
      const n = new THREE.Vector3(-tg.z, 0, tg.x); // points landward (to the left of travel)
      m.lookAt(p.clone().add(n));
      s.add(m);
    }

    // plate motion arrows (Indo-Australia moves NNE)
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-3, -14); arrowShape.lineTo(3, -14); arrowShape.lineTo(3, 2); arrowShape.lineTo(8, 2);
    arrowShape.lineTo(0, 14); arrowShape.lineTo(-8, 2); arrowShape.lineTo(-3, 2); arrowShape.closePath();
    const ag = new THREE.ShapeGeometry(arrowShape);
    ag.rotateX(-Math.PI / 2);
    this.arrows = [];
    for (const [lo, la] of [[100, -12], [110, -15.5], [121, -15.5]]) {
      const m = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, depthWrite: false }));
      m.position.copy(geo(lo, la, 1.2));
      m.rotation.y = -0.2;
      s.add(m);
      this.arrows.push({ m, base: m.position.clone() });
    }
    // pulsing epicentre ring off Sumatra
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(geo(SIMEULUE[0], SIMEULUE[1], 1));
    s.add(this.ring);

    this.anchors = {
      eurasia: geo(108.5, 4.5, 3), indo: geo(108, -15.5, 3), pacific: geo(136.5, 5.5, 3),
      trench: geo(101.5, -6.3, 3), simeulue: geo(SIMEULUE[0], SIMEULUE[1], 3), sumatra: geo(101.5, -0.5, 3), java: geo(110.0, -7.4, 3),
    };
  }

  // mode: 'plates' (ch1) or 'simeulue' (ch7). k: 0..1 progress inside the shot
  update(t, mode, k) {
    this.oceanU.uTime.value = t;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    this.glowMat.opacity = 0.18 + 0.2 * pulse;
    for (const a of this.arrows) {
      const s = (t * 0.6) % 1;
      a.m.position.copy(a.base).add(new THREE.Vector3(0.2 * s * 20, 0, -s * 20));
      a.m.material.opacity = mode === 'plates' ? Math.sin(Math.PI * s) * smoothstep(0.05, 0.25, k) : 0;
    }
    this.simeulueMat.emissiveIntensity = mode === 'simeulue' ? 0.6 + 0.4 * pulse : 0;
    const rk = (t * 0.8) % 1;
    this.ring.visible = mode === 'simeulue';
    this.ring.scale.setScalar(4 + rk * 30);
    this.ring.material.opacity = (1 - rk) * 0.9;
  }
}
