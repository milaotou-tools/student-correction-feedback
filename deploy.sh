#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-student-correction-feedback}"
REPO_URL="${REPO_URL:-https://github.com/milaotou-tools/student-correction-feedback.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_PATH="${DEPLOY_PATH:-/www/wwwroot/student-correction-feedback}"
PM2_NAME="${PM2_NAME:-student-correction-feedback}"
APP_PORT="${APP_PORT:-3002}"

echo "[deploy] app=${APP_NAME} branch=${BRANCH} path=${DEPLOY_PATH} port=${APP_PORT}"

mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"
git config --global --add safe.directory "$DEPLOY_PATH" >/dev/null 2>&1 || true
sudo chown -R "$(id -un)":"$(id -gn)" "$DEPLOY_PATH" >/dev/null 2>&1 || true

if [ ! -d ".git" ]; then
  if [ -n "$(ls -A . 2>/dev/null)" ]; then
    echo "[deploy] first deploy path is not empty: $DEPLOY_PATH"
    exit 1
  fi
  echo "[deploy] first deploy: cloning repository"
  git clone -b "$BRANCH" "$REPO_URL" .
else
  echo "[deploy] updating existing checkout"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd
fi

echo "[deploy] installing dependencies"
NPM_CACHE_DIR="${NPM_CACHE_DIR:-$HOME/.npm-cache}"
mkdir -p "$NPM_CACHE_DIR"
export npm_config_cache="$NPM_CACHE_DIR"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[deploy] installing Playwright Chromium"
if command -v dnf >/dev/null 2>&1; then
  if ! sudo dnf install -y --setopt=install_weak_deps=False --nobest --skip-broken \
    atk \
    at-spi2-atk \
    at-spi2-core \
    cairo \
    cups-libs \
    dbus-libs \
    fontconfig \
    freetype \
    glib2 \
    gtk3 \
    libdrm \
    libX11 \
    libX11-xcb \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXfixes \
    libXi \
    libXrandr \
    libXrender \
    libXScrnSaver \
    libXtst \
    libxcb \
    libxkbcommon \
    libxshmfence \
    nspr \
    nss \
    pango \
    alsa-lib \
    mesa-libgbm \
    xdg-utils \
    google-noto-sans-cjk-ttc-fonts; then
    echo "[deploy] warning: dnf dependency install returned non-zero; continuing"
  fi
  fc-cache -f >/dev/null 2>&1 || true
else
  npx playwright install-deps chromium
fi
npx playwright install chromium

echo "[deploy] building"
npm run build

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  echo "[deploy] restarting pm2 process ${PM2_NAME}"
  pm2 restart "$PM2_NAME" --update-env
else
  echo "[deploy] starting pm2 process ${PM2_NAME}"
  pm2 start npm --name "$PM2_NAME" -- run start -- --port "$APP_PORT"
fi

pm2 save
echo "[deploy] done"
