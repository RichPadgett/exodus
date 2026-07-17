#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEPLOY_HOST:-}" || -z "${REMOTE_REPO_DIR:-}" || -z "${REMOTE_WEB_DIR:-}" ]]; then
  cat >&2 <<'USAGE'
Missing required remote deploy settings.

Example:
  DEPLOY_HOST="ubuntu@server" \
  REMOTE_REPO_DIR="/home/ubuntu/exodus" \
  REMOTE_WEB_DIR="/var/www/enochscalendar.com/exodus" \
  npm run deploy:remote

Optional:
  SSH_KEY="~/.ssh/id_ubuntu"
  SSH_PORT="22"
  REMOTE_BRANCH="master"
  SKIP_REMOTE_INSTALL="true"
  SKIP_REMOTE_BUNDLE="true"
  DELETE_REMOTE="false"
USAGE
  exit 1
fi

REMOTE_BRANCH="${REMOTE_BRANCH:-master}"
REMOTE_WEB_DIR="${REMOTE_WEB_DIR%/}"

SSH_ARGS=()
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_ARGS+=("-i" "${SSH_KEY/#\~/$HOME}")
fi

if [[ -n "${SSH_PORT:-}" ]]; then
  SSH_ARGS+=("-p" "${SSH_PORT}")
fi

if [[ ${#SSH_ARGS[@]} -gt 0 ]]; then
  SSH_COMMAND=(ssh "${SSH_ARGS[@]}" "${DEPLOY_HOST}")
else
  SSH_COMMAND=(ssh "${DEPLOY_HOST}")
fi

"${SSH_COMMAND[@]}" \
  "REMOTE_REPO_DIR='${REMOTE_REPO_DIR}' REMOTE_WEB_DIR='${REMOTE_WEB_DIR}' REMOTE_BRANCH='${REMOTE_BRANCH}' SKIP_REMOTE_INSTALL='${SKIP_REMOTE_INSTALL:-false}' SKIP_REMOTE_BUNDLE='${SKIP_REMOTE_BUNDLE:-false}' DELETE_REMOTE='${DELETE_REMOTE:-true}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "${REMOTE_REPO_DIR}"
git fetch origin "${REMOTE_BRANCH}"
git checkout "${REMOTE_BRANCH}"
git pull --ff-only origin "${REMOTE_BRANCH}"

cd exodus-dos-web

if [[ "${SKIP_REMOTE_INSTALL}" != "true" ]]; then
  npm ci
fi

if [[ "${SKIP_REMOTE_BUNDLE}" != "true" ]]; then
  npm run bundle:game
fi

npm run build

if [[ ! -f dist/index.html ]]; then
  echo "Remote build did not create dist/index.html" >&2
  exit 1
fi

mkdir -p "${REMOTE_WEB_DIR}"

RSYNC_ARGS=("-az")
if [[ "${DELETE_REMOTE}" == "true" ]]; then
  RSYNC_ARGS+=("--delete")
fi

rsync "${RSYNC_ARGS[@]}" dist/ "${REMOTE_WEB_DIR}/"
REMOTE_SCRIPT

echo "Remote deploy complete on ${DEPLOY_HOST}:${REMOTE_WEB_DIR}"
