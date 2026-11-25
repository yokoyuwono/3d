// Terraced rice fields (sawah) that can freeze under snow, for ANDAI… Episode 2.
import * as THREE from 'three';
import { mulberry32, lerp } from './util.js';
import { particleMaterial } from './world.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class SawahScene {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color(0xa8cbe8);
    s.background = this.bg;
    s.fog = new THREE.Fog(0xa8cbe8, 60, 220);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556633, 1.3);
    s.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(-40, 60, 30);
    s.add(sun);
    const R = mulberry32(31);
    this.soilMat = new THREE.MeshLambertMaterial({ color: lin(0.45, 0.36, 0.24) });
    this.waterMat = new THREE.MeshLambertMaterial({ color: lin(0.45, 0.62, 0.7) });
    this.riceMat = new THREE.MeshLambertMaterial({ color: lin(0.35, 0.68, 0.22) });
    const plant = new THREE.ConeGeometry(0.18, 1.1, 4);
    plant.translate(0, 0.55, 0);
    const rows = [];
    // six terraces stepping down toward the camera
    for (let i = 0; i < 6; i++) {
      const y = i * 1.6, z = -i * 9;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(80, 1.6, 9), this.soilMat);
      wall.position.set(0, y - 0.8, z);
      const water = new THREE.Mesh(new THREE.BoxGeometry(78, 0.1, 8), this.waterMat);
      water.position.set(0, y + 0.02, z);
      s.add(wall, water);
      for (let x = -38; x < 38; x += 1.2) for (let r = -3.4; r < 3.6; r += 1.1) rows.push([x + (R() - 0.5) * 0.3, y, z + r + (R() - 0.5) * 0.3]);
    }
    this.rice = new THREE.InstancedMesh(plant, this.riceMat, rows.length);
    const d = new THREE.Object3D();
    rows.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.rotation.set((R() - 0.5) * 0.3, R() * 6, (R() - 0.5) * 0.3); d.scale.setScalar(0.8 + R() * 0.4); d.updateMatrix(); this.rice.setMatrixAt(i, d.matrix); });
    s.add(this.rice);
    // hills, a hut and coconut palms
    const hill = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshLambertMaterial({ color: lin(0.22, 0.45, 0.2) }));
    hill.scale.set(2, 0.5, 1); hill.position.set(0, -8, -120);
    s.add(hill);
    this.palmLeaves = new THREE.MeshLambertMaterial({ color: lin(0.22, 0.5, 0.18), side: THREE.DoubleSide });
    this.palms = [];
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 8, 6); trunkGeo.translate(0, 4, 0);
    const leaf = new THREE.PlaneGeometry(1.2, 4.6, 1, 3); leaf.translate(0, 2.3, 0); leaf.rotateX(-Math.PI / 2 + 0.5);
    for (const [x, z] of [[-26, 6], [-31, 2], [28, 4], [33, -1]]) {
      const g = new THREE.Group();
      const tr = new THREE.Mesh(trunkGeo, new THREE.MeshLambertMaterial({ color: lin(0.45, 0.36, 0.25) }));
      g.add(tr);
      const crown = new THREE.Group(); crown.position.y = 8;
      for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(leaf, this.palmLeaves); l.rotation.y = (k / 8) * Math.PI * 2; crown.add(l); }
      g.add(crown);
      g.position.set(x, 0, z);
      s.add(g);
      this.palms.push(crown);
    }
    // snow cover (fades in) and snowfall
    this.snowCover = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    this.snowCover.rotation.x = -Math.PI / 2; this.snowCover.position.set(0, 8.3, -30);
    const n = 2500;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(0.25), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.flakes = new THREE.Points(g, particleMaterial([1, 1, 1]));
    this.flakes.frustumCulled = false;
    this.seeds = Array.from({ length: n }, () => ({ x: R() * 100 - 50, y: R() * 40, z: R() * 80 - 60, sp: 1 + R(), ph: R() * 6 }));
    s.add(this.flakes);
    this.anchors = { rice: new THREE.Vector3(0, 4, -4), palm: new THREE.Vector3(-28, 11, 4) };
  }
  update(t, snow, scaleY) {
    const k = Math.min(1, snow);
    this.riceMat.color.copy(lin(0.35, 0.68, 0.22)).lerp(lin(0.78, 0.8, 0.74), k);
    this.waterMat.color.copy(lin(0.45, 0.62, 0.7)).lerp(lin(0.88, 0.94, 1.0), k);
    this.soilMat.color.copy(lin(0.45, 0.36, 0.24)).lerp(lin(0.85, 0.85, 0.88), k * 0.7);
    this.palmLeaves.color.copy(lin(0.22, 0.5, 0.18)).lerp(lin(0.55, 0.45, 0.3), k);
    for (const c of this.palms) c.children.forEach((l, i) => { l.rotation.x = lerp(0, 0.6, k); });
    this.bg.copy(new THREE.Color(0xa8cbe8)).lerp(new THREE.Color(0xd6dde4), k);
    this.scene.fog.color.copy(this.bg);
    const pos = this.flakes.geometry.attributes.position, al = this.flakes.geometry.attributes.aAlpha;
    this.seeds.forEach((s, i) => { pos.setXYZ(i, s.x + Math.sin(t + s.ph) * 1.5, 40 - ((s.y + t * s.sp * 3) % 40), s.z); al.setX(i, 0.9 * k); });
    pos.needsUpdate = al.needsUpdate = true;
    this.flakes.material.uniforms.uScale.value = scaleY;
    this.flakes.material.uniforms.uFogCol.value.copy(this.bg);
  }
}
