# ============================================================================
# FITMATE FRONTEND DOCKERFILE (Vanilla JS Bundle + Unprivileged Nginx)
# Stage 1 builds bundle.js reproducibly via build.py
# Stage 2 serves static assets + reverse-proxies /api/ to backend:8000
# ============================================================================

FROM python:3.12-slim AS builder

WORKDIR /src
COPY . .
RUN python build.py


FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /src/index.html /usr/share/nginx/html/index.html
COPY --from=builder --chown=nginx:nginx /src/bundle.js /usr/share/nginx/html/bundle.js
COPY --from=builder --chown=nginx:nginx /src/styles /usr/share/nginx/html/styles
COPY --from=builder --chown=nginx:nginx /src/assets /usr/share/nginx/html/assets
COPY --from=builder --chown=nginx:nginx /src/config /usr/share/nginx/html/config
COPY --from=builder --chown=nginx:nginx /src/components /usr/share/nginx/html/components
COPY --from=builder --chown=nginx:nginx /src/pages /usr/share/nginx/html/pages
COPY --from=builder --chown=nginx:nginx /src/routes /usr/share/nginx/html/routes
COPY --from=builder --chown=nginx:nginx /src/services /usr/share/nginx/html/services
COPY --from=builder --chown=nginx:nginx /src/state /usr/share/nginx/html/state

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:5173/nginx-health || exit 1
