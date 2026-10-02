#!/usr/bin/env bash
# Starts a dev session: iOS simulator, DB tunnel for Sequel Ace, and Metro (hot reload).
# Usage: npm run session   (Ctrl+C stops Metro and closes the tunnel)
set -euo pipefail

cd "$(dirname "$0")/.."

SIM_NAME="${SIM_NAME:-iPhone 14 Pro}"
AWS_REGION="us-east-1"
TUNNEL_TARGET="i-0667b765ea308d425"
TUNNEL_LOCAL_PORT=13306
TUNNEL_LOG=".expo/db-tunnel.log"
TUNNEL_PID=""

cleanup() {
  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "==> Closing DB tunnel"
    pkill -P "$TUNNEL_PID" 2>/dev/null || true   # the running aws ssm session
    kill "$TUNNEL_PID" 2>/dev/null || true       # the reconnect loop
  fi
}
trap cleanup EXIT INT TERM

# 1. Simulator
echo "==> Booting simulator: $SIM_NAME"
xcrun simctl boot "$SIM_NAME" 2>/dev/null || true   # no-op if already booted
open -a Simulator
# boot returns before iOS is ready; wait so Expo's openurl doesn't time out on a cold boot
xcrun simctl bootstatus "$SIM_NAME" -b >/dev/null

# 2. DB tunnel (localhost:13306 -> RDS/MySQL via SSM)
if lsof -iTCP:"$TUNNEL_LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> DB tunnel already listening on localhost:$TUNNEL_LOCAL_PORT, skipping"
else
  echo "==> Checking AWS credentials"
  if ! aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "!! AWS credentials not valid — log in (e.g. 'aws sso login') and re-run." >&2
    exit 1
  fi

  echo "==> Starting DB tunnel on localhost:$TUNNEL_LOCAL_PORT (log: $TUNNEL_LOG)"
  mkdir -p "$(dirname "$TUNNEL_LOG")"
  # SSM drops idle sessions after ~20 min, so reconnect whenever the session ends
  (
    while true; do
      aws ssm start-session \
        --target "$TUNNEL_TARGET" \
        --region "$AWS_REGION" \
        --document-name AWS-StartPortForwardingSessionToRemoteHost \
        --parameters "{\"host\":[\"172.18.0.2\"],\"portNumber\":[\"3306\"],\"localPortNumber\":[\"$TUNNEL_LOCAL_PORT\"]}" \
        < /dev/null || true
      echo "$(date '+%H:%M:%S') tunnel session ended, reconnecting in 2s"
      sleep 2
    done
  ) >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  for _ in {1..15}; do
    lsof -iTCP:"$TUNNEL_LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
      echo "!! DB tunnel exited early. See $TUNNEL_LOG" >&2
      exit 1
    fi
    sleep 1
  done
  echo "   Sequel Ace: host 127.0.0.1, port $TUNNEL_LOCAL_PORT (password: npm run db:password)"
fi

# 3. Stop any dev server left over from an earlier session, so this one gets port 8081 and
#    picks up the current app.config.js / .env (an old Metro keeps serving stale config).
METRO_PORT=8081
OLD_PIDS=$(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$OLD_PIDS" ]]; then
  for pid in $OLD_PIDS; do
    cmd=$(ps -o command= -p "$pid" 2>/dev/null || true)
    # Only stop Node dev servers; leave anything else on the port alone.
    if [[ "$cmd" != *node* ]]; then
      echo "!! Port $METRO_PORT is used by something other than a dev server: $cmd" >&2
      echo "   Stop it yourself and re-run." >&2
      exit 1
    fi
    echo "==> Stopping previous dev server (pid $pid)"
    kill "$pid" 2>/dev/null || true
  done
  for _ in {1..10}; do
    lsof -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
    sleep 1
  done
  # Force it if it ignored the polite signal.
  for pid in $(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN 2>/dev/null || true); do
    kill -9 "$pid" 2>/dev/null || true
  done
fi

# 4. Metro with hot reload; --ios opens the installed dev-client build on the booted simulator
echo "==> Starting Metro"
npx expo start --dev-client --ios
