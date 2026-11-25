// Cut-away Earth for "a tunnel through the Earth": layered shells with a wedge removed
// (via clipping planes), a straight tunnel from Jakarta (top) to its antipode (bottom),
// and a little person falling through it. Plus a first-person tunnel view.
import * as THREE from 'three';
import { clamp, lerp, mulberry32 } from './util.js';
import { Person } from './life.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
export const R_EARTH = 10;
// layer radii in scene units (Earth radius 6,371 km = 10); crust exaggerated so it is visible
export const LAYERS = { crust: 10, mantle: 9.75, outer: 5.46, inner: 1.92 };

export class EarthCut {
  constructor(colorMap) {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x03050c);
    const R = mulberry32(31);
    const sp = [];
    for (let i = 0; i < 1800; i++) { const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(300); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));
    s.add(new THREE.AmbientLight(0x404050, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(30, 20, 40); s.add(sun);
    // wedge cut: remove the region x>0 & z>0 so the camera can look inside
    this.clip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
    const cm = (o) => Object.assign(o, { clippingPlanes: this.clip, clipIntersection: true, side: THREE.DoubleSide });
    this.earth = new THREE.Group();
    s.add(this.earth);
    const surface = new THREE.Mesh(new THREE.SphereGeometry(LAYERS.crust, 96, 48), new THREE.MeshLambertMaterial(cm({ map: colorMap })));
    // orient the map so Jakarta (-6.2, 106.8) is at the top (+y)
    const jk = new THREE.Vector3(Math.cos(-0.108) * Math.sin(1.864), Math.sin(-0.108), Math.cos(-0.108) * Math.cos(1.864)).normalize();
    surface.rotation.y = -Math.PI / 2;
    this.globeGroup = new THREE.Group();
    this.globeGroup.add(surface);
    this.globeGroup.quaternion.setFromUnitVectors(jk, new THREE.Vector3(0, 1, 0));
    this.earth.add(this.globeGroup);
    const shell = (r, color, emissive = 0) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), new THREE.MeshLambertMaterial(cm({ color: lin(...color), emissive: lin(...color), emissiveIntensity: emissive })));
      this.earth.add(m);
      return m;
    };
    shell(LAYERS.mantle, [0.85, 0.32, 0.1], 0.25);
    this.outer = shell(LAYERS.outer, [1.0, 0.62, 0.12], 0.7);
    this.inner = shell(LAYERS.inner, [1.0, 0.95, 0.75], 1.0);
    // glow around the inner core
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const gx = gc.getContext('2d'); const gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false }));
    this.glow.scale.setScalar(7);
    this.earth.add(this.glow);
    // tunnel (vertical through the centre) and the faller
    this.tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2 * LAYERS.crust + 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
    this.earth.add(this.tunnel);
    this.faller = new Person(R, { scale: 0.55 });
    this.earth.add(this.faller.root);
    this.trail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.8 }));
    this.earth.add(this.trail);
    // curved path for the "Earth's rotation pushes you into the wall" illustration
    const pts = [];
    for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push(new THREE.Vector3(Math.pow(k, 2.2) * 0.9, LAYERS.crust - k * 3.2, 0)); }
    this.coriolis = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 6, false), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    this.coriolis.visible = false;
    this.earth.add(this.coriolis);
    this.anchors = {
      top: new THREE.Vector3(0, LAYERS.crust + 1.4, 0), bottom: new THREE.Vector3(0, -LAYERS.crust - 0.6, 0),
      crust: new THREE.Vector3(6.9, 7.0, 0.3), mantle: new THREE.Vector3(5.0, 5.2, 0.3), outer: new THREE.Vector3(2.6, 3.6, 0.3), inner: new THREE.Vector3(0.9, 1.3, 0.3),
      faller: new THREE.Vector3(), wall: new THREE.Vector3(0.9, LAYERS.crust - 3.2, 0),
    };
  }
  // y: faller position along the tunnel (-10..10); trailFrom: start of the red trail
  update(t, y, o = {}) {
    this.faller.root.position.set(0, y - 0.5, 0);
    this.faller.root.rotation.set(0, t * 0.6, 0);
    this.faller.pose(t, o.pose || 'cheer', 1);
    const from = o.trailFrom ?? LAYERS.crust;
    this.trail.visible = o.trail !== false;
    this.trail.scale.y = Math.max(0.01, Math.abs(from - y));
    this.trail.position.set(0, (from + y) / 2, 0);
    this.glow.material.opacity = 0.7 + 0.3 * Math.sin(t * 3);
    this.outer.material.emissiveIntensity = 0.6 + 0.15 * Math.sin(t * 2);
    this.coriolis.visible = !!o.coriolis;
    this.faller.root.visible = !o.coriolis;
    this.anchors.faller.set(0, y + 1.2, 0);
  }
}

// ------------------------------------------------------------------ first-person fall
export class TunnelPOV {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x000000);
    this.u = { uTime: { value: 0 }, uDepth: { value: 0 }, uSpeed: { value: 1 } };
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 600, 48, 1, true), new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide,
      vertexShader: 'varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uTime, uDepth, uSpeed; varying vec2 vUv; varying float vY;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        void main(){
          float y = vY + uTime * 60.0 * uSpeed;
          float n = vn(vec2(vUv.x * 40.0, y * 0.08)) * 0.6 + vn(vec2(vUv.x * 120.0, y * 0.3)) * 0.4;
          // rock colours by depth: crust brown -> mantle red -> outer core molten orange -> inner core white-hot
          vec3 crust = vec3(0.35, 0.27, 0.2), mantle = vec3(0.6, 0.15, 0.05), outer = vec3(1.0, 0.55, 0.1), inner = vec3(1.0, 0.95, 0.8);
          vec3 c = mix(crust, mantle, smoothstep(0.02, 0.15, uDepth));
          c = mix(c, outer, smoothstep(0.5, 0.6, uDepth));
          c = mix(c, inner, smoothstep(0.78, 0.86, uDepth));
          c *= 0.55 + 0.6 * n;
          float streak = smoothstep(0.92, 1.0, vn(vec2(vUv.x * 60.0, y * 0.02)));
          c += streak * vec3(1.0, 0.8, 0.5) * 0.5 * uSpeed;
          float fade = smoothstep(-300.0, -40.0, vY);
          gl_FragColor = vec4(c * fade, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    s.add(tube);
    s.add(new THREE.AmbientLight(0xffffff, 1.2));
    this.light = new THREE.PointLight(0xffa050, 2.5, 60, 1.2); this.light.position.set(0, -10, 0); s.add(this.light);
    const R = mulberry32(4);
    this.person = new Person(R, { scale: 1 });
    this.person.root.position.set(0, -6, 0);
    this.person.root.rotation.x = Math.PI; // falling head-first, seen from above
    s.add(this.person.root);
  }
  update(t, depth, speed) {
    this.u.uTime.value = t; this.u.uDepth.value = depth; this.u.uSpeed.value = speed;
    this.person.pose(t, 'cheer', 1.4);
    this.person.root.rotation.z = 0.2 * Math.sin(t * 1.3);
    this.person.root.position.x = 0.4 * Math.sin(t * 0.9);
    this.light.color.setHSL(lerp(0.08, 0.13, depth), 1, 0.6);
  }
}
