import * as THREE from './lib/three.module.js';
import * as T from './toon.js';
import * as P from './paint.js';
import { SHOTS, TOTAL, shotAt, camAt, dofAt, LIGHTS, lightFor, actorsAt, worldAt, fxAt } from './story.js';

const W = 1080, H = 1920;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 1500);
const rx = (a) => a * Math.PI / 180;

// ---------- materials ----------
const grad = (() => { const d = new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 2, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
const texM = (c, rx_ = 1, ry_ = 1, color = '#ffffff') => toon({ map: P.tex(c, rx_, ry_), color });
const M = {
  plank: texM(P.planks(1), 1, 6), beam: texM(P.beam(2), 1, 2), beamDark: texM(P.beam(3, [28, 36, 30]), 1, 2),
  rot: texM(P.rotten(4), 1, 1), rotB: texM(P.rotten(14), 1, 1),
  stone: texM(P.stone(4), 1, 1), stoneMoss: texM(P.mossy(P.stone(4), 5, 1.2), 1, 1),
  grass: texM(P.grass(6), 40, 40), dirt: texM(P.dirt(7), 6, 30), plaster: texM(P.plaster(8), 1, 1), plaster2: texM(P.plaster(18, 28), 1, 1),
  roof: texM(P.roof(9), 2, 2), marble: texM(P.marble(10), 1, 1), marbleTop: toon({ color: '#ece2cf' }),
  trunk: toon({ color: '#6a4a32' }), cypress: toon({ color: '#3f6b36' }), pine: toon({ color: '#5c8a3c' }), bush: toon({ color: '#6c9a42' }),
  hill: toon({ color: '#7aa64c' }), hillFar: toon({ color: '#86ad60' }), mount: toon({ color: '#8fa7b8' }), snow: toon({ color: '#f4f6fa' }),
  iron: toon({ color: '#5c5a57' }), bronze: toon({ color: '#b08a4a' }), wood: toon({ color: '#7a5434' }), door: toon({ color: '#5a3a24' }),
  window: toon({ color: '#2b2430' }), red: toon({ color: '#b8282b' }),
};
M.banner = new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.banner()), alphaTest: 0.5, side: THREE.DoubleSide });
// helmet
const helmetIn = P.tex(P.helmetInside()); helmetIn.wrapS = helmetIn.wrapT = THREE.ClampToEdgeWrapping;
M.helmIn = new THREE.MeshToonMaterial({ gradientMap: grad, map: helmetIn, side: THREE.BackSide });
M.helmOut = toon({ color: '#8f8a7e' });

// ---------- ink / normal-depth contract ----------
const NOINK = 'noink'; // userData flag: never outlined (cards, fx, water handled specially)
const ndMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vec4 p4 = vec4(position,1.); vec3 n3 = normal;
#ifdef USE_INSTANCING
 p4 = instanceMatrix*p4; n3 = mat3(instanceMatrix)*n3;
#endif
 vN = normalize(normalMatrix*n3); vec4 mv = modelViewMatrix*p4; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*.5+.5, vD); }`,
  side: THREE.DoubleSide,
});
const cardNd = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } },
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if(texture2D(map,vUv).a<.5) discard; gl_FragColor=vec4(0.,0.,0.,vD); }`,
  side: THREE.DoubleSide,
});
const waterNd = new THREE.ShaderMaterial({
  vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vD; void main(){ gl_FragColor=vec4(.5,1.,.5,vD); }`,
});

// ---------- helpers ----------
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, opts = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = opts.cast ?? true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const uvScale = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
/** box with world-scaled UVs per face (texel density 1 tile per `t` metres) */
const tbox = (w, h, d, t = 2) => {
  const g = box(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / t, uv.getY(i) * dims[f][1] / t); }
  return g;
};

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float sunSize; varying vec3 vP;
    void main(){ float h = clamp(vP.y,0.,1.); vec3 c = mix(hor, top, pow(h, .55)); if(vP.y<0.) c = hor;
      float s = dot(normalize(vP), normalize(sunDir)); c += sunCol * (smoothstep(1.-sunSize, 1.-sunSize*.6, s) + .35*pow(max(s,0.), 24.)*step(.001,sunSize));
      gl_FragColor = vec4(c,1.); }`,
}));
sky.userData.sky = true; scene.add(sky);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog('#ffffff', 40, 600);

// ---------- village world + royal elephant ----------
const DECK = 0; // ground height (cards use it for contact blobs)
const waterU = { t: { value: 0 }, deep: { value: new THREE.Color('#2f6f8f') }, shal: { value: new THREE.Color('#5fa8bf') }, glint: { value: new THREE.Color('#e9f6ff') } };
const world = new THREE.Group(); scene.add(world);
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const eleSkinTex = () => { const [c, g] = cvs(512, 512), r = P.rng(77);
  g.fillStyle = '#8f929c'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < .5 ? '60,62,72' : '200,202,210'},${.05 + r() * .12})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 110; i++) { g.strokeStyle = `rgba(48,50,60,${.25 + r() * .3})`; g.lineWidth = 1 + r() * 2.2; g.beginPath(); const x = r() * 512, y = r() * 512, l = 30 + r() * 70; g.moveTo(x, y); g.bezierCurveTo(x + l * .3, y + 8, x + l * .7, y - 8, x + l, y + r() * 10 - 5); g.stroke(); }
  return c; };
const blanketTex = () => { const [c, g] = cvs(512, 256);
  g.fillStyle = '#b3252f'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#e8b43a'; g.fillRect(0, 0, 512, 26); g.fillRect(0, 230, 512, 26); g.fillStyle = '#2f7d78'; g.fillRect(0, 30, 512, 8); g.fillRect(0, 218, 512, 8);
  for (let i = 0; i < 16; i++) { const x = i * 32 + 16; g.fillStyle = '#e8b43a'; g.beginPath(); g.moveTo(x, 100); g.lineTo(x + 14, 128); g.lineTo(x, 156); g.lineTo(x - 14, 128); g.fill(); g.fillStyle = '#2f7d78'; g.beginPath(); g.arc(x, 128, 5, 0, 7); g.fill(); g.fillStyle = '#e8b43a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 16 * (k < 2 ? 1 : -1) * 0 + (k - 1.5) * 7, 70 + (k % 2) * 6, 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(x + (k - 1.5) * 7, 186 + (k % 2) * 6, 2.6, 0, 7); g.fill(); } }
  return c; };
M.elephant = texM(eleSkinTex(), 3, 2); M.ivory = toon({ color: '#f6eed8' }); M.gold = toon({ color: '#e6b533' }); M.black = toon({ color: '#1a1418' });
M.nail = toon({ color: '#ebe1c8' }); M.redc = toon({ color: '#b3252f' }); M.pink = toon({ color: '#dd9fa6' });
M.blanket = new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(blanketTex()), side: THREE.DoubleSide });
M.plaza = texM(P.dirt(7), 9, 9); M.sand = toon({ color: '#e7b878' }); M.lime = toon({ color: '#f4ebd8' }); M.maroon = toon({ color: '#9b3a2e' });
M.thatch = toon({ color: '#d2b062' }); M.clay = toon({ color: '#c99a6a' }); M.pot = toon({ color: '#c0562f' }); M.leaf = toon({ color: '#3f8a3a' }); M.leaf2 = toon({ color: '#5aa23f' }); M.banyan = toon({ color: '#2f6e34' });
M.orange = toon({ color: '#f08a1c' });

// ground
const grassBig = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), (() => { const m = M.grass.clone(); m.map = M.grass.map.clone(); m.map.repeat.set(70, 70); m.map.needsUpdate = true; return m; })());
grassBig.rotation.x = -Math.PI / 2; grassBig.position.y = -0.04; grassBig.receiveShadow = true; world.add(grassBig);
M.plaza.color.set('#b7c98a'); const plaza = new THREE.Mesh(new THREE.CircleGeometry(36, 64), M.plaza); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0; plaza.receiveShadow = true; world.add(plaza);

// grass tufts (reference study: dense blades give the ground life and depth) - instanced, deterministic
{ const N = 26000, g = new THREE.ConeGeometry(0.028, 1, 3); g.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(g, toon({ color: '#ffffff' }), N), d = new THREE.Object3D(), col = new THREE.Color();
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const cols = ['#4f9a3a', '#63ad40', '#7cbc48', '#3f8a35', '#8fc455'];
  for (let i = 0; i < N; i++) { const a = rnd() * 6.283, r = 2 + Math.pow(rnd(), 0.8) * 26, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    if (cx > -4 && cx < 6 && cz > -2.2 && cz < 2.4) { i--; continue; } // keep the elephant's footprint clear
    d.position.set(cx + (rnd() - 0.5) * 0.4, 0, cz + (rnd() - 0.5) * 0.4); d.rotation.set((rnd() - 0.5) * 0.5, rnd() * 6.283, (rnd() - 0.5) * 0.5);
    const h = 0.1 + rnd() * 0.2; d.scale.set(1, h, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.set(cols[(rnd() * cols.length) | 0])); }
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; world.add(im); }

// temple (shikhara style) at the back of the plaza
const TEMPLE = new THREE.Vector3(0, 0, -19);
const temple = new THREE.Group(); temple.position.copy(TEMPLE); world.add(temple);
add(tbox(18, 0.7, 13, 2), M.stone, 0, 0.35, 0, temple);
for (let i = 0; i < 3; i++) add(tbox(7 - i * 0.2, 0.22, 1.1, 1), M.stone, 0, 0.11 + i * 0.22, 7.6 - i * 0.55 + 0.4, temple);
add(tbox(10, 4.4, 7, 2), M.lime, 0, 2.9, 1.8, temple);                               // mandapa hall
add(tbox(10.6, 0.5, 7.6, 2), M.maroon, 0, 5.3, 1.8, temple);                          // cornice
add(tbox(5, 0.4, 5, 2), M.sand, 0, 5.75, 1.8, temple);
for (const x of [-4.2, -1.4, 1.4, 4.2]) { add(new THREE.CylinderGeometry(0.32, 0.38, 4.4, 12), M.sand, x, 2.9, 5.7, temple); add(tbox(0.9, 0.3, 0.9, 1), M.maroon, x, 5.15, 5.7, temple); }
add(tbox(10, 0.5, 1, 2), M.maroon, 0, 5.3, 5.7, temple);
add(box(2.2, 3.0, 0.2), toon({ color: '#3d2418' }), 0, 2.2, 5.35, temple, { cast: false });
add(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: '#3d2418' }), 0, 3.7, 5.35, temple, { cast: false });
const towerW = [5.2, 4.5, 3.8, 3.1, 2.4, 1.7];
let ty = 6.0; towerW.forEach((w, i) => { add(tbox(w, 1.15, w, 2), i % 2 ? M.lime : M.sand, 0, ty + 0.57, -1.4, temple); add(tbox(w + 0.5, 0.22, w + 0.5, 2), M.maroon, 0, ty + 1.26, -1.4, temple); ty += 1.37; });
add(new THREE.SphereGeometry(0.95, 16, 10), M.sand, 0, ty + 0.5, -1.4, temple);
add(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), M.gold, 0, ty + 1.8, -1.4, temple);
const tflag = add(new THREE.PlaneGeometry(1.2, 0.7, 6, 1), toon({ color: '#f08a1c', side: THREE.DoubleSide }), 0.65, ty + 2.35, -1.4, temple, { cast: false });
tflag.userData.base = tflag.geometry.attributes.position.array.slice();
// pillars with marigold garlands
const garland = (x0, x1, y, z, parent, n = 16, sag = 0.5) => { for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t; add(new THREE.SphereGeometry(0.11, 8, 6), i % 3 ? M.orange : toon({ color: '#f5c020' }), x, y - Math.sin(t * Math.PI) * sag, z, parent, { cast: false }); } };
garland(-4.2, -1.4, 4.9, 6.2, temple); garland(-1.4, 1.4, 4.9, 6.2, temple); garland(1.4, 4.2, 4.9, 6.2, temple);

// houses
const houses = [];
const house = (x, z, w, d, h, rot, mat = M.plaster, roofMat = M.roof) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  add(tbox(w, h, d, 2), mat, 0, h / 2, 0, g);
  const rf = add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.5, 1.8, 4), roofMat, 0, h + 0.9, 0, g); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414);
  add(box(0.9, 1.8, 0.1), M.door, 0, 0.9, d / 2 + 0.03, g, { cast: false });
  for (const s of [-1, 1]) add(box(0.6, 0.7, 0.1), M.window, s * w * 0.3, h * 0.62, d / 2 + 0.03, g, { cast: false });
  houses.push(g); return g;
};
const rh = P.rng(12);
[[-24, -8], [-30, 6], [-22, 14], [-36, -14], [-38, 2], [-42, 16], [24, -9], [30, 7], [22, 15], [36, -13], [40, 3], [44, 17], [-14, -22], [16, -23], [-30, -24], [32, -26]].forEach(([x, z], i) =>
  house(x, z, 4 + rh() * 3, 4 + rh() * 2.5, 3.0 + rh() * 1.6, Math.atan2(-x, -z) * 0.6 + (rh() - 0.5) * 0.5, i % 2 ? M.plaster : M.plaster2));
// the six men's hut
const hut = new THREE.Group(); hut.position.set(-10, 0, -4.5); world.add(hut);
add(new THREE.CylinderGeometry(2.4, 2.5, 2.3, 20), M.clay, 0, 1.15, 0, hut);
add(new THREE.ConeGeometry(3.3, 2.0, 20), M.thatch, 0, 3.3, 0, hut);
add(box(1.0, 1.7, 0.12), M.door, 0, 0.85, 2.45, hut, { cast: false });
add(new THREE.SphereGeometry(0.42, 12, 10), M.pot, 2.2, 0.42, 1.9, hut); add(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 10), M.pot, 2.2, 0.95, 1.9, hut);
add(new THREE.SphereGeometry(0.36, 12, 10), M.pot, -2.3, 0.36, 1.9, hut);
add(tbox(2.2, 0.25, 1.1, 1), M.wood, 4.2, 0.45, 1.0, hut); for (const [x, z] of [[-1, -.45], [1, -.45], [-1, .45], [1, .45]]) add(box(0.14, 0.4, 0.14), M.wood, 4.2 + x, 0.2, 1.0 + z, hut);
// trees
const palm = (x, z, h = 7) => { const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g); const t = add(new THREE.CylinderGeometry(0.2, 0.34, h, 8), M.trunk, 0, h / 2, 0, g); t.rotation.z = 0.1;
  for (let i = 0; i < 8; i++) { const lf = add(new THREE.ConeGeometry(0.4, 3.0, 4), i % 2 ? M.leaf : M.leaf2, 0, h + 0.2, 0, g); lf.scale.z = 0.3; lf.rotation.set(0, i * 0.785, 1.1); lf.position.set(Math.cos(i * 0.785) * 1.1 + 0.4, h - 0.1, Math.sin(i * 0.785) * -1.1); lf.rotation.y = i * 0.785; lf.rotation.z = 1.2; } return g; };
const banyan = (x, z, s = 1) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); add(new THREE.CylinderGeometry(0.55, 0.9, 4, 10), M.trunk, 0, 2, 0, g);
  [[0, 5.2, 0, 2.8], [-2.2, 4.6, 0.6, 2.2], [2.3, 4.8, -0.4, 2.3], [0.6, 6.3, 0.5, 2.1], [-0.8, 4.3, -1.8, 2.0]].forEach(([a, b, c, r], i) => { const s_ = add(new THREE.SphereGeometry(r, 14, 10), i % 2 ? M.banyan : M.leaf, a, b, c, g); s_.scale.y = 0.75; }); return g; };
const rt = P.rng(44);
banyan(14, -9, 1.2); banyan(-17, -14, 1.1); banyan(28, -18, 1.3); banyan(-30, -16, 1.2);
for (let i = 0; i < 30; i++) { const a = rt() * 6.28, d = 30 + rt() * 70; const x = Math.cos(a) * d, z = Math.sin(a) * d - 10; if (z > 18 && Math.abs(x) < 20) continue; (i % 4 ? palm : banyan)(x, z, i % 4 ? 6 + rt() * 3 : 0.8 + rt() * 0.5); }
// bunting across the plaza
const bunting = new THREE.Group(); world.add(bunting);
for (const x of [-11, 11]) add(new THREE.CylinderGeometry(0.07, 0.09, 5.4, 8), M.wood, x, 2.7, -8, world);
{ const cols = ['#f08a1c', '#d9467a', '#3ea35a', '#f5c020', '#3a8fd0']; for (let i = 0; i < 17; i++) { const t = i / 16, x = -11 + 22 * t, y = 5.2 - Math.sin(t * Math.PI) * 0.9; const tri = add(new THREE.CircleGeometry(0.34, 3), toon({ color: cols[i % 5], side: THREE.DoubleSide }), x, y - 0.3, -8, bunting, { cast: false }); tri.rotation.z = -Math.PI / 2; tri.userData.sway = i; } 
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([-11 + 22 * t, 5.2 - Math.sin(t * Math.PI) * 0.9, -8]); } for (let i = 0; i < 16; i++) { const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]); const m = add(new THREE.CylinderGeometry(0.02, 0.02, a.distanceTo(b), 4), M.wood, (a.x + b.x) / 2, (a.y + b.y) / 2, -8, bunting, { cast: false }); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2; } }
// hills + mountains + clouds
for (let i = 0; i < 16; i++) { const a = rt() * Math.PI * 2, d = 200 + rt() * 160; const h = add(new THREE.SphereGeometry(40 + rt() * 40, 20, 10), i % 2 ? M.hill : M.hillFar, Math.cos(a) * d, -14, Math.sin(a) * d, world, { cast: false }); h.scale.y = 0.5 + rt() * 0.3; }
for (let i = 0; i < 12; i++) { const a = rt() * Math.PI * 2, d = 560 + rt() * 200, hh = 90 + rt() * 100, r_ = 110 + rt() * 70; const g = new THREE.Group(); g.position.set(Math.cos(a) * d, -5, Math.sin(a) * d); world.add(g); add(new THREE.ConeGeometry(r_, hh, 7), M.mount, 0, hh / 2, 0, g, { cast: false }); }
const clouds = [];
{ const r = P.rng(90);
  for (let i = 0; i < 14; i++) {
    const [c, g2] = cvs(600, 400); const pen = new T.Pen(g2); pen.ol = 0;
    pen.g.translate(300, 200); pen.g.scale(1.4, 1.2); pen.g.translate(-300, -200); T.fxCloud(pen, i + 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.667), new THREE.MeshBasicMaterial({ map: P.tex(c), transparent: true, fog: false, depthWrite: false }));
    const a = r() * Math.PI * 2, d = 650 + r() * 250; m.position.set(Math.cos(a) * d, 120 + r() * 160, Math.sin(a) * d); m.scale.setScalar(160 + r() * 140);
    m.userData.ndSkip = true; m.renderOrder = -1; scene.add(m); clouds.push(m);
  } }

// ---------- the royal elephant (faces +x; +z is the near side) ----------
const sph = (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);
const chain = (pts, r0, r1, mat, parent) => { const grp = new THREE.Group(); parent.add(grp);
  for (let i = 0; i < pts.length - 1; i++) { const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    const ra = r0 + (r1 - r0) * t0, rb = r0 + (r1 - r0) * t1;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, a.distanceTo(b) * 1.03, 12, 1), mat); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = m.receiveShadow = true; grp.add(m);
    const j = new THREE.Mesh(new THREE.SphereGeometry(ra, 12, 8), mat); j.position.copy(a); j.castShadow = true; grp.add(j); }
  const e = new THREE.Mesh(new THREE.SphereGeometry(r1, 10, 8), mat); e.position.set(...pts[pts.length - 1]); grp.add(e); return grp; };
const ele = (() => {
  const root = new THREE.Group(); scene.add(root);
  const body = add(sph(1), M.elephant, 0, 2.15, 0, root); body.scale.set(2.1, 1.4, 1.3);
  add(sph(1), M.elephant, -1.2, 2.2, 0, root).scale.set(1.1, 1.2, 1.2);
  const head = add(sph(1), M.elephant, 2.15, 2.75, 0, root); head.scale.set(1.0, 1.1, 0.95);
  for (const s of [-1, 1]) add(sph(0.5, 16, 12), M.elephant, 2.4, 3.45, s * 0.4, root).scale.set(1, 0.9, 1);
  const blk = add(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, 1.0), M.blanket, -0.1, 2.15, 0, root); blk.scale.set(1.85, 1.45, 1.36);
  // royal forehead plate + beads
  add(sph(1, 16, 12), M.redc, 3.0, 3.18, 0, root).scale.set(0.11, 0.58, 0.48);
  add(sph(1, 16, 12), M.gold, 3.04, 3.2, 0, root).scale.set(0.1, 0.44, 0.35);
  for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; add(sph(0.06, 8, 6), M.gold, 3.1 - Math.abs(a) * 0.1, 2.95 + Math.cos(a) * 0.12, a * 0.55, root); }
  // eyes (+/-z) 
  for (const s of [-1, 1]) { add(sph(0.1, 10, 8), M.black, 2.72, 2.98, s * 0.74, root); add(sph(0.03, 6, 6), toon({ color: '#ffffff' }), 2.76, 3.02, s * 0.8, root); }
  // legs
  const legs = [];
  for (const [x, z, ph] of [[1.3, 0.8, 0], [1.3, -0.8, 0.5], [-1.3, 0.8, 0.5], [-1.3, -0.8, 0]]) {
    const g = new THREE.Group(); g.position.set(x, 1.7, z); root.add(g);
    add(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 14), M.elephant, 0, -0.75, 0, g);
    add(new THREE.CylinderGeometry(0.5, 0.54, 0.22, 14), M.elephant, 0, -1.6, 0, g);
    for (const a of [-0.6, 0, 0.6]) add(sph(0.11, 8, 6), M.nail, 0.5 * Math.cos(a), -1.62, 0.5 * Math.sin(a), g).scale.set(0.9, 0.7, 1.2);
    const an = add(new THREE.TorusGeometry(0.47, 0.06, 8, 20), M.gold, 0, -1.25, 0, g); an.rotation.x = Math.PI / 2;
    legs.push({ g, ph });
  }
  // trunk
  const N = 9, trunk = []; let par = root;
  for (let i = 0; i < N; i++) {
    const r0 = 0.52 - i * 0.037, r1 = 0.52 - (i + 1) * 0.037, len = 0.34;
    const g = new THREE.Group(); if (i === 0) g.position.set(2.95, 2.45, 0); else g.position.set(len, 0, 0); par.add(g);
    const cg = new THREE.CylinderGeometry(r1, r0, len, 12, 1); cg.rotateZ(-Math.PI / 2); cg.translate(len / 2, 0, 0); add(cg, M.elephant, 0, 0, 0, g);
    add(sph(r0, 12, 8), M.elephant, 0, 0, 0, g);
    if (i === N - 1) add(sph(0.2, 10, 8), M.pink, len, -0.02, 0, g).scale.set(0.9, 0.8, 0.9);
    trunk.push({ g, len }); par = g;
  }
  // tusks
  const tuskPts = [[2.95, 2.05, 0.5], [3.45, 1.7, 0.72], [3.95, 1.68, 0.92], [4.35, 1.95, 1.0], [4.6, 2.4, 0.95], [4.72, 2.8, 0.9]];
  for (const s of [-1, 1]) { const pts = tuskPts.map(([x, y, z]) => [x, y, z * s]); chain(pts, 0.17, 0.03, M.ivory, root); chain([pts[0], [pts[0][0] + 0.28, pts[0][1] - 0.12, pts[0][2] + 0.06 * s]], 0.2, 0.19, M.gold, root); }
  // ears
  const ears = [];
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(1.85, 3.05, s * 0.9); root.add(g);
    const o = add(sph(1, 20, 14), M.elephant, -0.85, -0.2, 0, g); o.scale.set(0.95, 1.05, 0.09);
    add(sph(1, 20, 14), M.pink, -0.85, -0.2, 0, g).scale.set(0.78, 0.88, 0.097);
    ears.push({ g, s }); }
  // tail
  const tail = []; { let p2 = root; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); if (i === 0) g.position.set(-2.2, 2.75, 0); else g.position.set(0.36, 0, 0); p2.add(g);
    const cg = new THREE.CylinderGeometry(0.04 + (4 - i) * 0.006, 0.075 - i * 0.008, 0.36, 8); cg.rotateZ(-Math.PI / 2); cg.translate(0.18, 0, 0); add(cg, M.elephant, 0, 0, 0, g); add(sph(0.075 - i * 0.008, 8, 6), M.elephant, 0, 0, 0, g);
    if (i === 4) for (let k = 0; k < 6; k++) { const c = add(new THREE.ConeGeometry(0.05, 0.38, 5), M.black, 0.36, 0, 0, g); c.rotation.set(0, k * 1.05, -Math.PI / 2 + (k % 3 - 1) * 0.35); c.position.set(0.55, (k % 3 - 1) * 0.05, ((k % 2) - 0.5) * 0.12); }
    tail.push({ g }); p2 = g; } }
  return { root, body, legs, trunk, ears, tail, N };
})();
const TRUNK_HANG = [-1.15, -0.25, -0.1, -0.05, 0.02, 0.08, 0.14, 0.2, 0.3], TRUNK_UP = [0.95, 0.3, 0.3, 0.32, 0.32, 0.28, 0.25, 0.2, 0.15];
function eleState(E, f) {
  ele.root.scale.setScalar(0.8); ele.root.position.set(E.x, Math.abs(Math.sin(E.walk * Math.PI * 2)) * 0.05 * E.walkAmp, E.z); ele.root.rotation.y = E.ry || 0;
  ele.legs.forEach(({ g, ph }) => { const a = Math.sin((E.walk + ph) * Math.PI * 2); g.rotation.z = E.walkAmp * 0.4 * a; g.position.y = 1.7 + E.walkAmp * Math.max(0, Math.cos((E.walk + ph) * Math.PI * 2)) * 0.12; });
  ele.trunk.forEach(({ g }, i) => { const k = i / (ele.N - 1);
    g.rotation.z = TRUNK_HANG[i] + (TRUNK_UP[i] - TRUNK_HANG[i]) * E.raise + E.tswing * 0.1 * Math.sin(f * 0.09 - i * 0.55) * (0.3 + k) + (E.curl || 0) * 0.08 * k;
    g.rotation.y = E.snake * 0.42 * Math.sin(f * 0.2 - i * 0.8) * (0.4 + k); });
  ele.ears.forEach(({ g, s }, i) => { const fl = E.ear * (0.5 + 0.5 * Math.sin(f * 0.13 + i * 1.7)); g.rotation.y = s * (0.22 + fl * 0.42); });
  ele.tail.forEach(({ g }, i) => { g.rotation.z = -0.15 - (i ? 0.1 : 0.9) + E.tail * 0.35 * Math.sin(f * 0.1 + i * 0.55) * (0.5 + i * 0.25); g.rotation.y = E.tail * 0.3 * Math.sin(f * 0.07 + i * 0.7 + 1); });
  ele.body.scale.y = 1.4 * (1 + 0.012 * Math.sin(f * 0.07));
}
const _v = new THREE.Vector3();
const probes = {
  flank: () => ele.root.localToWorld(new THREE.Vector3(-0.4, 1.75, 1.22)),
  tusk: () => ele.root.localToWorld(new THREE.Vector3(4.35, 1.95, 1.0)),
  trunk: () => ele.trunk[3].g.getWorldPosition(new THREE.Vector3()),
  leg: () => ele.legs[0].g.localToWorld(new THREE.Vector3(0, -0.55, 0.42)),
  ear: () => ele.ears[1].g.localToWorld(new THREE.Vector3(-0.8, -1.12, 0.1)),
  tail: () => ele.tail[4].g.localToWorld(new THREE.Vector3(0.45, 0, 0)),
};
const makeEnv = () => ({ p: (n) => { const v = probes[n](); return [v.x, v.y, v.z]; } });

// ---------- cards ----------
const CW = 2000, CH = 2000, CM = 2.25; // card canvas: design space is 1000x1000 (character centred, 200px margin each side so reaching arms never clip)
const cardGeo = new THREE.PlaneGeometry(CM, CM); cardGeo.translate(0, CM / 2 - CM * 0.025, 0);
const blobTex = P.tex(P.radial('20,14,30', 0.6));
class Card {
  constructor(scale = 1) {
    [this.c, this.g] = (() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return [c, c.getContext('2d')]; })();
    this.t = new THREE.CanvasTexture(this.c); this.t.colorSpace = THREE.SRGBColorSpace; this.t.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(cardGeo, this.mat); this.mesh.userData.nd = cardNd(this.t); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.t, alphaTest: 0.5 });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: true }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.userData.ndSkip = true; this.blob.renderOrder = 1;
    scene.add(this.mesh); scene.add(this.blob); this.key = ''; this.mesh.visible = this.blob.visible = false;
  }
  draw(key, fn) {
    if (key === this.key) return; this.key = key;
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH); g.setTransform(CW / 1000, 0, 0, CH / 1000, 0, 0); g.translate(200, 0);
    const p = new T.Pen(g); fn(p); this.t.needsUpdate = true;
  }
}
const cards = []; const getCard = (i) => cards[i] || (cards[i] = new Card());

// ---------- render targets & post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtNd = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtInk = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsGeo = new THREE.PlaneGeometry(2, 2);
const fs = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(fsGeo, mat)); return s; };
const inkU = { col: { value: rtColor.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, px: { value: 1.6 }, fogCol: { value: new THREE.Color() },
  sat: { value: 1.08 }, lift: { value: new THREE.Color(0, 0, 0) }, gain: { value: new THREE.Color(1, 1, 1) }, vig: { value: 0.22 }, flash: { value: 0 } };
const inkScene = fs(new THREE.ShaderMaterial({ uniforms: inkU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D col, nd; uniform vec2 res; uniform float px, sat, vig, flash; uniform vec3 fogCol, lift, gain; varying vec2 vUv;
  float edgeAt(vec2 uv, float r){
    vec4 c = texture2D(nd, uv); if (dot(c.rgb,c.rgb) < .01) return 0.; float d = c.a; vec3 n = c.rgb*2.-1.;
    float e = 0.; float rr = r * clamp(7./d, .62, 1.25);
    for (int i=0;i<16;i++){ float a = float(i)*.785398 + (i>7 ? .39 : 0.); float k = i>7 ? .5 : 1.;
      vec2 o = vec2(cos(a), sin(a))*rr*k/res; vec4 s = texture2D(nd, uv+o);
      float ds = s.a; bool card = dot(s.rgb,s.rgb) < .01;
      if (card && ds > 0.) continue;            // character cards: never outlined by the world ink
      if (card) ds = 1e4;                        // sky
      vec3 ns = s.rgb*2.-1.;
      e = max(e, smoothstep(.006, .02, (ds - d)/d));                           // depth jump, near side only
      if (!card && abs(ds-d)/d < .06) e = max(e, smoothstep(.88, .72, dot(n, ns)) * .9); // crease
    }
    return e * (1. - smoothstep(140., 520., d)*.8);
  }
  void main(){
    vec3 c = texture2D(col, vUv).rgb;
    float e = edgeAt(vUv, px);
    c = mix(c, vec3(.012,.01,.014), e);
    if (flash < -0.5) c = vec3(e);
    float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, sat);
    c = c*gain + lift;
    vec2 q = vUv-.5; c *= 1. - vig*dot(q*vec2(1.,.75), q*vec2(1.,.75))*2.2;
    c = mix(c, vec3(1.), flash);
    gl_FragColor = vec4(c,1.); }` }));
const dofU = { src: { value: rtInk.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, focus: { value: 5 }, cinf: { value: 0 }, near: { value: 1 } };
const dofScene = fs(new THREE.ShaderMaterial({ uniforms: dofU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D src, nd; uniform vec2 res; uniform float focus, cinf, near; varying vec2 vUv;
  float coc(vec2 uv){ float d = texture2D(nd, uv).a; if (d <= 0.) d = 2000.; float k = 1. - focus/d; return k > 0. ? cinf*k : min(-k*cinf*near, cinf*1.4); }
  void main(){
    float c0 = coc(vUv);
    if (cinf < .5 || c0 < .6) { gl_FragColor = linearToOutputTexel(vec4(texture2D(src, vUv).rgb, 1.)); return; }
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i=0;i<48;i++){ float fi = float(i); float r = sqrt((fi+.5)/48.); float a = fi*2.39996;
      vec2 o = vec2(cos(a), sin(a))*r*c0/res; float cs = coc(vUv+o);
      float w = smoothstep(r*c0-1.5, r*c0+.5, cs + .5);
      acc += texture2D(src, vUv+o).rgb*w; wsum += w; }
    gl_FragColor = linearToOutputTexel(vec4(acc/max(wsum,1e-3), 1.)); }` }));
// final copy with sRGB handled by the renderer output (we render to screen with linear->sRGB in the shader chunk)
dofScene.children[0].material.toneMapped = false;

// ---------- per-frame state ----------
const tmpV = new THREE.Vector3();
function applyLight(L, f) {
  hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemi;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  scene.fog.color.set(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  skyU.top.value.set(L.skyTop); skyU.hor.value.set(L.skyHor); skyU.sunCol.value.set(L.sunDisc || '#000'); skyU.sunSize.value = L.sunSize || 0;
  inkU.sat.value = L.sat; inkU.gain.value.set(L.gain || '#ffffff'); inkU.lift.value.set(L.lift || '#000000');
  waterU.deep.value.set(L.waterDeep); waterU.shal.value.set(L.waterShal); waterU.glint.value.set(L.glint);
}
function placeSun(L, focus) {
  // sun direction from azimuth/elevation in world space
  const az = rx(L.az), el = rx(L.el); tmpV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  skyU.sunDir.value.copy(tmpV);
  sun.position.copy(focus).addScaledVector(tmpV, 80); sun.target.position.copy(focus);
  const ext = L.shadowExt || 30, sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
}

function worldState(W, f) {
  eleState(W.E, f);
  bunting.children.forEach((m) => { if (m.userData.sway !== undefined) m.rotation.x = Math.sin(f * 0.12 + m.userData.sway) * 0.18; });
  const pa = tflag.geometry.attributes.position, base = tflag.userData.base;
  for (let i = 0; i < pa.count; i++) { const x = base[i * 3]; pa.setZ(i, Math.sin(f * 0.2 + x * 4) * 0.1 * (x + 0.6)); } pa.needsUpdate = true;
}

function drawActors(list, cam) {
  cards.forEach((c) => { c.mesh.visible = c.blob.visible = false; });
  list.forEach((a, i) => {
    const c = getCard(i);
    c.draw(a.key, a.draw);
    c.mesh.visible = true; c.mesh.position.set(a.x, a.y, a.z);
    const s = a.s || 1; c.mesh.scale.set(s * (a.flip ? -1 : 1), s, s);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - a.x, cam.position.z - a.z) + (a.yaw || 0), a.roll || 0);
    c.mat.color.set(a.tint || '#ffffff'); c.mat.opacity = a.alpha ?? 1;
    c.mesh.castShadow = a.shadow !== false;
    c.mesh.renderOrder = a.order || 2; c.mat.depthTest = !a.overlay;
    if (a.blob !== false && a.y < DECK + 0.5) { c.blob.visible = true; c.blob.position.set(a.x, (a.ground ?? DECK) + 0.02, a.z); c.blob.scale.set(0.95 * s, 0.6 * s, 1); }
  });
}

const swapForNd = (on) => {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      o.userData.mat0 = o.material;
      if (o.userData.ndSkip) { o.userData.vis0 = o.visible; o.visible = false; return; }
      if (o === sky || o.userData.sky) { o.userData.vis0 = o.visible; o.visible = false; return; }
      o.material = o.userData.nd || ndMat;
    } else {
      o.material = o.userData.mat0; if (o.userData.vis0 !== undefined) { o.visible = o.userData.vis0; delete o.userData.vis0; }
    }
  });
};

window.renderFrame = (f) => {
  const S = shotAt(f), L = lightFor(S, f), C = camAt(f);
  applyLight(L, f);
  camera.position.set(...C.pos); camera.up.set(0, 1, 0); camera.lookAt(...C.look); camera.rotateZ(rx(C.roll || 0));
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const W_ = worldAt(f); worldState(W_, f);
  placeSun(L, new THREE.Vector3(...(C.shadowAt || C.look)));
  ele.root.updateMatrixWorld(true); const env = makeEnv(); drawActors([...actorsAt(f, T, env), ...fxAt(f, T, env)], camera);
  sky.position.copy(camera.position);
  for (const c of clouds) c.quaternion.copy(camera.quaternion);
  // pass A: colour
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  // pass B: normal + depth
  const fog = scene.fog; scene.fog = null; const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.shadowMap.autoUpdate = false;
  swapForNd(true); renderer.setRenderTarget(rtNd); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera); swapForNd(false);
  scene.fog = fog; renderer.shadowMap.enabled = sm; renderer.shadowMap.autoUpdate = true;
  if (window.DEBUG_ND) { const dm = new THREE.MeshBasicMaterial({ map: rtNd.texture }); const ds = fs(dm); renderer.setRenderTarget(null); renderer.render(ds, fsCam); return true; }
  // ink + grade
  const D = dofAt(f);
  inkU.px.value = 2.5; inkU.flash.value = window.DEBUG_E ? -1 : (C.flash || 0); inkU.vig.value = L.vig ?? 0.22;
  renderer.setRenderTarget(rtInk); renderer.render(inkScene, fsCam);
  // lens
  dofU.focus.value = D.focus; dofU.cinf.value = D.cinf; dofU.near.value = D.near ?? 1;
  renderer.setRenderTarget(null); renderer.render(dofScene, fsCam);
  return true;
};
window.TOTAL = TOTAL;
window.ready = true;
