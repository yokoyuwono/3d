// The coastal town, the sea and everything that happens to them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { axis, clamp, fbm, kf, lerp, mulberry32, smoothstep, easeOut, canvasTexture } from './util.js';
import { TownLife } from './townlife.js';
import {
  baseH, hillH, HILL, seaParams, waterH, mood, shakeAt, frontAt, GLSL_TERRAIN, GLSL_WATER, T_QUAKE,
} from './timeline.js';

const lin = (rgb) => new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

// terrain with small detail noise (used for placing objects)
export function terrainY(x, z) {
  let d = 0;
  if (z > 22) d = (fbm(x * 0.03, z * 0.03, 3) - 0.5) * 0.5 * smoothstep(22, 40, z);
  else if (z < -2) d = (fbm(x * 0.05 + 9, z * 0.05, 3) - 0.5) * 0.6;
  return baseH(x, z) + d;
}

// ------------------------------------------------------------------ particles
export function particleMaterial(color, additive = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: lin(color) },
      uScale: { value: 1000 },
      uFogCol: { value: new THREE.Color() },
      uFogDen: { value: 0.0006 },
    },
    vertexShader: /* glsl */ `
      uniform float uScale, uFogDen;
      attribute float aSize; attribute float aAlpha;
      varying float vA; varying float vFog;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(aSize * uScale / max(0.5, -mv.z), 512.0);
        gl_Position = projectionMatrix * mv;
        vA = aAlpha;
        float d = length(mv.xyz);
        vFog = 1.0 - exp(-pow(uFogDen * d, 2.0));
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uFogCol;
      varying float vA; varying float vFog;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, r) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(uColor, uFogCol, vFog), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function particleSystem(n, color, additive) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const p = new THREE.Points(g, particleMaterial(color, additive));
  p.frustumCulled = false;
  return p;
}

// ------------------------------------------------------------------ grid helper
function gridGeometry(xs, zs, yfn, colfn) {
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = colfn ? new Float32Array(nx * nz * 3) : null;
  let k = 0;
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = xs[i], z = zs[j];
      const y = yfn(x, z);
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      if (colfn) {
        colfn(x, z, y, c);
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      }
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ textures
function windowTexture() {
  const cv = canvasTexture(128, 96, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9d4cc';
    g.fillRect(0, h - 8, w, 8); // floor band
    const grd = g.createLinearGradient(0, 20, 0, 72);
    grd.addColorStop(0, '#5e7f99');
    grd.addColorStop(1, '#253847');
    g.fillStyle = '#8b8378';
    g.fillRect(26, 20, 76, 54);
    g.fillStyle = grd;
    g.fillRect(30, 24, 68, 46);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(30, 24, 20, 46);
    g.fillStyle = '#8b8378';
    g.fillRect(62, 24, 4, 46);
  });
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function signTexture(lines, bg = '#0b7a3b') {
  const cv = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 12;
    g.strokeRect(10, 10, w - 20, h - 20);
    // running figure + arrow pictogram
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(80, 70, 18, 0, Math.PI * 2); g.fill();
    g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(80, 95); g.lineTo(70, 150); g.lineTo(40, 195); g.moveTo(70, 150); g.lineTo(105, 190);
    g.moveTo(55, 110); g.lineTo(100, 125); g.stroke();
    g.font = '900 56px Inter';
    g.textAlign = 'left';
    g.fillText(lines[0], 140, 105);
    g.font = '800 44px Inter';
    g.fillText(lines[1], 140, 170);
    g.beginPath(); g.moveTo(400, 215); g.lineTo(470, 215); g.stroke();
    g.beginPath(); g.moveTo(450, 195); g.lineTo(472, 215); g.lineTo(450, 235); g.stroke();
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ================================================================== World
export class World {
  constructor(opts = {}) {
    this.opts = opts;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.0006);
    this.rand = mulberry32(1337);
    this.anchors = {}; // named 3D points for overlay labels
    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildRoads();
    this.buildTown();
    this.buildPalms();
    this.buildBoats();
    this.buildPeople();
    this.buildDebris();
    this.buildCracks();
    this.buildSigns();
    this.buildParticles();
    this.buildWeather();
    if (opts.monument) this.buildMonument();
    this.terrainY = terrainY;
    this.lifeMode = 'calm';
    if (opts.life) {
      this.life = new TownLife(this);
      // the old tsunami extras are replaced by the new townsfolk
      for (const p of [...this.beachPeople, ...this.hillPeople, ...this.evac]) p.g.visible = false;
    }
  }

  // ---------------------------------------------------------------- sky
  buildSky() {
    this.skyUniforms = {
      uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() },
      uClouds: { value: 0.3 }, uTime: { value: 0 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith, uHorizon, uSunDir, uSunCol; uniform float uClouds, uTime;
        varying vec3 vDir;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
          float sd = max(dot(d, uSunDir), 0.0);
          // clouds on a virtual plane
          if (h > 0.0) {
            vec2 uv = d.xz / (h + 0.08) * 1.3 + vec2(uTime * 0.01, 0.0);
            float c = fbm(uv * 1.2);
            float cover = smoothstep(1.0 - uClouds * 0.9, 1.15 - uClouds * 0.6, c + 0.15);
            vec3 cc = mix(vec3(1.0, 0.97, 0.94), uHorizon * 0.55 + vec3(0.05), uClouds * 0.8);
            cc += uSunCol * pow(sd, 6.0) * 0.4;
            col = mix(col, cc, cover * smoothstep(0.0, 0.12, h) * 0.9);
          }
          col += uSunCol * (pow(sd, 1500.0) * 6.0 + pow(sd, 14.0) * 0.35) * (1.0 - uClouds * 0.6);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), m);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  buildLights() {
    this.sunDir = new THREE.Vector3(-0.38, 0.5, -0.78).normalize();
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -190; sc.right = 190; sc.top = 190; sc.bottom = -190; sc.near = 10; sc.far = 900;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.4;
    this.sun.target.position.set(0, 0, 90);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 400);
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 1.0);
    this.scene.add(this.hemi);
  }

  // ---------------------------------------------------------------- terrain
  buildTerrain() {
    const xs = axis([[-900, -260, 30], [-260, 260, 3], [260, 900, 30]]);
    const zs = axis([[-700, -320, 12], [-320, 330, 2.5], [330, 900, 25]]);
    const sand = new THREE.Color(), tmp = new THREE.Color();
    const g = gridGeometry(xs, zs, terrainY, (x, z, y, c) => {
      const n = fbm(x * 0.08, z * 0.08, 3);
      if (z < -1.5) {
        // wet seabed: dark sand with algae patches and rocks
        c.setRGB(0.66, 0.58, 0.44).lerp(tmp.setRGB(0.36, 0.42, 0.26), smoothstep(0.45, 0.72, n) * 0.8);
        c.multiplyScalar(lerp(1.0, 0.78, smoothstep(-2, -120, z)));
      } else if (y < 2.2 && z < 22) {
        c.setRGB(0.88, 0.79, 0.58).multiplyScalar(0.92 + n * 0.16); // beach
      } else {
        const hill = hillH(x, z);
        c.setRGB(0.36, 0.52, 0.22).lerp(tmp.setRGB(0.50, 0.55, 0.30), n);
        if (hill > 3) c.lerp(tmp.setRGB(0.24, 0.42, 0.16), smoothstep(3, 20, hill) * 0.8);
        if (Math.abs(x) < 135 && z > 22 && z < 165 && hill < 4) c.lerp(tmp.setRGB(0.60, 0.58, 0.50), 0.55); // town ground
        sand.setRGB(0.88, 0.79, 0.58);
        c.lerp(sand, 1 - smoothstep(16, 24, z));
      }
      c.convertSRGBToLinear();
    });
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(g, m);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  // ---------------------------------------------------------------- water
  buildWater() {
    const xs = axis([[-1800, -320, 40], [-320, 320, 4], [320, 1800, 40]]);
    const zs = axis([[-3000, -520, 40], [-520, 330, 2.5], [330, 700, 20]]);
    const g = gridGeometry(xs, zs, () => 0);
    this.waterUniforms = {
      uTime: { value: 0 }, uL: { value: 0 }, uF: { value: -4000 }, uA: { value: 0 }, uWf: { value: 20 },
      uWb: { value: 60 }, uB: { value: 0 }, uChop: { value: 1 }, uMud: { value: 0 },
      uSunDir: { value: this.sunDir }, uSunCol: { value: new THREE.Color() },
      uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
      uFogCol: { value: new THREE.Color() }, uFogDen: { value: 0.0006 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: /* glsl */ `
        ${GLSL_WATER}
        ${GLSL_TERRAIN}
        varying vec3 vWorld; varying vec3 vN; varying float vCrest; varying float vDepth;
        void main(){
          vec3 p = position;
          float c, c1, c2;
          float h = waterH(p.xz, c);
          float e = 1.2;
          float hx = waterH(p.xz + vec2(e, 0.0), c1);
          float hz = waterH(p.xz + vec2(0.0, e), c2);
          vN = normalize(vec3(h - hx, e, h - hz));
          p.y = h;
          vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
          vCrest = c;
          vDepth = h - terrainH(p.xz);
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        ${GLSL_WATER}
        uniform float uMud, uFogDen;
        uniform vec3 uSunDir, uSunCol, uZenith, uHorizon, uFogCol;
        varying vec3 vWorld; varying vec3 vN; varying float vCrest; varying float vDepth;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec2 q = vWorld.xz;
          float dist = length(cameraPosition - vWorld);
          float detail = 1.0 - smoothstep(150.0, 900.0, dist);
          float nx = vn(q * 0.45 + vec2(uTime * 0.5, 0.0)) - 0.5;
          float nz = vn(q * 0.45 * 1.3 + vec2(7.0, -uTime * 0.4)) - 0.5;
          vec3 n = normalize(vN + vec3(nx, 0.0, nz) * 0.16 * detail);
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
          vec3 R = reflect(-V, n);
          vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.5));
          vec3 deep = lin(vec3(0.03, 0.20, 0.30)), shallow = lin(vec3(0.15, 0.62, 0.64));
          vec3 base = mix(shallow, deep, smoothstep(0.3, 8.0, vDepth));
          base = mix(base, lin(vec3(0.16, 0.30, 0.32)), vCrest * 0.7);
          base = mix(base, lin(vec3(0.42, 0.34, 0.22)), uMud * smoothstep(-120.0, 5.0, vWorld.z));
          float diff = max(dot(n, uSunDir), 0.0) * 0.5 + 0.5;
          vec3 col = mix(base * diff * (0.6 + 0.4 * uSunCol), sky, fres * 0.85);
          vec3 Hh = normalize(uSunDir + V);
          col += uSunCol * pow(max(dot(n, Hh), 0.0), 90.0) * 0.6;
          // foam
          float fn = vn(q * 0.6 + vec2(0.0, uTime * 1.5));
          float fn2 = vn(q * 0.18 + vec2(uTime * 0.2, -uTime * 1.1));
          float shore = (1.0 - smoothstep(0.0, 0.35, vDepth)) * 0.7;
          float ck; waterH(q, ck);
          float fn3 = vn(q * 0.22 + vec2(uTime * 0.3, uTime * 0.9));
          float crestFoam = smoothstep(0.25, 0.95, ck + (fn3 - 0.5) * 0.3) * 0.9;
          float flood = uMud * smoothstep(0.62, 0.9, fn2) * 0.35 * smoothstep(-60.0, 10.0, vWorld.z);
          float foam = clamp(max(max(shore * smoothstep(0.35, 0.65, fn), crestFoam), flood), 0.0, 1.0);
          col = mix(col, vec3(0.86, 0.90, 0.92) * (0.75 + 0.25 * diff), foam);
          float f = 1.0 - exp(-pow(uFogDen * dist, 2.0));
          col = mix(col, uFogCol, f);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.water = new THREE.Mesh(g, m);
    this.water.frustumCulled = false;
    this.scene.add(this.water);
  }

  // ---------------------------------------------------------------- roads
  buildRoads() {
    this.xStreets = [-120, -80, -40, 0, 40, 80, 120];
    this.zStreets = [20, 55, 90, 125, 160];
    const geos = [];
    const strip = (x0, z0, x1, z1, w) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.ceil(len / 3));
      const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
      const px = -dz * w / 2, pz = dx * w / 2;
      const pos = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
        pos.push(x + px, terrainY(x + px, z + pz) + 0.07, z + pz, x - px, terrainY(x - px, z - pz) + 0.07, z - pz);
        if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      geos.push(g);
    };
    strip(-260, 20, 260, 20, 9);
    for (const x of this.xStreets) strip(x, 20, x, x < 0 && x > -90 ? 150 : 165, 7);
    for (const z of this.zStreets.slice(1)) strip(-124, z, 124, z, 7);
    strip(-10, 150, -30, 178, 5); // path up the hill
    const g = mergeGeometries(geos.map((g) => g.toNonIndexed()));
    g.computeVertexNormals();
    const roads = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: lin([0.33, 0.33, 0.34]), side: THREE.DoubleSide }));
    roads.receiveShadow = true;
    this.scene.add(roads);
  }

  // ---------------------------------------------------------------- town
  buildTown() {
    const R = this.rand;
    this.winTex = windowTexture();
    const walls = [[0.96, 0.94, 0.88], [0.95, 0.90, 0.75], [0.80, 0.90, 0.84], [0.98, 0.86, 0.72], [0.80, 0.87, 0.95], [0.95, 0.80, 0.78], [0.90, 0.90, 0.90]];
    const roofs = [[0.70, 0.30, 0.18], [0.62, 0.25, 0.16], [0.75, 0.40, 0.22], [0.30, 0.34, 0.40], [0.25, 0.45, 0.62], [0.55, 0.20, 0.18]];
    this.wallMats = walls.map((c) => new THREE.MeshLambertMaterial({ color: lin(c), map: this.winTex }));
    this.roofMats = roofs.map((c) => new THREE.MeshLambertMaterial({ color: lin(c) }));
    const roofGeo = new THREE.ConeGeometry(1, 1, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.5, 0);
    this.roofGeo = roofGeo;

    this.buildings = [];
    const lots = [];
    for (let i = 0; i < this.xStreets.length - 1; i++) {
      for (let j = 0; j < this.zStreets.length - 1; j++) {
        const xa = this.xStreets[i] + 4.5, xb = this.xStreets[i + 1] - 4.5;
        const za = this.zStreets[j] + 5, zb = this.zStreets[j + 1] - 4.5;
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
          lots.push({ i, j, cx: lerp(xa, xb, (a + 0.5) / 2), cz: lerp(za, zb, (b + 0.5) / 2), lw: (xb - xa) / 2, ld: (zb - za) / 2, a, b });
        }
      }
    }
    for (const L of lots) {
      if (hillH(L.cx, L.cz) > 1.2) continue;
      // the mosque occupies a whole block
      if (L.i === 1 && L.j === 1) { if (L.a === 0 && L.b === 0) this.addMosque(lerp(L.cx, L.cx + L.lw, 0.5), L.cz + L.ld / 2); continue; }
      if (L.i === 4 && L.j === 2 && R() < 0.5) continue; // a small park
      const focus = L.i === 3 && L.j === 0 && L.a === 0 && L.b === 0;
      const r = R();
      let floors, roof;
      if (focus) { floors = 2; roof = true; }
      else if (L.j === 0 && (L.i === 1 || L.i === 4) && L.b === 0) { floors = 7 + Math.floor(R() * 3); roof = false; } // beach hotels
      else if (r < 0.68) { floors = 1 + Math.floor(R() * 2) + (R() < 0.3 ? 1 : 0); roof = true; }
      else if (r < 0.92) { floors = 3 + Math.floor(R() * 2); roof = false; }
      else { floors = 5 + Math.floor(R() * 2); roof = false; }
      const w = focus ? 10 : Math.min(L.lw - 1.5, 8 + R() * 5);
      const d = focus ? 9 : Math.min(L.ld - 1.5, 7.5 + R() * 4);
      const x = L.cx + (focus ? 0 : (R() - 0.5) * (L.lw - w - 1));
      const z = L.cz + (focus ? 0 : (R() - 0.5) * (L.ld - d - 1));
      this.addBuilding(x, z, w, d, floors, roof, focus ? 1 : Math.floor(R() * this.wallMats.length), Math.floor(R() * this.roofMats.length), focus);
    }
    // little beach warungs
    for (let k = 0; k < 7; k++) {
      const x = -150 + k * 48 + (R() - 0.5) * 14;
      if (Math.abs(x - 10) < 18) continue;
      this.addBuilding(x, 13.5, 5, 4, 1, true, Math.floor(R() * this.wallMats.length), 3 + (k % 3), false);
    }
    // pick buildings that collapse during the quake (visible from the quake shot)
    for (const b of this.buildings) {
      if (b.focus || b.mosque) continue;
      const inView = b.x > -75 && b.x < 40 && b.z > 45 && b.z < 140;
      if ((inView && R() < 0.45) || R() < 0.08) {
        b.collapse = { t0: T_QUAKE + 0.9 + R() * 3.6, tiltX: (R() - 0.5) * 0.7, tiltZ: (R() - 0.5) * 0.7, sink: 0.45 + R() * 0.3 };
      }
    }
  }

  addBuilding(x, z, w, d, floors, hasRoof, wallIdx, roofIdx, focus) {
    const FH = 3;
    const h = floors * FH;
    const g0 = terrainY(x, z);
    const group = new THREE.Group();
    group.position.set(x, g0 - 0.2, z);
    const geo = new THREE.BoxGeometry(w, h + 0.2, d);
    // scale UVs so one window bay = 4 m x 3 m
    const uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) {
      const fw = f < 2 ? d : w;
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        if (f === 2 || f === 3) uv.setXY(i, 0.02, 0.02);
        else uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(fw / 4)), uv.getY(i) * floors + 0.03);
      }
    }
    const body = new THREE.Mesh(geo, this.wallMats[wallIdx]);
    body.position.y = (h + 0.2) / 2;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    let top = h;
    if (hasRoof) {
      const rh = Math.min(w, d) * 0.28;
      const roof = new THREE.Mesh(this.roofGeo, this.roofMats[roofIdx]);
      roof.scale.set((w / 2 + 0.6) * Math.SQRT2, rh, (d / 2 + 0.6) * Math.SQRT2);
      roof.position.y = h + 0.2;
      roof.castShadow = true;
      group.add(roof);
      top = h + rh;
    } else {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), this.roofMats[3]);
      cap.position.y = h + 0.4;
      group.add(cap);
      if (floors >= 4) {
        const tank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 2.5), this.roofMats[3]);
        tank.position.set(w * 0.2, h + 1.5, -d * 0.15);
        tank.castShadow = true;
        group.add(tank);
      }
    }
    this.scene.add(group);
    const b = { group, x, z, w, d, h: top, g0, phase: this.rand() * 6.28, collapse: null, focus };
    this.buildings.push(b);
    if (focus) {
      this.focus = b;
      // anchors on the sea-facing facade for the floor labels
      this.anchors.floor1 = new THREE.Vector3(x - w / 2, g0 + 1.5, z - d / 2);
      this.anchors.floor2 = new THREE.Vector3(x - w / 2, g0 + 4.5, z - d / 2);
      this.anchors.roof = new THREE.Vector3(x, g0 + h + 1.6, z - d / 2);
      this.focusLevels = [g0 + 3, g0 + 6, top + g0];
    }
    return b;
  }

  addMosque(x, z) {
    const g0 = terrainY(x, z);
    const group = new THREE.Group();
    group.position.set(x, g0 - 0.2, z);
    const white = new THREE.MeshLambertMaterial({ color: lin([0.97, 0.96, 0.92]) });
    const green = new THREE.MeshLambertMaterial({ color: lin([0.12, 0.55, 0.38]) });
    const gold = new THREE.MeshLambertMaterial({ color: lin([0.95, 0.75, 0.25]) });
    const base = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), white);
    base.position.y = 4;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), green);
    dome.position.y = 8;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 8), gold);
    tip.position.y = 16;
    const min = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 24, 10), white);
    min.position.set(12, 12, -8);
    const minTop = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 10), green);
    minTop.position.set(12, 25.7, -8);
    for (const m of [base, dome, min, minTop, tip]) { m.castShadow = m.receiveShadow = true; group.add(m); }
    this.scene.add(group);
    this.buildings.push({ group, x, z, w: 20, d: 20, h: 26, g0, phase: 1, collapse: null, mosque: true });
  }

  // ---------------------------------------------------------------- palms
  buildPalms() {
    const R = this.rand;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 9, 6, 6);
    trunkGeo.translate(0, 4.5, 0);
    const p = trunkGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 0.025 * y * y); }
    trunkGeo.computeVertexNormals();
    const leaf = new THREE.PlaneGeometry(1.4, 5.5, 1, 4);
    leaf.translate(0, 2.75, 0);
    const lp = leaf.attributes.position;
    for (let i = 0; i < lp.count; i++) { const y = lp.getY(i); lp.setZ(i, -0.06 * y * y); lp.setX(i, lp.getX(i) * (1 - y / 6)); }
    leaf.rotateX(-Math.PI / 2 + 0.5);
    leaf.computeVertexNormals();
    const leaves = [];
    for (let k = 0; k < 8; k++) { const l = leaf.clone(); l.rotateY((k / 8) * Math.PI * 2); leaves.push(l); }
    const crownGeo = mergeGeometries(leaves);
    const trunkMat = new THREE.MeshLambertMaterial({ color: lin([0.45, 0.36, 0.25]) });
    const leafMat = new THREE.MeshLambertMaterial({ color: lin([0.22, 0.48, 0.18]), side: THREE.DoubleSide });
    this.palms = [];
    const spots = [];
    for (let x = -230; x <= 230; x += 11) spots.push([x + (R() - 0.5) * 6, 6 + R() * 9]);
    for (let k = 0; k < 40; k++) spots.push([-130 + R() * 260, 24 + R() * 140]);
    for (let k = 0; k < 30; k++) { const a = R() * 6.28, r = 20 + R() * 40; spots.push([HILL.x + Math.cos(a) * r * 1.2, HILL.z + Math.sin(a) * r]); }
    for (const [x, z] of spots) {
      if (Math.abs(x - 10) < 12 && z < 22) continue; // keep the beach camera clear
      if (z > 22 && z < 165 && Math.abs(x) < 125) {
        // inside town only on street sides
        let ok = false;
        for (const sx of this.xStreets) if (Math.abs(x - sx) < 6 && Math.abs(x - sx) > 4.2) ok = true;
        if (!ok && R() < 0.85) continue;
        if (!ok) continue;
      }
      const g = new THREE.Group();
      const s = 0.8 + R() * 0.5;
      g.position.set(x, terrainY(x, z) - 0.2, z);
      g.scale.setScalar(s);
      g.rotation.y = R() * 6.28;
      const tr = new THREE.Mesh(trunkGeo, trunkMat);
      const cr = new THREE.Mesh(crownGeo, leafMat);
      cr.position.set(0.025 * 81, 9, 0);
      tr.castShadow = cr.castShadow = true;
      g.add(tr, cr);
      this.scene.add(g);
      this.palms.push({ g, cr, phase: R() * 6.28, x, z });
    }
  }

  // ---------------------------------------------------------------- boats
  buildBoats() {
    const R = this.rand;
    const hull = new THREE.BoxGeometry(2.0, 1.1, 8, 2, 1, 6);
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i); const y = hp.getY(i), z = hp.getZ(i);
      if (y < 0) x *= 0.35;
      const tip = smoothstep(1.5, 4, Math.abs(z));
      x *= 1 - tip * 0.85;
      hp.setX(i, x);
      if (y > 0) hp.setY(i, y + tip * 0.5);
    }
    hull.computeVertexNormals();
    const outrig = new THREE.CylinderGeometry(0.12, 0.12, 7, 5);
    outrig.rotateX(Math.PI / 2);
    const beam = new THREE.CylinderGeometry(0.07, 0.07, 6.5, 4);
    beam.rotateZ(Math.PI / 2);
    const cols = [[0.85, 0.15, 0.12], [0.10, 0.35, 0.75], [0.95, 0.95, 0.92], [0.95, 0.70, 0.10], [0.15, 0.60, 0.35]];
    const bamboo = new THREE.MeshLambertMaterial({ color: lin([0.75, 0.65, 0.45]) });
    this.boats = [];
    for (let k = 0; k < 14; k++) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(hull, new THREE.MeshLambertMaterial({ color: lin(cols[k % cols.length]) }));
      m.castShadow = true;
      g.add(m);
      for (const sx of [-3, 3]) { const o = new THREE.Mesh(outrig, bamboo); o.position.set(sx, -0.3, 0); g.add(o); }
      for (const sz of [-1.5, 1.5]) { const b = new THREE.Mesh(beam, bamboo); b.position.set(0, 0.35, sz); g.add(b); }
      if (k % 3 === 0) {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2), new THREE.MeshLambertMaterial({ color: lin([0.95, 0.95, 0.9]) }));
        cabin.position.set(0, 0.9, -0.8);
        g.add(cabin);
      }
      const x0 = -110 + R() * 220, z0 = -18 - R() * 140;
      g.rotation.y = R() * 6.28;
      this.scene.add(g);
      this.boats.push({ g, x0, z0, yaw: g.rotation.y, phase: R() * 6.28 });
    }
  }

  // ---------------------------------------------------------------- people
  buildPeople() {
    const R = this.rand;
    const bodyGeo = new THREE.CapsuleGeometry(0.27, 0.85, 3, 6);
    bodyGeo.translate(0, 0.72, 0);
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    headGeo.translate(0, 1.55, 0);
    const shirts = [[0.9, 0.2, 0.2], [0.2, 0.4, 0.9], [0.95, 0.8, 0.2], [0.2, 0.7, 0.4], [0.95, 0.95, 0.95], [0.9, 0.5, 0.1], [0.6, 0.3, 0.7]];
    const mats = shirts.map((c) => new THREE.MeshLambertMaterial({ color: lin(c) }));
    const skin = new THREE.MeshLambertMaterial({ color: lin([0.55, 0.38, 0.26]) });
    const mk = (scale = 1) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(bodyGeo, mats[Math.floor(R() * mats.length)]);
      const h = new THREE.Mesh(headGeo, skin);
      b.castShadow = true;
      g.add(b, h);
      g.scale.setScalar(scale * (0.9 + R() * 0.2));
      this.scene.add(g);
      return g;
    };
    this.beachPeople = [];
    for (let k = 0; k < 30; k++) {
      this.beachPeople.push({ g: mk(1.4), x0: -70 + R() * 140, z0: 3 + R() * 14, out: 22 + R() * 30, spd: 0.8 + R() * 0.5, phase: R() * 6.28, wander: R() * 6.28 });
    }
    this.hillPeople = [];
    for (let k = 0; k < 46; k++) {
      const a = R() * 6.28, r = Math.sqrt(R()) * 16;
      const x = HILL.x + 6 + Math.cos(a) * r * 1.3, z = HILL.z - 8 + Math.sin(a) * r * 0.8;
      this.hillPeople.push({ g: mk(1.25), x, z, tIn: 33 + R() * 4, phase: R() * 6.28 });
    }
    // evacuees who know the sign: run from the town up the hill while the sea retreats
    this.evac = [];
    this.showEvac = false;
    for (let k = 0; k < 44; k++) {
      const x0 = -75 + R() * 75, z0 = 105 + R() * 45;
      const a = R() * 6.28, r = Math.sqrt(R()) * 14;
      this.evac.push({ g: mk(1.6), x0, z0, x1: HILL.x + 6 + Math.cos(a) * r * 1.3, z1: HILL.z - 8 + Math.sin(a) * r * 0.8, t0: 24 + R() * 1.5, dur: 8 + R() * 3, phase: R() * 6.28 });
    }
    this.anchors.hilltop = new THREE.Vector3(HILL.x + 6, terrainY(HILL.x + 6, HILL.z - 8) + 6, HILL.z - 8);
  }

  // ---------------------------------------------------------------- debris
  buildDebris() {
    const R = this.rand;
    const geos = [new THREE.BoxGeometry(4, 0.4, 1.2), new THREE.BoxGeometry(4.2, 1.5, 2), new THREE.BoxGeometry(2.5, 0.3, 2.5), new THREE.BoxGeometry(3, 1.4, 1.8)];
    const cols = [[0.45, 0.32, 0.2], [0.8, 0.15, 0.12], [0.55, 0.45, 0.35], [0.9, 0.9, 0.9], [0.2, 0.3, 0.6], [0.6, 0.25, 0.15]];
    this.debris = [];
    for (let k = 0; k < 80; k++) {
      const m = new THREE.Mesh(geos[k % geos.length], new THREE.MeshLambertMaterial({ color: lin(cols[Math.floor(R() * cols.length)]) }));
      m.castShadow = true;
      m.visible = false;
      this.scene.add(m);
      this.debris.push({ m, x: -125 + R() * 250, z: 8 + R() * 150, rot: R() * 6.28, spin: (R() - 0.5) * 0.6, drift: 0.8 + R() * 2.5, phase: R() * 6.28 });
    }
  }

  // ---------------------------------------------------------------- cracks
  buildCracks() {
    const R = this.rand;
    this.cracks = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0x0b0806 });
    for (let k = 0; k < 9; k++) {
      let x = -70 + R() * 110, z = 40 + R() * 90;
      let a = R() * 6.28;
      const pos = [], idx = [];
      const n = 30;
      for (let i = 0; i <= n; i++) {
        a += (R() - 0.5) * 0.9;
        x += Math.cos(a) * 1.4; z += Math.sin(a) * 1.4;
        const w = 0.25 + 0.5 * Math.sin((i / n) * Math.PI) * (0.6 + R() * 0.6);
        const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
        pos.push(x + px, terrainY(x + px, z + pz) + 0.12, z + pz, x - px, terrainY(x - px, z - pz) + 0.12, z - pz);
        if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      const m = new THREE.Mesh(g, mat);
      m.visible = false;
      this.scene.add(m);
      this.cracks.push({ m, t0: T_QUAKE + 0.8 + R() * 2.2, n: idx.length });
    }
  }

  buildSigns() {
    const post = new THREE.MeshLambertMaterial({ color: 0x777777 });
    const mk = (x, z, lines, yaw, s = 1) => {
      const g = new THREE.Group();
      const y = terrainY(x, z);
      g.position.set(x, y, z);
      g.rotation.y = yaw;
      g.scale.setScalar(s);
      for (const px of [-2.2, 2.2]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 6), post);
        p.position.set(px, 2.75, 0);
        g.add(p);
      }
      const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.7), new THREE.MeshBasicMaterial({ map: signTexture(lines), side: THREE.DoubleSide }));
      board.position.y = 4.3;
      g.add(board);
      this.scene.add(g);
      return g;
    };
    mk(-6, 147, ['JALUR', 'EVAKUASI'], Math.PI, 1.3);
    mk(HILL.x + 22, HILL.z - 22, ['TITIK', 'KUMPUL'], Math.PI + 0.5, 1.4);
    mk(25, 17, ['JALUR', 'EVAKUASI'], Math.PI, 1.0);
  }

  // ---------------------------------------------------------------- particles
  buildParticles() {
    const R = this.rand;
    // dust from collapsing buildings
    const col = this.buildings.filter((b) => b.collapse);
    const per = 70;
    this.dust = particleSystem(col.length * per, [0.62, 0.56, 0.48]);
    this.dustSeeds = [];
    for (const b of col) for (let k = 0; k < per; k++) {
      const a = R() * 6.28;
      this.dustSeeds.push({ b, a, sp: 4 + R() * 12, up: 1 + R() * 10, size: 6 + R() * 10, y0: R() * b.h });
    }
    this.scene.add(this.dust);
    // spray along the wave crest
    const n = 3500;
    this.spray = particleSystem(n, [0.93, 0.96, 0.98]);
    this.spraySeeds = [];
    for (let k = 0; k < n; k++) this.spraySeeds.push({ x: -700 + R() * 1400, ph: R(), sp: 0.6 + R() * 0.8, back: 10 + R() * 40, up: 0.6 + R() * 0.9, size: 5 + R() * 12 });
    this.scene.add(this.spray);
  }

  // ---------------------------------------------------------------- weather (ANDAI episodes)
  buildWeather() {
    const R = mulberry32(77);
    this.wind = 0; this.windAge = 0; this.snow = 0;
    // fast streaks blowing east (+x)
    const n = 4000;
    this.streakSeeds = [];
    const pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) this.streakSeeds.push({ x: R() * 600 - 300, y: 0.5 + R() * 45, z: -60 + R() * 240, len: 10 + R() * 22, sp: 0.7 + R() * 0.6 });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.streaks.frustumCulled = false;
    this.scene.add(this.streaks);
    // flying roof tiles / branches
    this.flyers = [];
    const geos = [new THREE.BoxGeometry(2.2, 0.15, 1.4), new THREE.BoxGeometry(3, 0.25, 0.25), new THREE.BoxGeometry(1.2, 0.6, 0.8)];
    const cols = [[0.7, 0.3, 0.18], [0.45, 0.32, 0.2], [0.3, 0.45, 0.2], [0.9, 0.9, 0.9]];
    for (let i = 0; i < 120; i++) {
      const m = new THREE.Mesh(geos[i % 3], new THREE.MeshLambertMaterial({ color: lin(cols[i % 4]) }));
      m.visible = false;
      this.scene.add(m);
      this.flyers.push({ m, x: -140 + R() * 260, z: 25 + R() * 130, delay: R() * 2.5, sp: 40 + R() * 60, up: 4 + R() * 18, spin: (R() - 0.5) * 12 });
    }
    // snow
    const ns = 4000;
    this.snowSys = particleSystem(ns, [1, 1, 1]);
    this.snowSeeds = [];
    for (let i = 0; i < ns; i++) this.snowSeeds.push({ x: R() * 400 - 200, y: R() * 80, z: -60 + R() * 220, sp: 1.5 + R(), size: 0.25 + R() * 0.35, ph: R() * 6.28 });
    this.scene.add(this.snowSys);
    // snow cover: a white skin over the terrain + whitening roofs and palm leaves
    this.snowCover = 0;
    this.snowSkin = new THREE.Mesh(this.terrain.geometry, new THREE.MeshLambertMaterial({ color: 0xf4f7fb, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.snowSkin.visible = false;
    this.scene.add(this.snowSkin);
    this.roofBase = this.roofMats.map((m) => m.color.clone());
  }

  // a Monas-like national monument in a plaza (illustrative), only for episodes that ask for it
  buildMonument() {
    const cx = 62, cz = 107, g0 = terrainY(cx, cz);
    for (const b of this.buildings) if (Math.hypot(b.x - cx, b.z - cz) < 20) b.group.visible = false;
    const G = new THREE.Group();
    G.position.set(cx, g0, cz);
    const stone = new THREE.MeshLambertMaterial({ color: lin([0.93, 0.92, 0.88]) });
    const gold = new THREE.MeshLambertMaterial({ color: lin([1.0, 0.78, 0.25]), emissive: lin([0.35, 0.22, 0.0]) });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 34), new THREE.MeshLambertMaterial({ color: lin([0.75, 0.73, 0.68]) }));
    plaza.position.y = 0.3;
    const cup1 = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 18), stone); cup1.position.y = 2.6;
    const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 9, 3, 4), stone); cup2.rotation.y = Math.PI / 4; cup2.position.y = 6;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 48, 4), stone); shaft.rotation.y = Math.PI / 4; shaft.position.y = 31.5;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.5, 2.4, 12), stone); bowl.position.y = 56.6;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5.5, 12), gold); flame.position.y = 60.4;
    for (const m of [plaza, cup1, cup2, shaft, bowl, flame]) { m.castShadow = m.receiveShadow = true; G.add(m); }
    this.scene.add(G);
    this.monument = G;
    this.anchors.monument = new THREE.Vector3(cx, g0 + 66, cz);
  }

  updateWeather(t, camera) {
    // wind streaks
    const w = this.wind;
    this.streaks.visible = w > 0.01;
    if (this.streaks.visible) {
      const p = this.streaks.geometry.attributes.position;
      this.streakSeeds.forEach((s, i) => {
        const x = ((s.x + t * 260 * s.sp + 300) % 600) - 300;
        p.setXYZ(i * 2, x, s.y, s.z);
        p.setXYZ(i * 2 + 1, x + s.len * (0.4 + w), s.y - 0.3, s.z);
      });
      p.needsUpdate = true;
      this.streaks.material.opacity = 0.75 * w;
    }
    for (const f of this.flyers) {
      const a = this.windAge - f.delay;
      f.m.visible = w > 0.3 && a > 0 && a < 5;
      if (!f.m.visible) continue;
      f.m.position.set(f.x + a * f.sp, terrainY(f.x, f.z) + 3 + f.up * Math.sin(Math.min(a, 2.5) * 0.6) + a * 2, f.z + Math.sin(a * 2 + f.x) * 3);
      f.m.rotation.set(a * f.spin, a * f.spin * 0.7, a * f.spin * 0.3);
    }
    if (w > 0) for (const pm of this.palms) { pm.g.rotation.z = -w * (0.9 + 0.15 * Math.sin(t * 9 + pm.phase)); pm.cr.rotation.y = t * 3 * w; }
    // snow cover
    const sc = this.snowCover || 0;
    this.snowSkin.visible = sc > 0.01;
    this.snowSkin.material.opacity = 0.88 * sc;
    this.roofMats.forEach((m, i) => m.color.copy(this.roofBase[i]).lerp(new THREE.Color(0.9, 0.92, 0.95), sc * 0.85));
    // snow
    this.snowSys.visible = this.snow > 0.01;
    if (this.snowSys.visible) {
      const pos = this.snowSys.geometry.attributes.position, al = this.snowSys.geometry.attributes.aAlpha, sz = this.snowSys.geometry.attributes.aSize;
      this.snowSeeds.forEach((s, i) => {
        const y = 80 - ((s.y + t * s.sp * 3) % 80);
        pos.setXYZ(i, s.x + Math.sin(t * 0.8 + s.ph) * 2, y, s.z);
        al.setX(i, 0.9 * this.snow);
        sz.setX(i, s.size);
      });
      pos.needsUpdate = al.needsUpdate = sz.needsUpdate = true;
      this.snowSys.material.uniforms.uScale.value = this.dust.material.uniforms.uScale.value;
    }
  }

  // ================================================================ update
  update(t, camera, canvasH) {
    const sp = seaParams(t);
    const md = mood(t);
    const zen = lin(md.zenith), hor = lin(md.horizon), sunC = lin(md.sun);

    // sky / fog / lights
    Object.assign(this.skyUniforms.uZenith.value, zen);
    Object.assign(this.skyUniforms.uHorizon.value, hor);
    this.skyUniforms.uSunDir.value.copy(this.sunDir);
    this.skyUniforms.uSunCol.value.copy(sunC);
    this.skyUniforms.uClouds.value = md.clouds;
    this.skyUniforms.uTime.value = t;
    this.sky.position.copy(camera.position);
    this.scene.fog.color.copy(hor);
    this.scene.fog.density = md.fog;
    this.sun.color.copy(sunC);
    this.sun.intensity = md.sunI;
    this.hemi.intensity = md.hemi;
    this.hemi.color.copy(zen).lerp(new THREE.Color(1, 1, 1), 0.5);

    const wu = this.waterUniforms;
    wu.uTime.value = t; wu.uL.value = sp.L; wu.uF.value = sp.F; wu.uA.value = sp.A; wu.uWf.value = sp.Wf;
    wu.uWb.value = sp.Wb; wu.uB.value = sp.B; wu.uChop.value = sp.chop; wu.uMud.value = sp.mud;
    wu.uSunCol.value.copy(sunC); wu.uZenith.value.copy(zen); wu.uHorizon.value.copy(hor);
    wu.uFogCol.value.copy(hor); wu.uFogDen.value = md.fog;

    const shake = shakeAt(t);

    // buildings: shaking + collapse
    for (const b of this.buildings) {
      let rx = 0, rz = 0, sy = 1, dy = 0;
      if (shake > 0) {
        const amp = shake * 0.035 * (0.5 + Math.min(1.5, b.h / 12));
        rx = amp * Math.sin(t * 13.1 + b.phase) * 0.6 + amp * 0.4 * Math.sin(t * 23.7 + b.phase * 2);
        rz = amp * Math.sin(t * 11.3 + b.phase * 1.7);
      }
      if (b.collapse) {
        const k = easeOut(clamp((t - b.collapse.t0) / 1.4));
        rx += b.collapse.tiltX * k;
        rz += b.collapse.tiltZ * k;
        sy = 1 - b.collapse.sink * k;
        dy = -1.2 * k;
      }
      b.group.rotation.set(rx, 0, rz);
      b.group.scale.y = sy;
      b.group.position.y = b.g0 - 0.2 + dy;
    }

    // palms sway (stronger in the quake and the flood)
    for (const p of this.palms) {
      const sw = 0.03 + shake * 0.12 + sp.mud * 0.05;
      p.g.rotation.z = sw * Math.sin(t * 1.3 + p.phase) + shake * 0.08 * Math.sin(t * 12 + p.phase);
      p.cr.rotation.y = 0.05 * Math.sin(t * 0.9 + p.phase);
      const wh = waterH(p.x, p.z, t, sp);
      const sub = wh - terrainY(p.x, p.z);
      p.g.rotation.x = sub > 2 ? -clamp((sub - 2) * 0.12, 0, 0.9) : 0; // flattened by the flood
    }

    // boats: float, get stranded on the seabed, then carried by the bore
    for (const bt of this.boats) {
      let x = bt.x0, z = bt.z0, yaw = bt.yaw;
      const Fx = frontAt(sp.F, x);
      if (Fx > z) { const run = Fx - z; z += run * 0.82; x += Math.sin(bt.phase) * run * 0.08; yaw += run * 0.012; }
      const w = waterH(x, z, t, sp);
      const ground = terrainY(x, z) + 0.6;
      const y = Math.max(w, ground);
      const stranded = ground > w + 0.05;
      bt.g.position.set(x, y + 0.2, z);
      bt.g.rotation.set(stranded ? 0.04 : 0.06 * Math.sin(t * 1.2 + bt.phase), yaw, stranded ? 0.22 : 0.08 * Math.sin(t * 0.9 + bt.phase));
    }

    // beach crowd: stroll, walk out onto the exposed seabed, then run inland
    for (const p of this.beachPeople) {
      let x = p.x0 + 1.5 * Math.sin(t * 0.2 + p.wander), z = p.z0;
      const out = smoothstep(24.2, 30.6, t) * p.out;
      z -= out;
      let moving = smoothstep(24.2, 25, t) * (1 - smoothstep(30.3, 30.9, t));
      let yaw = Math.PI;
      if (t > 31.3) {
        const run = (t - 31.3);
        z += run * (5.2 + p.spd * 2);
        moving = 1.6;
        yaw = 0;
      }
      if (t < 24.2) { moving = 0.3; yaw = p.wander; }
      p.g.visible = t < 39.5;
      const bob = Math.abs(Math.sin(t * (6 + moving * 4) + p.phase)) * 0.12 * moving;
      p.g.position.set(x, terrainY(x, z) + bob, z);
      p.g.rotation.y = yaw;
    }
    for (const p of this.hillPeople) {
      p.g.visible = t > p.tIn;
      p.g.position.set(p.x, terrainY(p.x, p.z) + Math.abs(Math.sin(t * 2 + p.phase)) * 0.05, p.z);
      p.g.rotation.y = Math.PI + Math.sin(p.phase) * 0.6;
    }

    for (const p of this.evac) {
      const k = clamp((t - p.t0) / p.dur);
      p.g.visible = this.showEvac && t > 23 && t < 41;
      if (!p.g.visible) continue;
      const x = lerp(p.x0, p.x1, k), z = lerp(p.z0, p.z1, k);
      const run = k > 0 && k < 1 ? 1 : 0;
      p.g.position.set(x, terrainY(x, z) + Math.abs(Math.sin(t * 11 + p.phase)) * 0.15 * run, z);
      p.g.rotation.y = Math.atan2(p.x1 - p.x0, p.z1 - p.z0);
    }

    // floating debris once the bore has passed
    for (const d of this.debris) {
      const Fx = frontAt(sp.F, d.x);
      const tPass = Fx > d.z;
      const w = waterH(d.x, d.z, t, sp);
      const ground = terrainY(d.x, d.z);
      d.m.visible = tPass && w > ground + 0.6 && t > 40.4;
      if (!d.m.visible) continue;
      const age = Math.max(0, t - 40.8);
      const z = d.z + age * d.drift, x = d.x + Math.sin(age * 0.3 + d.phase) * 2;
      d.m.position.set(x, waterH(x, z, t, sp) - 0.15, z);
      d.m.rotation.set(0.15 * Math.sin(t * 1.4 + d.phase), d.rot + age * d.spin, 0.12 * Math.sin(t * 1.1 + d.phase));
    }

    // cracks open
    for (const c of this.cracks) {
      const k = clamp((t - c.t0) / 0.8);
      c.m.visible = k > 0 && t < 41.5;
      c.m.geometry.setDrawRange(0, Math.floor(k * c.n / 6) * 6);
    }

    // dust clouds
    {
      const pos = this.dust.geometry.attributes.position, al = this.dust.geometry.attributes.aAlpha, sz = this.dust.geometry.attributes.aSize;
      this.dustSeeds.forEach((s, i) => {
        const age = t - s.b.collapse.t0;
        if (age < 0 || t > 40.9) { al.setX(i, 0); return; }
        const k = 1 - Math.exp(-age * 0.9);
        const r = s.sp * k + 2;
        pos.setXYZ(i, s.b.x + Math.cos(s.a) * r, s.b.g0 + s.y0 * (1 - k * 0.6) + s.up * k, s.b.z + Math.sin(s.a) * r);
        al.setX(i, 0.55 * smoothstep(0, 0.3, age) * (1 - smoothstep(4, 14, age)));
        sz.setX(i, s.size * (1 + k * 1.8));
      });
      pos.needsUpdate = al.needsUpdate = sz.needsUpdate = true;
    }
    // spray / mist on the crest
    {
      const pos = this.spray.geometry.attributes.position, al = this.spray.geometry.attributes.aAlpha, sz = this.spray.geometry.attributes.aSize;
      const vis = smoothstep(33, 37, t) * (1 - smoothstep(43, 46, t));
      this.spraySeeds.forEach((s, i) => {
        if (vis <= 0) { al.setX(i, 0); return; }
        const life = (t * s.sp + s.ph) % 1;
        const Fx = frontAt(sp.F, s.x);
        const z = Fx + 4 - life * s.back;
        const crestTop = sp.B + sp.A;
        const y = Math.max(waterH(s.x, Fx, t, sp), crestTop * 0.9) + life * sp.A * s.up * 0.6;
        pos.setXYZ(i, s.x, y, z);
        al.setX(i, vis * Math.sin(Math.PI * life) * 0.45 * smoothstep(2, 10, sp.A));
        sz.setX(i, s.size * (0.6 + life * 1.6) * (0.5 + sp.A / 30));
      });
      pos.needsUpdate = al.needsUpdate = sz.needsUpdate = true;
    }
    const scale = canvasH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.updateWeather(t, camera);
    if (this.life) {
      this.life.update(t, this.lifeMode);
      for (const p of [...this.beachPeople, ...this.hillPeople, ...this.evac]) p.g.visible = false;
    }
    for (const ps of [this.dust, this.spray, this.snowSys]) {
      ps.material.uniforms.uScale.value = scale;
      ps.material.uniforms.uFogCol.value.copy(hor);
      ps.material.uniforms.uFogDen.value = md.fog;
    }
    return sp;
  }
}
