#!/usr/bin/env bash
# Grep gate: fails if code reintroduces vendors/APIs outside the approved stack (Netlify + Supabase + OpenAI Responses).
set -u
cd "$(dirname "$0")/.."
FAIL=0
check() {
  local label="$1" pattern="$2"; shift 2
  local hits
  hits=$(grep -rniE "$pattern" "$@" --include=*.ts --include=*.tsx --include=*.js --include=*.cjs --include=*.mjs --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=public_dist --exclude-dir=docs --exclude-dir=tests --exclude=check-stack.sh --exclude=_validation.js 2>/dev/null | grep -v "^src/tests/" || true)
  if [ -n "$hits" ]; then echo "✗ $label"; echo "$hits" | head -8; FAIL=1; else echo "✓ $label"; fi
}
SRC="src lib netlify supabase/functions scripts"
check "agentmail"                    'agentmail'                                   $SRC
check "chat/completions"             'chat/completions'                            $SRC
check "max_tokens"                   '\bmax_tokens\b'                              $SRC
check "browser OpenAI key"           'VITE_OPENAI|dangerouslyAllowBrowser'         src lib
check "legacy model ids"             "gpt-(3\.5|4o|4-turbo|5\.[0-9]-(thinking|instant))" src lib netlify supabase/functions
check "Assistants threads"           'beta\.(threads|agents)'                      $SRC
check "Gemini / Gemma"               'gemini|gemma|generativelanguage'             $SRC
check "Zapier / Zoom / Unipile"      'zapier|unipile|zoom\.us'                     $SRC
check "Vercel AI SDK"                '@ai-sdk|from .ai.'                           src lib netlify
# Direct OpenAI HTTP calls are only allowed in the shared helpers (everything else goes through them).
# Exception: conversational-ai.service.ts posts its WebRTC SDP offer to /v1/realtime/calls using ONLY an ephemeral client secret minted by netlify/functions/realtime-token.js (never an API key).
direct=$(grep -rnE "api\.openai\.com" src lib netlify supabase/functions scripts --include=*.ts --include=*.tsx --include=*.js --include=*.cjs 2>/dev/null | grep -vE "^(lib/core/openaiClient\.ts|supabase/functions/_shared/openai\.ts|netlify/functions/_responses\.js|scripts/check-stack\.sh|src/tests/|lib/core/callOpenAI\.ts|lib/core/responsesClient\.ts|lib/core/streaming\.ts|src/services/conversational-ai\.service\.ts)" || true)
if [ -n "$direct" ]; then echo "✗ direct api.openai.com calls outside shared helpers"; echo "$direct" | head -8; FAIL=1; else echo "✓ direct api.openai.com calls"; fi
exit $FAIL
