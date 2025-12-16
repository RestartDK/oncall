# use the official Bun image
FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# install dependencies with full workspace for frozen lockfile
FROM base AS install
COPY package.json bun.lock ./
COPY packages packages
RUN bun install --frozen-lockfile

# Production image - only copy what's needed to run
FROM base AS release
COPY --from=install /usr/src/app/node_modules node_modules
COPY --from=install /usr/src/app/package.json .
COPY --from=install /usr/src/app/packages/server packages/server

EXPOSE 3000
WORKDIR /usr/src/app/packages/server
CMD ["bun", "run", "src/index.ts"]
