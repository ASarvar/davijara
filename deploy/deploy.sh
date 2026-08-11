#!/usr/bin/env bash
# Builds the app and atomically cuts the running server over to the new
# build. Run this ON THE SERVER, from a checkout of the repo.
#
# One-time setup this script assumes is already done:
#   useradd --system --home /var/www/davijara davijara
#   mkdir -p /var/www/davijara/{releases,shared}
#   chown -R davijara:davijara /var/www/davijara
#   # then, as the davijara user, create /var/www/davijara/shared/.env with
#   # the real NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_BASE_PATH /
#   # LISTINGS_API_URL / API_USER / API_PASSWORD values (see .env.example)
#   # and: chmod 600 that file.
#   cp deploy/davijara.service /etc/systemd/system/
#   systemctl daemon-reload && systemctl enable davijara
#   # and put deploy/nginx-site-location.conf's `location /site` block into
#   # the existing davijara.uz vhost, then: nginx -t && systemctl reload nginx
#
# NOTE: neither the systemd unit nor the nginx block is re-copied by this
# script. Changing either in the repo means copying it across by hand again.
#
# Re-run this same script for every future deploy.

set -euo pipefail

APP_DIR="/var/www/davijara"
ENV_FILE="$APP_DIR/shared/.env"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$APP_DIR/releases/$(date +%Y%m%d%H%M%S)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — see the one-time setup notes at the top of this script." >&2
  exit 1
fi

cd "$REPO_DIR"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing dependencies"
# `npm install`, not `npm ci`. ci demands the lockfile be byte-exact for the
# npm version running it, and that check itself has version-to-version
# quirks: this lockfile was generated with npm 10.9.0 and `npm ci` on the
# server's 10.8.2 rejected it (EUSAGE, over transitive deps this repo does
# not even declare directly — @swc/helpers, picomatch). A plain local
# `npm install` against the same lockfile made zero changes, confirming the
# lockfile itself is fine and this was a cross-version validation false
# positive, not real drift. `install` reconciles quietly instead of hard
# failing on it — the right tradeoff for a single low-frequency-deploy
# server, where ci's extra byte-for-byte strictness buys little.
npm install

# NEXT_PUBLIC_* values are baked into the client bundle at build time, not
# read at runtime — the build step needs the real env, not just the systemd
# unit's EnvironmentFile (which only affects the running server afterward).
echo "==> Building (env from $ENV_FILE)"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
npm run build

echo "==> Assembling release at $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r .next/standalone/. "$RELEASE_DIR/"
# Not included in `standalone` by design — Next's own docs call this out.
#
# The nested path is `.next/standalone/.next/static`, matching this repo's
# DEFAULT distDir. next.config.ts lets that be overridden with
# NEXT_DIST_DIR (used locally to measure a build without a live dev server
# fighting over the same folder) — verified that with such an override the
# standalone build mirrors the custom name instead (e.g.
# `standalone/.next-prod/`). This script deliberately never sets that env
# var, so `.next/static` is the right path here; if a future CI pipeline
# does set NEXT_DIST_DIR for its own build step, this line has to change to
# match.
cp -r .next/static "$RELEASE_DIR/.next/static"
cp -r public "$RELEASE_DIR/public"

echo "==> Switching current -> $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

echo "==> Restarting service"
sudo systemctl restart davijara
sleep 1
systemctl is-active --quiet davijara && echo "davijara is running" || {
  echo "davijara failed to start — check: journalctl -u davijara -n 50" >&2
  exit 1
}

echo "==> Pruning old releases (keeping the last 5)"
cd "$APP_DIR/releases"
ls -1t | tail -n +6 | xargs -r -I{} rm -rf -- {}

echo "Done."
