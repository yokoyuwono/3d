// Indonesia relief map from real elevation data (AWS Terrain Tiles, 0.05 degree) with a
// rising sea: land at or below `level` metres turns into sea. x = (lon-118)*10, z = -(lat+2)*10.
import * as THREE from 'three';

const LON0 = 94, LAT0 = 7.5, RES = 0.05, STEP = 2; // sample every 2nd pixel (0.1 degree)
export const dgeo = (lon, lat, y = 0) => new THREE.Vector3((lon - 118) * 10, y, -(lat + 2) * 10);
export const H_SCALE = 0.0045; // metres -> scene units (exaggerated relief)

export class DemMap {
  static async load(url) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const E = new Float32Array(img.width * img.height);
    for (let i = 0; i < E.length; i++) E[i] = d[i * 4] * 256 + d[i * 4 + 1] - 32768;
    return new DemMap(E, img.width, img.height);
  }

  constructor(E, w, h) {
    this.E = E; this.w = w; this.h = h;
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x0a1a2a);
    s.fog = new THREE.Fog(0x0a1a2a, 700, 1600);
    const nx = Math.floor(w / STEP), nz = Math.floor(h / STEP);
    const pos = new Float32Array(nx * nz * 3), el = new Float32Array(nx * nz);
    let k = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const e = E[j * STEP * w + i * STEP];
      const lon = LON0 + (i * STEP + 0.5) * RES, lat = LAT0 - (j * STEP + 0.5) * RES;
      const p = dgeo(lon, lat, e > 0 ? e * H_SCALE : Math.max(-6, e * 0.0015));
      pos.set([p.x, p.y, p.z], k * 3); el[k] = e; k++;
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aElev', new THREE.BufferAttribute(el, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.u = { uLevel: { value: 0 }, uHi: { value: 0 }, uSun: { value: new THREE.Vector3(-0.4, 0.8, 0.45).normalize() } };
    this.land = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: 'attribute float aElev; varying float vE; varying vec3 vN; varying vec3 vW; void main(){ vE = aElev; vN = normalize(normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: /* glsl */ `
        uniform float uLevel, uHi; uniform vec3 uSun; varying float vE; varying vec3 vN; varying vec3 vW;
        vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec3 c;
          if (vE <= 0.0) c = mix(lin(vec3(0.05, 0.16, 0.32)), lin(vec3(0.1, 0.35, 0.55)), smoothstep(-3000.0, -20.0, vE));
          else {
            c = mix(lin(vec3(0.55, 0.72, 0.35)), lin(vec3(0.25, 0.52, 0.22)), smoothstep(0.0, 300.0, vE));
            c = mix(c, lin(vec3(0.55, 0.5, 0.33)), smoothstep(700.0, 1800.0, vE));
            c = mix(c, lin(vec3(0.75, 0.72, 0.68)), smoothstep(2500.0, 3800.0, vE));
            // land at or below the new sea level becomes sea (lighter, newly drowned)
            float drowned = 1.0 - step(uLevel + 0.01, vE);
            c = mix(c, lin(vec3(0.12, 0.42, 0.62)), drowned * step(0.01, uLevel));
            // optional: highlight land already below sea level (subsidence)
            c = mix(c, lin(vec3(0.95, 0.15, 0.1)), uHi * (1.0 - smoothstep(0.0, 1.5, vE)));
          }
          float d = max(dot(normalize(vN), uSun), 0.0);
          c *= 0.45 + 0.75 * d;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    s.add(this.land);
    // the sea surface rises with the level
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.1, 0.32, 0.5, THREE.SRGBColorSpace), transparent: true, opacity: 0.55, depthWrite: false }));
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(dgeo(118, -2).x, 0.02, dgeo(118, -2).z);
    s.add(this.sea);
    // city markers
    this.cities = {};
    const add = (name, lat, lon) => {
      const e = this.elev(lat, lon);
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.position.copy(dgeo(lon, lat, Math.max(0, e) * H_SCALE + 1));
      s.add(m);
      this.cities[name] = { m, e, lat, lon };
    };
    for (const [n, la, lo] of [['Jakarta', -6.175, 106.827], ['Surabaya', -7.26, 112.75], ['Makassar', -5.14, 119.42], ['Palembang', -2.98, 104.76], ['Semarang', -6.97, 110.42], ['Medan', 3.59, 98.67],
      ['Bandung', -6.91, 107.61], ['Bogor', -6.6, 106.8], ['Malang', -7.98, 112.63], ['Yogyakarta', -7.8, 110.36], ['Banjarmasin', -3.32, 114.59], ['Pontianak', -0.03, 109.33]]) add(n, la, lo);
  }

  elev(lat, lon) {
    const i = Math.round((lon - LON0) / RES - 0.5), j = Math.round((LAT0 - lat) / RES - 0.5);
    let best = -1e9; // median-ish: take the 3x3 median
    const v = [];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) v.push(this.E[(j + dj) * this.w + (i + di)]);
    v.sort((a, b) => a - b);
    best = v[4];
    return best;
  }

  cityPos(name, lift = 4) { const c = this.cities[name]; return c.m.position.clone().add(new THREE.Vector3(0, lift, 0)); }
  drowned(name, level) { return this.cities[name].e <= level; }

  update(t, level, hi = 0) {
    this.u.uLevel.value = level;
    this.u.uHi.value = hi * (0.6 + 0.4 * Math.sin(t * 6));
    this.sea.position.y = level * H_SCALE + 0.02;
    for (const c of Object.values(this.cities)) c.m.material.color.set(c.e <= level ? 0xff3b30 : 0x30d158);
  }
}
