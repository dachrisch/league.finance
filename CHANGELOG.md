# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.7](https://github.com/dachrisch/league.finance/compare/v0.1.6...v0.1.7) (2026-04-14)


### Features

* replace legacy offer creation with redesigned wizard ([73db4c5](https://github.com/dachrisch/league.finance/commit/73db4c53ded1176cdbbd8535e02fc131d3f8dd01))
* wire up TRPC mutations to actually create offers ([48823a3](https://github.com/dachrisch/league.finance/commit/48823a39b0b785283caf1dbb9f9b38f0a10c304c))


### Bug Fixes

* improve offer creation data collection in wizard ([bcdf7e1](https://github.com/dachrisch/league.finance/commit/bcdf7e1ec776ab9627ded699a4a6f85039385f4b))
* improve season selection handling ([49a03d0](https://github.com/dachrisch/league.finance/commit/49a03d0565c85a959f8c88f6da06b38a6bc0dc79))
* replace alert dialogs with proper field validation in OfferCreateWizard ([6e68074](https://github.com/dachrisch/league.finance/commit/6e68074cdab4c68c580905def170c76f456838eb))
* switch to real OfferCreateWizard with backend integration ([20363e4](https://github.com/dachrisch/league.finance/commit/20363e4a7eb43d2d1c7a65a264aca2703f552ec5))

### [0.1.6](https://github.com/dachrisch/league.finance/compare/v0.1.5...v0.1.6) (2026-04-13)


### Features

* optimize app for mobile with responsive navigation ([f13ecea](https://github.com/dachrisch/league.finance/commit/f13ecea8a1343ce0fe93e4febbd8aa022800e5be))

### [0.1.5](https://github.com/dachrisch/league.finance/compare/v0.1.4...v0.1.5) (2026-04-11)


### Features

* add Association model with name, description, email, phone ([3dc2b60](https://github.com/dachrisch/league.finance/commit/3dc2b60bb2916371cf8bc6b0a24e02c6e435205b))
* add Contact CRUD router ([45cc8f7](https://github.com/dachrisch/league.finance/commit/45cc8f7dd6294b93d458d7ca5f2e3bd5f7d329bb))
* add Contact model and schema ([c50f52c](https://github.com/dachrisch/league.finance/commit/c50f52c9433cadfc12ae64e4d588b63b8ce6fb7d))
* add Offer model and schema ([0fda0d0](https://github.com/dachrisch/league.finance/commit/0fda0d00502494e2464fce58d6a1987bb0b9c5ac))
* add OfferCard component with status indicators ([b1046c2](https://github.com/dachrisch/league.finance/commit/b1046c231c4c3c4d6bd2b3d8ccf13134c1219f42))
* add offerId field to FinancialConfig ([0dd2dd6](https://github.com/dachrisch/league.finance/commit/0dd2dd637dcf479a88c0583e653818e1e1dfc51a))
* **components:** add collapsed offer card component ([a58b5a7](https://github.com/dachrisch/league.finance/commit/a58b5a78335a118856a9f13f5ad23c2da87e5892))
* **components:** add expanded offer card with configs table ([295087f](https://github.com/dachrisch/league.finance/commit/295087f8a796e5e34346b881744831025b2daf9b))
* **components:** add inline association creation form ([9b8b3d0](https://github.com/dachrisch/league.finance/commit/9b8b3d0d3a2e78d938126175034d0e72373bec96))
* **components:** add inline contact creation form ([c883108](https://github.com/dachrisch/league.finance/commit/c883108b8d3c35e123f209473744500856e61530))
* **components:** add selectable contact grid for wizard ([07e5aa7](https://github.com/dachrisch/league.finance/commit/07e5aa7de786657cd9e21d64cba417a6160e37a6))
* **dashboard:** redesign to show offers as primary entity with expandable configs ([eb8bcbb](https://github.com/dachrisch/league.finance/commit/eb8bcbb588db65918dfa28d7b33a3ee349ae04ca))
* **task-2:** create Offer model with comprehensive tests ([e8c8113](https://github.com/dachrisch/league.finance/commit/e8c81136e186b0a190ca93eaa907a218465146d1))
* **task-3:** create OfferLineItem model with price calculations ([83f0791](https://github.com/dachrisch/league.finance/commit/83f0791dffefa3f81ee594be5eaad07eb12bbb16))
* **task-4:** add offerId reference to FinancialConfig model ([a111a3e](https://github.com/dachrisch/league.finance/commit/a111a3e33a58fac53aff30e2bd7fbb6502dd55fd))
* **task-5:** create offerCalculator utility for pricing calculations ([e934f29](https://github.com/dachrisch/league.finance/commit/e934f290141d537e6ae7b7088af37f40efb062b0))
* **task-6:** create pdfGenerator utility for PDF offer generation ([e7b8c58](https://github.com/dachrisch/league.finance/commit/e7b8c58427fdb91d96362d0e9148bbcde0c9e6f9))
* **task-7:** create driveUploader utility for Google Drive integration ([eb85877](https://github.com/dachrisch/league.finance/commit/eb8587710e2f0d1cf9edf5284171e79c61e78a9a))
* **task-8:** create email utilities for offer delivery ([6c567c2](https://github.com/dachrisch/league.finance/commit/6c567c2722d44b79a9f39dcef35fea341d2dfce7))
* **tasks-16-25:** implement frontend components and pages for offer tool ([ff64e86](https://github.com/dachrisch/league.finance/commit/ff64e8691a0fc92cd3b29de6d8103b9dcb5b6d39))
* **tasks-9-15:** implement associations and offers routers ([438e25f](https://github.com/dachrisch/league.finance/commit/438e25f063e37a14ec6757e975d27b74c6367a3e))
* update app routing for offer-first workflow ([f08dd09](https://github.com/dachrisch/league.finance/commit/f08dd09b4ae1345e2cf24676054e4af553533cfb))
* **utils:** add offer display helper functions ([28f3e8b](https://github.com/dachrisch/league.finance/commit/28f3e8bff05565c21be34b19057c91d22c1bebf9))
* **wizard:** rewrite offer creation with 3-step process and inline forms ([9834a00](https://github.com/dachrisch/league.finance/commit/9834a009f83b20624d2728ddcf3803eeb1eac08a))


### Bug Fixes

* align frontend pages with actual API endpoints ([1bba009](https://github.com/dachrisch/league.finance/commit/1bba0096673de5798919b619eb230d758d0a4d9b))
* **build:** remove unused server utility files causing TypeScript build failures ([9d64356](https://github.com/dachrisch/league.finance/commit/9d64356b3a1acaa08613cb79354769be2d5c0122))
* **build:** resolve TypeScript errors and type mismatches in CI ([268f767](https://github.com/dachrisch/league.finance/commit/268f767f3dd86748ef572f51a52a5114a13d20cd))
* correct Offer router to match actual Offer model ([981daee](https://github.com/dachrisch/league.finance/commit/981daeed53f659bd5d134638f2cf73005e28ea5d))
* correct test assertions in Association model tests ([6654770](https://github.com/dachrisch/league.finance/commit/6654770a70be4498bef30102ef084359dcaf3f1a))
* correct undefined pendingCount variable in OffersPage ([314c9ec](https://github.com/dachrisch/league.finance/commit/314c9ec7e529d32374a6d7f1086282c0605bb94d))
* mock Puppeteer in PDF tests to avoid sandbox errors in CI ([78a8526](https://github.com/dachrisch/league.finance/commit/78a852620d0dd9eac780cf0709395a22a55825e8))
* **tests:** remove unsupported edit functionality test from AssociationForm ([90e5f8b](https://github.com/dachrisch/league.finance/commit/90e5f8bc49283b3ba167eadda42e2ee93728ce60))
* use expect.fail instead of fail in test ([803a8e3](https://github.com/dachrisch/league.finance/commit/803a8e3487daeeb7098052e5f3c2053d1dc78e32))
* **utils:** remove unused mongoose import from client helpers ([b2ee01a](https://github.com/dachrisch/league.finance/commit/b2ee01aaeb30469d758f674f763ac4c39f910836))
* **wizard:** add base rate validation and contacts loading state ([4525cbc](https://github.com/dachrisch/league.finance/commit/4525cbc24fba07205c187cef302a6226c5547bb2))

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
