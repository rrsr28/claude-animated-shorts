// Renders frames with your Mac's GPU, several browser windows in parallel.
//   node render_local.mjs frames 0-2184        (all frames, resumes automatically if you stop and re-run)
//   node render_local.mjs stills "0,500,1470"  (a few frames, for a quick look)
// Env: WORKERS=2 (parallel browsers)  SOFTWARE=1 (force CPU rendering, very slow)
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [,, outdir, spec, step = '1'] = process.argv;
const FPS = +(process.env.FPS || 30); // output frame n shows story frame n*30/FPS (story timing is always in 30-fps frames)
const parse = (spec) => { const fr = []; for (const part of spec.split(',')) { if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let f = a; f <= b; f += +step) fr.push(f); } else fr.push(+part); } return fr; };
const name = (f) => path.join(outdir, `f${String(f).padStart(4, '0')}.jpg`);
const WORKERS = +(process.env.WORKERS || 2);

async function work(frames) {
  const root = path.join(here, 'web');
  const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(s); }).listen(0);
  await new Promise((r) => srv.on('listening', r));
  const soft = !!process.env.SOFTWARE;
  const args = soft ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
  let b; try { b = await chromium.launch({ channel: soft ? undefined : 'chromium', args }); } catch (e) { b = await chromium.launch({ args }); }
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await pg.waitForFunction(() => window.ready || window.err, null, { timeout: 240000 });
  if (await pg.evaluate(() => window.err)) { console.log('the page failed to start'); process.exit(1); }
  if (process.env.WORKER_ID === '0' || !process.env.WORKER_ID) {
    const gpu = await pg.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    console.log('graphics:', gpu, /swiftshader|software|llvmpipe/i.test(gpu) ? '  <-- WARNING: this is CPU rendering, it will be slow' : '  (GPU, good)');
  }
  const t0 = Date.now(); let n = 0;
  for (const f of frames) {
    if (fs.existsSync(name(f))) continue;
    const d = await pg.evaluate(([f, FPS]) => { window.renderFrame(f * 30 / FPS); return document.getElementById('c').toDataURL('image/jpeg', 0.96); }, [f, FPS]);
    fs.writeFileSync(name(f), Buffer.from(d.split(',')[1], 'base64')); n++;
    if (process.env.WORKER_ID === "0" && n % 25 === 0) console.log(`  ~${Math.min(frames.length * WORKERS, n * WORKERS)}/${frames.length * WORKERS} frames, ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame per window`);
  }
  await b.close(); srv.close();
}
if (process.env.WORKER_ID !== undefined) { await work(JSON.parse(process.env.WORK)); process.exit(0); }
fs.mkdirSync(outdir, { recursive: true });
const all = parse(spec).filter((f) => !fs.existsSync(name(f)));
if (!all.length) { console.log('all frames already exist'); process.exit(0); }
const w = Math.min(WORKERS, all.length), chunks = Array.from({ length: w }, (_, i) => all.filter((_, j) => j % w === i));
const t0 = Date.now(); console.log(`rendering ${all.length} frames with ${w} window(s)...`);
await Promise.all(chunks.map((c, i) => new Promise((res) => { const p = spawn(process.execPath, [fileURLToPath(import.meta.url), outdir, spec, step], { env: { ...process.env, WORKER_ID: String(i), WORK: JSON.stringify(c) }, stdio: 'inherit' }); p.on('exit', res); })));
console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
