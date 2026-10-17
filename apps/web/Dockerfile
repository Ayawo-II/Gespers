# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV pnpm_config_fetch_timeout=300000
ENV pnpm_config_fetch_retries=5
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter web

FROM deps AS dev
COPY apps/web ./apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "exec", "next", "dev", "-H", "0.0.0.0"]
