// "The Blind Men and the Elephant" — timed to voice.mp3 (72.84 s, 30 fps, 2185 frames).
import { M, clamp, lerp, lerp3, ramp, q, idle, blinkAt, walk } from './motion.js';
import { ASPECT, SAFE, B, solveCam, handheld, handPx, clampReach, REACH } from './cam.js';
export const FPS = 30, TOTAL = 2185, DECK = 0;
export const smooth = M.smooth;
export const SHOTS = [
  { id: 'hook', a: 0, b: 85, light: 'day' },
  { id: 'live', a: 86, b: 175, light: 'day' },
  { id: 'hear', a: 176, b: 218, light: 'day' },
  { id: 'arrive', a: 219, b: 291, light: 'day' },
  { id: 'curious', a: 292, b: 366, light: 'day' },
  { id: 'walk', a: 367, b: 412, light: 'day' },
  { id: 'wall', a: 413, b: 579, light: 'day' },
  { id: 'tusk', a: 580, b: 725, light: 'day' },
  { id: 'trunk', a: 726, b: 929, light: 'day' },
  { id: 'leg', a: 930, b: 1076, light: 'day' },
  { id: 'ear', a: 1077, b: 1217, light: 'day' },
  { id: 'tail', a: 1218, b: 1407, light: 'day' },
  { id: 'argue', a: 1408, b: 1551, light: 'day' },
  { id: 'sageIn', a: 1552, b: 1679, light: 'day' },
  { id: 'sageSays', a: 1680, b: 1853, light: 'day' },
  { id: 'silent', a: 1854, b: 1953, light: 'golden' },
  { id: 'moral', a: 1954, b: 2184, light: 'golden' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
const SHOT = Object.fromEntries(SHOTS.map((s) => [s.id, s]));

// ---------- lights ----------
export const LIGHTS = {
  day: { az: 140, el: 52, sky: '#c4d6f2', ground: '#9a9066', hemi: 1.15, sun: '#fff1dc', sunI: 2.5, fog: '#d3e2f2', fogNear: 70, fogFar: 900,
    skyTop: '#3f80d4', skyHor: '#c9ddf3', sat: 1.12, waterDeep: '#2c6c8c', waterShal: '#5aaec4', glint: '#effaff', vig: 0.2, shadowExt: 14 },
  golden: { az: 25, el: 15, sky: '#a79ccc', ground: '#c8b496', hemi: 1.3, sun: '#ffc487', sunI: 2.5, fog: '#f3bd8f', fogNear: 60, fogFar: 760,
    skyTop: '#7a74b8', skyHor: '#ffc886', sunDisc: '#fff0c8', sunSize: 0.0035, sat: 1.02, gain: '#fff6ec', waterDeep: '#3d5a86', waterShal: '#d99a6e',
    glint: '#ffe2a8', vig: 0.26, shadowExt: 14 },
};
export const lightFor = (S) => ({ ...LIGHTS[S.light] });

// ---------- helpers ----------
const orb = (t, d, az, h, fov, roll = 0, lh = 0) => { const a = az * Math.PI / 180; return { pos: [t[0] + d * Math.sin(a), t[1] + h, t[2] + d * Math.cos(a)], look: [t[0], t[1] + lh, t[2]], fov, roll }; };
const camRightV = (C) => { const fx = C.look[0] - C.pos[0], fz = C.look[2] - C.pos[2], l = Math.hypot(fx, fz) || 1; return [-fz / l, 0, fx / l]; };
const toCamV = (C) => { const fx = C.look[0] - C.pos[0], fz = C.look[2] - C.pos[2], l = Math.hypot(fx, fz) || 1; return [-fx / l, 0, -fz / l]; };
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---------- timing ----------
const QUOTE = { 1: [[499, 558]], 2: [[651, 658], [678, 706]], 3: [[812, 837], [858, 895]], 4: [[999, 1011], [1016, 1057]], 5: [[1155, 1197]], 6: [[1306, 1333], [1353, 1384]], sage: [[1637, 1673], [1680, 1743], [1764, 1821]] };
const speaking = (k, f) => QUOTE[k].some(([a, b]) => f >= a && f < b);
const talk = (k, f, a = 'grin', b = 'shock') => (speaking(k, f) ? (((f / 4) | 0) % 2 ? a : b) : null);
// where each man ends up: part, side offset, contact frame, arrival start, bubble icon + pop frame
const PARTS = [null,
  { part: 'flank', off: -0.5, a0: 413, hit: 435, bub: 'wall', pop: 549 },
  { part: 'tusk', off: 0.5, a0: 580, hit: 606, bub: 'spear', pop: 697 },
  { part: 'trunk', off: -0.5, a0: 726, hit: 748, bub: 'snake', pop: 888 },
  { part: 'leg', off: -0.5, a0: 930, hit: 950, bub: 'tree', pop: 1048 },
  { part: 'ear', off: -0.5, a0: 1077, hit: 1098, bub: 'fan', pop: 1186 },
  { part: 'tail', off: -0.5, a0: 1218, hit: 1252, bub: 'rope', pop: 1374 },
];
const SEEDS = [0, 3, 8, 13, 18, 23, 28];

// ---------- cameras ----------
const PT = { flank: [-0.32, 1.4, 0.98], tusk: [3.48, 1.56, 0.8], trunk: [2.55, 1.25, 0], leg: [1.0, 0.95, 1.0], ear: [0.85, 1.55, 1.25], tail: [-1.6, 1.1, 0] };
const HOME_P = [[-11.7, 0, -0.75], [-10.55, 0, -0.85], [-9.4, 0, -0.75], [-11.15, 0, 0.35], [-10.0, 0, 0.3], [-8.85, 0, 0.35]];
const HOME = (i) => HOME_P[i];
const CAMS = {
  hook: [
    { f: 0, pos: [-9.6, 1.85, 5.3], look: [-10.1, 1.75, 0], fov: 30 },
    { f: 40, pos: [-9.9, 1.95, 6.2], look: [-10.1, 1.75, 0], fov: 32 },
    { f: 85, pos: [-9.8, 2.4, 11.5], look: [-10.1, 1.7, 0], fov: 44 },
  ],
  live: [
    { f: 86, pos: [-9.8, 2.4, 11.5], look: [-10.1, 1.7, 0], fov: 44 },
    { f: 175, pos: [-6.2, 2.2, 10.0], look: [-9.4, 1.7, 0], fov: 42 },
  ],
  hear: [
    { f: 176, pos: [-7.3, 1.9, 5.4], look: [-7.9, 1.7, 0], fov: 34 },
    { f: 218, pos: [-7.7, 1.85, 4.6], look: [-8.0, 1.7, 0], fov: 30 },
  ],
  arrive: [
    { f: 219, pos: [-2.0, 2.2, 15.5], look: [-0.8, 1.7, 0], fov: 46 },
    { f: 291, pos: [0.0, 2.4, 14.0], look: [0.4, 1.8, 0], fov: 42 },
  ],
  curious: [
    { f: 292, pos: [-10.6, 1.9, 6.4], look: [-10.4, 1.9, 0], fov: 34 },
    { f: 366, pos: [-10.2, 2.1, 8.8], look: [-10.2, 1.9, 0], fov: 40 },
  ],
  walk: [
    { f: 367, pos: [-10.0, 1.7, 9.5], look: [-10.0, 1.4, 0], fov: 46 },
    { f: 412, pos: [-7.1, 1.7, 9.5], look: [-7.1, 1.4, 0], fov: 46 },
  ],
  wall: [{ f: 413, ...orb(PT.flank, 8.0, -14, 0.5, 38) }, { f: 500, ...orb(PT.flank, 7.2, -6, 0.3, 35) }, { f: 579, ...orb(PT.flank, 6.6, 6, 0.1, 33) }],
  tusk: [{ f: 580, ...orb(PT.tusk, 8.4, -4, 0.3, 38) }, { f: 650, ...orb(PT.tusk, 7.6, 6, 0.25, 35) }, { f: 725, ...orb(PT.tusk, 6.8, 14, 0.2, 33) }],
  trunk: [{ f: 726, ...orb(PT.trunk, 8.4, 0, 0.5, 38) }, { f: 820, ...orb(PT.trunk, 7.2, 10, 0.3, 35) }, { f: 929, ...orb(PT.trunk, 6.6, 18, 0.2, 33) }],
  leg: [{ f: 930, ...orb(PT.leg, 8.0, 6, 0.2, 38) }, { f: 1076, ...orb(PT.leg, 6.6, -4, -0.1, 34) }],
  ear: [{ f: 1077, ...orb(PT.ear, 8.2, 8, 0.4, 38) }, { f: 1217, ...orb(PT.ear, 6.8, -2, 0.2, 34) }],
  tail: [{ f: 1218, ...orb(PT.tail, 8.2, -72, 0.6, 38) }, { f: 1320, ...orb(PT.tail, 7.2, -60, 0.4, 35) }, { f: 1407, ...orb(PT.tail, 6.6, -48, 0.3, 33) }],
  argue: [
    { f: 1408, pos: [0.2, 2.7, 13.5], look: [0.3, 1.5, 0.5], fov: 44 },
    { f: 1551, pos: [0.4, 2.6, 12.0], look: [0.3, 1.5, 0.5], fov: 42, roll: 0 },
  ],
  sageIn: [
    { f: 1552, pos: [4.6, 1.8, 9.2], look: [3.8, 1.5, 3.6], fov: 40 },
    { f: 1679, pos: [3.6, 1.7, 8.0], look: [3.4, 1.55, 3.6], fov: 34 },
  ],
  sageSays: [
    { f: 1680, pos: [3.8, 1.7, 7.4], look: [3.2, 1.6, 3.6], fov: 32 },
    { f: 1716, pos: [3.9, 1.7, 7.0], look: [3.2, 1.6, 3.6], fov: 31 },
    { f: 1763, ease: 'smooth', pos: [-1.5, 2.6, 15.0], look: [0.6, 1.5, 0.3], fov: 46 },
    { f: 1853, pos: [-0.6, 2.6, 12.0], look: [0.6, 1.5, 0.3], fov: 44 },
  ],
  silent: [
    { f: 1854, pos: [0.0, 1.7, 7.6], look: [0.2, 1.4, 2.2], fov: 36 },
    { f: 1953, pos: [0.4, 1.7, 6.2], look: [0.4, 1.4, 2.2], fov: 32 },
  ],
  moral: [
    { f: 1954, pos: [-4.8, 1.5, 9.0], look: [-1.4, 1.2, 1.0], fov: 40 },
    { f: 2020, ease: 'smooth', pos: [0.4, 2.6, 11.0], look: [0.9, 1.4, 0.8], fov: 44 },
    { f: 2184, pos: [1.0, 3.8, 13.5], look: [0.9, 1.5, 0.6], fov: 46 },
  ],
};
const KICKS = [{ f: 275, a: 0.04 }, { f: 2160, a: 0.04 }];
const camRaw = (f) => {
  const S = shotAt(f), K = CAMS[S.id]; let c;
  if (f <= K[0].f) c = { ...K[0] };
  else if (f >= K[K.length - 1].f) c = { ...K[K.length - 1] };
  else { const i = K.findIndex((k, j) => f >= k.f && f <= K[j + 1].f), a = K[i], b = K[i + 1], t = M[b.ease || 'smooth']((f - a.f) / (b.f - a.f));
    c = { pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: lerp(a.fov, b.fov, t), roll: lerp(a.roll || 0, b.roll || 0, t) }; }
  c.fov *= 1 - 0.0008 * Math.max(0, f - S.a) * 0.15;
  return c;
};
// ---------- solver-based cameras: every key says WHAT must be in frame and HOW to move; the solver finds the distance ----------
// subject helpers (boxes in world metres)
const menBoxes = (ms, y0 = 0) => ms.map((m) => stBox(m, y0));
const stBox = (m, y0 = 0) => B(station[m][0], station[m][2], 0.6, y0, 1.78);
const bubBox = (m) => B(bubAnchor[m][0], bubAnchor[m][2], 0.5, 2.1, 3.1);
const ptBox = (part) => { const p = PT[part]; return B(p[0], p[2], 0.2, Math.max(0, p[1] - 0.25), p[1] + 0.25); };
const homeBoxes = (is, y0 = 0) => is.map((i) => B(HOME_P[i][0], HOME_P[i][2], 0.55, y0, 1.75));
const ALL6 = [1, 2, 3, 4, 5, 6];
const CL = [null, ...ALL6.map((m) => [-2.125 + 0.85 * (m - 1), 0, 2.4 + (m % 2 ? 0.25 : -0.25)])];
const clBox = (m, y0 = 0) => B(CL[m][0], CL[m][2], 0.5, y0, 1.78);
const clBub = (m) => B(CL[m][0], CL[m][2], 0.4, 1.95 + (m % 2) * 0.4, 2.95 + (m % 2) * 0.4);
const clBoxes = (ms, y0 = 0) => ms.map((m) => clBox(m, y0));
const ELE = [B(0.2, 0, 2.3, 0, 3.0), B(3.0, 0, 0.9, 0, 3.4)];
const sagePos = (f) => { if (f < 1552) return [8, 0, 3.7]; if (f < 1680) { const t = ramp(f, 1552, 1610); return [lerp(7.4, 3.5, M.easeOut(t)), 0, 3.7]; } if (f < 1954) return [2.95, 0, 3.0]; return [-0.3, 0, 3.4]; };
const sageBox = (f, y0 = 0) => { const p = sagePos(f); return B(p[0], p[2], 0.55, y0, 1.75); };
const partShot = (m, az0, az1, az2, fov = 37) => { const P_ = PARTS[m], subj = (f) => [stBox(m), bubBox(m), ptBox(P_.part)];
  return { subj, keys: [{ f: P_.a0, az: az0, k: 1.5, h: 0.8, fov, ly: 0.1 }, { f: P_.hit + 40, az: az1, k: 1.18, h: 0.4, fov: fov - 2, roll: 1.2 }, { f: SHOT[['', 'wall', 'tusk', 'trunk', 'leg', 'ear', 'tail'][m]].b, az: az2, k: 1.0, h: 0.15, fov: fov - 4, roll: -1.0 }] }; };
const SPEC = {
  hook: { subj: () => homeBoxes([0, 1, 2, 3, 4, 5]), keys: [
    { f: 0, subj: () => homeBoxes([1, 4], 0.55), az: -4, k: 1.0, h: 0.05, fov: 30, roll: 0 },
    { f: 38, subj: () => homeBoxes([1, 4], 0.4), az: 5, k: 1.0, h: 0.2, fov: 32 },
    { f: 85, az: 6, k: 1.3, h: 1.0, fov: 40, roll: 1.0 }] },
  live: { subj: () => homeBoxes([0, 1, 2, 3, 4, 5]), keys: [{ f: 86, az: 6, k: 1.3, h: 1.0, fov: 40, roll: 1.0 }, { f: 130, az: -6, k: 1.12, h: 0.7, fov: 38, roll: -0.6 }, { f: 175, az: -18, k: 1.02, h: 0.4, fov: 36 }] },
  hear: { subj: () => homeBoxes([2, 4, 5], 0.2), keys: [{ f: 176, az: -10, k: 1.12, h: 0.3, fov: 34 }, { f: 218, az: -2, k: 1.0, h: 0.1, fov: 30, roll: -1.2 }] },
  arrive: { subj: (f) => { const E = worldAt(f).E, x = Math.max(E.x, -1.2); return [B(x + 1.6, 0, 2.6, 0, 3.0), B(E.x + 3.9, 1.55, 0.5, 0, 1.75), B(-0.2, 0, 2.2, 0, 2.2)]; },
    keys: [{ f: 219, az: -14, k: 1.1, h: 0.9, fov: 44 }, { f: 262, az: 4, k: 1.0, h: 0.5, fov: 42, roll: 1.0 }, { f: 291, az: 12, k: 0.95, h: 0.3, fov: 40, roll: -1.0 }] },
  curious: { subj: () => homeBoxes([1, 3, 4, 5], 0), keys: [{ f: 292, az: -8, k: 1.0, h: 0.2, fov: 34 }, { f: 330, az: 4, k: 1.1, h: 0.5, fov: 36, roll: 1.0 }, { f: 366, az: 12, k: 1.3, h: 0.9, fov: 38 }] },
  walk: { subj: (f) => { const t = (f - 367) / 30, x0 = -8.4 + 1.9 * t; return [B(x0, 0.1, 0.55, 0, 1.75), B(x0 - 0.95, 0.1, 0.55, 0, 1.75), B(x0 - 1.9, 0.1, 0.55, 0, 1.75)]; },
    keys: [{ f: 367, az: -10, k: 1.05, h: 0.5, fov: 40 }, { f: 412, az: 8, k: 1.0, h: 0.35, fov: 38, roll: 1.2 }] },
  wall: partShot(1, -22, -8, 8), tusk: partShot(2, -12, 6, 20), trunk: partShot(3, -6, 12, 26), leg: partShot(4, 14, 2, -12), ear: partShot(5, 10, -2, -16),
  tail: partShot(6, -80, -66, -50),
  argue: { subj: () => [...clBoxes(ALL6), ...ALL6.map(clBub)], keys: [{ f: 1408, az: 8, k: 1.1, h: 0.9, ly: 0.9, fov: 50, roll: 1.5 }, { f: 1480, az: -4, k: 1.02, h: 0.6, ly: 0.9, fov: 48, roll: -2.0 }, { f: 1551, az: -10, k: 1.0, h: 0.4, ly: 0.9, fov: 46, roll: 1.0 }] },
  sageIn: { subj: (f) => [sageBox(f), ...clBoxes([5, 6])], keys: [{ f: 1552, az: 14, k: 1.2, h: 0.5, fov: 44 }, { f: 1620, az: 4, k: 1.05, h: 0.3, fov: 40, roll: 1.0 }, { f: 1679, az: -6, k: 1.0, h: 0.2, fov: 36, roll: -0.8 }] },
  sageSays: { subj: (f) => [sageBox(f, 0.7)], keys: [
    { f: 1680, subj: (f) => [sageBox(f, 0.6)], az: -8, k: 1.0, h: 0.2, fov: 32, roll: 0.8 },
    { f: 1735, subj: (f) => [sageBox(f, 0.6)], az: 6, k: 0.95, h: 0.15, fov: 30, roll: -0.6 },
    { f: 1770, subj: (f) => [...clBoxes(ALL6), sageBox(f), ...ELE], az: 0, k: 1.05, h: 0.8, ly: 0.9, fov: 50 },
    { f: 1853, subj: (f) => [...clBoxes(ALL6), sageBox(f), ...ELE], az: -12, k: 1.0, h: 0.6, ly: 0.9, fov: 48, roll: 1.0 }] },
  silent: { subj: () => clBoxes(ALL6), keys: [
    { f: 1854, subj: () => clBoxes([3, 4, 5], 0.4), az: -6, k: 1.0, h: 0.1, fov: 34 },
    { f: 1900, subj: () => clBoxes([2, 3, 4, 5], 0.3), az: 4, k: 1.0, h: 0.2, fov: 36, roll: 1.0 },
    { f: 1953, subj: () => [...clBoxes(ALL6), sageBox(1953)], az: 8, k: 1.04, h: 0.4, ly: 0.7, fov: 44, roll: -1.0 }] },
  moral: { subj: () => [...menBoxes(ALL6), sageBox(2100), ...ELE], keys: [
    { f: 1954, subj: () => [stBox(1), ptBox('flank')], az: -38, k: 1.0, h: 0.2, fov: 36 },
    { f: 2010, subj: () => [...menBoxes([1, 2, 3, 4]), sageBox(2010)], az: -22, k: 1.05, h: 0.8, fov: 40, roll: 1.0 },
    { f: 2090, subj: () => [...menBoxes(ALL6), sageBox(2090), ...ELE], az: -6, k: 1.12, h: 0.9, ly: 0.8, fov: 44 },
    { f: 2184, subj: () => [...menBoxes(ALL6), sageBox(2184), ...ELE], az: 10, k: 1.0, h: 1.4, ly: 0.8, fov: 46, roll: -0.8 }] },
};
const camNew = (f) => {
  const S = shotAt(f), sp = SPEC[S.id], K = sp.keys, sub = (k) => (k.subj || sp.subj)(f);
  const solve = (k, extra = {}) => solveCam(sub(k), { az: k.az, k: k.k, h: k.h, fov: k.fov, roll: k.roll, ly: k.ly, ...extra });
  let c;
  if (f <= K[0].f) c = solve(K[0]);
  else if (f >= K[K.length - 1].f) c = solve(K[K.length - 1]);
  else { const i = K.findIndex((k, j) => f >= k.f && f <= K[j + 1].f), a = K[i], b = K[i + 1], t = M.smooth((f - a.f) / (b.f - a.f));
    if ((a.subj || sp.subj) === (b.subj || sp.subj)) { // same subjects: blend the move parameters -> real orbit arcs
      const L = (x, y) => lerp(x || 0, y || 0, t); c = solveCam(sub(a), { az: L(a.az, b.az), k: lerp(a.k || 1, b.k || 1, t), h: L(a.h, b.h), fov: L(a.fov, b.fov), roll: L(a.roll, b.roll), ly: L(a.ly, b.ly) }); }
    else { const ca = solve(a), cb = solve(b); c = { pos: lerp3(ca.pos, cb.pos, t), look: lerp3(ca.look, cb.look, t), fov: lerp(ca.fov, cb.fov, t), roll: lerp(ca.roll, cb.roll, t) }; } }
  handheld(c, f);
  return c;
};
export const camAt = (f) => {
  const c = camNew(f);
  for (const k of KICKS) { const d = f - k.f; if (d >= 0 && d < 7) { const s = (d % 2 ? -1 : 1) * k.a * (1 - d / 7); c.look = [c.look[0], c.look[1] + s * 3, c.look[2] + s * 2]; c.roll = (c.roll || 0) + s * 20; } }
  c.flash = (f >= 1854 && f < 1860) ? (1 - (f - 1854) / 6) * 0.7 : (f >= 2158 && f < 2166) ? (1 - (f - 2158) / 8) * 0.45 : 0;
  c.shadowAt = c.look;
  return c;
};

// ---------- the six men's stations (fixed world places, built once from each man's own shot camera) ----------
const DEP = 0.6;
const ptAt = (part) => PT[part];
const station = (() => { const out = [null]; for (let m = 1; m <= 6; m++) { const P_ = PARTS[m], ref = camRaw(P_.hit), r = camRightV(ref), tc = toCamV(ref), tp = ptAt(P_.part);
  out.push([tp[0] + tc[0] * DEP + r[0] * P_.off, 0, tp[2] + tc[2] * DEP + r[2] * P_.off]); } return out; })();
const bubAnchor = [null]; const startOff = [null];
for (let m = 1; m <= 6; m++) { const ref = camRaw(PARTS[m].hit), r = camRightV(ref), tc = toCamV(ref);
  bubAnchor.push([station[m][0] + r[0] * 0.95 + tc[0] * 0.3, 0, station[m][2] + r[2] * 0.95 + tc[2] * 0.3]); startOff.push([r[0] * 3.6, r[2] * 3.6]); }
const WAIT = (m) => [-5.2 - (m % 3) * 0.9, 0, 3.4 + Math.floor((m - 1) / 3) * 0.9 - (m % 2) * 0.3];

// ---------- world state (elephant) ----------
export const worldAt = (f) => {
  const E = { x: 0, z: 0, ry: 0, walk: 0, walkAmp: 0, raise: 0, tswing: 0.6, snake: 0, ear: 0.45, tail: 0.5, curl: 0 };
  if (f < 219) E.x = -40;
  else if (f < 276) { const t = (f - 219) / 57; E.x = -4.6 * (1 - M.easeOut(t)); E.walk = (f - 219) / 30 * 0.9; E.walkAmp = 1 - M.smooth(ramp(f, 262, 276)); }
  E.raise = f >= 262 && f < 300 ? M.smooth(ramp(f, 262, 276)) * (1 - M.smooth(ramp(f, 285, 296))) : 0;
  if (f >= 2148) E.raise = M.back(ramp(f, 2148, 2162), 1.2);
  E.snake = 0.9 * M.smooth(ramp(f, 745, 780)) * (1 - M.smooth(ramp(f, 900, 925)));
  E.ear = 0.45 + 0.9 * M.smooth(ramp(f, 1085, 1105)) * (1 - M.smooth(ramp(f, 1190, 1215)));
  E.tail = 0.5 + 0.7 * M.smooth(ramp(f, 1230, 1255)) * (1 - M.smooth(ramp(f, 1385, 1405)));
  if (f >= 1408 && f < 1552) { E.ear = 0.8; E.tswing = 1.0; }
  return { E };
};

// ---------- fx icons for the thought bubbles ----------
const BR = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const ICONS = {
  q: (p) => { const g = p.g; g.save(); g.font = '900 240px Arial Black, Arial'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#241726'; g.strokeText('?', 300, 520); g.fillStyle = '#f2a31b'; g.fillText('?', 300, 520); g.restore(); },
  wall: (p) => { const cols = ['#c9663f', '#d4764a', '#b95a36']; for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const x = 190 + k * 76 + (r % 2) * 38, y = 345 + r * 44; p.poly(BR(Math.max(190, x), y, Math.min(410, x + 74) - Math.max(190, x), 42), cols[(r + k + 3) % 3], 5); } p.poly(BR(186, 340, 228, 182), null, 8); },
  spear: (p) => { p.band([[200, 520], [392, 352]], '#8a5a34', 15, 5, 'round'); p.poly([[388, 372], [418, 316], [466, 296], [440, 348], [412, 378]], '#d5dbe2', 6); },
  snake: (p) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([190 + t * 210, 440 + 56 * Math.sin(t * Math.PI * 3)]); } p.band(pts, '#52ab4c', 28, 6, 'round'); for (let i = 3; i < 24; i += 4) p.dot(pts[i][0], pts[i][1], 6, '#f2d34a'); const e = pts[24]; p.ell(e[0] + 14, e[1] - 4, 26, 20, '#52ab4c', 6); p.dot(e[0] + 20, e[1] - 10, 5, '#ffffff'); p.dot(e[0] + 22, e[1] - 10, 2.5, '#241726'); p.stroke([[e[0] + 36, e[1] - 2], [e[0] + 56, e[1] - 4], [e[0] + 66, e[1] - 12], [e[0] + 56, e[1] - 4], [e[0] + 66, e[1] + 4]], 4, '#e23a4a'); },
  tree: (p) => { p.band([[300, 540], [300, 430]], '#8a5a34', 34, 6, 'round'); p.ell(300, 360, 92, 72, '#3f9a3f', 7); p.ell(238, 408, 62, 48, '#4aa745', 7); p.ell(362, 408, 62, 48, '#4aa745', 7); p.ell(300, 372, 80, 58, '#3f9a3f', 0); },
  fan: (p) => { p.band([[300, 500], [300, 565]], '#8a5a34', 22, 5, 'round'); p.ell(300, 395, 112, 112, '#e9c86b', 7); p.ell(300, 395, 112, 112, null, 7); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.stroke([[300, 395], [300 + Math.cos(a) * 108, 395 + Math.sin(a) * 108]], 3, '#b98b3a'); } p.ell(300, 395, 100, 100, null, 6); p.ell(300, 395, 22, 22, '#c43b3b', 5); },
  rope: (p) => { const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 7, r = 14 + i * 2.4; pts.push([300 + Math.cos(t) * r, 430 + Math.sin(t) * r * 0.62]); } p.band(pts, '#d6b575', 17, 5, 'round'); p.band([pts[48], [392, 540], [430, 560]], '#d6b575', 17, 5, 'round'); for (let i = 4; i < 48; i += 6) p.stroke([[pts[i][0] - 5, pts[i][1] - 7], [pts[i][0] + 5, pts[i][1] + 7]], 3, '#9a7a3e'); },
};
const bubbleCard = (icon) => (p) => {
  p.ell(300, 430, 205, 160, '#ffffff', 10);
  p.ell(190, 590, 30, 24, '#ffffff', 8); p.ell(150, 650, 19, 15, '#ffffff', 7); p.ell(125, 695, 11, 9, '#ffffff', 6);
  ICONS[icon](p);
};
export const fxAt = (f, T, env) => {
  const S = shotAt(f), out = [];
  const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 5, ...extra });
  const C = camAt(f), right = camRightV(C), tc = toCamV(C);
  const bub = (icon, pop, anchor, sc = 1.1, side = 1, alpha = 1, wob = 1) => {
    if (f < pop) return; const t = M.back(ramp(f, pop, pop + 8), 2.2); if (t <= 0.01) return;
    const hb = 2.5, oy = hb - (975 - 430) * 0.00225 * sc;
    const sh = f > pop + 10 ? Math.sin((f - pop) * 0.5) * 0.03 * wob : 0;
    out.push(FX('bub' + icon + side, bubbleCard(icon), [anchor[0] + right[0] * 0.95 * side + tc[0] * 0.3, oy, anchor[2] + right[2] * 0.95 * side + tc[2] * 0.3], sc * t, { flip: side < 0, roll: sh, alpha }));
  };
  // part-shot bubbles above each man (they stay until the argument)
  for (let m = 1; m <= 6; m++) { const P_ = PARTS[m]; if (f >= P_.pop && f < 1408 + 4 && S.id !== 'argue' && S.id !== 'hear') {
      if (f < 1408 && f >= P_.pop && SHOT[P_.part] && S.id === P_.part) bub(P_.bub, P_.pop, station[m], 1.15, 1); } }
  if (S.id === 'curious') { [[-10.9, 300], [-9.9, 314], [-8.9, 328]].forEach(([x, pop], i) => bub('q', pop, [x, 0, i % 2 ? -0.45 : 0], 0.95 + i * 0.05, i === 2 ? -1 : 1, 1, 1.5)); }
  if (S.id === 'arrive' && f >= 266 && f < 292) { const t = q(ramp(f, 266, 292), 2); out.push(FX('trump' + t, (p) => { p.g.translate(0, 0); T.fxBurst(p, t, '#fff3b0', 12, 60, 240); }, [1.9, 3.2, 1.5], 1.5, { alpha: 1 - t * 0.6 })); }
  if (S.id === 'hear' && f >= 196) { const t = q(ramp(f, 196, 214), 2); out.push(FX('ex' + t, (p) => T.fxBurst(p, t, '#ffe27a', 10, 40, 200), [-8.6, 2.4, 0.3], 0.9)); }
  // argument: all six icons pop above their heads, shaking
  if (S.id === 'argue' || S.id === 'sageIn' || (S.id === 'sageSays' && f < 1764)) {
    PARTS.forEach((P_, m) => { if (!P_) return; const base = S.id === 'argue' ? 1420 + m * 6 : 0; const sc = 0.66;
      if (f < base) return; const t = M.back(ramp(f, base, base + 8), 2.2); if (t <= 0.01) return;
      const shake = S.id === 'argue' && f < 1490 ? Math.sin(f * 0.9 + m) * 0.08 : 0;
      const oy = (2.45 + (m % 2) * 0.4) - (975 - 430) * 0.00225 * sc;
      out.push(FX('arg' + P_.bub, bubbleCard(P_.bub), [CL[m][0] + tc[0] * 0.3, oy, CL[m][2] + tc[2] * 0.3], sc * t, { roll: shake })); });
  }
  if (S.id === 'argue' && f >= 1430 && f < 1500) PARTS.forEach((P_, m) => { if (!P_) return; if ((f + m * 5) % 14 < 4) out.push(FX('bang', (p) => T.fxBurst(p, 0.7, '#ff7a5a', 8, 30, 120), [CL[m][0], 1.9, CL[m][2]], 0.4)); });
  if (S.id === 'sageSays' && f >= 1771 && f < 1830) { PARTS.forEach((P_, m) => { if (!P_) return; const t0 = 1771 + (m - 1) * 8; if (f < t0) return; const t = q(ramp(f, t0, t0 + 18), 2); if (t >= 1) return; const pos = env ? env.p(P_.part) : PT[P_.part]; out.push(FX('ring' + m + t, (p) => T.fxRing(p, t), [pos[0], pos[1] + 0.35, pos[2] + 0.3], 1.1)); }); }
  if (S.id === 'silent') { // sweat drops + deflating icons + realisation sparks
    PARTS.forEach((P_, m) => { if (!P_) return; if (f >= 1862 + m * 3) { const t = ((f - m * 7) % 24) / 24; out.push(FX('sw', (p) => T.fxDrip(p), [CL[m][0] + right[0] * 0.3, 1.6 - t * 0.2, CL[m][2] + right[2] * 0.3 + 0.4], 0.14, { alpha: 1 - t * t })); }
      const sc = 0.66 * (1 - M.easeIn(ramp(f, 1858 + m * 4, 1900 + m * 4))); if (sc > 0.02) out.push(FX('arg' + P_.bub, bubbleCard(P_.bub), [CL[m][0] + tc[0] * 0.3, 2.45 + (m % 2) * 0.4 - (975 - 430) * 0.00225 * sc, CL[m][2] + tc[2] * 0.3], sc, { roll: Math.sin(f * 0.4 + m) * 0.1 })); });
    if (f >= 1905) { const t = q(ramp(f, 1905, 1925), 2); PARTS.forEach((P_, m) => { if (!P_) return; out.push(FX('lamp' + m, (p) => T.fxBurst(p, t, '#fff3b0', 8, 20, 90), [CL[m][0], 2.3, CL[m][2]], 0.5, { alpha: 1 - Math.abs(t - 0.5) })); }); }
  }
  if (S.id === 'moral' && f >= 2150) { const t = q(ramp(f, 2150, 2184), 2); out.push(FX('fin' + t, (p) => T.fxBurst(p, t, '#ffe27a', 14, 60, 260), [2.3, 3.0, 1.3], 2.2, { alpha: 0.85 })); }
  if (S.id === 'moral') for (let i = 0; i < 14; i++) { const t = ((f - 1954) * 0.006 + i / 14) % 1, x = -6 + i * 1.0 + Math.sin(i * 3) * 0.5, y = 5.5 - t * 5.5, z = 1.0 + Math.cos(i * 2) * 2; out.push(FX('petal' + (i % 3), (p) => T.fxLeaf(p, ['#f08a1c', '#f5c020', '#e8467a'][i % 3]), [x, y, z], 0.12, { roll: q(t * 9 + i, 1) })); }
  return out;
};

// ---------- actors ----------
const REST = (side) => [300 + side * 105, 674];
const mkMan = (m, o, A, extra = {}) => ({ key: 'b' + m + JSON.stringify(o), draw: (p) => T_.romanFront(p, 'blind' + m, { seed: SEEDS[m], blink: 1, ...o }), x: A[0], y: A[1] ?? 0, z: A[2], ...extra });
let T_ = null;
const R = (who, o, pos, extra = {}) => ({ key: who + JSON.stringify(o), draw: (p) => T_.romanFront(p, who, o), x: pos[0], y: pos[1] ?? 0, z: pos[2], ...extra });

export const actorsAt = (f, T, env) => {
  T_ = T; const S = shotAt(f), out = [], C = camAt(f);
  const probe = (part) => (env ? env.p(part) : PT[part]);
  const tint = S.light === 'golden' ? '#ffe4cc' : '#ffffff';
  const camSide = (A) => { const th = Math.atan2(C.pos[0] - A[0], C.pos[2] - A[2]); return [Math.cos(th), 0, -Math.sin(th)]; };

  // ---- the men ----
  const manState = (m) => {
    const P_ = PARTS[m], A1 = station[m], id = idle(f, m), o = { ...id };
    let A = A1, step = 0, reach = 0, facing = 0;
    if (f < P_.a0) { A = null; }
    else if (f < P_.hit - 2) { // walking up to the elephant
      const t = ramp(f, P_.a0, P_.hit - 2), start = [A1[0] - startOff[m][0], 0, A1[2] - startOff[m][1]];
      const e = M.smooth(t); A = [lerp(start[0], A1[0], e), 0, lerp(start[2], A1[2], e)]; step = q(((f - P_.a0) / 30 * 1.0) % 1, 2); facing = 1; }
    reach = M.smooth(ramp(f, P_.hit - 12, P_.hit));
    return { A, step, reach, o, facing };
  };
  const stationMan = (m, expr, extra = {}, tgtScale = 1) => {
    const P_ = PARTS[m], { A, step, reach, o, facing } = manState(m); if (!A) return null;
    const tgt = probe(P_.part), side = P_.off < 0 ? 1 : -1, px = clampReach(handPx(A, tgt, C), side), rest = REST(side);
    const pat = f > P_.hit + 6 && f < P_.hit + 60 ? Math.sin((f - P_.hit) * 0.5) * 7 : 0;
    const to = [lerp(rest[0], px[0], reach) + pat * 0.3, lerp(rest[1], px[1], reach) + pat];
    const ex = expr ?? (talk(m, f) || (f >= P_.hit ? (f >= PARTS[m].pop - 24 ? 'shock' : 'smile') : 'neutral'));
    const oo = { expr: ex, step, facing: facing || (side > 0 ? 1 : -1), ...o, ...(side > 0 ? { R: 'to', toR: [q(to[0], 1), q(to[1], 1)] } : { L: 'to', toL: [q(to[0], 1), q(to[1], 1)] }), ...extra };
    oo.bob = q(oo.bob, 3); oo.tilt = q(oo.tilt, 1); oo.headTilt = q(oo.headTilt, 1);
    return mkMan(m, oo, A, { tint, overlay: true, order: 3 });
  };

  // ---- shot specifics ----
  if (S.id === 'hook' || S.id === 'live' || S.id === 'hear' || S.id === 'curious') {
    for (let i = 0; i < 6; i++) { const m = i + 1, H = HOME(i), id = idle(f, m);
      const o = { ...id, bob: q(id.bob, 3), tilt: q(id.tilt, 1), headTilt: q(id.headTilt, 1), expr: 'smile', facing: i % 2 ? -1 : 1 };
      if (S.id === 'hook') { o.expr = i === 2 ? 'grin' : 'smile'; if (i === 0) o.L = 'wave', o.wv = q(f * 0.3, 1); if (i === 3) o.R = 'belly'; }
      if (S.id === 'live') { if (i === 1 && f > 100 && f < 130) { o.L = 'point'; o.expr = 'laugh'; } if (i === 4) o.R = 'cane'; }
      if (S.id === 'hear') { o.expr = f > 196 ? 'shock' : 'neutral'; if (i === 3 || i === 5) o.L = 'ear'; if (i === 4) o.R = 'ear'; if (i === 2) o.L = 'ear'; o.facing = 1; o.headTilt = q(6 * Math.sin(f * 0.3 + i), 1); }
      if (S.id === 'curious') { o.expr = 'neutral'; if (i < 3) { o.L = 'cheek'; o.headTilt = q(8 * Math.sin(f * 0.12 + i), 1); } if (i === 3) { o.R = 'point'; } if (i === 4) { o.R = 'up'; } o.facing = 1; }
      out.push(mkMan(m, o, H, { tint }));
    }
    // news-runner villager
    if (f >= 120 && f < 219) { const t = ramp(f, 120, 176), x = lerp(8.0, -7.2, M.easeOut(t)); const run = f < 176 ? q(((f - 120) / 30 * 2.2) % 1, 2) : 0;
      out.push(R('vil3', { seed: 61, expr: 'shock', L: 'up', R: 'up', step: run, facing: -1, blink: blinkAt(f, 61), bob: q(Math.abs(Math.sin(f * 0.8)) * (f < 176 ? 0.03 : 0.006), 3), headTilt: f >= 176 ? q(4 * Math.sin(f * 0.8), 1) : 0 }, [x, 0, 0.9], { tint })); }
  } else if (S.id === 'arrive') {
    const E = worldAt(f).E; // mahout leads
    if (f >= 219) out.push(R('mahout', { seed: 71, expr: 'grin', L: 'wave', wv: f * 0.2, R: 'hang', step: q(E.walkAmp ? E.walk * 1.8 % 1 : 0, 2), facing: 1, blink: blinkAt(f, 71) }, [E.x + 3.9, 0, 1.55], { tint }));
  } else if (S.id === 'walk') {
    const t = (f - 367) / 30; for (let i = 0; i < 6; i++) { const m = i + 1, x = -8.4 + 1.9 * t - i * 1.15, z = i % 2 ? 0.2 : 0, id = idle(f, m);
      const o = { expr: 'smile', step: q((t * 1.0 + i * 0.07) % 1, 2), facing: 1, bob: q(Math.abs(Math.sin(t * 6 + i)) * 0.012, 3), headTilt: q(id.headTilt, 1), tilt: q(id.tilt * 0.5, 1) };
      if (i > 0) { const ahead = -8.4 + 1.9 * t - (i - 1) * 0.95; const sh = [ahead - 0.1, 1.02, (i - 1) % 2 ? 0.2 : 0]; const px = clampReach(handPx([x, 0, z], sh, C), 1); o.R = 'to'; o.toR = [q(px[0], 1), q(px[1], 1)]; }
      else { o.R = 'cane'; o.L = 'to'; o.toL = [q(300 + 160, 1), q(560 + 18 * Math.sin(t * 9), 1)]; }
      out.push(mkMan(m, o, [x, 0, z], { tint })); }
  } else {
    // men at (or on the way to) their stations
    const upTo = { wall: 1, tusk: 2, trunk: 3, leg: 4, ear: 5, tail: 6 }[S.id];
    for (let m = 1; m <= 6; m++) {
      const P_ = PARTS[m]; let card = null;
      if (S.id in { argue: 1, sageIn: 1, sageSays: 1, silent: 1 }) {
        const id = idle(f, m), A = CL[m], o = { ...id, bob: q(id.bob, 3), tilt: q(id.tilt, 1), headTilt: q(id.headTilt, 1), facing: m % 2 ? 1 : -1, expr: 'neutral' };
        if (S.id === 'argue') { const ang = f < 1492; o.expr = ang ? (((f / 5 + m) | 0) % 2 ? 'shock' : 'stern') : 'stubborn';
          if (ang) { if (m % 2) o.L = 'point'; else o.R = 'point'; o.bob = q(Math.abs(Math.sin(f * 0.5 + m)) * 0.025, 3); o.headTilt = q(7 * Math.sin(f * 0.6 + m), 1); } else { o.L = 'hip'; o.R = 'hip'; } }
        if (S.id === 'sageIn') { o.expr = f < 1600 ? 'stubborn' : 'neutral'; if (f < 1600) { o.L = 'hip'; o.R = 'hip'; } }
        if (S.id === 'sageSays') { o.expr = f < 1764 ? 'neutral' : 'dazed'; }
        if (S.id === 'silent') { o.expr = f < 1899 ? 'pained' : 'relief'; o.headTilt = q(f < 1899 ? 14 + 3 * Math.sin(f * 0.1 + m) : 0, 1); if (f >= 1899) o.R = 'belly'; }
        card = mkMan(m, o, A, { tint });
      } else if (S.id === 'moral' || m <= (upTo || 0)) {
        let ex = null, extra = {};
        if (S.id === 'moral') ex = f < 2140 ? (f > 2020 ? 'smile' : 'neutral') : 'laugh';
        card = stationMan(m, ex, extra);
        if (card && S.id === 'moral' && f >= 2148) { const hop = Math.abs(Math.sin((f - 2148) * 0.45 + m)) * 0.12; card.y = hop; }
      } else if (!(S.id in { hook: 1 })) { /* waiting offscreen */ }
      if (card) out.push(card);
    }
  }
  // sage
  if (S.id === 'sageIn' || S.id === 'sageSays' || S.id === 'silent' || S.id === 'moral') {
    let pos = [3.2, 0, 3.7], o = { seed: 81, blink: blinkAt(f, 81), facing: -1, R: 'cane', L: 'hang' }, tn = {};
    if (S.id === 'sageIn') { const t = ramp(f, 1552, 1610); pos = sagePos(f); o.step = t < 1 ? q(((f - 1552) / 30 * 1.1) % 1, 2) : 0; o.expr = f < 1604 ? 'smile' : (talk('sage', f, 'smile', 'grin') || 'smile'); }
    else if (S.id === 'sageSays') { pos = sagePos(f); o.expr = talk('sage', f, 'smile', 'grin') || 'smile_closed'; if (f >= 1764) o.L = 'point'; if (f >= 1700 && f < 1745) o.L = 'wave', o.wv = f * 0.25; }
    else if (S.id === 'silent') { pos = sagePos(f); o.expr = f < 1930 ? 'smile_closed' : 'smile'; }
    else { pos = [-0.3, 0, 3.4]; o.expr = f > 2020 ? 'grin' : 'smile'; o.facing = 1; if (f >= 2148) o.L = 'up', o.R = 'up'; }
    const id = idle(f, 9); out.push(R('sage', { ...o, bob: q(id.bob, 3), headTilt: q(id.headTilt, 1), tilt: q(id.tilt * 0.6, 1) }, pos, { tint }));
  }
  // villagers watching the elephant arrive / listening (life in the plaza)
  if (S.id === 'arrive') { [['vil1', 4.2, -1.6, 'cheek'], ['vil2', 5.2, -2.4, 'up'], ['vil3', -5.4, -4.4, 'wave']].forEach(([w, x, z, pose], i) => out.push(R(w, { seed: 91 + i, expr: 'smile', L: pose, R: 'hang', facing: x > 0 ? -1 : 1, blink: blinkAt(f, 91 + i), bob: q(Math.abs(Math.sin(f * 0.3 + i)) * 0.012, 3), wv: f * 0.25 }, [x, 0, z], { tint }))); }
  return out;
};

// ---------- lens ----------
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f);
  const man = (m) => dist3(C.pos, [station[m][0], 1.2, station[m][2]]);
  switch (S.id) {
    case 'hook': return { focus: dist3(C.pos, [-10.1, 1.5, 0]), cinf: lerp(12, 3, M.smooth(ramp(f, 0, 70))) };
    case 'live': return { focus: dist3(C.pos, [-9.4, 1.5, 0]), cinf: 3 };
    case 'hear': return { focus: dist3(C.pos, [-7.9, 1.5, 0]), cinf: 8 };
    case 'arrive': return { focus: dist3(C.pos, [worldAt(f).E.x + 1.5, 1.6, 0]), cinf: 2 };
    case 'curious': return { focus: dist3(C.pos, [-10.2, 1.5, 0]), cinf: 7 };
    case 'walk': return { focus: dist3(C.pos, [C.look[0], 1.2, 0]), cinf: 5 };
    case 'wall': return { focus: man(1), cinf: 9 };
    case 'tusk': return { focus: man(2), cinf: 9 };
    case 'trunk': return { focus: man(3), cinf: 9 };
    case 'leg': return { focus: man(4), cinf: 9 };
    case 'ear': return { focus: man(5), cinf: 9 };
    case 'tail': return { focus: man(6), cinf: 9 };
    case 'argue': return { focus: dist3(C.pos, [0, 1.2, 2.4]), cinf: 3 };
    case 'sageIn': case 'sageSays': return { focus: f < 1745 ? dist3(C.pos, [2.95, 1.2, 3.0]) : dist3(C.pos, [0, 1.5, 1.8]), cinf: f < 1745 ? 8 : 2 };
    case 'silent': return { focus: dist3(C.pos, [0, 1.3, 2.4]), cinf: 5 };
    case 'moral': return { focus: dist3(C.pos, [0.9, 1.5, 1.0]), cinf: f < 2020 ? 6 : 1.5 };
  }
  return { focus: 10, cinf: 0 };
};
