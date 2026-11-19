# Neon Tide — Cover Studio

Open `app/index.html` in desktop Chrome. Everything is local: no installation,
network, account, or upload. Alternatively run `node serve.ts --port 8080`.

Drop one or more photos, write your title, and export a PNG. Click a panel or
P1–P4 to select it; drag its image, adjust focus/zoom, or click a library photo
to replace it. Three compositions, four grades, optional printed details,
portrait/square/landscape previews, and Undo are included.

Exports: 1080×1080, 1080×1350, 1920×1080. Each size gets a new aspect-aware
render, not a stretched preview. Images stay in browser memory.

`shots.json` describes the four screenshots. `?shot=cover` hides the studio;
`?shot=editor` preserves it. Both accept `photo`, `caption`, `subtitle`,
`layout`, and `grade`; `window.__shotReady` signals completion.

The Canvas artwork uses original panel layouts, hand-drawn geometry and
lettering treatments. It contains no official game art, logos or fonts.
The two bundled sample photos were supplied with the starter and are free to
use. The four fonts are SIL OFL 1.1; see `app/fonts/LICENSE-OFL.txt`. The
`.min.js` asset files are generated local font/photo buffers for Chrome's
file mode; the original fonts and JPEGs are alongside them. Renderer and UI
source are plain JavaScript. Root source license: MIT.

Package: set `MAKEFUN_OUTPUT_DIR` then run `node main.ts`. It copies `app/`
and `screenshots/` and builds the dossier using the untouched vendored tool.
