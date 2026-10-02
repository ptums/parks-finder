# Stage 1: build the static site.
FROM node:22-slim AS build
WORKDIR /app
# The "prepare" script runs husky; there is no git repo in the image.
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite bakes these in at build time. Only VITE_* values reach the browser.
ARG VITE_RAG_URL=""
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=""
ENV VITE_RAG_URL=$VITE_RAG_URL \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
RUN npm run build:web

# Stage 2: serve it with Caddy on 8080.
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv
EXPOSE 8080
