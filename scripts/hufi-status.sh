#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }

check_http() {
  local label="$1"
  local url="$2"
  shift 2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$@" "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    ok "$label — HTTP $code"
  elif [[ "$code" == "000" ]]; then
    fail "$label — Nicht erreichbar"
  else
    warn "$label — HTTP $code"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HufiApp Status-Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "▶ Prozesse (PM2)"
if command -v pm2 &>/dev/null; then
  pm2 list --no-color 2>/dev/null | grep -E "name|online|stopped|errored" || warn "PM2 keine Prozesse"
else
  warn "PM2 nicht installiert"
fi

echo ""
echo "▶ nginx"
if nginx -t 2>/dev/null; then
  ok "nginx Konfiguration gültig"
else
  fail "nginx Konfiguration fehlerhaft"
fi

echo ""
echo "▶ Lokale Services"
check_http "Ollama direkt (11434)"  "http://127.0.0.1:11434/api/tags"
check_http "Piper TTS (5003)"       "http://127.0.0.1:5003/health"
# Whisper nutzt /transcribe (POST) — kein /health Endpoint implementiert
WHISPER_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:5000/transcribe" 2>/dev/null)
if [[ "$WHISPER_CODE" == "400" || "$WHISPER_CODE" == "422" || "$WHISPER_CODE" == "200" ]]; then
  ok "Whisper STT (5000/transcribe) — erreichbar (HTTP $WHISPER_CODE)"
elif [[ "$WHISPER_CODE" == "405" ]]; then
  ok "Whisper STT (5000/transcribe) — Endpoint vorhanden (405 = POST erwartet)"
else
  fail "Whisper STT (5000/transcribe) — HTTP $WHISPER_CODE"
fi

echo ""
echo "▶ nginx Proxys (HTTPS)"
check_http "Ollama via nginx HTTPS" \
  "https://127.0.0.1/api/ollama/api/tags" -k -H "Host: hufiapp.de"
check_http "TTS via nginx HTTPS" \
  "https://127.0.0.1/api/local-tts" -k -H "Host: hufiapp.de" -X POST

echo ""
echo "▶ Ollama Chat Test"
CHAT_CODE=$(curl -s -k -o /tmp/hufi_chat_test.txt -w "%{http_code}" \
  -H "Host: hufiapp.de" \
  -H "Content-Type: application/json" \
  https://127.0.0.1/api/ollama/api/chat \
  -d '{"model":"hufiai-fast","messages":[{"role":"user","content":"Antworte nur mit: OK"}],"stream":false}' 2>/dev/null || echo "000")

if [[ "$CHAT_CODE" == "200" ]]; then
  RESPONSE=$(cat /tmp/hufi_chat_test.txt | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',{}).get('content','?')[:40])" 2>/dev/null || echo "?")
  ok "Ollama Chat — Antwort: $RESPONSE"
else
  fail "Ollama Chat — HTTP $CHAT_CODE"
fi

echo ""
echo "▶ Supabase Edge Function: hufi-agent"
SUPABASE_URL="${VITE_SUPABASE_URL:-}"
if [[ -f "$(dirname "$0")/../.env" ]]; then
  SUPABASE_URL=$(grep VITE_SUPABASE_URL "$(dirname "$0")/../.env" | cut -d= -f2 | tr -d '"' || echo "")
fi

if [[ -n "$SUPABASE_URL" ]]; then
  EDGE_CODE=$(curl -s -o /tmp/hufi_edge_test.txt -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/functions/v1/hufi-agent" \
    -H "Content-Type: application/json" \
    -d '{"text":"test"}' 2>/dev/null || echo "000")
  if [[ "$EDGE_CODE" == "401" ]]; then
    ok "hufi-agent Edge Function erreichbar (401 = Auth fehlt, korrekt)"
  elif [[ "$EDGE_CODE" == "200" ]]; then
    ok "hufi-agent Edge Function antwortet"
  elif [[ "$EDGE_CODE" == "404" ]]; then
    fail "hufi-agent Edge Function nicht deployed (404)"
  else
    warn "hufi-agent Edge Function — HTTP $EDGE_CODE"
    cat /tmp/hufi_edge_test.txt 2>/dev/null | head -3
  fi
else
  warn "VITE_SUPABASE_URL nicht gefunden — Edge Function Test übersprungen"
fi

echo ""
echo "▶ Deploy-Verzeichnis"
if [[ -d "/var/www/hufiapps/v25" ]]; then
  INDEX=$(ls -la /var/www/hufiapps/v25/index.html 2>/dev/null && echo "vorhanden" || echo "fehlt")
  ok "Deploy-Verzeichnis: $INDEX"
else
  fail "Deploy-Verzeichnis /var/www/hufiapps/v25 nicht gefunden"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
