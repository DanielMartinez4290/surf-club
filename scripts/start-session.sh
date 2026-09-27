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

# 3. Metro with hot reload; --ios opens the installed dev-client build on the booted simulator
echo "==> Starting Metro"
npx expo start --dev-client --ios
