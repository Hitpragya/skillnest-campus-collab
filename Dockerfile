# Single container: compiles the C++17 engine, then runs the Express API.
# Build:  docker build -t peernest-api .
# Run:    docker run -p 4000:4000 -e JWT_SECRET=... -e CORS_ORIGIN=https://your-frontend -v peernest-data:/data peernest-api

# ---- stage 1: C++ engine ----
FROM debian:bookworm-slim AS engine
RUN apt-get update && apt-get install -y --no-install-recommends g++ cmake make && rm -rf /var/lib/apt/lists/*
WORKDIR /src/engine
COPY engine/ ./
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
 && cmake --build build -j \
 && ctest --test-dir build --output-on-failure

# ---- stage 2: Node API ----
FROM node:22-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
# better-sqlite3 ships prebuilt binaries for this platform; build tools are a fallback.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && npm ci --omit=dev \
 && apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY server/src ./src
COPY --from=engine /src/engine/build/peernest_worker /app/engine/peernest_worker

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/data/peernest.sqlite \
    PEERNEST_ENGINE_PATH=/app/engine/peernest_worker
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
