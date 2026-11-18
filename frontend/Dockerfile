FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security.conf /etc/nginx/snippets/security.conf
COPY --chmod=755 40-promptly-config.sh /docker-entrypoint.d/40-promptly-config.sh
COPY public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
