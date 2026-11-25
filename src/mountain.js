// Mountain scenes for ANDAI… Episode 2 (illustrative, not to scale):
//  - 'jaya':  a Puncak Jaya-like limestone massif with a summit ice field that can shrink
//  - 'dieng': a highland plateau around 2,000 m whose grass can be covered with frost (embun upas)
// Units: 1 unit = 100 m of altitude.
import * as THREE from 'three';
import { fbm, mulberry32, axis } from './util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export function jayaH(x, z) {
  const ridge = Math.exp(-(((z + 0.12 * x) / 34) ** 2)) * Math.exp(-((x / 120) ** 2));
  const n = fbm(x * 0.03 + 3, z * 0.03 + 7, 4);
  const crest = Math.abs(fbm(x * 0.06, z * 0.06, 3) - 0.5) * 2;
  let h = 49 * Math.pow(ridge, 0.75) * (0.82 + 0.25 * n) + crest * 4 * ridge + (n - 0.5) * 3;
  h += 6 * Math.exp(-(((x + 70) / 60) ** 2 + ((z - 60) / 50) ** 2)); // foothills
  return Math.max(0, h);
}

export function diengH(x, z) {
  const n = fbm(x * 0.02 + 11, z * 0.02 + 5, 4);
  let h = 20 + (n - 0.5) * 4;
  const rim = Math.sqrt(x * x + z * z);
  h += 9 * Math.max(0, (rim - 90) / 60) ** 1.4 * (0.7 + 0.6 * n);          // surrounding peaks
  h -= 2.2 * Math.exp(-(((x - 18) / 16) ** 2 + ((z + 10) / 12) ** 2));     // crater lake basin
  return h;
}

export class MountainScene {
  constructor(mode) {
    this.mode = mode;
    const s = (this.scene = new THREE.Scene());
    const sky = mode === 'jaya' ? 0x9fc4e6 : 0xc9d6df;
    s.background = new THREE.Color(sky);
    s.fog = new THREE.Fog(sky, mode === 'jaya' ? 250 : 120, mode === 'jaya' ? 700 : 420);
    this.sunDir = new THREE.Vector3(-0.5, 0.65, 0.55).normalize();
    this.u = {
      uSun: { value: this.sunDir }, uIce: { value: 1 }, uFrost: { value: 0 }, uSnowLine: { value: 999 },
      uFogCol: { value: new THREE.Color(sky) }, uFogNear: { value: s.fog.near }, uFogFar: { value: s.fog.far }, uWarm: { value: 0 },
    };
    const H = mode === 'jaya' ? jayaH : diengH;
    this.H = H;
    const xs = axis([[-260, 260, 2]]), zs = axis([[-260, 260, 2]]);
    const pos = [], idx = [];
    for (const z of zs) for (const x of xs) pos.push(x, H(x, z), z);
    const nx = xs.length;
    for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun, uFogCol; uniform float uIce, uFrost, uSnowLine, uFogNear, uFogFar, uWarm;
        varying vec3 vW; varying vec3 vN;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
        vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec3 N = normalize(vN);
          float h = vW.y;
          float slope = 1.0 - N.y;
          float n = fbm(vW.xz * 0.05);
          float n2 = fbm(vW.xz * 0.35);
          ${''}
          vec3 forest = lin(vec3(0.13, 0.32, 0.14)), grass = lin(vec3(0.45, 0.58, 0.25)), alpine = lin(vec3(0.62, 0.62, 0.42));
          vec3 rock = lin(vec3(0.46, 0.45, 0.43)) * (0.75 + 0.35 * n2), dark = lin(vec3(0.24, 0.23, 0.22));
          vec3 col;
          #ifdef JAYA
            col = mix(forest, grass, smoothstep(16.0, 26.0, h + n * 6.0));
            col = mix(col, alpine, smoothstep(28.0, 34.0, h + n * 5.0));
            col = mix(col, rock, smoothstep(32.0, 37.0, h + n * 4.0));
            col = mix(col, dark, smoothstep(0.45, 0.7, slope) * 0.6);
            // summit ice field: shrinks from the edges as uIce falls
            float ice = smoothstep(0.0, 0.06, (h - 45.5) / 6.0 + n * 0.35 + n2 * 0.2 - (1.0 - uIce) * 0.95) * (1.0 - smoothstep(0.5, 0.75, slope));
            col = mix(col, lin(vec3(0.92, 0.96, 1.0)) * (0.85 + 0.15 * n2), ice);
          #else
            // Dieng: potato terraces and grass on the plateau
            float terr = smoothstep(0.45, 0.55, fract(vW.z * 0.18 + n * 2.0));
            col = mix(grass, lin(vec3(0.36, 0.5, 0.2)), terr * 0.6);
            col = mix(col, lin(vec3(0.55, 0.43, 0.3)), smoothstep(0.6, 0.75, n) * 0.6);
            col = mix(col, forest, smoothstep(23.0, 28.0, h));
            float flatness = 1.0 - smoothstep(0.1, 0.35, slope);
            float frost = uFrost * flatness * smoothstep(0.25, 0.6, n2 + 0.3) * (1.0 - smoothstep(22.5, 24.0, h));
            col = mix(col, lin(vec3(0.9, 0.93, 0.97)), frost * 0.9);
          #endif
          col = mix(col, lin(vec3(0.95, 0.97, 1.0)), smoothstep(uSnowLine, uSnowLine + 2.0, h + n * 4.0));
          float d = max(dot(N, normalize(uSun)), 0.0);
          vec3 light = mix(vec3(1.0), vec3(1.25, 0.95, 0.7), uWarm);
          vec3 c = col * (0.35 + 0.85 * d) * light;
          float f = smoothstep(uFogNear, uFogFar, length(cameraPosition - vW));
          c = mix(c, uFogCol, f);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      defines: mode === 'jaya' ? { JAYA: 1 } : {},
    });
    this.terrain = new THREE.Mesh(g, mat);
    s.add(this.terrain);

    if (mode === 'dieng') {
      // crater lake and drifting mist
      const lake = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: lin(0.3, 0.6, 0.55) }));
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(18, diengH(18, -10) + 1.2, -10);
      lake.scale.set(1.1, 0.8, 1);
      s.add(lake);
      this.mist = [];
      const R = mulberry32(5);
      const mtex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })();
      for (let i = 0; i < 26; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, transparent: true, depthWrite: false, opacity: 0.6 }));
        sp.scale.set(60 + R() * 60, 14 + R() * 10, 1);
        sp.position.set(-120 + R() * 240, 23 + R() * 4, -120 + R() * 240);
        s.add(sp);
        this.mist.push({ sp, x0: sp.position.x, sp0: 1 + R() });
      }
      // a few small farm huts
      for (let i = 0; i < 14; i++) {
        const x = -60 + R() * 110, z = 10 + R() * 60;
        const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshLambertMaterial({ color: lin(0.85, 0.82, 0.75) }));
        hut.position.set(x, diengH(x, z) + 1, z);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.4, 4), new THREE.MeshLambertMaterial({ color: lin(0.55, 0.25, 0.18) }));
        roof.rotation.y = Math.PI / 4; roof.position.set(x, diengH(x, z) + 2.7, z);
        s.add(hut, roof);
      }
      s.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.2));
      const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.copy(this.sunDir).multiplyScalar(100); s.add(dl);
    } else {
      // clouds below the summit
      this.mist = [];
      const R = mulberry32(8);
      const ctex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })();
      for (let i = 0; i < 40; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, transparent: true, depthWrite: false, opacity: 0.85 }));
        sp.scale.set(70 + R() * 80, 22 + R() * 14, 1);
        sp.position.set(-240 + R() * 480, 18 + R() * 10, -240 + R() * 480);
        if (Math.abs(sp.position.z) < 50 && Math.abs(sp.position.x) < 100) sp.position.z += 110 * Math.sign(sp.position.z || 1);
        s.add(sp);
        this.mist.push({ sp, x0: sp.position.x, sp0: 0.6 + R() });
      }
    }
    // climber marker for the altitude explanation
    this.climber = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    this.climber.visible = false;
    s.add(this.climber);
    // summit point (highest vertex) for labels
    let best = [0, 0, 0];
    for (let i = 0; i < pos.length; i += 3) if (pos[i + 1] > best[1]) best = [pos[i], pos[i + 1], pos[i + 2]];
    this.summit = new THREE.Vector3(...best);
  }

  // climber path from the foot to the summit, k = 0..1
  climberAt(k) {
    const x = this.summit.x - 150 * (1 - k) + 10, z = this.summit.z + 70 * (1 - k);
    return new THREE.Vector3(x, this.H(x, z) + 1.8, z);
  }

  update(t, o = {}) {
    this.u.uIce.value = o.ice ?? 1;
    this.u.uFrost.value = o.frost || 0;
    this.u.uSnowLine.value = o.snowLine ?? 999;
    this.u.uWarm.value = o.warm || 0;
    for (const m of this.mist) m.sp.position.x = m.x0 + Math.sin(t * 0.05 * m.sp0) * 30 + t * 0.8 * m.sp0;
    this.climber.visible = o.climber !== undefined;
    if (this.climber.visible) this.climber.position.copy(this.climberAt(o.climber));
  }
}
