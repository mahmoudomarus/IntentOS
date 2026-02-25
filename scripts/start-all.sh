#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────
# Intent OS — Full Stack Startup
# Starts: OpenClaw Gateway + Token Server + Expo Frontend
# ──────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GATEWAY_DIR="$ROOT_DIR/openclaw"
BACKEND_DIR="$ROOT_DIR/backend"
MOBILE_DIR="$ROOT_DIR/mobile"

GATEWAY_PORT="${GATEWAY_PORT:-18789}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
EXPO_PORT="${EXPO_PORT:-8081}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[start-all]${NC} $1"; }
ok()  { echo -e "${GREEN}[start-all]${NC} $1"; }
warn(){ echo -e "${YELLOW}[start-all]${NC} $1"; }
err() { echo -e "${RED}[start-all]${NC} $1"; }

# ── Kill previous instances ──────────────────────────

cleanup() {
  log "Shutting down services..."
  kill "$GW_PID" "$BE_PID" "$FE_PID" 2>/dev/null || true
  wait "$GW_PID" "$BE_PID" "$FE_PID" 2>/dev/null || true
  ok "All services stopped."
}
trap cleanup EXIT INT TERM

kill_port() {
  local port=$1
  local pid
  pid=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    warn "Killing existing process on port $port (PID: $pid)"
    kill -9 "$pid" 2>/dev/null || true
    sleep 0.5
  fi
}

kill_port "$GATEWAY_PORT"
kill_port "$BACKEND_PORT"
kill_port "$EXPO_PORT"

# ── Start OpenClaw Gateway ───────────────────────────

log "Starting OpenClaw Gateway on ws://127.0.0.1:$GATEWAY_PORT ..."
cd "$GATEWAY_DIR"
node openclaw.mjs gateway --port "$GATEWAY_PORT" &
GW_PID=$!

# Wait for gateway to be ready
for i in $(seq 1 20); do
  if lsof -ti:"$GATEWAY_PORT" >/dev/null 2>&1; then
    ok "Gateway ready (PID: $GW_PID)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    err "Gateway failed to start within 20s"
    exit 1
  fi
  sleep 1
done

# ── Start Token Server (Next.js backend) ─────────────

log "Starting token server on http://127.0.0.1:$BACKEND_PORT ..."
cd "$BACKEND_DIR"
PORT="$BACKEND_PORT" npx next dev --port "$BACKEND_PORT" &
BE_PID=$!

# Wait for backend to be ready
for i in $(seq 1 30); do
  if curl -s "http://127.0.0.1:$BACKEND_PORT" >/dev/null 2>&1; then
    ok "Token server ready (PID: $BE_PID)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "Token server may still be starting..."
  fi
  sleep 1
done

# ── Start Expo Frontend ──────────────────────────────

log "Starting Expo frontend on http://127.0.0.1:$EXPO_PORT ..."
cd "$MOBILE_DIR"
npx expo start --web --port "$EXPO_PORT" &
FE_PID=$!

echo ""
ok "═══════════════════════════════════════════════"
ok "  Intent OS is running!"
ok "═══════════════════════════════════════════════"
ok "  Gateway:  ws://127.0.0.1:$GATEWAY_PORT"
ok "  Token:    http://127.0.0.1:$BACKEND_PORT"
ok "  Frontend: http://127.0.0.1:$EXPO_PORT"
ok "═══════════════════════════════════════════════"
echo ""
log "Press Ctrl+C to stop all services."
echo ""

# Wait for any process to exit
wait -n "$GW_PID" "$BE_PID" "$FE_PID" 2>/dev/null || true
