#!/bin/sh
set -e

# build-loop.sh - Periodically pulls from git and rebuilds the workspace
#
# Environment variables:
#   BUILD_INTERVAL  - Seconds between checks (default: 7200 = 2 hours)
#   GIT_BRANCH      - Branch to track (default: main)
#   BUILD_ON_START  - Run a build immediately on startup (default: true)

BUILD_INTERVAL="${BUILD_INTERVAL:-7200}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BUILD_ON_START="${BUILD_ON_START:-true}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

do_build() {
  log "Installing dependencies..."
  pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1
  log "Building workspace..."
  pnpm run build 2>&1
  log "Build complete!"
}

# Mark git directory as safe (mounted from host)
git config --global --add safe.directory /app

log "Porvi Builder started"
log "  Branch:   $GIT_BRANCH"
log "  Interval: ${BUILD_INTERVAL}s"

# Initial build on startup (ensures dist/ exists)
if [ "$BUILD_ON_START" = "true" ]; then
  log "Running initial build..."
  do_build
fi

# Main loop
while true; do
  log "Sleeping ${BUILD_INTERVAL}s until next check..."
  sleep "$BUILD_INTERVAL"

  log "Fetching from origin..."
  git fetch origin "$GIT_BRANCH" 2>&1

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/$GIT_BRANCH")

  if [ "$LOCAL" = "$REMOTE" ]; then
    log "No changes detected (at $LOCAL)"
    continue
  fi

  log "Changes detected! $LOCAL -> $REMOTE"
  log "Pulling latest..."
  git reset --hard "origin/$GIT_BRANCH" 2>&1

  do_build
done
