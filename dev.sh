#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Linefire local dev launcher
# Usage: ./dev.sh [port]   (default: 4173)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PORT="${1:-4173}"
VITE="./node_modules/.bin/vite"

echo "🔫  Linefire dev server"
echo "────────────────────────"

# Kill any lingering vite processes
echo "⏹  Stopping previous Vite instances..."
pkill -9 -f "vite" 2>/dev/null || true
sleep 0.5

# Verify we're in the right place
if [[ ! -f "$VITE" ]]; then
  echo "❌  Vite not found. Run 'npm install' first."
  exit 1
fi

echo "🚀  Starting Vite on http://localhost:${PORT}"
echo ""
exec "$VITE" --port "$PORT" --host
