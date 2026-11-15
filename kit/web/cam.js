// cam.js - GENERIC camera + arm helpers for the cartoon-short kit. Keep this file as is for every story.
export const ASPECT = 9 / 16, SAFE = 0.86;   // 9:16 frame; subjects stay inside 86 % of the frame
export const B = (x, z, hw, y0, y1) => ({ x, z, hw, y0, y1 });   // subject box in world metres: centre x,z, half-width, floor y0, top y1
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const solveCam = (boxes, p) => {
  const a = p.az * Math.PI / 180, dx = Math.sin(a), dz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const b of boxes) { x0 = Math.min(x0, b.x - b.hw * Math.abs(rx)); x1 = Math.max(x1, b.x + b.hw * Math.abs(rx)); z0 = Math.min(z0, b.z - b.hw * Math.abs(rz)); z1 = Math.max(z1, b.z + b.hw * Math.abs(rz)); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); }
  const c = [(x0 + x1) / 2, (y0 + y1) / 2 + (p.ly || 0), (z0 + z1) / 2];
  const pts = []; for (const b of boxes) for (const sx of [-1, 1]) for (const y of [b.y0, b.y1]) pts.push([b.x + rx * b.hw * sx, y, b.z + rz * b.hw * sx]);
  const tv = Math.tan(p.fov * Math.PI / 360), th = tv * ASPECT;
  const worst = (d) => { const pos = [c[0] + dx * d, c[1] + p.h, c[2] + dz * d], f = norm3([c[0] - pos[0], c[1] - pos[1], c[2] - pos[2]]), r = norm3(cross3(f, [0, 1, 0])), u = cross3(r, f);
    let w = 0; for (const P of pts) { const v = [P[0] - pos[0], P[1] - pos[1], P[2] - pos[2]], z = dot3(v, f); if (z < 0.3) return 9; w = Math.max(w, Math.abs(dot3(v, r) / (z * th)), Math.abs(dot3(v, u) / (z * tv))); } return w; };
  let lo = 1.5, hi = 80; for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (worst(mid) > SAFE) lo = mid; else hi = mid; }
  const d = hi * (p.k || 1);
  return { pos: [c[0] + dx * d, c[1] + p.h, c[2] + dz * d], look: c, fov: p.fov, roll: p.roll || 0 };
};

/** Handheld/drift layer (from the reference study: the reference camera never rests). Call on every solved camera. */
export const handheld = (c, f) => {
  const pv = [c.pos[0] - c.look[0], c.pos[2] - c.look[2]], pl = Math.hypot(pv[0], pv[1]) || 1, rx = [pv[1] / pl, -pv[0] / pl];
  const dr = 0.16 * Math.sin(f * 0.031) + 0.07 * Math.sin(f * 0.083 + 2), dy = 0.07 * Math.sin(f * 0.047 + 1), dd = 0.12 * Math.sin(f * 0.021 + 3);
  c.pos = [c.pos[0] + rx[0] * dr + (pv[0] / pl) * dd, c.pos[1] + dy, c.pos[2] + rx[1] * dr + (pv[1] / pl) * dd];
  const sw = 0.05 * Math.sin(f * 0.043), sw2 = 0.035 * Math.sin(f * 0.071 + 1);
  c.look = [c.look[0] + sw, c.look[1] + sw2, c.look[2]]; c.roll = (c.roll || 0) + 0.7 * Math.sin(f * 0.037) + 0.3 * Math.sin(f * 0.11); c.fov *= 1 + 0.012 * Math.sin(f * 0.029);
  return c;
};

export const handPx = (A, P, C) => { // ray from camera through the touch point, intersected with the card plane -> hand lands exactly on the part at any camera angle
  const nx = C.pos[0] - A[0], nz = C.pos[2] - A[2], nl = Math.hypot(nx, nz) || 1, n = [nx / nl, nz / nl], r = [n[1], -n[0]];
  const den = (P[0] - C.pos[0]) * n[0] + (P[2] - C.pos[2]) * n[1], num = (A[0] - C.pos[0]) * n[0] + (A[2] - C.pos[2]) * n[1];
  const t = Math.abs(den) < 1e-4 ? 1 : num / den, Q = [C.pos[0] + (P[0] - C.pos[0]) * t, C.pos[1] + (P[1] - C.pos[1]) * t, C.pos[2] + (P[2] - C.pos[2]) * t];
  return [300 + ((Q[0] - A[0]) * r[0] + (Q[2] - A[2]) * r[1]) / 0.00225, 975 - (Q[1] - A[1]) / 0.00225]; };
export const REACH = 300; // max hand distance (design px) from the shoulder: keeps arms natural
export const clampReach = (px, side) => { const sx = 300 + side * 85, sy = 480, dx = px[0] - sx, dy = px[1] - sy, d = Math.hypot(dx, dy); return d > REACH ? [sx + dx / d * REACH, sy + dy / d * REACH] : px; };
