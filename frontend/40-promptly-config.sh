#!/bin/sh
# Runtime config: where the browser should reach the backend.
#   API_BASE     URL or path of the backend, relative to the page (default "api/").
#   BACKEND_URL  if set (e.g. http://backend:3000), nginx proxies /api/ to it.
set -e
API_BASE="${API_BASE:-api/}"
API_BASE=$(printf '%s' "$API_BASE" | tr -d '"\\<>')
printf 'window.PW_CONFIG = { apiBase: "%s" };\n' "$API_BASE" > /usr/share/nginx/html/config.js
mkdir -p /etc/nginx/snippets
if [ -n "$BACKEND_URL" ]; then
  cat > /etc/nginx/snippets/proxy.inc <<CONF
location /api/ {
  proxy_pass ${BACKEND_URL%/}/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host \$host;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_read_timeout 1h;
  client_max_body_size 8m;
}
CONF
else
  : > /etc/nginx/snippets/proxy.inc
fi
