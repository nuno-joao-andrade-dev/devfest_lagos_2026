import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SLIDES_DIR = path.resolve(__dirname, '../../slides');
const PORT = Number(process.env.SLIDES_PORT || 8080);

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' || !req.url ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(SLIDES_DIR, urlPath);

  if (!filePath.startsWith(SLIDES_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === '.html'
      ? 'text/html; charset=utf-8'
      : ext === '.svg'
        ? 'image/svg+xml'
        : ext === '.md'
          ? 'text/markdown; charset=utf-8'
          : 'text/plain; charset=utf-8';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n====================================================================');
  console.log(' 📽️  DevFest Lagos 2026 — Interactive Workshop Slide Deck');
  console.log('====================================================================');
  console.log(` 🌐 Live Web Deck   : http://localhost:${PORT}`);
  console.log(` 📄 HTML File       : ${path.join(SLIDES_DIR, 'index.html')}`);
  console.log(` 📝 Markdown Source : ${path.join(SLIDES_DIR, 'SLIDES.md')}`);
  console.log('--------------------------------------------------------------------');
  console.log(' Controls: [← / → / Space] Navigate | [S] Speaker Notes | [F] Fullscreen');
  console.log(' Press Ctrl+C to stop the slide server.');
  console.log('====================================================================\n');
});
