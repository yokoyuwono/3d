// Offline renderer: drives index.html in headless Chromium, captures frames with
// overlays and pipes them to ffmpeg.
// Usage: node tools/render.mjs --from 0 --to 160 --fps 30 --out build/part.mp4 [--scale 0.75]
//        node tools/render.mjs --stills 1,9,17 [--dir build/stills]   |   --events build/events.json
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fps = +(args.fps || 30), scale = args.scale || '1';
let from = +(args.from || 0), to = args.to;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.m4a': 'audio/mp4', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => { console.log('[pageerror]', e.message); process.exit(1); });
await page.goto(`http://localhost:${port}/${args.page || 'index.html'}?render=1&scale=${scale}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });

async function frame(t) {
  await page.evaluate((t) => window.renderAt(t), t);
  return page.screenshot({ type: 'jpeg', quality: 93 });
}

to = +(to ?? (await page.evaluate(() => window.DURATION)));
if (args.events) {
  const ev = await page.evaluate(() => ({ ...window.EVENTS, shots: window.SHOT_TIMES ?? window.EVENTS.shots }));
  fs.writeFileSync(args.events, JSON.stringify(ev, null, 1));
  console.log(JSON.stringify(ev));
} else if (args.stills) {
  fs.mkdirSync(args.dir || 'build/stills', { recursive: true });
  for (const s of args.stills.split(',')) {
    const t0 = Date.now();
    fs.writeFileSync(path.join(args.dir || 'build/stills', `t${(+s).toFixed(2).padStart(5, '0')}.jpg`), await frame(+s));
    console.log('still', s, Date.now() - t0, 'ms');
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const start = Date.now();
  for (let n = n0; n < n1; n++) {
    const buf = await frame(n / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((n - n0) % 30 === 0) {
      const el = (Date.now() - start) / 1000, done = n - n0 + 1;
      console.log(`${args.out}: frame ${n}/${n1} (${(el / done).toFixed(2)} s/frame, eta ${Math.round((el / done) * (n1 - n - 1))} s)`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await browser.close();
server.close();
