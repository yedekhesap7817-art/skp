#!/usr/bin/env node
/* Kare bazlı render: index.html?render → her kare canvas'tan PNG olarak alınır → ffmpeg (H.264).
   Kullanım:
     node scripts/render.mjs                       # tam video → dist/hangi-yemege-hangi-peynir.mp4
     node scripts/render.mjs --stills 0,90,300     # seçili kareleri out/stills/ altına PNG olarak yazar
     node scripts/render.mjs --cues                # ses efekti noktalarını audio/cues.json'a yazar
   Gerekenler: Node 18+, playwright (Chromium), ffmpeg. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  const globalRoot = (await import('node:child_process')).execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(globalRoot, 'playwright')));
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);
const FPS = 30, FRAMES = 1320;
const WORKERS = +opt('--workers', 3);
const OUT = path.resolve(ROOT, opt('--out', 'dist/hangi-yemege-hangi-peynir.mp4'));
const AUDIO = path.resolve(ROOT, opt('--audio', 'audio/soundtrack.wav'));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.otf': 'font/otf', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/index.html?render`;

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL_);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  if (errors.length) { console.error('Konsol hataları:\n' + errors.join('\n')); process.exitCode = 2; }
  return page;
}
const grab = (page, i) => page.evaluate((i) => { window.renderFrame(i); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, i);

try {
  if (has('--cues')) {
    const page = await openPage();
    const data = await page.evaluate(() => window.getCues());
    fs.writeFileSync(path.join(ROOT, 'audio/cues.json'), JSON.stringify(data, null, 1));
    console.log(`audio/cues.json yazıldı (${data.cues.length} efekt, ${data.vo.length} VO yuvası)`);
  } else if (has('--stills')) {
    const frames = opt('--stills').split(',').map(Number);
    const dir = path.resolve(ROOT, opt('--dir', 'out/stills'));
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage();
    for (const f of frames) {
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(await grab(page, f), 'base64'));
    }
    console.log(`${frames.length} kare → ${dir}`);
  } else {
    // Paralel parçalar: her işçi kendi aralığını ayrı bir H.264 parçasına kodlar, sonra kayıpsız birleştirilir.
    const tmp = path.join(ROOT, 'out', 'parts');
    fs.mkdirSync(tmp, { recursive: true });
    const per = Math.ceil(FRAMES / WORKERS);
    const t0 = Date.now();
    let done = 0;
    const parts = await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * per, b = Math.min(FRAMES, a + per);
      const file = path.join(tmp, `part${w}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-x264-params', 'keyint=60', file], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const page = await openPage();
      for (let i = a; i < b; i++) {
        const buf = Buffer.from(await grab(page, i), 'base64');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (++done % 60 === 0) process.stdout.write(`\r${done}/${FRAMES} kare  (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
      }
      ff.stdin.end();
      await closed;
      return file;
    }));
    console.log(`\nKareler tamam: ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    const silent = path.join(tmp, 'video.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    if (fs.existsSync(AUDIO)) {
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '44', '-movflags', '+faststart', OUT]);
    } else {
      console.warn('Ses dosyası yok, sessiz video yazılıyor: ' + AUDIO);
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', OUT]);
    }
    console.log('Çıktı: ' + OUT);
  }
} finally {
  await browser.close();
  server.close();
}
function run(cmd, a) { return new Promise((r, j) => spawn(cmd, a, { stdio: 'inherit' }).on('close', (c) => (c === 0 ? r() : j(new Error(cmd + ' ' + c))))); }
