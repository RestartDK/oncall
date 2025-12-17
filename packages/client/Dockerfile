# use the official Bun image
FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# install dependencies with full workspace for frozen lockfile
FROM base AS install
COPY package.json bun.lock ./
COPY packages packages
RUN bun install --frozen-lockfile

# build server types and client
FROM install AS build
ENV NODE_ENV=production
RUN cd packages/server && bun run build:types
RUN cd packages/client && bun run build

# Production image with nginx - only copy built assets
FROM nginx:alpine AS release
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/packages/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
