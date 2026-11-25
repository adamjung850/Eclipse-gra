import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const items = ['index.html', 'css', 'js', 'lib', 'assets'];
for (const item of items) {
  const src = path.join(root, item);
  const dst = path.join(dist, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
  }
}

console.log('Prepared dist/ for Tauri.');
