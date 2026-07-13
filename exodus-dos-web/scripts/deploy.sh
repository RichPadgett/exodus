#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${PROJECT_DIR}/dist"

if [[ -z "${DEPLOY_TARGET:-}" ]]; then
  cat >&2 <<'USAGE'
Missing DEPLOY_TARGET.

Example:
  DEPLOY_TARGET="ubuntu@server:/var/www/enochscalendar.com/exodus/" npm run deploy

Optional:
  SSH_KEY="~/.ssh/id_ubuntu"
  SSH_PORT="22"
  SKIP_BUILD="true"
  DRY_RUN="true"
  DELETE_REMOTE="false"
USAGE
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "The rsync command is required for deployment." >&2
  exit 1
fi

if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  npm run build
fi

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "Missing build output at ${DIST_DIR}. Run npm run build first." >&2
  exit 1
fi

SSH_ARGS=()
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_ARGS+=("-i" "${SSH_KEY/#\~/$HOME}")
fi

if [[ -n "${SSH_PORT:-}" ]]; then
  SSH_ARGS+=("-p" "${SSH_PORT}")
fi

RSYNC_ARGS=("-az" "--human-readable" "--info=stats2,progress2")

if [[ "${DELETE_REMOTE:-true}" == "true" ]]; then
  RSYNC_ARGS+=("--delete")
fi

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  RSYNC_ARGS+=("--dry-run")
fi

if [[ ${#SSH_ARGS[@]} -gt 0 ]]; then
  RSYNC_ARGS+=("-e" "ssh ${SSH_ARGS[*]}")
fi

rsync "${RSYNC_ARGS[@]}" "${DIST_DIR}/" "${DEPLOY_TARGET}"

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "Dry run complete. No files were changed."
else
  echo "Deployed ${DIST_DIR}/ to ${DEPLOY_TARGET}"
fi
