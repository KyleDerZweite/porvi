#!/bin/sh
set -eu

LOCK_DIR=".porvi/locks/pnpm-install.lock"
MODULES_MARKER="node_modules/.modules.yaml"

mkdir -p .porvi/locks

if [ -f "$MODULES_MARKER" ] && [ "${FORCE_BOOTSTRAP_INSTALL:-false}" != "true" ]; then
  exec "$@"
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if mkdir "$LOCK_DIR" 2>/dev/null; then
  trap cleanup EXIT INT TERM
  echo "Bootstrapping workspace dependencies..."
  pnpm install --frozen-lockfile || pnpm install
else
  echo "Waiting for dependency bootstrap..."
  while [ -d "$LOCK_DIR" ]; do
    sleep 1
  done

  if [ ! -f "$MODULES_MARKER" ]; then
    echo "Dependency bootstrap did not complete cleanly, retrying..."
    pnpm install --frozen-lockfile || pnpm install
  fi
fi

exec "$@"
