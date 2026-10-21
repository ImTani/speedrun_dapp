# Build from the repo root: docker build -f apps/runner/Dockerfile -t arena-runner .
# Secrets are mounted at runtime: /app/.env and /app/.secrets (see src/service.ts).
FROM node:24-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
COPY . .
RUN pnpm install --frozen-lockfile --filter @arena/runner... && pnpm store prune
WORKDIR /app/apps/runner
# node runs the service itself (no pnpm wrapper), so SIGTERM and the exit code reach it directly.
ENTRYPOINT ["node", "--import", "tsx", "src/service.ts"]
