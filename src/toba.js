// Scenes for "Andai Gunung Toba meletus lagi":
//  TobaTerrain  real terrain of the Toba caldera (AWS Terrain Tiles), with the pre-eruption volcano, the collapse,
//               the lake filling, Samosir rising, the eruption column, pyroclastic flows and ash cover (units: km, height x EX)
//  TobaVillage  a Batak lakeside village (units: m) with life, that can be buried in falling ash
//  AfricaScene  hunter-gatherers by a river 74,000 years ago (Shinfa-Metema / Pinnacle Point story)
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32, fbm } from './util.js';
import { Person, Flock, makeKerbau, makeChicken, makeRowBoat } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
export const EX = 4;          // vertical exaggeration of the terrain
const PX = 0.445;             // km per DEM pixel (0.004 deg)
const LAKE = 0.904;           // lake surface (km)

function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 64 + Math.cos(i * 2.4) * 22 * (i % 3) / 2, y = 64 + Math.sin(i * 2.4) * 22 * (i % 3) / 2, r = 30 + (i % 4) * 6;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PUFF = typeof document !== 'undefined' ? puffTex() : null;

// ------------------------------------------------------------------ terrain
export class TobaTerrain {
  static async load(url) {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    return new TobaTerrain(g.getImageData(0, 0, img.width, img.height), img.width, img.height);
  }
  constructor(data, w, h) {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0x9cc3e6); s.background = this.bg;
    s.fog = new THREE.Fog(0x9cc3e6, 150, 520);
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x4a4030, 1.3); s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.0); this.sun.position.set(-60, 90, 40); s.add(this.sun);
    this.w = w; this.h = h;
    const n = w * h;
    this.E = new Float32Array(n); this.B = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const d = data.data; this.E[i] = Math.max(0, d[i * 4] * 256 + d[i * 4 + 1] - 32768) / 1000; this.B[i] = d[i * 4 + 2]; }
    // caldera ellipse (NW-SE), for the imagined pre-eruption volcano and the vent
    this.vent = new THREE.Vector2(0, 0);
    let sx = 0, sz = 0, cnt = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.B[j * w + i]) { sx += i; sz += j; cnt++; }
    this.ci = sx / cnt; this.cj = sz / cnt;
    const ang = Math.atan2(1, -1.25);   // long axis direction in pixel space (NW-SE)
    this.ax = new THREE.Vector2(Math.cos(ang), Math.sin(ang));
    const geo = new THREE.PlaneGeometry((w - 1) * PX, (h - 1) * PX, w - 1, h - 1);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.pos = geo.attributes.position;
    this.col = new THREE.BufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute('color', this.col);
    this.hNow = new Float32Array(n); this.hPre = new Float32Array(n); this.hBed = new Float32Array(n); this.rEll = new Float32Array(n); this.rad = new Float32Array(n);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, b = this.B[k], e = this.E[k];
      const dx = i - this.ci, dz = j - this.cj;
      const u = dx * this.ax.x + dz * this.ax.y, v = -dx * this.ax.y + dz * this.ax.x;
      const r = Math.hypot(u / 118, v / 46);
      this.rEll[k] = r; this.rad[k] = Math.hypot(dx, dz) * PX;
      this.hNow[k] = b > 0 && b < 255 ? LAKE : e;
      this.hBed[k] = b === 0 ? e : b === 255 ? LAKE - 0.45 : LAKE - Math.min(0.5, (b / 8) * 0.06) - 0.02;
      const dome = 1.15 + 1.5 * Math.pow(clamp(1 - r), 1.4) + (fbm(i * 0.05, j * 0.05, 3) - 0.5) * 0.25;
      this.hPre[k] = r < 1.15 ? Math.max(e, lerp(e, dome, smoothstep(1.15, 0.9, r))) : e;
    }
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(geo, this.mat); s.add(this.mesh);
    this.plainMat = new THREE.MeshLambertMaterial({ color: lin(0.27, 0.48, 0.2) });
    const plain = new THREE.Mesh(new THREE.RingGeometry(55, 2000, 64, 1), this.plainMat);
    plain.rotation.x = -Math.PI / 2; plain.position.y = 0.45 * EX - 0.05; s.add(plain);
    // the lake: only quads inside the lake/Samosir mask
    const idx = [];
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const a = j * w + i, q = [a, a + 1, a + w, a + w + 1];
      if (q.some((x) => this.B[x] > 0)) idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
    }
    const wg = new THREE.BufferGeometry();
    const wp = new Float32Array(n * 3); for (let k = 0; k < n; k++) { wp[k * 3] = this.pos.getX(k); wp[k * 3 + 2] = this.pos.getZ(k); }
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wg.setIndex(idx); wg.computeVertexNormals();
    this.waterMat = new THREE.MeshLambertMaterial({ color: lin(0.13, 0.36, 0.56), transparent: true, opacity: 0.93 });
    this.water = new THREE.Mesh(wg, this.waterMat); s.add(this.water);
    this.ventPos = this.world(this.ci + 10, this.cj + 6, 1.3);
    this.state = '';
    this.buildFx();
    this.buildCubes();
    this.anchors = { samosir: this.world(129, 128, 2.2), lake: this.world(80, 70, 1.2), pangururan: this.world(100, 122, 1.2), vent: this.ventPos.clone(), rim: this.world(160, 80, 2), india: null };
  }
  world(i, j, hkm) { return new THREE.Vector3((i - (this.w - 1) / 2) * PX, hkm * EX, (j - (this.h - 1) / 2) * PX); }
  groundAt(x, z) {
    const i = clamp(Math.round(x / PX + (this.w - 1) / 2), 0, this.w - 1), j = clamp(Math.round(z / PX + (this.h - 1) / 2), 0, this.h - 1);
    return this.pos.getY(j * this.w + i);
  }

  buildFx() {
    const R = mulberry32(5);
    // eruption column: rising puffs that spread into an umbrella cloud
    this.col_ = Array.from({ length: 260 }, () => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color: 0x6a645e, transparent: true, depthWrite: false, fog: false }));
      this.scene.add(m); return { m, ph: R(), a: R() * Math.PI * 2, r: R(), s: 0.7 + R() * 0.6 };
    });
    // pyroclastic flows: low grey-brown puffs racing outwards along the ground
    this.flow = Array.from({ length: 220 }, () => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color: 0x8a7a6a, transparent: true, depthWrite: false }));
      this.scene.add(m); return { m, a: R() * Math.PI * 2, r: R(), s: 0.6 + R() * 0.8 };
    });
    // hot-spring steam (Pangururan)
    this.steam = Array.from({ length: 10 }, () => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color: 0xffffff, transparent: true, depthWrite: false }));
      this.scene.add(m); return { m, ph: R() };
    });
  }
  buildCubes() {
    // volume blocks: Tambora 1815 (~160 km3 -> 5.4 km cube) x 17 ~ Toba (~2,800 km3)
    this.cubes = [];
    const side = Math.cbrt(160);
    const base = this.world(205, 70, 0);
    for (let k = 0; k < 17; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(side * 0.97, side * 0.97, side * 0.97), new THREE.MeshLambertMaterial({ color: k ? lin(0.85, 0.35, 0.2) : lin(0.95, 0.75, 0.15) }));
      const ix = k % 3, iz = Math.floor(k / 3) % 3, iy = Math.floor(k / 9);
      m.userData.p = new THREE.Vector3(base.x + (ix - 1) * side, 0, base.z + (iz - 1) * side);
      m.userData.y = iy * side + side / 2;
      m.visible = false; this.scene.add(m); this.cubes.push(m);
    }
    this.cubeBase = base;
  }
  // o: collapse (0 imagined volcano .. 1 empty caldera), fill (0..1 lake level), samosir (0..1 uplift), ash (0..1 cover),
  //    erupt (0..1 column), flow (0..1 pyroclastic radius), dark (0..1 sky), cubes (0..17), steam (0..1)
  update(t, o = {}) {
    const collapse = o.collapse ?? 1, fill = o.fill ?? 1, sam = o.samosir ?? 1, ash = o.ash ?? 0;
    const key = [collapse, fill, sam, ash].map((x) => x.toFixed(3)).join();
    if (key !== this.state) {
      this.state = key;
      const n = this.w * this.h, c = new THREE.Color();
      const grass = lin(0.27, 0.48, 0.2), forest = lin(0.15, 0.33, 0.14), high = lin(0.45, 0.4, 0.3), bed = lin(0.4, 0.36, 0.3), ashC = lin(0.55, 0.54, 0.52), rock = lin(0.42, 0.33, 0.27);
      for (let k = 0; k < n; k++) {
        const b = this.B[k];
        let y;
        if (b === 255) y = lerp(lerp(this.hPre[k], this.hBed[k], collapse), this.hNow[k], collapse >= 1 ? sam : 0);
        else if (b > 0) y = lerp(this.hPre[k], this.hBed[k], collapse);
        else y = lerp(this.hPre[k], this.E[k], collapse);
        const i = k % this.w, j = (k - i) / this.w, edge = Math.min(i, j, this.w - 1 - i, this.h - 1 - j);
        y = lerp(0.45, y, smoothstep(0, 18, edge));
        this.pos.setY(k, y * EX);
        const e = y;
        c.copy(e < 0.6 ? grass : e < 1.4 ? grass.clone().lerp(forest, (e - 0.6) / 0.8) : forest.clone().lerp(high, clamp((e - 1.4) / 0.8)));
        if (b > 0 && collapse > 0.5 && !(b === 255 && sam > 0.8)) c.lerp(bed, 0.8);
        if (collapse < 1 && this.rEll[k] < 1.15) c.lerp(rock, smoothstep(1.15, 0.7, this.rEll[k]) * (1 - collapse) * 0.8);
        const reach = clamp(ash * 1.6 - this.rad[k] / 140);
        c.lerp(ashC, reach);
        this.col.setXYZ(k, c.r, c.g, c.b);
      }
      this.pos.needsUpdate = true; this.col.needsUpdate = true; this.geo.computeVertexNormals();
      this.plainMat.color.copy(grass).lerp(ashC, clamp(ash * 1.6 - 0.5));
    }
    const lvl = lerp(LAKE - 0.5, LAKE, fill);
    this.water.visible = collapse > 0.98 && fill > 0.01;
    this.water.position.y = lvl * EX;
    this.waterMat.color.copy(lin(0.13, 0.36, 0.56)).lerp(lin(0.4, 0.4, 0.4), clamp(ash * 1.5));
    // sky
    const dark = o.dark ?? 0;
    this.bg.copy(lin(0.62, 0.77, 0.9)).lerp(lin(0.16, 0.13, 0.12), dark); this.scene.fog.color.copy(this.bg);
    this.scene.fog.near = lerp(150, 40, dark); this.scene.fog.far = lerp(520, 220, dark);
    this.hemi.intensity = lerp(1.3, 0.55, dark); this.sun.intensity = lerp(2.0, 0.5, dark);
    // column
    const er = o.erupt ?? 0;
    const top = 70 * smoothstep(0, 0.5, er);
    for (const q of this.col_) {
      const v = q.m; v.visible = er > 0.01;
      if (!v.visible) continue;
      const k = (q.ph + t * 0.09) % 1;
      const hh = k * top;
      const spread = hh > top * 0.75 ? (hh - top * 0.75) * 3.2 * smoothstep(0.3, 1, er) : 0;
      const r = 3 + hh * 0.08 + spread * q.r;
      v.position.set(this.ventPos.x + Math.cos(q.a) * r, this.ventPos.y + Math.min(hh, top * 0.85 + spread * 0.08), this.ventPos.z + Math.sin(q.a) * r);
      v.scale.setScalar((6 + hh * 0.25 + spread * 0.25) * q.s);
      v.material.opacity = 0.9 * (1 - smoothstep(0.85, 1, k)) * smoothstep(0, 0.05, k);
      v.material.color.setRGB(lerp(0.32, 0.5, k), lerp(0.3, 0.47, k), lerp(0.28, 0.44, k));
    }
    // pyroclastic flow ring
    const fl = o.flow ?? 0;
    for (const q of this.flow) {
      const v = q.m; v.visible = fl > 0.01;
      if (!v.visible) continue;
      const r = 8 + fl * 55 * (0.65 + 0.35 * q.r) + Math.sin(t * 2 + q.a * 5) * 0.8;
      const x = this.ventPos.x + Math.cos(q.a) * r * 1.4, z = this.ventPos.z + Math.sin(q.a) * r * 0.75;
      v.position.set(x, this.groundAt(x, z) + 1.5, z);
      v.scale.setScalar(5 * q.s);
      v.material.opacity = 0.85 * (1 - smoothstep(0.85, 1, fl));
    }
    // steam
    const st = o.steam ?? 0;
    for (const q of this.steam) {
      const v = q.m; v.visible = st > 0.01;
      if (!v.visible) continue;
      const k = (q.ph + t * 0.25) % 1, p = this.anchors.pangururan;
      v.position.set(p.x + Math.sin(q.ph * 9) * 0.6, p.y + k * 5, p.z);
      v.scale.setScalar(1 + k * 3); v.material.opacity = 0.6 * (1 - k) * st;
    }
    // volume cubes
    const nc = o.cubes ?? 0;
    this.cubes.forEach((m, k) => {
      const a = clamp(nc - k);
      m.visible = a > 0.01;
      if (!m.visible) return;
      const g = this.groundAt(m.userData.p.x, m.userData.p.z);
      m.position.set(m.userData.p.x, g + m.userData.y + (1 - a) * 12, m.userData.p.z);
    });
  }
}

// ------------------------------------------------------------------ Batak lakeside village
function rumahBolon(R) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: lin(0.3, 0.18, 0.1) });
  for (const x of [-2.4, 0, 2.4]) for (const z of [-1.6, 1.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.8, 6), wood); p.position.set(x, 0.9, z); g.add(p); }
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.0, 3.8), wood); body.position.y = 2.8; g.add(body);
  // painted front panels (red, white, black ornaments)
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x9a1e14 })); f.position.set(s * 2.81, 2.8, 0); f.rotation.y = s * Math.PI / 2; g.add(f);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x111111 : 0xf2eee6 })); st.position.set(s * 2.82, 2.3 + i * 0.5, 0); st.rotation.y = s * Math.PI / 2; g.add(st); }
  }
  // saddle roof that sweeps up at both ends
  const roofGeo = new THREE.PlaneGeometry(9, 5.2, 24, 8);
  const p = roofGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.09 * x * x - Math.abs(y) * 0.95); }
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: lin(0.42, 0.33, 0.24), side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2; roof.position.y = 6.0;
  g.add(roof);
  g.userData.roof = roof.material; g.userData.body = wood;
  return g;
}

export class TobaVillage {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(); s.background = this.bg;
    s.fog = new THREE.Fog(0xa6c8e8, 120, 1400);
    this.hemi = new THREE.HemisphereLight(0xe8f2ff, 0x50603a, 1.3); s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.8); this.sun.position.set(40, 60, 30); s.add(this.sun);
    const R = mulberry32(31);
    const gg = new THREE.PlaneGeometry(400, 200, 80, 40); const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i); gp.setZ(i, (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 1.2 + 0.5 + Math.max(0, -y - 60) * 0.25); }
    gg.computeVertexNormals();
    this.groundMat = new THREE.MeshLambertMaterial({ color: lin(0.36, 0.55, 0.25) });
    const ground = new THREE.Mesh(gg, this.groundMat); ground.rotation.x = -Math.PI / 2; ground.position.z = 98; s.add(ground);
    this.lakeMat = new THREE.MeshLambertMaterial({ color: lin(0.16, 0.4, 0.6) });
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), this.lakeMat); lake.rotation.x = -Math.PI / 2; lake.position.set(0, -0.3, -1500 - 4); s.add(lake);
    const shore = new THREE.Mesh(new THREE.PlaneGeometry(400, 6), new THREE.MeshLambertMaterial({ color: lin(0.7, 0.62, 0.45) })); shore.rotation.x = -Math.PI / 2; shore.position.set(0, -0.1, -2); s.add(shore);
    // Samosir and the caldera walls in the distance
    this.hillMat = new THREE.MeshLambertMaterial({ color: lin(0.3, 0.45, 0.32) });
    for (const [x, z, sx, sy] of [[-150, -420, 300, 75], [180, -480, 260, 60], [420, -330, 180, 110], [-480, -300, 220, 130]]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), this.hillMat); h.scale.set(sx, sy, sx * 0.4); h.position.set(x, -5, z); s.add(h);
    }
    // houses
    this.houses = [[-14, 12, 0.1], [-4, 14, -0.05], [6, 13, 0.08], [16, 12, -0.1]].map(([x, z, r]) => { const h = rumahBolon(R); h.position.set(x, 0, z); h.rotation.y = r; s.add(h); return h; });
    // pine trees
    this.treeMat = new THREE.MeshLambertMaterial({ color: lin(0.12, 0.3, 0.16) });
    for (let i = 0; i < 26; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8 + R() * 4, 7), this.treeMat); t.position.set(-60 + R() * 120, 5, 22 + R() * 30); s.add(t); }
    // people: tourists, villagers, kids swimming, a fisherman in a solu canoe
    this.walkers = Array.from({ length: 9 }, (_, i) => { const p = new Person(R, { hat: ['hijab', 'hair', 'caping', 'hair'][i % 4] }); s.add(p.root); return { p, x0: -24 + R() * 48, z: 4 + R() * 6, sp: 0.6 + R() * 0.6, ph: R() * 50, dir: R() < 0.5 ? 1 : -1 }; });
    this.swimmers = Array.from({ length: 4 }, (_, i) => { const p = new Person(R, { scale: 0.75, hat: 'hair' }); p.root.position.set(-6 + i * 3.5, -1.0, -8 - (i % 2) * 2); s.add(p.root); return p; });
    this.boat = makeRowBoat(R, 1); this.boat.scale.set(0.8, 1, 1.6); this.boat.position.set(10, -0.2, -26); s.add(this.boat);
    this.kerbau = [makeKerbau(), makeKerbau()]; this.kerbau.forEach((k, i) => { k.position.set(28 + i * 4, 0, 18 + i * 2); k.rotation.y = 1.2 + i; s.add(k); });
    this.chickens = Array.from({ length: 6 }, () => { const c = makeChicken(R); s.add(c); return { c, x: -10 + R() * 20, z: 8 + R() * 4, ph: R() * 6 }; });
    this.flock = new Flock(s, 8, { c: new THREE.Vector3(0, 0, -30), r: 30, h: 18, color: [0.95, 0.95, 0.95], size: 2.4, seed: 3 });
    // falling ash
    const n = 3000, ap = new Float32Array(n * 3), Ra = mulberry32(8);
    for (let i = 0; i < n; i++) { ap[i * 3] = -60 + Ra() * 120; ap[i * 3 + 1] = Ra() * 40; ap[i * 3 + 2] = -40 + Ra() * 80; }
    this.ashSeed = ap.slice();
    const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    this.ash = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0x8a8580, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    s.add(this.ash);
    this.anchors = { houses: new THREE.Vector3(0, 9, 13), lake: new THREE.Vector3(0, 3, -20), swim: new THREE.Vector3(-1, 1.6, -9), boat: new THREE.Vector3(10, 2.6, -26) };
  }
  // ash: 0..1 (ashfall + darkness); panic: people run; swim: kids in the lake
  update(t, o = {}) {
    const ash = o.ash ?? 0, panic = ash > 0.2;
    this.bg.copy(lin(0.65, 0.8, 0.94)).lerp(lin(0.22, 0.19, 0.17), ash); this.scene.fog.color.copy(this.bg);
    this.scene.fog.near = lerp(120, 8, ash); this.scene.fog.far = lerp(1400, 90, ash);
    this.hemi.intensity = lerp(1.3, 0.6, ash); this.sun.intensity = lerp(1.8, 0.35, ash);
    const grey = lin(0.55, 0.54, 0.52);
    this.groundMat.color.copy(lin(0.36, 0.55, 0.25)).lerp(grey, ash * 0.9);
    this.treeMat.color.copy(lin(0.12, 0.3, 0.16)).lerp(grey, ash * 0.7);
    this.lakeMat.color.copy(lin(0.16, 0.4, 0.6)).lerp(lin(0.35, 0.35, 0.34), ash * 0.8);
    this.hillMat.color.copy(lin(0.3, 0.45, 0.32)).lerp(this.bg, ash);
    for (const h of this.houses) h.userData.roof.color.copy(lin(0.42, 0.33, 0.24)).lerp(grey, ash);
    for (const w of this.walkers) {
      const sp = panic ? 4.5 : w.sp, x = panic ? -40 + (((t * sp + w.ph) % 80)) : w.x0 + Math.sin(t * 0.25 + w.ph) * 6;
      w.p.root.position.set(x, 0, panic ? w.z + 8 : w.z);
      w.p.root.rotation.y = panic ? Math.PI / 2 : Math.cos(t * 0.25 + w.ph) > 0 ? Math.PI / 2 : -Math.PI / 2;
      w.p.pose(t, panic ? 'run' : 'walk', panic ? 2 : 1);
    }
    this.swimmers.forEach((p, i) => { p.root.visible = !panic && (o.swim ?? 1) > 0; p.root.position.y = -1.0 + Math.sin(t * 2 + i) * 0.08; p.pose(t + i, i % 2 ? 'wave' : 'row', 1); });
    this.boat.visible = !panic;
    this.boat.position.x = 10 + Math.sin(t * 0.1) * 3; this.boat.rotation.z = Math.sin(t * 1.1) * 0.04;
    this.boat.userData.crew[0].pose(t, 'row', 1);
    this.kerbau.forEach((k) => { k.visible = !panic; });
    for (const c of this.chickens) { c.c.visible = !panic; c.c.position.set(c.x + Math.sin(t * 0.6 + c.ph) * 1.5, 0, c.z); c.c.rotation.y = t * 0.6 + c.ph; }
    this.flock.update(t, panic ? 0 : 1);
    this.ash.visible = ash > 0.02;
    if (this.ash.visible) {
      const p = this.ash.geometry.attributes.position, sd = this.ashSeed;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, sd[i * 3] + Math.sin(t * 0.7 + i) * 0.3, ((sd[i * 3 + 1] - t * 2.2) % 40 + 40) % 40, sd[i * 3 + 2]);
      p.needsUpdate = true;
      this.ash.material.opacity = ash;
    }
  }
}

// ------------------------------------------------------------------ 74,000 years ago: people by an African river
export class AfricaScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0xe8cfa0); s.background = this.bg;
    s.fog = new THREE.Fog(0xe8cfa0, 60, 260);
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x6a5030, 1.4));
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.8); sun.position.set(-40, 30, -20); s.add(sun);
    const R = mulberry32(17);
    const gg = new THREE.PlaneGeometry(400, 300, 60, 40); const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setZ(i, (fbm(gp.getX(i) * 0.03, gp.getY(i) * 0.03, 3) - 0.5) * 3);
    gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ color: lin(0.72, 0.6, 0.36) })); ground.rotation.x = -Math.PI / 2; s.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), new THREE.MeshLambertMaterial({ color: lin(0.25, 0.45, 0.5) })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.6, -8); river.rotation.z = 0.15; s.add(river);
    const trunk = new THREE.MeshLambertMaterial({ color: lin(0.35, 0.25, 0.15) }), leaf = new THREE.MeshLambertMaterial({ color: lin(0.35, 0.45, 0.2) });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4, 6), trunk); tr.position.y = 2; g.add(tr);
      const cr = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 0.9, 10), leaf); cr.position.y = 4.3; g.add(cr);
      g.position.set(-80 + R() * 160, 0, 8 + R() * 60); s.add(g);
    }
    for (let i = 0; i < 120; i++) { const g = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), new THREE.MeshLambertMaterial({ color: lin(0.6, 0.55, 0.3) })); g.position.set(-40 + R() * 80, 0.4, 0 + R() * 30); s.add(g); }
    this.people = [[-3, -1.5, 'throw', 2.8], [2, -1.2, 'bend', 2.6], [5, 3, 'sit', 0.4], [-6, 4, 'idle', 0.8], [0, 5.5, 'point', -2.6]].map(([x, z, pose, ry]) => {
      const p = new Person(R, { hat: 'hair', shirt: [0.45, 0.3, 0.18] }); p.root.position.set(x, 0, z); p.root.rotation.y = ry; s.add(p.root); return { p, pose };
    });
    const fire = new THREE.Group();
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.3 - i * 0.08, 0.9 - i * 0.2, 6), new THREE.MeshBasicMaterial({ color: [0xff6a00, 0xffa020, 0xffe080][i] })); f.position.y = 0.45; fire.add(f); }
    fire.position.set(3, 0, 5); s.add(fire); this.fire = fire;
    this.fish = Array.from({ length: 4 }, (_, i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshLambertMaterial({ color: 0xb8c4c8 })); f.scale.set(2, 0.6, 0.8); s.add(f); return { f, x: -8 + i * 5, ph: i * 1.7 }; });
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, -20), r: 30, h: 16, color: [0.1, 0.1, 0.1], size: 2.4, seed: 2 });
    const n = 1500, ap = new Float32Array(n * 3), Ra = mulberry32(4);
    for (let i = 0; i < n; i++) { ap[i * 3] = -30 + Ra() * 60; ap[i * 3 + 1] = Ra() * 25; ap[i * 3 + 2] = -20 + Ra() * 40; }
    this.ashSeed = ap.slice();
    const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    this.ash = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0x9a948c, size: 0.1, transparent: true, opacity: 0.7, depthWrite: false }));
    s.add(this.ash);
    this.anchors = { group: new THREE.Vector3(0, 3.2, 2), river: new THREE.Vector3(-3, 2.6, -4) };
  }
  update(t, ash = 0.3) {
    for (const q of this.people) q.p.pose(t, q.pose, 1);
    this.fire.children.forEach((f, i) => f.scale.set(1, 0.8 + 0.25 * Math.sin(t * 13 + i * 2), 1));
    for (const q of this.fish) { const k = ((t * 0.5 + q.ph) % 3) / 3; q.f.visible = k < 0.25; const a = k / 0.25; q.f.position.set(q.x, 0.6 + Math.sin(a * Math.PI) * 1.4, -8 + q.ph); q.f.rotation.z = (0.5 - a) * 2; }
    this.flock.update(t, 1);
    this.ash.visible = ash > 0.01;
    const p = this.ash.geometry.attributes.position, sd = this.ashSeed;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, sd[i * 3] + Math.sin(t * 0.5 + i) * 0.4, ((sd[i * 3 + 1] - t * 0.8) % 25 + 25) % 25, sd[i * 3 + 2]);
    p.needsUpdate = true; this.ash.material.opacity = 0.7 * ash;
  }
}
