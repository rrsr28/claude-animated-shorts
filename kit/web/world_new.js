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
const plaza = new THREE.Mesh(new THREE.CircleGeometry(36, 64), M.plaza); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0; plaza.receiveShadow = true; world.add(plaza);

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
  ele.root.position.set(E.x, Math.abs(Math.sin(E.walk * Math.PI * 2)) * 0.05 * E.walkAmp, E.z); ele.root.rotation.y = E.ry || 0;
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
  flank: () => ele.root.localToWorld(new THREE.Vector3(-0.4, 2.0, 1.27)),
  tusk: () => ele.root.localToWorld(new THREE.Vector3(4.5, 2.3, 0.97)),
  trunk: () => ele.trunk[3].g.getWorldPosition(new THREE.Vector3()),
  leg: () => ele.legs[0].g.localToWorld(new THREE.Vector3(0, -0.55, 0.42)),
  ear: () => ele.ears[1].g.localToWorld(new THREE.Vector3(-0.9, -0.55, 0.1)),
  tail: () => ele.tail[4].g.localToWorld(new THREE.Vector3(0.45, 0, 0)),
};
const makeEnv = () => ({ p: (n) => { const v = probes[n](); return [v.x, v.y, v.z]; } });
