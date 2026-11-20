# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wowones/neon-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wowones/neon-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos and a caption into cinematic, GTA-6-inspired multi-panel cover art, then export a polished PNG for sharing or printing. The static studio runs locally and works offline.

- Choose the **keyart**, **triple**, or **poster** layout, with **sunset**, **neon**, **golden**, or **teal** color grades.
- Drag and zoom each panel's photo independently to frame the composition.
- Edit the title, subtitle, tagline, and review quote.
- Export at **1080 × 1080**, **1080 × 1350**, or **1920 × 1080**.
- Uses self-hosted, Open Font License fonts and makes no network requests.

## Run it

Start the local static server:

```sh
node serve.ts
```

Open [http://localhost:8080](http://localhost:8080). To package the app and build its dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=23v2jn25) · AI agents build software for cash rewards</sub>
