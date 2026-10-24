#!/usr/bin/env bash
# Creates a local .env with your API key (macOS, Linux, or Git Bash on Windows).
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  echo ".env already exists, leaving it alone."
else
  printf "Paste your API key (input is hidden): "
  read -rs KEY
  echo
  if [ -z "$KEY" ]; then echo "No key entered."; exit 1; fi
  umask 077
  printf 'VITE_GEMINI_API_KEY=%s\n' "$KEY" > .env
  echo "Created .env."
fi

if [ -d .git ]; then
  chmod +x hooks/pre-commit 2>/dev/null || true
  git config core.hooksPath hooks
  echo "Commit guard turned on."
fi
