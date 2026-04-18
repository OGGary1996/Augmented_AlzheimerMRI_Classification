#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${MAIN_PID:-}" ]]; then
    kill "${MAIN_PID}" 2>/dev/null || true
  fi
  if [[ -n "${CHATBOT_PID:-}" ]]; then
    kill "${CHATBOT_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd /app/FastAPIServer

uv run --project /app/FastAPIServer uvicorn main:app --host 127.0.0.1 --port 8000 &
MAIN_PID=$!

uv run --project /app/FastAPIServer uvicorn chatbot_app:app --host 127.0.0.1 --port 8001 &
CHATBOT_PID=$!

nginx -g "daemon off;" &
NGINX_PID=$!

wait -n "${MAIN_PID}" "${CHATBOT_PID}" "${NGINX_PID}"
