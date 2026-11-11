// Rendert scene.html Bild für Bild und kodiert mit FFmpeg.
// Nutzung: node render.js            -> out/video_stumm.mp4
//          node render.js preview 0 45 120 ...  -> out/preview_<frame>.png
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.error('[page error]', e); process.exit(1); });
  await page.route('http://local/**', route => {
    const p = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
    route.fulfill({ body: fs.readFileSync(p), contentType: TYPES[path.extname(p)] || 'application/octet-stream' });
  });
  await page.goto('http://local/scene.html');
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const meta = await page.evaluate(() => window.META);
  const total = Math.round(meta.DURATION * meta.FPS);

  if (process.argv[2] === 'preview') {
    for (const f of process.argv.slice(3).map(Number)) {
      const url = await page.evaluate(i => window.renderFrame(i), f);
      fs.writeFileSync(path.join(OUT, `preview_${f}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
  } else {
    fs.writeFileSync(path.join(OUT, 'words.json'), JSON.stringify(meta, null, 1));
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(meta.FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', path.join(OUT, 'video_stumm.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < total; i++) {
      const url = await page.evaluate(n => window.renderFrame(n), i);
      if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) console.log(`Frame ${i}/${total}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
