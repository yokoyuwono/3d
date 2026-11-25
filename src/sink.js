// Scenes for "Andai Jakarta tenggelam 2050":
//  SubsidenceScene  a cut-away block of Jakarta's ground: houses and a factory on top, clay and sandy aquifer layers below,
//                   deep wells pumping groundwater out; the clay compacts and the surface sinks below the sea next door
//  SpongeScene      the sponge analogy: a wet sponge squeezed as water is drawn out, it does not spring back
import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from './util.js';
import { Person, Flock } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: lin(...c), ...o });

export class SubsidenceScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xbcd6ec); s.fog = new THREE.Fog(0xbcd6ec, 90, 300);
    s.add(new THREE.HemisphereLight(0xffffff, 0x605040, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.position.set(20, 40, 30); s.add(sun);
    const R = mulberry32(19);
    // layers (top -> bottom): [name, thickness, colour, compressible]
    this.layers = [['top', 1.5, [0.45, 0.35, 0.22], 0], ['clay1', 5, [0.5, 0.52, 0.55], 1], ['sand1', 4, [0.78, 0.68, 0.45], 0.25], ['clay2', 5, [0.42, 0.45, 0.5], 1], ['sand2', 4, [0.74, 0.64, 0.42], 0.25], ['rock', 6, [0.35, 0.3, 0.28], 0]]
      .map(([n, h, c, comp]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 14), M(c)); s.add(m); return { n, h, m, comp }; });
    // groundwater dots inside the sandy aquifers
    const n = 900, wp = new Float32Array(n * 3);
    this.wseed = Array.from({ length: n }, () => ({ x: -19 + R() * 38, z: 7.02, u: R(), L: R() < 0.5 ? 2 : 4 }));
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    this.water = new THREE.Points(wg, new THREE.PointsMaterial({ color: 0x2f7bff, size: 0.35, transparent: true, opacity: 0.9 }));
    s.add(this.water);
    // the surface world: houses, people, a factory with deep wells
    this.top = new THREE.Group(); s.add(this.top);
    for (let i = 0; i < 5; i++) {
      const h = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 3), M([[0.95, 0.9, 0.8], [0.85, 0.9, 0.95], [0.95, 0.82, 0.75]][i % 3])); b.position.y = 1.3; h.add(b);
      const r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), M([0.75, 0.32, 0.2])); r.position.y = 3.3; r.rotation.y = Math.PI / 4; h.add(r);
      h.position.set(-16 + i * 4.2, 0, 2 - (i % 2) * 3); this.top.add(h);
    }
    const fac = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 6), M([0.7, 0.72, 0.75])); fac.position.set(10, 3, 0); this.top.add(fac);
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 10), M([0.6, 0.3, 0.25])); chim.position.set(13, 8, -1.5); this.top.add(chim);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), M([0.6, 0.75, 0.85])); tower.position.set(2, 7, -3); this.top.add(tower);
    this.people = Array.from({ length: 6 }, (_, i) => { const p = new Person(R, { hat: ['hijab', 'hair', 'caping'][i % 3] }); p.root.position.set(-15 + i * 3.6, 0, 5.2); p.root.rotation.y = 0.2; this.top.add(p.root); return p; });
    // wells: pipes from the surface into the aquifers, with water particles rising
    this.wells = [-12, -4, 10, 14].map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 8), M([0.3, 0.3, 0.32])); p.position.set(x, 0, 6.8); s.add(p); return { x, p }; });
    this.lift = Array.from({ length: 80 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2f7bff })); s.add(m); return { m, w: i % 4, ph: (i / 80) * 4 % 1 }; });
    // piped water from a reservoir (the fix)
    this.pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 44, 12), M([0.2, 0.45, 0.85])); this.pipe.rotation.z = Math.PI / 2; s.add(this.pipe);
    // the sea on the right, at a fixed level 0, and its overflow over the sinking land
    this.sea = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 14), M([0.2, 0.45, 0.65], { transparent: true, opacity: 0.85 })); this.sea.position.set(50, -15, 0); s.add(this.sea);
    this.flood = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 14), M([0.25, 0.5, 0.7], { transparent: true, opacity: 0.6 })); s.add(this.flood);
    this.seaLine = new THREE.Mesh(new THREE.BoxGeometry(100, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.seaLine.position.set(20, 0, 7.1); s.add(this.seaLine);
    // ruler (0 .. -4 m) on the left
    this.ruler = new THREE.Group();
    for (let i = 0; i <= 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd400 })); t.position.set(0, -i, 0); this.ruler.add(t); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd400 })); bar.position.y = -2; this.ruler.add(bar);
    this.ruler.position.set(-22, 1.5, 7.2); s.add(this.ruler);
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, 0), r: 25, h: 18, color: [0.95, 0.95, 0.95], size: 2, seed: 4 });
    this.base0 = 1.5;      // original ground level above the sea
    this.anchors = { surface: new THREE.Vector3(-8, 6, 5), wells: new THREE.Vector3(-8, -8, 7.2), clay: new THREE.Vector3(-8, -4, 7.2), ruler: new THREE.Vector3(-22, 2.5, 7.2), sea: new THREE.Vector3(30, 2, 7), pipe: new THREE.Vector3(0, 3, 9) };
  }
  // pump: 0..1 how much water has been drawn (drives compaction); pumping: wells running (particles); piped: reservoir pipe on;
  // sink: total surface drop in metres (default from pump)
  update(t, o = {}) {
    const pump = o.pump ?? 0, sink = o.sink ?? 4 * pump;
    // stack layers from the bottom up, compressing the clays
    let y = -24;
    const comp = this.layers.reduce((a, L) => a + L.h * L.comp, 0);
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const L = this.layers[i];
      const h = L.h - (sink * L.h * L.comp) / comp;
      L.m.scale.y = h; L.m.position.y = y + h / 2; L.cur = { y0: y, y1: y + h };
      y += h;
    }
    // y is now the top of the ground; ground surface relative to sea level
    const surf = y - (-24 + this.layers.reduce((a, L) => a + L.h, 0)) + this.base0;
    const shift = surf - this.layers[0].cur.y1;
    for (const L of this.layers) L.m.position.y += shift;
    this.top.position.y = surf;
    // groundwater dots: fewer as water is pumped out
    const p = this.water.geometry.attributes.position;
    const aq = { 2: this.layers[2], 4: this.layers[4] };
    this.wseed.forEach((q, i) => {
      const L = aq[q.L], y0 = L.m.position.y - L.m.scale.y / 2, y1 = L.m.position.y + L.m.scale.y / 2;
      const keep = q.u > pump * 0.85;
      p.setXYZ(i, q.x + Math.sin(t * 0.5 + i) * 0.1, keep ? lerp(y0 + 0.2, y1 - 0.2, (q.u * 7.3) % 1) : -999, q.z);
    });
    p.needsUpdate = true;
    // wells
    const deep = this.layers[4].m.position.y;
    for (const w of this.wells) { const top = surf + 0.6, len = top - deep; w.p.scale.y = len; w.p.position.y = deep + len / 2; w.p.visible = (o.wells ?? 1) > 0.5; }
    const pumping = o.pumping ?? 0;
    for (const q of this.lift) {
      const w = this.wells[q.w], k = (q.ph + t * 0.5) % 1;
      q.m.visible = pumping > 0.01 && w.p.visible;
      q.m.position.set(w.x, lerp(deep, surf + 0.6, k), 6.95);
    }
    this.pipe.visible = (o.piped ?? 0) > 0.01; this.pipe.position.set(4, surf + 0.3, 6.2);
    // sea and flooding
    const tide = o.tide ?? 0;
    this.sea.position.y = -15 + tide;
    const depth = Math.max(0, tide - surf);
    this.flood.visible = depth > 0.02 && (o.wall ?? 0) < 0.5;
    this.flood.scale.y = depth; this.flood.position.y = surf + depth / 2;
    this.ruler.position.y = this.base0;
    this.ruler.scale.y = 1;
    for (const pp of this.people) pp.pose(t, depth > 0.3 ? 'shiver' : 'idle', 1);
    this.flock.update(t, 1);
    this.anchors.surface.y = surf + 6;
    return surf;
  }
}

export class SpongeScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x1b2230);
    s.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.1));
    const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(4, 8, 6); s.add(l);
    const table = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 8), M([0.55, 0.4, 0.28])); table.position.y = -0.2; s.add(table);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4), M([0.8, 0.85, 0.9])); tray.position.y = 0.15; s.add(tray);
    this.pool = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 3.6), M([0.2, 0.5, 0.95], { transparent: true, opacity: 0.85 })); s.add(this.pool);
    // sponge with pores
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#f2c84b'; g.fillRect(0, 0, 256, 256);
    const R = mulberry32(2);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(150,100,20,${0.3 + R() * 0.4})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 2 + R() * 6, 2 + R() * 5, R() * 3, 0, 7); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.spongeMat = new THREE.MeshLambertMaterial({ map: tex });
    this.sponge = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2.6), this.spongeMat); s.add(this.sponge);
    this.plate = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 3), M([0.6, 0.62, 0.66])); s.add(this.plate);
    this.drops = Array.from({ length: 24 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4f9bff })); s.add(m); return { m, x: -1.8 + (i % 8) * 0.5, z: -1 + Math.floor(i / 8) * 1, ph: (i * 0.37) % 1 }; });
    this.anchors = { sponge: new THREE.Vector3(0, 3, 0) };
  }
  // squeeze: 0..1 water drawn out; wet colour darkens with water
  update(t, squeeze = 0) {
    const h = 2 * (1 - 0.45 * squeeze);
    this.sponge.scale.y = h / 2; this.sponge.position.y = 0.3 + h / 2;
    this.plate.position.y = 0.3 + h + 0.13;
    this.spongeMat.color.setRGB(lerp(0.75, 1, squeeze), lerp(0.75, 1, squeeze), lerp(0.75, 1, squeeze));
    this.pool.position.y = 0.3 + 0.1 * squeeze; this.pool.scale.y = 0.2 + squeeze;
    for (const d of this.drops) { const k = (d.ph + t * 1.2) % 1; d.m.visible = squeeze > 0.05 && squeeze < 0.98; d.m.position.set(d.x, 0.3 - k * 0.1, d.z); }
  }
}
