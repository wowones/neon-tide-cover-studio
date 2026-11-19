// Package Vice Coast Cover Studio and its gallery of Chrome captures.
// Use MAKEFUN_OUTPUT_DIR=out for a local package, or node serve.ts to preview.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const entryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gallerySource = join(entryRoot, 'screenshots');
const galleryOutput = join(outputRoot, 'screenshots');

mkdirSync(outputRoot, { recursive: true });
cpSync(join(entryRoot, 'app'), join(outputRoot, 'app'), { recursive: true });
mkdirSync(galleryOutput, { recursive: true });
if (existsSync(gallerySource)) cpSync(gallerySource, galleryOutput, { recursive: true });

// Keep the grader's entry limits unchanged.
writeFileSync(
  join(outputRoot, 'dossier.json'),
  buildDossier(outputRoot, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
