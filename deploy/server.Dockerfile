# Stage 1: build the server and bake the embedding model.
FROM node:22-slim AS build
WORKDIR /app
# The "prepare" script runs husky; there is no git repo in the image.
ENV HUSKY=0
COPY package.json package-lock.json ./
# Scripts stay on: onnxruntime-node downloads its Linux binary in postinstall.
RUN npm ci
COPY . .
RUN npm run build:server
# Download the MiniLM model now so the running server never needs the network.
ENV MODEL_CACHE_DIR=/app/model-cache
RUN npm run build:index

# Stage 2: runtime. The server reads db/parks.sample.json from the working directory.
FROM node:22-slim
WORKDIR /app
ENV HUSKY=0 NODE_ENV=production PORT=8080 MODEL_CACHE_DIR=/app/model-cache
COPY package.json package-lock.json ./
# Dev dependencies (husky) are not installed here, so drop the "prepare" script that runs husky.
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/db db
COPY --from=build --chown=node:node /app/model-cache model-cache
USER node
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
# Deploy from the repo root so the build context is the repo root:
#   fly deploy --config deploy/fly.rag.toml --dockerfile deploy/server.Dockerfile
