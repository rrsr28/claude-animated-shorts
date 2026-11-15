// Framing audit: projects every character/bubble through the camera for all frames; reports who is cut by the frame edge.
import * as S from './web/story.js';
const T = { romanFront() {} };
const ASPECT = 9 / 16, N = S.TOTAL;
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function project(C) {
  const f = norm([C.look[0] - C.pos[0], C.look[1] - C.pos[1], C.look[2] - C.pos[2]]), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const tv = Math.tan(C.fov * Math.PI / 360), th = tv * ASPECT;
  return (P) => { const v = [P[0] - C.pos[0], P[1] - C.pos[1], P[2] - C.pos[2]], z = dot(v, f); if (z < 0.2) return null; return [dot(v, r) / (z * th), dot(v, u) / (z * tv)]; };
}
// visible fraction of a world-space box (corners) inside NDC [-1,1]^2
function vis(pr, cx, cz, hw, y0, y1, C) {
  const th = Math.atan2(C.pos[0] - cx, C.pos[2] - cz), r = [Math.cos(th), 0, -Math.sin(th)];
  const pts = []; for (const sx of [-1, 1]) for (const y of [y0, y1]) { const p = pr([cx + r[0] * hw * sx, y, cz + r[2] * hw * sx]); if (!p) return null; pts.push(p); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), yy0 = Math.min(...ys), yy1 = Math.max(...ys);
  const ox = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)), oy = Math.max(0, Math.min(1, yy1) - Math.max(-1, yy0));
  return (ox * oy) / ((x1 - x0) * (yy1 - yy0));
}
const rows = {};
for (let f = 0; f < N; f++) {
  const C = S.camAt(f), pr = project(C), sh = S.shotAt(f).id;
  for (const a of [...S.actorsAt(f, T, undefined)]) {
    const id = a.key.match(/^(b\d|sage|mahout|vil\d)/)[1];
    const v = vis(pr, a.x, a.z, 0.5, a.y || 0, (a.y || 0) + 1.75, C); if (v === null) continue;
    (rows[sh + ':' + id] ||= []).push([f, v]);
  }
}
const ranges = (arr, pred) => { const out = []; let s = null, p = null; for (const [f, v] of arr) { if (pred(v)) { if (s === null) s = f; p = f; } else if (s !== null) { out.push([s, p]); s = null; } } if (s !== null) out.push([s, p]); return out; };
let bad = 0;
for (const [k, arr] of Object.entries(rows)) {
  const cut = ranges(arr, (v) => v > 0.02 && v < 0.92).filter(([a, b]) => b - a >= 3);
  if (cut.length) { bad++; console.log(k.padEnd(14), 'CUT   ', cut.map(([a, b]) => `${a}-${b}`).join(' ')); }
}
console.log(bad ? `\n${bad} actor/shot pairs partly out of frame` : 'all clear');

// Arm-reach audit: hand distance from the shoulder (design px) for every man, every frame.
let longest = 0, worst = null;
for (let f = 0; f < N; f++) for (const a of S.actorsAt(f, T, undefined)) {
  const m = a.key.match(/^b\d(.*)$/); if (!m) continue; const o = JSON.parse(m[1]);
  for (const [k, side] of [['toL', -1], ['toR', 1]]) if (o[k]) { const d = Math.hypot(o[k][0] - (300 + side * 85), o[k][1] - 480); if (d > longest) { longest = d; worst = [f, a.key.slice(0, 3), k]; } }
}
console.log('longest arm reach', Math.round(longest), 'px (limit ~300) at', JSON.stringify(worst));
