#!/usr/bin/env bash
# Wrapper around `docker compose up` that fixes a GitHub Codespaces-specific
# gotcha: verification/reset/ticket emails embed an absolute link built from
# FRONTEND_URL, and if that's left at its default (http://localhost:3000),
# the link is dead for anyone opening the site through a Codespaces
# forwarded URL -- "localhost:3000" means their own machine, not the
# Codespace. Detect Codespaces (it sets CODESPACE_NAME itself) and set
# FRONTEND_URL to the real forwarded URL before starting Compose.
set -euo pipefail

if [ -z "${FRONTEND_URL:-}" ] && [ -n "${CODESPACE_NAME:-}" ]; then
  export FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  echo "Detected GitHub Codespaces -- FRONTEND_URL set to $FRONTEND_URL"
fi

exec docker compose up --build "$@"
