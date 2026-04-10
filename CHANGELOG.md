# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.4](https://github.com/dachrisch/league.finance/compare/v0.1.3...v0.1.4) (2026-04-10)

### [0.1.3](https://github.com/dachrisch/league.finance/compare/v0.1.2...v0.1.3) (2026-04-09)


### Bug Fixes

* correct docker test environment and build args for leagues.finance ([bff31e8](https://github.com/dachrisch/league.finance/commit/bff31e8dbbe252330c6ae94ffc76e0fc14f52942))

### [0.1.2](https://github.com/dachrisch/league.finance/compare/v0.1.1...v0.1.2) (2026-04-09)


### Features

* add version tag to footer ([923de2d](https://github.com/dachrisch/league.finance/commit/923de2dba9c1b3da7e0f8c801b6c1302d2fb172e))

### 0.1.1 (2026-04-09)


### Features

* add /health endpoint and start server before mongo connects ([25fcf8f](https://github.com/dachrisch/league.finance/commit/25fcf8f7201d39b1ae59623785db4bcd29be7848))
* add CI/CD workflow for testing and Docker Hub push ([03d8a0f](https://github.com/dachrisch/league.finance/commit/03d8a0ffdf857ff0219e260148ea92a868286189))
* add Footer component and sticky footer styles ([802f3ae](https://github.com/dachrisch/league.finance/commit/802f3ae1f2466dc37425d39ff9e06f7bf17a1d43))
* add health module with db status tracking ([ec95465](https://github.com/dachrisch/league.finance/commit/ec95465babfdaddef5e748e350e2442f96ccdf15))
* add SVG favicon (trophy with euro sign) ([c1a1bc5](https://github.com/dachrisch/league.finance/commit/c1a1bc5bc6466d981ca3b56d74590b7f9b6d0e6a))
* discounts, dashboard, and calculate tRPC routers ([c6c60be](https://github.com/dachrisch/league.finance/commit/c6c60bed47dd1cbfa5ed61ec172bb79b4ebfa696))
* finance calculation engine with full test coverage (TDD) ([0f6164e](https://github.com/dachrisch/league.finance/commit/0f6164ebbb91bc3afc5432aa88dca267be9bd8fe))
* finance settings and configs tRPC routers ([9fa646f](https://github.com/dachrisch/league.finance/commit/9fa646f3ff8aaf22ba8c2470383f82296c31eb71))
* full client implementation with tRPC, React Query, and production Docker setup ([32c7d8b](https://github.com/dachrisch/league.finance/commit/32c7d8b42298349dd638ef8f41f11d4132c44fad))
* Google OAuth2 strategy, Express app entry, JWT issuance ([90eb381](https://github.com/dachrisch/league.finance/commit/90eb381105cffc49876b103080578e36522633ed))
* implement responsive design for mobile friendliness ([997a28f](https://github.com/dachrisch/league.finance/commit/997a28ffea2a31b312cadbd81f792ec1a43ceb21))
* integrate Footer into App layout ([7b7f6ae](https://github.com/dachrisch/league.finance/commit/7b7f6ae7d93b80176b374d1479cbdd62761044d4))
* merged AppRouter and refactored finance routers to use data fetcher ([96bd483](https://github.com/dachrisch/league.finance/commit/96bd4831f4caa7549f988cae62bad2b2f5a41ed9))
* Mongoose models for User, FinancialConfig, Discount, FinancialSettings ([806639f](https://github.com/dachrisch/league.finance/commit/806639f46327911e177135b9410b09f33f7bb640))
* MySQL pool and MongoDB connection helpers ([b4501f1](https://github.com/dachrisch/league.finance/commit/b4501f11c5e0dc572beb136ff74c33a97aa8e3f3))
* seasonal dashboard grouping with unified accordion structures and documentation ([0966e0d](https://github.com/dachrisch/league.finance/commit/0966e0dcb9f38943ac287a0973d44c05d3ae4253))
* shared Zod schemas and inferred types ([0942695](https://github.com/dachrisch/league.finance/commit/0942695dbd5d22ca73faccd0a7b1d8d42ebf577c))
* show info screen when database is down ([f272a10](https://github.com/dachrisch/league.finance/commit/f272a1003f414361283ad27cda141f2139c4b126))
* teams tRPC router — leagues, seasons, byLeagueSeason from MySQL ([455518b](https://github.com/dachrisch/league.finance/commit/455518bbc6be316568fd802c7bd55f797007f293))
* tRPC init with JWT context, protected and admin procedures ([5270f56](https://github.com/dachrisch/league.finance/commit/5270f56c50a3afdacff00d1155c11c1f54e6bef7))


### Bug Fixes

* add retry logic for MongoDB connection ([6d0a48a](https://github.com/dachrisch/league.finance/commit/6d0a48acded7bf1fac6bac959233e819ed154990))
* add symlink and healthcheck to Dockerfile ([2da7d05](https://github.com/dachrisch/league.finance/commit/2da7d054e45b3e77994f5a1b7ce0b1f2f7f66073))
* atomic getOrCreateSettings, min:0 on count fields, configId index on Discount ([9eba215](https://github.com/dachrisch/league.finance/commit/9eba2153224fab4511738ff833cdc862191fb987))
* atomic settings update, NOT_FOUND guard on config delete ([a8d80f5](https://github.com/dachrisch/league.finance/commit/a8d80f571e6d364e1a639d37f82036eabf4f9d3a))
* clean up corrupted src/server/index.ts and suppress tsconfig deprecations ([83ac07e](https://github.com/dachrisch/league.finance/commit/83ac07e04e2198639e632d36d0a0ff29f4804b21))
* extract createApp() and fix /*splat wildcard for Express 5 / path-to-regexp v8 ([3d16e92](https://github.com/dachrisch/league.finance/commit/3d16e925321bd887513818221526b5ee62ff2ad2))
* guard connectMongo against double-invocation, redact URI in logs ([f9c042e](https://github.com/dachrisch/league.finance/commit/f9c042e3388279b3c5e364dc418b00e9a8754f2e))
* ignore client secret JSON, fix typecheck script, match @types/express to v4 ([bc516a0](https://github.com/dachrisch/league.finance/commit/bc516a0f9423b2e30fcdd11d9e3975f3ed3d97b7))
* implement global 401 UNAUTHORIZED redirect in QueryClient ([3469be3](https://github.com/dachrisch/league.finance/commit/3469be36bb9518ea7af67af839df10639b7a9548))
* make TeamSchema.description nullable to handle MySQL null values ([6328ab8](https://github.com/dachrisch/league.finance/commit/6328ab83aa350ee084a8bf431ff83430a006c93c))
* pass required env vars to docker test and handle container crash gracefully ([628c794](https://github.com/dachrisch/league.finance/commit/628c794cc56f0f9f36dbaabaa3ad43f1ff625dfa))
* point HEALTHCHECK at /health endpoint ([f9b74e4](https://github.com/dachrisch/league.finance/commit/f9b74e4f4ab93f64d7eaf79b1285c1507870e6dd))
* rename client auth callback to /login/callback to avoid Vite proxy conflict ([9f7da45](https://github.com/dachrisch/league.finance/commit/9f7da455066b37a58b1bb59db1617f5d6e46bdba))
* replace bare * wildcard with (.*) for path-to-regexp compatibility ([cdcf3ed](https://github.com/dachrisch/league.finance/commit/cdcf3ed1f11a1544898dec414e10a330616272ed))
* resolve docker build failure by passing VITE_GIT_COMMIT_HASH build arg ([8f1bba5](https://github.com/dachrisch/league.finance/commit/8f1bba5b360f624c15e1b97016b7f96753afd3f7))
* restore correctly formatted Vite and Vitest configs ([75809ca](https://github.com/dachrisch/league.finance/commit/75809cae798f459e6577ea6fcd2c89a6b553136b))
* round currency values to 2 decimal places in finance calculator ([c1d2e36](https://github.com/dachrisch/league.finance/commit/c1d2e36a58eeb43c352f1c9ff243291f0fb4247c))
* specify HS256 algorithm in jwt.verify to prevent algorithm confusion ([4295162](https://github.com/dachrisch/league.finance/commit/4295162348c2705c074a9df476e8372993b15a77))
* upgrade CI to Node 24 to match local npm 11 environment ([5331471](https://github.com/dachrisch/league.finance/commit/5331471d16730d16edd336f8111b3d3310130f34))
* upgrade Dockerfile to node:24-alpine and use --legacy-peer-deps ([9e60f9c](https://github.com/dachrisch/league.finance/commit/9e60f9c6c1b2cb4fc673c68f6857d40fb307ac11))
* use --legacy-peer-deps in npm ci to handle peer dep lock file check ([7a12fa1](https://github.com/dachrisch/league.finance/commit/7a12fa1459f8865635a0417db0401cfa85c181a3))
* use CLIENT_URL env var for redirects and fix prod static path ([f4dbbb6](https://github.com/dachrisch/league.finance/commit/f4dbbb6c16f90de4ac68f8badac53ea9156b84bd))
* use proper MongoDB update operators, derive first-user role from admin existence ([b2c0c13](https://github.com/dachrisch/league.finance/commit/b2c0c13bfa3583d939d23ee988092932218bd2d7))
* use RowDataPacket[] type for mysql2 queries in teams router ([aa20569](https://github.com/dachrisch/league.finance/commit/aa205694186cd5ebf179134c3390acf667782515))
