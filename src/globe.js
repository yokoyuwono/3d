// A stylised 3D Earth for the "ANDAI…" episodes: continents from Natural Earth
// (public domain), day/night with a fixed Sun, frost on the night side, heat on the
// day side, the equatorial ocean bulge and the "oceans migrate to the poles" effect
// (illustration after Witold Fraczek's Esri model).
import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { CITIES } from './life.js';

export const R = 10;
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

// lat/lon (degrees) -> local position on a sphere of radius r (lon 0 faces +z, east is +x)
export function ll(lat, lon, r = R) {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

function landCanvases(rings) {
  const w = 2048, h = 1024;
  const color = document.createElement('canvas'); color.width = w; color.height = h;
  const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  const g = color.getContext('2d'), m = mask.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#163a6b'); grd.addColorStop(0.5, '#1d5d94'); grd.addColorStop(1, '#163a6b');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
  const px = ([lon, lat]) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  const path = (ctx, ring) => { ctx.beginPath(); ring.forEach((p, i) => { const [x, y] = px(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
  // land: greens near the equator, browns in the subtropics, white at the poles
  const lg = g.createLinearGradient(0, 0, 0, h);
  [[0, '#f4f7fa'], [0.11, '#e8eef2'], [0.17, '#6f8f5a'], [0.3, '#5f8a45'], [0.36, '#b49a63'], [0.42, '#5e9a3e'],
    [0.5, '#2f7d32'], [0.58, '#5e9a3e'], [0.64, '#b49a63'], [0.72, '#6f8f5a'], [0.8, '#8a9a7a'], [0.86, '#e8eef2'], [1, '#f4f7fa']]
    .forEach(([o, c]) => lg.addColorStop(o, c));
  for (const ring of rings) {
    path(g, ring); g.fillStyle = lg; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.stroke();
    path(m, ring); m.fillStyle = '#fff'; m.fill();
  }
  // a little texture noise
  const R_ = mulberry32(9);
  g.globalAlpha = 0.06;
  for (let i = 0; i < 9000; i++) { g.fillStyle = R_() < 0.5 ? '#000' : '#fff'; g.fillRect(R_() * w, R_() * h, 3, 3); }
  g.globalAlpha = 1;
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = c === color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; return t; };
  return { color: tex(color), mask: tex(mask) };
}

export class Globe {
  constructor(rings) {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x02040a);
    // stars
    const R_ = mulberry32(21);
    const sp = [];
    for (let i = 0; i < 2600; i++) {
      const v = new THREE.Vector3(R_() - 0.5, R_() - 0.5, R_() - 0.5).normalize().multiplyScalar(400 + R_() * 200);
      sp.push(v.x, v.y, v.z);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.8 })));

    this.sunDir = new THREE.Vector3(1, 0.15, 0.6).normalize();
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    this.sun.position.copy(this.sunDir).multiplyScalar(300);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('#fff3c4', 'rgba(255,200,80,0)'), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(70);
    this.sun.add(glow);
    s.add(this.sun);

    const { color, mask } = landCanvases(rings);
    this.u = {
      uMap: { value: color }, uMask: { value: mask }, uSun: { value: this.sunDir.clone() },
      uFrost: { value: 0 }, uHeat: { value: 0 }, uDrain: { value: 0 }, uEquator: { value: 0 }, uTime: { value: 0 }, uNightDark: { value: 1 },
    };
    this.earth = new THREE.Group();
    s.add(this.earth);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vL;
        void main(){ vUv = uv; vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap, uMask; uniform vec3 uSun; uniform float uFrost, uHeat, uDrain, uEquator, uTime, uNightDark;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vL;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec3 col = texture2D(uMap, vUv).rgb;
          float land = texture2D(uMask, vUv).r;
          float lat = (vUv.y - 0.5) * 180.0;
          float alat = abs(lat);
          float n = vn(vUv * vec2(60.0, 30.0)) * 0.6 + vn(vUv * vec2(200.0, 100.0)) * 0.4;
          // oceans migrate to the poles: equatorial seabed is exposed, high latitudes flood
          float band = uDrain * (38.0 + 6.0 * n);
          float exposed = (1.0 - land) * (1.0 - smoothstep(band - 4.0, band, alat)) * step(0.001, uDrain);
          vec3 seabed = mix(lin(vec3(0.62, 0.52, 0.36)), lin(vec3(0.45, 0.36, 0.26)), n);
          col = mix(col, seabed, exposed);
          float floodLat = 90.0 - uDrain * (40.0 + 6.0 * n);
          float flooded = land * smoothstep(floodLat, floodLat + 3.0, alat) * step(0.001, uDrain);
          col = mix(col, lin(vec3(0.10, 0.30, 0.55)), flooded * 0.9);
          float water = (1.0 - land) * (1.0 - exposed) + flooded;
          // lighting
          vec3 N = normalize(vN);
          float d = dot(N, normalize(uSun));
          float day = smoothstep(-0.12, 0.18, d);
          vec3 V = normalize(cameraPosition - vW);
          vec3 Hh = normalize(normalize(uSun) + V);
          float spec = pow(max(dot(N, Hh), 0.0), 60.0) * water * day;
          vec3 lit = col * (0.25 + 1.0 * max(d, 0.0)) + vec3(1.0, 0.95, 0.85) * spec * 0.6;
          vec3 night = col * 0.06 * uNightDark + lin(vec3(0.02, 0.03, 0.07));
          // frost on the night side, heat on the day side
          night = mix(night, lin(vec3(0.70, 0.80, 0.92)) * (0.35 + 0.25 * n), uFrost * (1.0 - day));
          lit = mix(lit, lit * vec3(1.35, 0.75, 0.45) + lin(vec3(0.25, 0.06, 0.0)), uHeat * smoothstep(0.3, 0.9, d));
          vec3 c = mix(night, lit, day);
          // equator highlight
          c += lin(vec3(1.0, 0.82, 0.2)) * uEquator * (1.0 - smoothstep(0.4, 1.2, alat)) * 1.5;
          // rim
          float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          c += lin(vec3(0.35, 0.6, 1.0)) * rim * 0.35 * (0.3 + day);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 80), mat);
    // SphereGeometry's u=0.5 sits at -z; rotate so lon 0 faces +z like ll()
    this.sphere.rotation.y = -Math.PI / 2;
    this.earth.add(this.sphere);

    // clouds
    this.cloudU = { uTime: { value: 0 }, uSun: this.u.uSun, uAlpha: { value: 0.55 } };
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48), new THREE.ShaderMaterial({
      uniforms: this.cloudU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uTime, uAlpha; uniform vec3 uSun; varying vec3 vP; varying vec3 vN;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
        float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
                     mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
        void main(){
          vec3 p = normalize(vP) * 3.0 + vec3(uTime * 0.01, 0.0, 0.0);
          float c = vn(p) * 0.55 + vn(p * 2.1) * 0.3 + vn(p * 4.3) * 0.15;
          float a = smoothstep(0.55, 0.75, c) * uAlpha;
          float day = smoothstep(-0.1, 0.25, dot(normalize(vN), normalize(uSun)));
          gl_FragColor = vec4(vec3(1.0) * (0.15 + 0.85 * day), a * (0.3 + 0.7 * day));
        }`,
    }));
    this.earth.add(this.clouds);

    // atmosphere glow
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 32), new THREE.ShaderMaterial({
      uniforms: { uSun: this.u.uSun }, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
          float day = 0.35 + 0.65 * smoothstep(-0.3, 0.4, dot(normalize(vN), normalize(uSun)));
          gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * rim * day * 1.6, rim); }`,
    }));
    s.add(this.atmo);

    // ocean bulge shell (exaggerated) for the "why the oceans move" explanation
    this.bulgeMat = new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0, depthWrite: false });
    this.bulge = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 64, 32), this.bulgeMat);
    this.earth.add(this.bulge);

    // equator ring + markers
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.004, 0.05, 8, 200), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0 }));
    this.ring.rotation.x = Math.PI / 2;
    this.earth.add(this.ring);
    this.markers = {};
    const mk = (name, lat, lon, color) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(ll(lat, lon, R * 1.01));
      this.earth.add(m);
      this.markers[name] = m;
    };
    mk('jakarta', -6.2, 106.8, 0xff3b30);
    mk('tokyo', 35.7, 139.7, 0xffd23a);
    mk('pole', 89.5, 0, 0xffffff);
    mk('europe', 60, 15, 0x3aa0ff);
    mk('canada', 62, -100, 0x3aa0ff);
    mk('russia', 66, 90, 0x3aa0ff);
    mk('indo', -1, 118, 0xff3b30);
    mk('papua', -4.08, 137.16, 0xffffff);
    mk('venezuela', 8.55, -71.0, 0xffd23a);

    // city lights: glow only on the night side (signs of people on Earth)
    const R4 = mulberry32(99), cp = [];
    for (const [la, lo] of CITIES) for (let i = 0; i < 14; i++) { const v = ll(la + (R4() - 0.5) * 2.2, lo + (R4() - 0.5) * 2.2, R * 1.004); cp.push(v.x, v.y, v.z); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    this.lights = new THREE.Points(cg, new THREE.ShaderMaterial({
      uniforms: { uSun: this.u.uSun, uOn: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform vec3 uSun; varying float vA; void main(){ vec3 n = normalize(mat3(modelMatrix)*position); vA = 1.0 - smoothstep(-0.15, 0.05, dot(n, normalize(uSun))); vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = 3.0; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float uOn; varying float vA; void main(){ float r = length(gl_PointCoord-0.5); gl_FragColor = vec4(1.0, 0.78, 0.4, smoothstep(0.5, 0.0, r) * vA * uOn); }',
    }));
    this.earth.add(this.lights);
    // the Moon and a tidal bulge (episode outro)
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(2.7, 48, 24), new THREE.MeshLambertMaterial({ color: 0xc9c9c9 }));
    this.moon.visible = false;
    s.add(this.moon);
    this.light = new THREE.DirectionalLight(0xffffff, 2.5);
    this.light.position.copy(this.sunDir).multiplyScalar(100);
    s.add(this.light, new THREE.AmbientLight(0x404050, 0.6));
  }

  // glowing outline of the Indonesian islands that can be slid north (Episode 2)
  addOutline(islands, ellipses) {
    this.outline = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0 });
    const dotPos = [];
    const ring = (pts) => {
      const v = pts.map(([lon, lat]) => ll(lat, lon, R * 1.012));
      v.push(v[0]);
      this.outline.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), mat));
      for (let i = 0; i < v.length - 1; i++) for (let k = 0; k < 6; k++) { const p = v[i].clone().lerp(v[i + 1], k / 6); dotPos.push(p.x, p.y, p.z); }
    };
    for (const pts of Object.values(islands)) ring(pts);
    for (const [lo, la, rx, ry, rot] of ellipses) {
      const pts = [];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([lo + x * Math.cos(rot) - y * Math.sin(rot), la + x * Math.sin(rot) + y * Math.cos(rot)]); }
      ring(pts);
    }
    this.outlineMat = mat;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3));
    this.outlineDots = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd23a, size: 5, sizeAttenuation: false, transparent: true, opacity: 0 }));
    this.outline.add(this.outlineDots);
    this.earth.add(this.outline);
    // rotate about the east-west axis through lon 118 so the outline slides along its meridian
    this.outlineAxis = ll(0, 118 + 90, 1).normalize();
  }

  // world position of a named marker (for HTML tags)
  markerPos(name, lift = 0.6) {
    const m = this.markers[name];
    const p = m.position.clone().multiplyScalar(1 + lift / R);
    return this.earth.localToWorld(p);
  }

  // spin: rotation angle (rad); opts: frost, heat, drain, equator, bulge (-1 polar .. 1 equatorial), moon
  update(t, spin, o = {}) {
    this.earth.rotation.y = spin;
    this.earth.updateMatrixWorld(true);
    this.u.uTime.value = t;
    this.u.uFrost.value = o.frost || 0;
    this.u.uHeat.value = o.heat || 0;
    this.u.uDrain.value = o.drain || 0;
    this.u.uEquator.value = o.equator || 0;
    this.ring.material.opacity = o.equator || 0;
    this.cloudU.uTime.value = t;
    this.lights.material.uniforms.uOn.value = o.frost ? 1 - o.frost * 0.85 : 1; // a frozen night dims the cities
    this.cloudU.uAlpha.value = o.clouds ?? 0.5;
    this.clouds.rotation.y = t * 0.01;
    const b = o.bulge || 0;
    this.bulgeMat.opacity = Math.min(0.45, Math.abs(b) * 0.6);
    this.bulge.scale.set(1 + 0.12 * Math.max(0, b), 1 - 0.12 * Math.max(0, b) + 0.16 * Math.max(0, -b), 1 + 0.12 * Math.max(0, b));
    if (b < 0) this.bulge.scale.set(1 - 0.06 * -b, 1 + 0.16 * -b, 1 - 0.06 * -b);
    for (const [n, m] of Object.entries(this.markers)) m.visible = (o.markers || []).includes(n);
    if (this.outline) {
      this.outlineMat.opacity = o.outline || 0;
      this.outlineDots.material.opacity = o.outline || 0;
      this.outline.quaternion.setFromAxisAngle(this.outlineAxis, -THREE.MathUtils.degToRad(o.shift || 0));
    }
    this.moon.visible = !!o.moon;
    if (o.moon) {
      const a = o.moonAngle || 0;
      this.moon.position.set(Math.cos(a) * 34, 3, Math.sin(a) * 34);
    }
  }
}

function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
