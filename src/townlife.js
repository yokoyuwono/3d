// Everyday life in the coastal town: pedestrians, ojek, angkot, cats, chickens, birds,
// kids with a snowman and a campfire. `mode` makes everyone react to the story:
// 'calm' | 'heat' | 'snow' | 'night' | 'storm' | 'none'.
import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { Person, Flock, makeCat, makeChicken, makeMotorbike, makeAngkot, makeSnowman, makeFire } from './life.js';

export class TownLife {
  constructor(world) {
    this.w = world;
    const s = world.scene, R = mulberry32(2024), Y = world.terrainY;
    this.Y = Y;
    const xs = world.xStreets, zs = world.zStreets;
    // pedestrians on sidewalks (segments along x-streets and z-streets) + the beach road
    this.walkers = [];
    for (let i = 0; i < 70; i++) {
      const alongZ = R() < 0.55;
      const side = R() < 0.5 ? -1 : 1;
      const p = new Person(R);
      s.add(p.root);
      const w = { p, alongZ, side, dir: R() < 0.5 ? -1 : 1, sp: 0.9 + R() * 0.6, off: R() * 1000, ph: R() * 10, kind: R() };
      if (alongZ) { w.x = xs[Math.floor(R() * xs.length)] + side * 4.4; w.a = 24; w.b = 150; }
      else if (R() < 0.35) { w.z = 20 + side * 5.2; w.a = -140; w.b = 140; }
      else { w.z = zs[1 + Math.floor(R() * (zs.length - 1))] + side * 4.2; w.a = -118; w.b = 118; }
      this.walkers.push(w);
    }
    // ojek and angkot on the roads
    this.vehicles = [];
    for (let i = 0; i < 22; i++) {
      const bike = i < 18;
      const v = bike ? makeMotorbike(R) : makeAngkot(R);
      s.add(v);
      const alongZ = R() < 0.45;
      const lane = (R() < 0.5 ? -1 : 1) * (bike ? 1.6 : 1.8);
      const q = { v, bike, alongZ, lane, dir: lane > 0 ? 1 : -1, sp: bike ? 9 + R() * 5 : 6 + R() * 2, off: R() * 1000 };
      if (alongZ) { q.x = xs[Math.floor(R() * xs.length)] + lane; q.a = 20; q.b = 160; }
      else { q.z = (R() < 0.5 ? 20 : zs[1 + Math.floor(R() * (zs.length - 1))]) + lane; q.a = -200; q.b = 200; }
      this.vehicles.push(q);
    }
    // cats and chickens near houses
    this.cats = Array.from({ length: 8 }, () => { const c = makeCat(R); s.add(c); return { c, x: -100 + R() * 200, z: 28 + R() * 120, ph: R() * 6, yaw: R() * 6 }; });
    this.chickens = Array.from({ length: 12 }, (_, i) => { const c = makeChicken(R); s.add(c); const cx = -60 + (i % 4) * 40, cz = 24 + Math.floor(i / 4) * 2; return { c, x: cx + R() * 4, z: cz + R() * 3, ph: R() * 6 }; });
    // birds: swallows over town, white seabirds over the shore
    this.flock1 = new Flock(s, 16, { c: new THREE.Vector3(-10, 0, 80), r: 55, h: 32, color: [0.12, 0.12, 0.15], size: 1.6, seed: 3 });
    this.flock2 = new Flock(s, 10, { c: new THREE.Vector3(20, 0, -10), r: 40, h: 14, color: [0.95, 0.95, 0.95], size: 2.2, seed: 9 });
    // plaza group (kids + snowman) and a campfire with people huddled around
    this.plaza = new THREE.Vector3(world.monument ? 74 : 20, 0, world.monument ? 96 : 40);
    this.plaza.y = Y(this.plaza.x, this.plaza.z);
    this.snowman = makeSnowman();
    this.snowman.position.copy(this.plaza).add(new THREE.Vector3(-2, 0, 2));
    this.snowman.scale.setScalar(1.3);
    s.add(this.snowman);
    this.kids = Array.from({ length: 7 }, (_, i) => { const p = new Person(R, { scale: 0.68 + R() * 0.1 }); s.add(p.root); return { p, a: (i / 7) * Math.PI * 2, r: 2.8 + (i % 2) * 1.8, role: ['throw', 'cheer', 'lookUp', 'throw', 'wave', 'cheer', 'lookUp'][i] }; });
    this.firePos = new THREE.Vector3(-28, 0, 8); this.firePos.y = Y(-28, 8);
    this.fire = makeFire(); this.fire.position.copy(this.firePos); this.fire.scale.setScalar(1.6); s.add(this.fire);
    this.huddle = Array.from({ length: 9 }, (_, i) => { const p = new Person(R); s.add(p.root); return { p, a: (i / 9) * Math.PI * 2 + R() * 0.3, r: 2.4 + R() * 0.6, sit: i % 3 !== 0 }; });
    this.anchors = { plaza: this.plaza.clone().add(new THREE.Vector3(0, 4, 0)), fire: this.firePos.clone().add(new THREE.Vector3(0, 3.5, 0)) };
  }

  update(t, mode) {
    const Y = this.Y;
    const none = mode === 'none' || mode === 'storm';
    const snow = mode === 'snow', heat = mode === 'heat', night = mode === 'night';
    const wrap = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
    // pedestrians
    this.walkers.forEach((w, i) => {
      const vis = !none && !night && !(heat && i % 3 === 0);
      w.p.root.visible = vis;
      if (!vis) return;
      w.p.winter(snow);
      const sp = w.sp * (heat ? 0.55 : snow ? 0.6 : 1);
      const still = snow ? w.kind < 0.3 : heat ? w.kind < 0.25 : w.kind < 0.12;
      const d = still ? 0 : wrap(w.off + t * sp * w.dir, 0, w.b - w.a);
      const s = w.a + d;
      const x = w.alongZ ? w.x : s, z = w.alongZ ? s : w.z;
      w.p.root.position.set(x, Y(x, z), z);
      w.p.root.rotation.y = still ? w.ph : w.alongZ ? (w.dir > 0 ? 0 : Math.PI) : (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      let pose = 'walk';
      if (still) pose = snow ? 'lookUp' : heat ? 'fan' : (w.kind < 0.06 ? 'wave' : 'idle');
      else if (heat && w.kind > 0.55) pose = 'umbrella';
      else if (snow && w.kind > 0.85) pose = 'shiver';
      w.p.pose(t, pose, sp);
    });
    // vehicles
    for (const q of this.vehicles) {
      const vis = !none && !night && !(snow && !q.bike) && !(heat && q.off % 3 < 1);
      q.v.visible = vis;
      if (!vis) continue;
      const sp = q.sp * (snow ? 0.35 : heat ? 0.8 : 1);
      const s = q.a + wrap(q.off + t * sp * q.dir, 0, q.b - q.a);
      const x = q.alongZ ? q.x : s, z = q.alongZ ? s : q.z;
      q.v.position.set(x, Y(x, z) + 0.05, z);
      q.v.rotation.y = q.alongZ ? (q.dir > 0 ? 0 : Math.PI) : (q.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      q.v.rotation.z = snow && q.bike ? 0.08 * Math.sin(t * 3 + q.off) : 0;
      if (q.bike) { const r = q.v.userData.rider; r.winter(snow); r.pose(t, 'sit', 1); r.legs.forEach((l) => (l.rotation.x = -1.2)); r.arms.forEach((a) => a.rotation.set(-1.2, 0, 0)); }
    }
    // cats: wander, or sleep in the shade when hot; hide in snow/night
    for (const c of this.cats) {
      c.c.visible = !none && !snow && !night;
      if (!c.c.visible) continue;
      const wander = heat ? 0 : Math.sin(t * 0.3 + c.ph) * 3;
      c.c.position.set(c.x + wander, Y(c.x, c.z) + (heat ? -0.1 : 0), c.z);
      c.c.rotation.y = c.yaw + (heat ? 0 : Math.cos(t * 0.3 + c.ph) > 0 ? 0 : Math.PI);
      c.c.scale.y = heat ? 0.6 : 1;
      c.c.userData.tail.rotation.z = 0.5 * Math.sin(t * 3 + c.ph);
    }
    for (const c of this.chickens) {
      c.c.visible = !none && !snow && !night;
      if (!c.c.visible) continue;
      const x = c.x + Math.sin(t * 0.5 + c.ph) * 1.5, z = c.z + Math.cos(t * 0.4 + c.ph) * 1.2;
      c.c.position.set(x, Y(x, z), z);
      c.c.rotation.y = t * 0.5 + c.ph;
      c.c.userData.head.rotation.x = Math.max(0, Math.sin(t * 4 + c.ph)) * 0.9;
    }
    // birds: calm circling; scatter when the storm hits; few in snow
    this.flock1.update(t, mode === 'none' || night ? 0 : 1, mode === 'storm' ? 1 : 0);
    this.flock2.update(t, mode === 'none' || night || snow ? 0 : 1, mode === 'storm' ? 1 : 0);
    // kids and the snowman (snow only)
    this.snowman.visible = snow;
    this.kids.forEach((k, i) => {
      k.p.root.visible = snow;
      if (!snow) return;
      k.p.winter(true);
      const a = k.a + Math.sin(t * 0.3 + i) * 0.2;
      const x = this.plaza.x + Math.cos(a) * k.r, z = this.plaza.z + Math.sin(a) * k.r;
      k.p.root.position.set(x, Y(x, z), z);
      k.p.root.rotation.y = Math.atan2(this.plaza.x - x, this.plaza.z - z);
      k.p.pose(t, k.role, 1);
    });
    // campfire on the frozen night
    this.fire.visible = night;
    const f = this.fire.userData;
    f.light.intensity = night ? 3 + Math.sin(t * 13) * 0.6 + Math.sin(t * 7.3) * 0.4 : 0;
    f.flame.scale.set(1, 1 + 0.15 * Math.sin(t * 11), 1);
    f.core.scale.set(1, 1 + 0.2 * Math.sin(t * 15 + 1), 1);
    this.huddle.forEach((h) => {
      h.p.root.visible = night;
      if (!night) return;
      h.p.winter(true);
      const x = this.firePos.x + Math.cos(h.a) * h.r, z = this.firePos.z + Math.sin(h.a) * h.r;
      h.p.root.position.set(x, Y(x, z), z);
      h.p.root.rotation.y = Math.atan2(this.firePos.x - x, this.firePos.z - z);
      h.p.pose(t, h.sit ? 'sit' : 'shiver', 1);
    });
  }
}
