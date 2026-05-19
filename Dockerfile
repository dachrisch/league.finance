FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_BUILD_VERSION=dev
ARG VITE_GIT_COMMIT_HASH=unknown
ENV VITE_BUILD_VERSION=$VITE_BUILD_VERSION
ENV VITE_GIT_COMMIT_HASH=$VITE_GIT_COMMIT_HASH
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY entrypoint.sh ./
RUN ln -s . dist/client && chmod +x entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --spider -q http://localhost:3000/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
