# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wowones/neon-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wowones/neon-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos and a caption into multi-panel cover art in the style of GTA 6's posters — the Vice City sunset / neon grade, bold 3D lettering, starburst seal, review banner, palm footer and credit strip. Everything runs locally in a desktop browser from its own static files; your photos never leave the machine.

- Multi-panel tilted-gutter collage with face-aware crops, per-panel drag-to-reposition and zoom.
- Editable title, brush-script signature, tagline and review quote.
- Three layouts (Key Art, Triple, Poster) and four color grades (Sunset, Neon Night, Golden, Teal).
- Aspect-aware renderer with auto-fitting 3D title; exports PNG at **1080×1080**, **1080×1350** and **1920×1080**.
- Self-hosted OFL fonts (Archivo Black, Anton, Mr Dafoe, Pacifico). No Rockstar logo, artwork or fonts. No network requests, no libraries.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Package the entry (Node 22.18+):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=23v2jn25&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>