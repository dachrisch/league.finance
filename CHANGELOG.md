# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.21](https://github.com/dachrisch/league.finance/compare/v0.1.20...v0.1.21) (2026-05-07)

### [0.1.20](https://github.com/dachrisch/league.finance/compare/v0.1.18...v0.1.20) (2026-05-07)


### Features

* refactor offers list for better UX (remove actions dropdown) ([524603d](https://github.com/dachrisch/league.finance/commit/524603d1b0ba0fbdf5e42307192a56184a6ad894))


### Bug Fixes

* **deps:** update dependency html-to-text to v10 ([#58](https://github.com/dachrisch/league.finance/issues/58)) ([9a05c45](https://github.com/dachrisch/league.finance/commit/9a05c452a03ed10edac1b8695870b871c5f0c694))

### [0.1.19](https://github.com/dachrisch/league.finance/compare/v0.1.18...v0.1.19) (2026-05-07)


### Features

* refactor offers list for better UX (remove actions dropdown) ([818eab6](https://github.com/dachrisch/league.finance/commit/818eab673f5e8e43fec678f58c9606cb288213bc))

### [0.1.18](https://github.com/dachrisch/league.finance/compare/v0.1.17...v0.1.18) (2026-05-07)


### Bug Fixes

* resolve version injection bug and enhance build metadata ([5dbf3e0](https://github.com/dachrisch/league.finance/commit/5dbf3e08b676c1ca9798aa3933857ba1c55dad5f))

### [0.1.17](https://github.com/dachrisch/league.finance/compare/v0.1.16...v0.1.17) (2026-05-06)


### Bug Fixes

* resolve test regressions and type errors from duplicate checks feature ([f578ae7](https://github.com/dachrisch/league.finance/commit/f578ae7b7d5e4fa2ae06f2993893e1d3c149d24c))

### [0.1.16](https://github.com/dachrisch/league.finance/compare/v0.1.15...v0.1.16) (2026-05-06)


### Features

* implement duplicate checks for associations/contacts and refactor UI to view-on-click ([2d6c81a](https://github.com/dachrisch/league.finance/commit/2d6c81a45ac944044bffe8676c8f874e282e1ff7))

### [0.1.15](https://github.com/dachrisch/league.finance/compare/v0.1.14...v0.1.15) (2026-05-06)


### Bug Fixes

* isolate test database from production MySQL - critical security fix ([96c3c7f](https://github.com/dachrisch/league.finance/commit/96c3c7f9905b1afbe332be40604fb6d336627955))
* **mongo:** allow disabling transactions for standalone instances ([a68ef48](https://github.com/dachrisch/league.finance/commit/a68ef48124aab6e6431231771daac8dfc22b92a4))
* **queue:** support REDIS_URL and remove duplicate queue file ([f22c96c](https://github.com/dachrisch/league.finance/commit/f22c96c8330d8619cce66c987664248d23b5ea9d))

### [0.1.14](https://github.com/dachrisch/league.finance/compare/v0.1.13...v0.1.14) (2026-04-19)


### Bug Fixes

* resolve season display, contact email editing, and wizard pre-selection ([cecdf2d](https://github.com/dachrisch/league.finance/commit/cecdf2d3c77e400db4627dc3fd0bb4d55e0cbc45))

### [0.1.13](https://github.com/dachrisch/league.finance/compare/v0.1.12...v0.1.13) (2026-04-19)


### Features

* add global test setup to check test data availability ([4a00b2d](https://github.com/dachrisch/league.finance/commit/4a00b2dea441f92284ccea61587851364059acca))
* add Playwright E2E tests for offer creation flows ([a2c7816](https://github.com/dachrisch/league.finance/commit/a2c7816953e9ccbf6ea70bd2bcf978ca23614cee))
* add test auth endpoint and fix E2E test authentication ([bd57be0](https://github.com/dachrisch/league.finance/commit/bd57be051918bf3c5cbe386d20005f324f5d118a))
* update E2E setup to create test preconditions and fail tests if missing ([5115f46](https://github.com/dachrisch/league.finance/commit/5115f46c6e0ee0b33cac300833e00ee0bbbf4f96))


### Bug Fixes

* handle cleanup errors in app test to prevent junit reporter exit code 1 ([c31a952](https://github.com/dachrisch/league.finance/commit/c31a95264d06b59a8d9fbbc582add39371e996c4))
* increase timeout for slow PDF generation test ([536bcc6](https://github.com/dachrisch/league.finance/commit/536bcc684c24c7ed80599acc17448c4d6ca42dd6))
* make E2E tests skip gracefully when test data is missing ([fbebdd4](https://github.com/dachrisch/league.finance/commit/fbebdd482ebed6e07ba7d71176adb69d093aed78))
* resolve all remaining test failures and ensure 100% pass rate ([0ca5272](https://github.com/dachrisch/league.finance/commit/0ca5272f7ee9d38f8f505fb3f403e502fec45736))
* resolve database schema mismatch in finance seasons router ([c27f0ce](https://github.com/dachrisch/league.finance/commit/c27f0ce31215bf7c872faa66df7c97808901e434))
* resolve season field undefined error in offer creation wizard ([9e858f1](https://github.com/dachrisch/league.finance/commit/9e858f18549625b6eaa1bdfeb57ab2e41c266ee4))
* resolve TypeScript errors from season field schema change ([5a8b120](https://github.com/dachrisch/league.finance/commit/5a8b120b2c2154a1abd7d77a67211e91b3fa6927))
* set NODE_ENV=development for tests to use MockQueue instead of Redis ([fbc5447](https://github.com/dachrisch/league.finance/commit/fbc54479c6a2110b03bc335f94bb2777299c1ece))
* show database errors instead of success messages when DB unavailable ([a83017d](https://github.com/dachrisch/league.finance/commit/a83017d0c6f9d7358ac3d19d228f691638e4d473))

### [0.1.12](https://github.com/dachrisch/league.finance/compare/v0.1.8...v0.1.12) (2026-04-17)


### Features

* add DriveService for uploading PDFs to Google Drive ([be500f3](https://github.com/dachrisch/league.finance/commit/be500f3b456cf574317ea2dff85029b27c2eb5db))
* add emailMetadata and job tracking fields to Offer model ([e76d720](https://github.com/dachrisch/league.finance/commit/e76d720aec3a0afddf814e35fbde0d0921ae09e2))
* add GmailService for sending offer emails ([412a8c2](https://github.com/dachrisch/league.finance/commit/412a8c225e02ee37726f561f92a15be166b4cb4a))
* add in-memory mock queue for development mode ([a18b69f](https://github.com/dachrisch/league.finance/commit/a18b69f7ce32823e9c2836bb517c2c78f40bbfdb))
* add PdfService for generating professional offer PDFs with puppeteer ([3927940](https://github.com/dachrisch/league.finance/commit/3927940c6df1f1bde46be235baf9e8b86ebc80b4))
* add send button and status column to OfferTable ([3f364f3](https://github.com/dachrisch/league.finance/commit/3f364f346dcf9217a66d681312bf375937aaddc1))
* add sendOffer, getOfferSendStatus, and retryOfferSend tRPC procedures ([e5e6519](https://github.com/dachrisch/league.finance/commit/e5e651988d7aced2d6d7754503d3379137190354))
* add SendOfferDialog component with progress tracking ([7a73b65](https://github.com/dachrisch/league.finance/commit/7a73b6556a77e68e7c1a043d432359378cf1a504))
* add SendOfferJob worker with three-stage processing pipeline ([952256c](https://github.com/dachrisch/league.finance/commit/952256c575fcad3ed3ab55b583cde2e528745b06))
* add toast notifications to OffersPage for send feedback ([407cf68](https://github.com/dachrisch/league.finance/commit/407cf680baed2dc25f96aafd202ec275b06ae11e))
* add useSendOfferJob hook for polling job status ([960a526](https://github.com/dachrisch/league.finance/commit/960a52639aa400d1188cb5fb0a4bf5e4d80e6a6a))
* **components:** add LeagueSelectorSection and CategoryGroup for Step 2 ([e171138](https://github.com/dachrisch/league.finance/commit/e1711389e36f1af0f928baea7f76271510bde2d0))
* **components:** add PricingSection component for Step 2 ([9ae014a](https://github.com/dachrisch/league.finance/commit/9ae014a6ce1558c4b4985dcaccdd5c3076f447df))
* **components:** add SeasonBlock component ([179e8f1](https://github.com/dachrisch/league.finance/commit/179e8f12f4ef6547b69890075c069f135c38a9c2))
* **components:** add Step1 container component ([942b71d](https://github.com/dachrisch/league.finance/commit/942b71d4f39a1a6f6678e9acfeb7e7c7851aaf97))
* **components:** add Step2 container component ([cc3d78d](https://github.com/dachrisch/league.finance/commit/cc3d78dddd2aa69f55c8dceb028852ffb5137d5e))
* **components:** add SummarySection component for Step 2 ([3b771d6](https://github.com/dachrisch/league.finance/commit/3b771d62f457a7fa9cf00c04f9262ba481467251))
* **components:** add UseExistingBlock component ([77f4ce7](https://github.com/dachrisch/league.finance/commit/77f4ce767a19df078cd7eac8cac7e30076f6a5b1))
* **components:** integrate OfferCreateWizard with tRPC and state hook ([e69eff5](https://github.com/dachrisch/league.finance/commit/e69eff54f34610d1e71bc2898477ff29bf703b17))
* **db:** add migration script to fix financial config index ([ec0cb65](https://github.com/dachrisch/league.finance/commit/ec0cb65aeeca3c331a27237a40ded367910ec92f))
* **hooks:** add text extraction utilities for contact info ([2dc95c2](https://github.com/dachrisch/league.finance/commit/2dc95c2d18ad79a3762ab4a1ba15c71af81526c1))
* implement offer send workflow with PDF generation, Google Drive upload, and Gmail integration ([2715708](https://github.com/dachrisch/league.finance/commit/27157080ee1a164615118660fb30a4220dbb38bc))
* multi-league selection on dashboard for quick offer creation ([4f5adcf](https://github.com/dachrisch/league.finance/commit/4f5adcfff1c612bf72030fc344ad0e711b665228))
* **pages:** add OfferNewPage for redesigned offer creation ([74d091b](https://github.com/dachrisch/league.finance/commit/74d091b0403a0d420c2933fa0c28711339eeeecc))
* **routing:** route /offers/new to the redesigned wizard ([6b4c677](https://github.com/dachrisch/league.finance/commit/6b4c677d0395631493b96e0c3a27a8374d4edf1b))


### Bug Fixes

* **a11y:** add ARIA attributes and roles to the offer wizard ([7eb3049](https://github.com/dachrisch/league.finance/commit/7eb30497b632de7c2bd6bcbbb05bfd301cac8e4e))
* adjust test matchers and component attributes for reliable element detection in CI ([d1a5012](https://github.com/dachrisch/league.finance/commit/d1a501230e5ac2d6b7b28ad89da2534d3dd73b19))
* cleanup polling interval on component unmount to prevent memory leak ([97227c8](https://github.com/dachrisch/league.finance/commit/97227c8830b6b6948f7c48674a6be27bfb169762))
* correct job queue integration and price computation in SendOfferJob ([05b740d](https://github.com/dachrisch/league.finance/commit/05b740d2fa7f1c167b5df746ab4de4a95f662181))
* correct tRPC endpoints, fix useEffect loop, add error handling and tests to useSendOfferJob ([a61763d](https://github.com/dachrisch/league.finance/commit/a61763d47f877a9587fed9668b5871db7f6a9fd7))
* correct TypeScript types in PdfService for Puppeteer Uint8Array ([5325556](https://github.com/dachrisch/league.finance/commit/532555614ed009ff08cb0dfe6915b4a1204feebf))
* ensure action buttons are always accessible to tests and use stable test IDs ([f280d7e](https://github.com/dachrisch/league.finance/commit/f280d7e399d7d01a93ce188e690a05f3fbf3a0e5))
* ensure OfferCard buttons are always rendered and accessible to tests ([1610925](https://github.com/dachrisch/league.finance/commit/16109254c17fe2ef81e422ba1f7015b4ef77dc80))
* **finance:** resolve offer creation failures from pasted data ([93161ef](https://github.com/dachrisch/league.finance/commit/93161ef0f022ff8810be95dc22c1776bb995a357))
* **finance:** unified extraction logic and fixed address parsing ([32dc012](https://github.com/dachrisch/league.finance/commit/32dc0127566b5308d41fbab20d767f0863851374))
* offer creation and display issues ([1ffcb4e](https://github.com/dachrisch/league.finance/commit/1ffcb4e56a2ec56c5af69938f44162d2ecc00734))
* replace paste template placeholder with dummy data, add mobile bottom nav ([5b80d49](https://github.com/dachrisch/league.finance/commit/5b80d490abc2dc782f0bd395514733934bcc4627))
* resolve CI test regressions by updating components to match test expectations and new designs ([d790527](https://github.com/dachrisch/league.finance/commit/d790527c1cde1330f0da804ac3ec0fc09b669628))
* resolve missing extraction utils imports in components ([1f9c0fa](https://github.com/dachrisch/league.finance/commit/1f9c0fad4edf0630f87a067999efec6392cad7d6))
* reveal hidden buttons in OfferCard for tests and use more flexible character matchers ([c736e05](https://github.com/dachrisch/league.finance/commit/c736e055e6afb1625c393333fd0ce9332c110172))
* simplify OfferCard structure to assist test element discovery ([c149a55](https://github.com/dachrisch/league.finance/commit/c149a55fa45f03d7fcda0f11674a09376a43111b))
* **ui:** add block expand/collapse to SeasonBlock ([afe0ff2](https://github.com/dachrisch/league.finance/commit/afe0ff283fdd1fcd923d5c24b2c449966faa7d00))
* **ui:** add block expand/collapse toggle for offer wizard ([669ed0c](https://github.com/dachrisch/league.finance/commit/669ed0c9917a8b9b139ec6315675eae87d8833a1))
* **ui:** remove unnecessary minHeight from OfferNewPage to eliminate scrollbar ([8259599](https://github.com/dachrisch/league.finance/commit/8259599fb86fd8600a0029fe2b1fe5f559140064))
* update redis v5 API compatibility in queue initialization ([61d76e3](https://github.com/dachrisch/league.finance/commit/61d76e31659a4a6cf3c83896d4de5d3a91155c52))
* update tests and components to correctly match UI changes and element targeting ([f9f8498](https://github.com/dachrisch/league.finance/commit/f9f8498331ddaf3cd26d1d541e7309d6273d00e6))
* use Bull v4 API compatible configuration ([9db1841](https://github.com/dachrisch/league.finance/commit/9db18411725629a67f71732b68e8a28ee4fe7da8))
* use correct Bull v4 QueueOptions API for redis config ([72c1315](https://github.com/dachrisch/league.finance/commit/72c1315f12ca5b9810eea091905cd22484522adf))

### [0.1.11](https://github.com/dachrisch/league.finance/compare/v0.1.10...v0.1.11) (2026-04-16)

### [0.1.10](https://github.com/dachrisch/league.finance/compare/v0.1.9...v0.1.10) (2026-04-16)


### Bug Fixes

* offer creation and display issues ([1ffcb4e](https://github.com/dachrisch/league.finance/commit/1ffcb4e56a2ec56c5af69938f44162d2ecc00734))
* replace paste template placeholder with dummy data, add mobile bottom nav ([5b80d49](https://github.com/dachrisch/league.finance/commit/5b80d490abc2dc782f0bd395514733934bcc4627))

### 0.1.9 (2026-04-15)


### Features

* add /health endpoint and start server before mongo connects ([25fcf8f](https://github.com/dachrisch/league.finance/commit/25fcf8f7201d39b1ae59623785db4bcd29be7848))
* add Association model with name, description, email, phone ([3dc2b60](https://github.com/dachrisch/league.finance/commit/3dc2b60bb2916371cf8bc6b0a24e02c6e435205b))
* add automatic GitHub release creation and link version in footer ([6d19a3d](https://github.com/dachrisch/league.finance/commit/6d19a3d413c87c1e77c84ceaa302386a0b4e8d00))
* add CI/CD workflow for testing and Docker Hub push ([03d8a0f](https://github.com/dachrisch/league.finance/commit/03d8a0ffdf857ff0219e260148ea92a868286189))
* add Contact CRUD router ([45cc8f7](https://github.com/dachrisch/league.finance/commit/45cc8f7dd6294b93d458d7ca5f2e3bd5f7d329bb))
* add Contact model and schema ([c50f52c](https://github.com/dachrisch/league.finance/commit/c50f52c9433cadfc12ae64e4d588b63b8ce6fb7d))
* add duplicate detection and entity creation to Step1 ([ea559b1](https://github.com/dachrisch/league.finance/commit/ea559b16788860ebc04b9313cb81a68ae7a0674b))
* add email and phone fields to contact schema ([137a4f3](https://github.com/dachrisch/league.finance/commit/137a4f336c1a6badc056c9e921782de355f29217))
* add Footer component and sticky footer styles ([802f3ae](https://github.com/dachrisch/league.finance/commit/802f3ae1f2466dc37425d39ff9e06f7bf17a1d43))
* add health module with db status tracking ([ec95465](https://github.com/dachrisch/league.finance/commit/ec95465babfdaddef5e748e350e2442f96ccdf15))
* add migration for association and contact schema changes ([a62c69e](https://github.com/dachrisch/league.finance/commit/a62c69eba0ccd3e499aafeb4c8b3e9c807e45ecd))
* add Offer model and schema ([0fda0d0](https://github.com/dachrisch/league.finance/commit/0fda0d00502494e2464fce58d6a1987bb0b9c5ac))
* add OfferCard component with status indicators ([b1046c2](https://github.com/dachrisch/league.finance/commit/b1046c231c4c3c4d6bd2b3d8ccf13134c1219f42))
* add offerId field to FinancialConfig ([0dd2dd6](https://github.com/dachrisch/league.finance/commit/0dd2dd637dcf479a88c0583e653818e1e1dfc51a))
* add search endpoints for duplicate detection in contacts & associations ([48971c3](https://github.com/dachrisch/league.finance/commit/48971c3a291fb1a914c796a8c55460060de3eb12))
* add SVG favicon (trophy with euro sign) ([c1a1bc5](https://github.com/dachrisch/league.finance/commit/c1a1bc5bc6466d981ca3b56d74590b7f9b6d0e6a))
* add text extraction utility for association & contact parsing ([694c191](https://github.com/dachrisch/league.finance/commit/694c191f152ab2dfde878de537e6bd4aa3926852))
* add version tag to footer ([923de2d](https://github.com/dachrisch/league.finance/commit/923de2dba9c1b3da7e0f8c801b6c1302d2fb172e))
* **components:** add collapsed offer card component ([a58b5a7](https://github.com/dachrisch/league.finance/commit/a58b5a78335a118856a9f13f5ad23c2da87e5892))
* **components:** add expanded offer card with configs table ([295087f](https://github.com/dachrisch/league.finance/commit/295087f8a796e5e34346b881744831025b2daf9b))
* **components:** add inline association creation form ([9b8b3d0](https://github.com/dachrisch/league.finance/commit/9b8b3d0d3a2e78d938126175034d0e72373bec96))
* **components:** add inline contact creation form ([c883108](https://github.com/dachrisch/league.finance/commit/c883108b8d3c35e123f209473744500856e61530))
* **components:** add LeagueSelectorSection and CategoryGroup for Step 2 ([e171138](https://github.com/dachrisch/league.finance/commit/e1711389e36f1af0f928baea7f76271510bde2d0))
* **components:** add PricingSection component for Step 2 ([9ae014a](https://github.com/dachrisch/league.finance/commit/9ae014a6ce1558c4b4985dcaccdd5c3076f447df))
* **components:** add SeasonBlock component ([179e8f1](https://github.com/dachrisch/league.finance/commit/179e8f12f4ef6547b69890075c069f135c38a9c2))
* **components:** add selectable contact grid for wizard ([07e5aa7](https://github.com/dachrisch/league.finance/commit/07e5aa7de786657cd9e21d64cba417a6160e37a6))
* **components:** add Step1 container component ([942b71d](https://github.com/dachrisch/league.finance/commit/942b71d4f39a1a6f6678e9acfeb7e7c7851aaf97))
* **components:** add Step2 container component ([cc3d78d](https://github.com/dachrisch/league.finance/commit/cc3d78dddd2aa69f55c8dceb028852ffb5137d5e))
* **components:** add SummarySection component for Step 2 ([3b771d6](https://github.com/dachrisch/league.finance/commit/3b771d62f457a7fa9cf00c04f9262ba481467251))
* **components:** add UseExistingBlock component ([77f4ce7](https://github.com/dachrisch/league.finance/commit/77f4ce767a19df078cd7eac8cac7e30076f6a5b1))
* **components:** integrate OfferCreateWizard with tRPC and state hook ([e69eff5](https://github.com/dachrisch/league.finance/commit/e69eff54f34610d1e71bc2898477ff29bf703b17))
* create OfferWizardStep1 component with extraction and dropdown options ([2a864b1](https://github.com/dachrisch/league.finance/commit/2a864b17f89a3053cf52f8da3801e59c23f28756))
* create unified AssociationContactForm component with text extraction ([46add26](https://github.com/dachrisch/league.finance/commit/46add26fc916bcc52fb01fbaededcfd55b583ac3))
* **dashboard:** redesign to show offers as primary entity with expandable configs ([eb8bcbb](https://github.com/dachrisch/league.finance/commit/eb8bcbb588db65918dfa28d7b33a3ee349ae04ca))
* **db:** add migration script to fix financial config index ([ec0cb65](https://github.com/dachrisch/league.finance/commit/ec0cb65aeeca3c331a27237a40ded367910ec92f))
* discounts, dashboard, and calculate tRPC routers ([c6c60be](https://github.com/dachrisch/league.finance/commit/c6c60bed47dd1cbfa5ed61ec172bb79b4ebfa696))
* finance calculation engine with full test coverage (TDD) ([0f6164e](https://github.com/dachrisch/league.finance/commit/0f6164ebbb91bc3afc5432aa88dca267be9bd8fe))
* finance settings and configs tRPC routers ([9fa646f](https://github.com/dachrisch/league.finance/commit/9fa646f3ff8aaf22ba8c2470383f82296c31eb71))
* full client implementation with tRPC, React Query, and production Docker setup ([32c7d8b](https://github.com/dachrisch/league.finance/commit/32c7d8b42298349dd638ef8f41f11d4132c44fad))
* Google OAuth2 strategy, Express app entry, JWT issuance ([90eb381](https://github.com/dachrisch/league.finance/commit/90eb381105cffc49876b103080578e36522633ed))
* **hooks:** add text extraction utilities for contact info ([2dc95c2](https://github.com/dachrisch/league.finance/commit/2dc95c2d18ad79a3762ab4a1ba15c71af81526c1))
* **hooks:** add useOfferCreation hook for wizard state management ([bf9dfcc](https://github.com/dachrisch/league.finance/commit/bf9dfcc29187e486964027dd87549e3ada837ba5))
* implement custom price save mutation for offer details ([ed888f0](https://github.com/dachrisch/league.finance/commit/ed888f00828b9e509527801e5b9c833b07cbb644))
* implement responsive design for mobile friendliness ([997a28f](https://github.com/dachrisch/league.finance/commit/997a28ffea2a31b312cadbd81f792ec1a43ceb21))
* integrate Footer into App layout ([7b7f6ae](https://github.com/dachrisch/league.finance/commit/7b7f6ae7d93b80176b374d1479cbdd62761044d4))
* merged AppRouter and refactored finance routers to use data fetcher ([96bd483](https://github.com/dachrisch/league.finance/commit/96bd4831f4caa7549f988cae62bad2b2f5a41ed9))
* Mongoose models for User, FinancialConfig, Discount, FinancialSettings ([806639f](https://github.com/dachrisch/league.finance/commit/806639f46327911e177135b9410b09f33f7bb640))
* MySQL pool and MongoDB connection helpers ([b4501f1](https://github.com/dachrisch/league.finance/commit/b4501f11c5e0dc572beb136ff74c33a97aa8e3f3))
* **offer-wizard:** add wizard state types and interfaces ([9ad8465](https://github.com/dachrisch/league.finance/commit/9ad846567197049daf966fc973e70ccfef39af8b))
* optimize app for mobile with responsive navigation ([f13ecea](https://github.com/dachrisch/league.finance/commit/f13ecea8a1343ce0fe93e4febbd8aa022800e5be))
* **pages:** add OfferNewPage for redesigned offer creation ([74d091b](https://github.com/dachrisch/league.finance/commit/74d091b0403a0d420c2933fa0c28711339eeeecc))
* replace legacy offer creation with redesigned wizard ([73db4c5](https://github.com/dachrisch/league.finance/commit/73db4c53ded1176cdbbd8535e02fc131d3f8dd01))
* **routing:** route /offers/new to the redesigned wizard ([6b4c677](https://github.com/dachrisch/league.finance/commit/6b4c677d0395631493b96e0c3a27a8374d4edf1b))
* **schemas:** add offer wizard validation schemas ([8fd719d](https://github.com/dachrisch/league.finance/commit/8fd719d4ae98db34fc09964016791187c09ea9ec))
* seasonal dashboard grouping with unified accordion structures and documentation ([0966e0d](https://github.com/dachrisch/league.finance/commit/0966e0dcb9f38943ac287a0973d44c05d3ae4253))
* shared Zod schemas and inferred types ([0942695](https://github.com/dachrisch/league.finance/commit/0942695dbd5d22ca73faccd0a7b1d8d42ebf577c))
* show info screen when database is down ([f272a10](https://github.com/dachrisch/league.finance/commit/f272a1003f414361283ad27cda141f2139c4b126))
* **styles:** add offer wizard design system and component styles ([3f83eb8](https://github.com/dachrisch/league.finance/commit/3f83eb8093cb516b51029000d43f23e23b28479f))
* **task-2:** create Offer model with comprehensive tests ([e8c8113](https://github.com/dachrisch/league.finance/commit/e8c81136e186b0a190ca93eaa907a218465146d1))
* **task-3:** create OfferLineItem model with price calculations ([83f0791](https://github.com/dachrisch/league.finance/commit/83f0791dffefa3f81ee594be5eaad07eb12bbb16))
* **task-4:** add offerId reference to FinancialConfig model ([a111a3e](https://github.com/dachrisch/league.finance/commit/a111a3e33a58fac53aff30e2bd7fbb6502dd55fd))
* **task-5:** create offerCalculator utility for pricing calculations ([e934f29](https://github.com/dachrisch/league.finance/commit/e934f290141d537e6ae7b7088af37f40efb062b0))
* **task-6:** create pdfGenerator utility for PDF offer generation ([e7b8c58](https://github.com/dachrisch/league.finance/commit/e7b8c58427fdb91d96362d0e9148bbcde0c9e6f9))
* **task-7:** create driveUploader utility for Google Drive integration ([eb85877](https://github.com/dachrisch/league.finance/commit/eb8587710e2f0d1cf9edf5284171e79c61e78a9a))
* **task-8:** create email utilities for offer delivery ([6c567c2](https://github.com/dachrisch/league.finance/commit/6c567c2722d44b79a9f39dcef35fea341d2dfce7))
* **tasks-16-25:** implement frontend components and pages for offer tool ([ff64e86](https://github.com/dachrisch/league.finance/commit/ff64e8691a0fc92cd3b29de6d8103b9dcb5b6d39))
* **tasks-9-15:** implement associations and offers routers ([438e25f](https://github.com/dachrisch/league.finance/commit/438e25f063e37a14ec6757e975d27b74c6367a3e))
* teams tRPC router — leagues, seasons, byLeagueSeason from MySQL ([455518b](https://github.com/dachrisch/league.finance/commit/455518bbc6be316568fd802c7bd55f797007f293))
* tRPC init with JWT context, protected and admin procedures ([5270f56](https://github.com/dachrisch/league.finance/commit/5270f56c50a3afdacff00d1155c11c1f54e6bef7))
* update app routing for offer-first workflow ([f08dd09](https://github.com/dachrisch/league.finance/commit/f08dd09b4ae1345e2cf24676054e4af553533cfb))
* update association schema to address-based model ([ac4b0cd](https://github.com/dachrisch/league.finance/commit/ac4b0cd261d08f00a63c85bf338569cd3ac608c7))
* **utils:** add offer display helper functions ([28f3e8b](https://github.com/dachrisch/league.finance/commit/28f3e8bff05565c21be34b19057c91d22c1bebf9))
* wire up TRPC mutations to actually create offers ([48823a3](https://github.com/dachrisch/league.finance/commit/48823a39b0b785283caf1dbb9f9b38f0a10c304c))
* **wizard:** rewrite offer creation with 3-step process and inline forms ([9834a00](https://github.com/dachrisch/league.finance/commit/9834a009f83b20624d2728ddcf3803eeb1eac08a))


### Bug Fixes

* **a11y:** add ARIA attributes and roles to the offer wizard ([7eb3049](https://github.com/dachrisch/league.finance/commit/7eb30497b632de7c2bd6bcbbb05bfd301cac8e4e))
* add configId to UpdateFinancialConfigSchema for spec compliance ([fd4ef54](https://github.com/dachrisch/league.finance/commit/fd4ef5477e25683151be05dd60074a3d5221f7a3))
* add logout endpoint, validate JWT payload, strengthen CSRF protection ([5f9dbba](https://github.com/dachrisch/league.finance/commit/5f9dbbad2ac79a11540815754b41fb8635e5421c))
* add max(100) validation for PERCENT discounts ([93ecd61](https://github.com/dachrisch/league.finance/commit/93ecd612321b211e5b3aac95a92d38ede777dee8))
* add required fields to test data - email for contacts, address for associations ([baebe0f](https://github.com/dachrisch/league.finance/commit/baebe0fb2e51996ac438a505980018006ae1a0b6))
* add retry logic for MongoDB connection ([6d0a48a](https://github.com/dachrisch/league.finance/commit/6d0a48acded7bf1fac6bac959233e819ed154990))
* add symlink and healthcheck to Dockerfile ([2da7d05](https://github.com/dachrisch/league.finance/commit/2da7d054e45b3e77994f5a1b7ce0b1f2f7f66073))
* address critical security and functional issues in custom price save ([4d28ffc](https://github.com/dachrisch/league.finance/commit/4d28ffc9788059b26f254edaa057bbc014f6cb63))
* align frontend pages with actual API endpoints ([1bba009](https://github.com/dachrisch/league.finance/commit/1bba0096673de5798919b619eb230d758d0a4d9b))
* atomic getOrCreateSettings, min:0 on count fields, configId index on Discount ([9eba215](https://github.com/dachrisch/league.finance/commit/9eba2153224fab4511738ff833cdc862191fb987))
* atomic offer creation with transaction rollback ([223dc3e](https://github.com/dachrisch/league.finance/commit/223dc3e2769667fdffe3cf190dbd11715306ea4e))
* atomic settings update, NOT_FOUND guard on config delete ([a8d80f5](https://github.com/dachrisch/league.finance/commit/a8d80f571e6d364e1a639d37f82036eabf4f9d3a))
* **build:** remove unused server utility files causing TypeScript build failures ([9d64356](https://github.com/dachrisch/league.finance/commit/9d64356b3a1acaa08613cb79354769be2d5c0122))
* **build:** resolve TypeScript errors and type mismatches in CI ([268f767](https://github.com/dachrisch/league.finance/commit/268f767f3dd86748ef572f51a52a5114a13d20cd))
* clean up corrupted src/server/index.ts and suppress tsconfig deprecations ([83ac07e](https://github.com/dachrisch/league.finance/commit/83ac07e04e2198639e632d36d0a0ff29f4804b21))
* correct @types/cookie-parser version to available 1.4.10 ([5774a4e](https://github.com/dachrisch/league.finance/commit/5774a4e4a75170794bc729067cda5fb83cf395fa))
* correct docker test environment and build args for leagues.finance ([bff31e8](https://github.com/dachrisch/league.finance/commit/bff31e8dbbe252330c6ae94ffc76e0fc14f52942))
* correct Offer router to match actual Offer model ([981daee](https://github.com/dachrisch/league.finance/commit/981daeed53f659bd5d134638f2cf73005e28ea5d))
* correct test assertions in Association model tests ([6654770](https://github.com/dachrisch/league.finance/commit/6654770a70be4498bef30102ef084359dcaf3f1a))
* correct undefined pendingCount variable in OffersPage ([314c9ec](https://github.com/dachrisch/league.finance/commit/314c9ec7e529d32374a6d7f1086282c0605bb94d))
* critical migration issues - env var, tracking, sparse index ([a6fd027](https://github.com/dachrisch/league.finance/commit/a6fd0278e36ca957e9068e5085a1c41d9d893958))
* **database:** Fix FinancialConfig index to support multiple offers per league/season ([1df415e](https://github.com/dachrisch/league.finance/commit/1df415e7588a932d600d78b6e0c72bc3f99a693e))
* exclude vitest test files from TypeScript compilation ([c9fb121](https://github.com/dachrisch/league.finance/commit/c9fb121dbbb503b37303a13f1ef8d73fc910032a))
* extract createApp() and fix /*splat wildcard for Express 5 / path-to-regexp v8 ([3d16e92](https://github.com/dachrisch/league.finance/commit/3d16e925321bd887513818221526b5ee62ff2ad2))
* **finance:** resolve offer creation failures from pasted data ([93161ef](https://github.com/dachrisch/league.finance/commit/93161ef0f022ff8810be95dc22c1776bb995a357))
* **finance:** unified extraction logic and fixed address parsing ([32dc012](https://github.com/dachrisch/league.finance/commit/32dc0127566b5308d41fbab20d767f0863851374))
* guard connectMongo against double-invocation, redact URI in logs ([f9c042e](https://github.com/dachrisch/league.finance/commit/f9c042e3388279b3c5e364dc418b00e9a8754f2e))
* ignore client secret JSON, fix typecheck script, match @types/express to v4 ([bc516a0](https://github.com/dachrisch/league.finance/commit/bc516a0f9423b2e30fcdd11d9e3975f3ed3d97b7))
* implement global 401 UNAUTHORIZED redirect in QueryClient ([3469be3](https://github.com/dachrisch/league.finance/commit/3469be36bb9518ea7af67af839df10639b7a9548))
* improve auth error handler pathname check to avoid false positives ([e108d42](https://github.com/dachrisch/league.finance/commit/e108d425516eec8541721cd8a37ad6ec7952ed65))
* improve migration idempotency and ordering ([d528df9](https://github.com/dachrisch/league.finance/commit/d528df97acf07af8490b1155f408b169c7f68ea8))
* improve offer creation data collection in wizard ([bcdf7e1](https://github.com/dachrisch/league.finance/commit/bcdf7e1ec776ab9627ded699a4a6f85039385f4b))
* improve season selection handling ([49a03d0](https://github.com/dachrisch/league.finance/commit/49a03d0565c85a959f8c88f6da06b38a6bc0dc79))
* improve transaction error handling in offer creation ([395ce8a](https://github.com/dachrisch/league.finance/commit/395ce8a18c2988b5f7506089497096f08441ec87))
* invalidate queries after entity creation to show new items in dropdowns ([db0f4b2](https://github.com/dachrisch/league.finance/commit/db0f4b227f4010895c83b9c10538b9a3e525e5ef))
* make TeamSchema.description nullable to handle MySQL null values ([6328ab8](https://github.com/dachrisch/league.finance/commit/6328ab83aa350ee084a8bf431ff83430a006c93c))
* mock Puppeteer in PDF tests to avoid sandbox errors in CI ([78a8526](https://github.com/dachrisch/league.finance/commit/78a852620d0dd9eac780cf0709395a22a55825e8))
* Pass credentials to fetch in httpBatchLink ([5c4b188](https://github.com/dachrisch/league.finance/commit/5c4b188d2e072a5e219dc602de79220ad43f5af2))
* pass required env vars to docker test and handle container crash gracefully ([628c794](https://github.com/dachrisch/league.finance/commit/628c794cc56f0f9f36dbaabaa3ad43f1ff625dfa))
* point HEALTHCHECK at /health endpoint ([f9b74e4](https://github.com/dachrisch/league.finance/commit/f9b74e4f4ab93f64d7eaf79b1285c1507870e6dd))
* proper tRPC mutation handling in OfferWizardStep1 for entity creation ([0540923](https://github.com/dachrisch/league.finance/commit/0540923f06ac4a2c5c2ff49d0f9462c59a7592f5))
* rename client auth callback to /login/callback to avoid Vite proxy conflict ([9f7da45](https://github.com/dachrisch/league.finance/commit/9f7da455066b37a58b1bb59db1617f5d6e46bdba))
* replace alert dialogs with proper field validation in OfferCreateWizard ([6e68074](https://github.com/dachrisch/league.finance/commit/6e68074cdab4c68c580905def170c76f456838eb))
* replace bare * wildcard with (.*) for path-to-regexp compatibility ([cdcf3ed](https://github.com/dachrisch/league.finance/commit/cdcf3ed1f11a1544898dec414e10a330616272ed))
* resolve docker build failure by passing VITE_GIT_COMMIT_HASH build arg ([8f1bba5](https://github.com/dachrisch/league.finance/commit/8f1bba5b360f624c15e1b97016b7f96753afd3f7))
* resolve missing extraction utils imports in components ([1f9c0fa](https://github.com/dachrisch/league.finance/commit/1f9c0fad4edf0630f87a067999efec6392cad7d6))
* restore correctly formatted Vite and Vitest configs ([75809ca](https://github.com/dachrisch/league.finance/commit/75809cae798f459e6577ea6fcd2c89a6b553136b))
* round currency values to 2 decimal places in finance calculator ([c1d2e36](https://github.com/dachrisch/league.finance/commit/c1d2e36a58eeb43c352f1c9ff243291f0fb4247c))
* Secure JWT token in HttpOnly cookie instead of URL query parameter ([c52ba9e](https://github.com/dachrisch/league.finance/commit/c52ba9efe87d6d2f933a2565379cf3000518d028))
* specify HS256 algorithm in jwt.verify to prevent algorithm confusion ([4295162](https://github.com/dachrisch/league.finance/commit/4295162348c2705c074a9df476e8372993b15a77))
* switch to real OfferCreateWizard with backend integration ([20363e4](https://github.com/dachrisch/league.finance/commit/20363e4a7eb43d2d1c7a65a264aca2703f552ec5))
* **tests:** remove unsupported edit functionality test from AssociationForm ([90e5f8b](https://github.com/dachrisch/league.finance/commit/90e5f8bc49283b3ba167eadda42e2ee93728ce60))
* **ui:** add block expand/collapse to SeasonBlock ([afe0ff2](https://github.com/dachrisch/league.finance/commit/afe0ff283fdd1fcd923d5c24b2c449966faa7d00))
* **ui:** add block expand/collapse toggle for offer wizard ([669ed0c](https://github.com/dachrisch/league.finance/commit/669ed0c9917a8b9b139ec6315675eae87d8833a1))
* **ui:** remove unnecessary minHeight from OfferNewPage to eliminate scrollbar ([8259599](https://github.com/dachrisch/league.finance/commit/8259599fb86fd8600a0029fe2b1fe5f559140064))
* upgrade CI to Node 24 to match local npm 11 environment ([5331471](https://github.com/dachrisch/league.finance/commit/5331471d16730d16edd336f8111b3d3310130f34))
* upgrade Dockerfile to node:24-alpine and use --legacy-peer-deps ([9e60f9c](https://github.com/dachrisch/league.finance/commit/9e60f9c6c1b2cb4fc673c68f6857d40fb307ac11))
* use --legacy-peer-deps in npm ci to handle peer dep lock file check ([7a12fa1](https://github.com/dachrisch/league.finance/commit/7a12fa1459f8865635a0417db0401cfa85c181a3))
* use CLIENT_URL env var for redirects and fix prod static path ([f4dbbb6](https://github.com/dachrisch/league.finance/commit/f4dbbb6c16f90de4ac68f8badac53ea9156b84bd))
* use correct tRPC mutation calls for entity creation in Step1 ([079086a](https://github.com/dachrisch/league.finance/commit/079086a6079aaa73f73d231fec6d46338e49c8fb))
* use expect.fail instead of fail in test ([803a8e3](https://github.com/dachrisch/league.finance/commit/803a8e3487daeeb7098052e5f3c2053d1dc78e32))
* use proper MongoDB update operators, derive first-user role from admin existence ([b2c0c13](https://github.com/dachrisch/league.finance/commit/b2c0c13bfa3583d939d23ee988092932218bd2d7))
* use RowDataPacket[] type for mysql2 queries in teams router ([aa20569](https://github.com/dachrisch/league.finance/commit/aa205694186cd5ebf179134c3390acf667782515))
* **utils:** remove unused mongoose import from client helpers ([b2ee01a](https://github.com/dachrisch/league.finance/commit/b2ee01aaeb30469d758f674f763ac4c39f910836))
* **wizard:** add base rate validation and contacts loading state ([4525cbc](https://github.com/dachrisch/league.finance/commit/4525cbc24fba07205c187cef302a6226c5547bb2))

### [0.1.8](https://github.com/dachrisch/league.finance/compare/v0.1.7...v0.1.8) (2026-04-14)


### Features

* add automatic GitHub release creation and link version in footer ([6d19a3d](https://github.com/dachrisch/league.finance/commit/6d19a3d413c87c1e77c84ceaa302386a0b4e8d00))
* add duplicate detection and entity creation to Step1 ([ea559b1](https://github.com/dachrisch/league.finance/commit/ea559b16788860ebc04b9313cb81a68ae7a0674b))
* add email and phone fields to contact schema ([137a4f3](https://github.com/dachrisch/league.finance/commit/137a4f336c1a6badc056c9e921782de355f29217))
* add migration for association and contact schema changes ([a62c69e](https://github.com/dachrisch/league.finance/commit/a62c69eba0ccd3e499aafeb4c8b3e9c807e45ecd))
* add search endpoints for duplicate detection in contacts & associations ([48971c3](https://github.com/dachrisch/league.finance/commit/48971c3a291fb1a914c796a8c55460060de3eb12))
* add text extraction utility for association & contact parsing ([694c191](https://github.com/dachrisch/league.finance/commit/694c191f152ab2dfde878de537e6bd4aa3926852))
* create OfferWizardStep1 component with extraction and dropdown options ([2a864b1](https://github.com/dachrisch/league.finance/commit/2a864b17f89a3053cf52f8da3801e59c23f28756))
* create unified AssociationContactForm component with text extraction ([46add26](https://github.com/dachrisch/league.finance/commit/46add26fc916bcc52fb01fbaededcfd55b583ac3))
* **hooks:** add useOfferCreation hook for wizard state management ([bf9dfcc](https://github.com/dachrisch/league.finance/commit/bf9dfcc29187e486964027dd87549e3ada837ba5))
* implement custom price save mutation for offer details ([ed888f0](https://github.com/dachrisch/league.finance/commit/ed888f00828b9e509527801e5b9c833b07cbb644))
* **offer-wizard:** add wizard state types and interfaces ([9ad8465](https://github.com/dachrisch/league.finance/commit/9ad846567197049daf966fc973e70ccfef39af8b))
* **schemas:** add offer wizard validation schemas ([8fd719d](https://github.com/dachrisch/league.finance/commit/8fd719d4ae98db34fc09964016791187c09ea9ec))
* **styles:** add offer wizard design system and component styles ([3f83eb8](https://github.com/dachrisch/league.finance/commit/3f83eb8093cb516b51029000d43f23e23b28479f))
* update association schema to address-based model ([ac4b0cd](https://github.com/dachrisch/league.finance/commit/ac4b0cd261d08f00a63c85bf338569cd3ac608c7))


### Bug Fixes

* add configId to UpdateFinancialConfigSchema for spec compliance ([fd4ef54](https://github.com/dachrisch/league.finance/commit/fd4ef5477e25683151be05dd60074a3d5221f7a3))
* add logout endpoint, validate JWT payload, strengthen CSRF protection ([5f9dbba](https://github.com/dachrisch/league.finance/commit/5f9dbbad2ac79a11540815754b41fb8635e5421c))
* add max(100) validation for PERCENT discounts ([93ecd61](https://github.com/dachrisch/league.finance/commit/93ecd612321b211e5b3aac95a92d38ede777dee8))
* add required fields to test data - email for contacts, address for associations ([baebe0f](https://github.com/dachrisch/league.finance/commit/baebe0fb2e51996ac438a505980018006ae1a0b6))
* address critical security and functional issues in custom price save ([4d28ffc](https://github.com/dachrisch/league.finance/commit/4d28ffc9788059b26f254edaa057bbc014f6cb63))
* atomic offer creation with transaction rollback ([223dc3e](https://github.com/dachrisch/league.finance/commit/223dc3e2769667fdffe3cf190dbd11715306ea4e))
* correct @types/cookie-parser version to available 1.4.10 ([5774a4e](https://github.com/dachrisch/league.finance/commit/5774a4e4a75170794bc729067cda5fb83cf395fa))
* critical migration issues - env var, tracking, sparse index ([a6fd027](https://github.com/dachrisch/league.finance/commit/a6fd0278e36ca957e9068e5085a1c41d9d893958))
* **database:** Fix FinancialConfig index to support multiple offers per league/season ([1df415e](https://github.com/dachrisch/league.finance/commit/1df415e7588a932d600d78b6e0c72bc3f99a693e))
* exclude vitest test files from TypeScript compilation ([c9fb121](https://github.com/dachrisch/league.finance/commit/c9fb121dbbb503b37303a13f1ef8d73fc910032a))
* improve auth error handler pathname check to avoid false positives ([e108d42](https://github.com/dachrisch/league.finance/commit/e108d425516eec8541721cd8a37ad6ec7952ed65))
* improve migration idempotency and ordering ([d528df9](https://github.com/dachrisch/league.finance/commit/d528df97acf07af8490b1155f408b169c7f68ea8))
* improve transaction error handling in offer creation ([395ce8a](https://github.com/dachrisch/league.finance/commit/395ce8a18c2988b5f7506089497096f08441ec87))
* invalidate queries after entity creation to show new items in dropdowns ([db0f4b2](https://github.com/dachrisch/league.finance/commit/db0f4b227f4010895c83b9c10538b9a3e525e5ef))
* Pass credentials to fetch in httpBatchLink ([5c4b188](https://github.com/dachrisch/league.finance/commit/5c4b188d2e072a5e219dc602de79220ad43f5af2))
* proper tRPC mutation handling in OfferWizardStep1 for entity creation ([0540923](https://github.com/dachrisch/league.finance/commit/0540923f06ac4a2c5c2ff49d0f9462c59a7592f5))
* Secure JWT token in HttpOnly cookie instead of URL query parameter ([c52ba9e](https://github.com/dachrisch/league.finance/commit/c52ba9efe87d6d2f933a2565379cf3000518d028))
* use correct tRPC mutation calls for entity creation in Step1 ([079086a](https://github.com/dachrisch/league.finance/commit/079086a6079aaa73f73d231fec6d46338e49c8fb))

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
