# Build from the repo root: docker build -f apps/runner/Dockerfile -t arena-runner .
# Secrets are mounted at runtime: /app/.env and /app/.secrets (see src/service.ts).
FROM node:24-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
COPY . .
RUN pnpm install --frozen-lockfile --filter @arena/runner...
CMD ["pnpm", "--filter", "@arena/runner", "service"]
