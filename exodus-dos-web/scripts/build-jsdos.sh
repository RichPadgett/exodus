#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PROJECT_DIR}/.." && pwd)"
SOURCE_DIR="${REPO_ROOT}/games/ExodusJo"
BUILD_DIR="${PROJECT_DIR}/.bundle-tmp"
OUTPUT_DIR="${PROJECT_DIR}/public/games"
OUTPUT_FILE="${OUTPUT_DIR}/exodus.jsdos"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Missing DOS game files at ${SOURCE_DIR}" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "The zip command is required to build exodus.jsdos." >&2
  exit 1
fi

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/.jsdos" "${BUILD_DIR}/ExodusJo" "${OUTPUT_DIR}"

cp -R "${SOURCE_DIR}/." "${BUILD_DIR}/ExodusJo/"

cat > "${BUILD_DIR}/.jsdos/dosbox.conf" <<'CONFIG'
[sdl]
fullscreen=false
fullresolution=desktop
windowresolution=original
autolock=true
sensitivity=100

[dosbox]
machine=svga_s3
memsize=64

[render]
frameskip=0
aspect=false
scaler=normal3x

[cpu]
core=auto
cputype=auto
cycles=auto

[mixer]
nosound=false
rate=44100
blocksize=1024
prebuffer=20

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
sbmixer=true
oplmode=auto

[speaker]
pcspeaker=true
tandy=auto
disney=true

[joystick]
joysticktype=auto
timed=true
autofire=false

[dos]
xms=true
ems=true
umb=true
keyboardlayout=auto

[autoexec]
mount c .
c:
cd ExodusJo
EXODUS.EXE
exit
CONFIG

(
  cd "${BUILD_DIR}"
  zip -qr "${OUTPUT_FILE}" .
)

rm -rf "${BUILD_DIR}"
echo "Created ${OUTPUT_FILE}"
