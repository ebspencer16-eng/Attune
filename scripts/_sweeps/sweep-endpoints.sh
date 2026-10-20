#!/bin/bash
# Sweep: every endpoint, from outside, with no credentials.
# A 401/403/405/400 is the endpoint working. A 500 is the endpoint broken
# before any line of it ran, which is what found admin-posts and admin-presets.
BASE="https://www.attune-relationships.com"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
for f in api/*.js; do
  n=$(basename "$f" .js)
  case "$n" in _*) continue;; esac
  code=$(curl -s -o /tmp/body.$$ -w "%{http_code}" -A "$UA" -m 25 "$BASE/api/$n")
  size=$(wc -c < /tmp/body.$$ | tr -d ' ')
  flag=""
  case "$code" in
    5*) flag="  <-- 5xx";;
    000) flag="  <-- no answer";;
  esac
  if grep -qi "security-checkpoint" /tmp/body.$$ 2>/dev/null; then flag="  <-- bot checkpoint, not the endpoint"; fi
  printf "%-34s %s  %6sB%s\n" "$n" "$code" "$size" "$flag"
  rm -f /tmp/body.$$
done
