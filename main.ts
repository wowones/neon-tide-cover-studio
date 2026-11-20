// Package the entry for make.fun: `MAKEFUN_OUTPUT_DIR=out node main.ts`.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const sourceScreenshots = join(root, 'screenshots');

function countImages(directory: string): number {
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    const stats = statSync(path);
    if (stats.isDirectory()) count += countImages(path);
    else if (stats.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name)) count++;
  }
  return count;
}

mkdirSync(output, { recursive: true });
cpSync(join(root, 'app'), join(output, 'app'), { recursive: true });

let screenshotCount = 0;
if (existsSync(sourceScreenshots)) {
  cpSync(sourceScreenshots, join(output, 'screenshots'), { recursive: true });
  screenshotCount = countImages(join(output, 'screenshots'));
}

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`Copied ${screenshotCount} screenshots; dossier ${dossier.byteLength} bytes`);
