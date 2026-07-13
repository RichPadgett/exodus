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

Deploy to the Nginx location mounted at `/exodus/`:

```bash
DEPLOY_TARGET="ubuntu@server:/var/www/enochscalendar.com/exodus/" npm run deploy
```

Use `SSH_KEY` or `SSH_PORT` when the server needs a specific key or port:

```bash
DEPLOY_TARGET="ubuntu@server:/var/www/enochscalendar.com/exodus/" \
SSH_KEY="~/.ssh/id_ubuntu" \
npm run deploy
```

To preview the file sync without changing production:

```bash
DEPLOY_TARGET="ubuntu@server:/var/www/enochscalendar.com/exodus/" npm run deploy:dry-run
```

## Remote Git Deploy

If the server has this repository checked out, deploy by pulling and building on
the server:

```bash
DEPLOY_HOST="ubuntu@server" \
REMOTE_REPO_DIR="/home/ubuntu/exodus" \
REMOTE_WEB_DIR="/var/www/enochscalendar.com/exodus" \
npm run deploy:remote
```

Optional settings:

```bash
SSH_KEY="~/.ssh/id_ubuntu"
SSH_PORT="22"
REMOTE_BRANCH="master"
SKIP_REMOTE_INSTALL="true"
SKIP_REMOTE_BUNDLE="true"
DELETE_REMOTE="false"
```

The remote deploy script runs `git pull --ff-only`, installs dependencies with
`npm ci`, rebuilds the DOS bundle, builds the web app, and syncs `dist/` into
the configured Nginx web directory.
