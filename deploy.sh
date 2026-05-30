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
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[deploy] installing Playwright Chromium"
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
