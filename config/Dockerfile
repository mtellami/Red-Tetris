FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

FROM base AS build
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY config/tsconfig*.json config/
COPY client/ client/
COPY server/ server/
COPY game-core/ game-core/
RUN pnpm build:server && pnpm build:client

FROM base AS production
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile \
    && mkdir /app/data \
    && chown node:node /app/data
COPY --from=build /app/dist/ dist/
COPY --from=build /app/client/dist/ client/dist/
USER node
EXPOSE 3000
CMD ["node", "dist/server/src/main.js"]
