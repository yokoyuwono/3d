// Antarctic ice-shelf edge with penguins and a calving block, and the "two glasses"
// demonstration (floating sea ice vs land ice) with a curious cat watching.
import * as THREE from 'three';
import { clamp, easeIn, lerp, mulberry32, fbm } from './util.js';
import { makePenguin, makeCat, Flock } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class IceSheet {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xbfd8ea);
    s.fog = new THREE.Fog(0xbfd8ea, 80, 420);
    s.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a8090, 1.4));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.0); sun.position.set(-60, 40, 80); s.add(sun);
    // sea
    this.seaU = { uTime: { value: 0 } };
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), new THREE.ShaderMaterial({
      uniforms: this.seaU,
      vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }',
      fragmentShader: `uniform float uTime; varying vec3 vW;
        void main(){ float w = sin(vW.x*0.15 + uTime*1.3)*0.5 + sin(vW.z*0.21 - uTime*1.1)*0.5; vec3 c = mix(vec3(0.03,0.12,0.2), vec3(0.08,0.24,0.34), 0.5 + 0.25*w);
          float f = smoothstep(80.0, 420.0, length(cameraPosition - vW)); c = mix(c, vec3(0.62,0.77,0.88), f); gl_FragColor = vec4(c,1.0);
          #include <colorspace_fragment>
        }`,
    }));
    sea.rotation.x = -Math.PI / 2;
    s.add(sea);
    // ice shelf: a long block with a noisy top and a streaked cliff face toward +z
    const cliffTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const g = c.getContext('2d'); g.fillStyle = '#dcecf7'; g.fillRect(0, 0, 256, 128);
      const R = mulberry32(2);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${120 + R() * 60},${170 + R() * 50},${210 + R() * 40},0.35)`; g.fillRect(R() * 256, 0, 1 + R() * 4, 128); }
      for (let y = 0; y < 128; y += 9) { g.fillStyle = 'rgba(150,190,220,0.25)'; g.fillRect(0, y, 256, 2); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const shelf = new THREE.BoxGeometry(400, 30, 200, 120, 1, 60);
    const p = shelf.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y > 0) p.setY(i, y + (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 6);
      if (z > 99) p.setZ(i, z + (fbm(x * 0.05, y * 0.05, 2) - 0.5) * 8);
    }
    shelf.computeVertexNormals();
    this.shelf = new THREE.Mesh(shelf, [new THREE.MeshLambertMaterial({ color: lin(0.86, 0.93, 0.98) }), new THREE.MeshLambertMaterial({ color: lin(0.86, 0.93, 0.98) }),
      new THREE.MeshLambertMaterial({ color: lin(0.95, 0.97, 1) }), new THREE.MeshLambertMaterial({ color: lin(0.86, 0.93, 0.98) }),
      new THREE.MeshLambertMaterial({ map: cliffTex }), new THREE.MeshLambertMaterial({ color: lin(0.86, 0.93, 0.98) })]);
    this.shelf.position.set(0, 9, -100);
    s.add(this.shelf);
    // calving block
    this.block = new THREE.Mesh(new THREE.BoxGeometry(26, 32, 12), new THREE.MeshLambertMaterial({ color: lin(0.88, 0.94, 0.99) }));
    this.blockBase = new THREE.Vector3(30, 8, 6);
    s.add(this.block);
    // icebergs
    const R = mulberry32(6);
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + R() * 8, 0), new THREE.MeshLambertMaterial({ color: lin(0.9, 0.95, 1) }));
      b.position.set(-150 + R() * 300, 0, 40 + R() * 160); b.scale.y = 0.5 + R() * 0.4; b.rotation.y = R() * 6;
      s.add(b);
    }
    // penguin colony on the shelf near the edge
    this.penguins = Array.from({ length: 26 }, (_, i) => {
      const pg = makePenguin();
      pg.scale.setScalar(1.6);
      const x = -40 + R() * 70, z = -18 - R() * 26;
      pg.position.set(x, 24.2 + (fbm(x * 0.02, (z + 100) * 0.02, 3) - 0.5) * 6, z);
      pg.rotation.y = R() * 6;
      s.add(pg);
      return { pg, x, z, ph: R() * 6, walk: R() < 0.4 };
    });
    this.flock = new Flock(s, 6, { c: new THREE.Vector3(0, 0, -20), r: 40, h: 50, color: [0.45, 0.4, 0.38], size: 3, seed: 13 });
    // splash particles
    this.splash = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true }));
    this.splashSeeds = Array.from({ length: 300 }, () => ({ a: R() * 6.28, v: 6 + R() * 14, u: 8 + R() * 16 }));
    this.splash.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(300 * 3), 3));
    s.add(this.splash);
    this.anchors = { colony: new THREE.Vector3(-5, 30, -28), cliff: new THREE.Vector3(-40, 30, 4), block: this.blockBase.clone() };
  }
  // calve: seconds since the block starts to fall (<0 = attached)
  update(t, calve = -1) {
    this.seaU.uTime.value = t;
    for (const q of this.penguins) {
      const wob = Math.sin(t * 7 + q.ph);
      q.pg.rotation.z = 0.12 * wob;
      if (q.walk) { q.pg.position.x = q.x + Math.sin(t * 0.25 + q.ph) * 4; q.pg.rotation.y = Math.cos(t * 0.25 + q.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; }
      q.pg.userData.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.2 + 0.25 * Math.max(0, Math.sin(t * 3 + q.ph)))));
    }
    this.flock.update(t, 1);
    const k = clamp(calve / 2.2);
    this.block.position.copy(this.blockBase).add(new THREE.Vector3(0, -24 * easeIn(k), 8 * k));
    this.block.rotation.x = 0.7 * easeIn(k);
    const sp = this.splash.geometry.attributes.position;
    const a = calve - 1.9;
    this.splash.visible = a > 0 && a < 2.5;
    if (this.splash.visible) this.splashSeeds.forEach((q, i) => sp.setXYZ(i, this.blockBase.x + Math.cos(q.a) * q.v * a, Math.max(0, q.u * a - 9.8 * a * a), this.blockBase.z + 12 + Math.sin(q.a) * q.v * a * 0.6));
    sp.needsUpdate = true;
    this.splash.material.opacity = clamp(1 - a / 2.5);
  }
}

// ------------------------------------------------------------------ two glasses
export class Glasses {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xf3ece2);
    s.add(new THREE.HemisphereLight(0xffffff, 0xb0a090, 1.3));
    const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(-20, 40, 30); s.add(d);
    const table = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 30), new THREE.MeshLambertMaterial({ color: lin(0.62, 0.44, 0.28) }));
    table.position.y = -1; s.add(table);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshLambertMaterial({ color: lin(0.93, 0.89, 0.82) }));
    wall.position.set(0, 25, -14); s.add(wall);
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xd8eef7, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const waterMat = new THREE.MeshLambertMaterial({ color: lin(0.3, 0.62, 0.9), transparent: true, opacity: 0.7 });
    const iceMat = new THREE.MeshLambertMaterial({ color: lin(0.88, 0.96, 1), transparent: true, opacity: 0.92 });
    this.glasses = [-8, 8].map((x) => {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.6, 13, 32, 1, true), glassMat); g.position.set(x, 6.5, 0); g.renderOrder = 3; s.add(g);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.6, 1, 32), waterMat); w.position.set(x, 0, 0); s.add(w);
      // initial level marker
      const mark = new THREE.Mesh(new THREE.TorusGeometry(4.05, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); mark.rotation.x = Math.PI / 2; mark.position.set(x, 7, 0); s.add(mark);
      return { x, w };
    });
    // left: floating cubes; right: ice resting on a grate above the glass (land ice)
    this.cubes = [[-9, 0.6], [-6.8, -1.1], [-8.2, 1.6]].map(([x, z]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), iceMat); c.position.set(x, 7, z); c.rotation.y = x; s.add(c); return c; });
    const grate = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.25, 24), new THREE.MeshLambertMaterial({ color: 0x777777, wireframe: true }));
    grate.position.set(8, 13.4, 0); s.add(grate);
    this.landIce = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 1), iceMat); this.landIce.position.set(8, 15.6, 0); this.landIce.scale.y = 0.6; s.add(this.landIce);
    this.drops = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), waterMat); s.add(m); return { m, ph: i / 6 }; });
    // the cat
    const R = mulberry32(8);
    this.cat = makeCat(R); this.cat.scale.setScalar(9); this.cat.position.set(-15, 0, 6); this.cat.rotation.y = 0.7; s.add(this.cat);
    this.anchors = { left: new THREE.Vector3(-8, 16, 0), right: new THREE.Vector3(8, 20, 0), mark: new THREE.Vector3(8, 7.4, 4) };
  }
  // melt: 0..1 for both glasses
  update(t, melt) {
    const lv0 = 7;
    // left: level fixed, cubes shrink
    this.glasses[0].w.scale.y = lv0; this.glasses[0].w.position.y = lv0 / 2;
    this.cubes.forEach((c, i) => { const sc = Math.max(0.02, 1 - melt * 1.05); c.scale.setScalar(sc); c.position.y = lv0 + 0.25 * sc + 0.15 * Math.sin(t * 1.5 + i); });
    // right: land ice shrinks, drops fall, level rises
    const sc = Math.max(0.02, 1 - melt);
    this.landIce.scale.set(sc, 0.6 * sc, sc);
    const lv = lv0 + 3.2 * melt;
    this.glasses[1].w.scale.y = lv; this.glasses[1].w.position.y = lv / 2;
    for (const d of this.drops) { const k = (t * 1.6 + d.ph) % 1; d.m.visible = melt > 0.02 && melt < 0.98; d.m.position.set(8 + Math.sin(d.ph * 9) * 1.5, lerp(13, lv, k), Math.cos(d.ph * 9) * 1.5); }
    this.cat.userData.tail.rotation.z = 0.6 * Math.sin(t * 2.5);
    this.cat.userData.head.rotation.y = 0.5 * Math.sin(t * 0.7);
    this.anchors.mark.set(8, lv + 0.6, 4);
  }
}
