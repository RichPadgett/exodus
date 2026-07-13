# Exodus DOS Web

Small web player for the DOS version of Exodus, intended to be served at
`https://enochscalendar.com/exodus`.

The original DOS files are intentionally not committed. Build the browser bundle
from the local `games/ExodusJo` directory:

```bash
npm run bundle:game
```

That creates `public/games/exodus.jsdos`, which is ignored by Git because it
contains the original game assets.

## Development

```bash
npm install
npm run bundle:game
npm run dev
```

## Production Build

```bash
npm run bundle:game
npm run build
```

Deploy `dist/` to the Nginx location mounted at `/exodus/`.
