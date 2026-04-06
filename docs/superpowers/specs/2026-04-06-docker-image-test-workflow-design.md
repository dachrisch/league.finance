# Docker Image Test Workflow Design

## Context

The CI pipeline currently builds and pushes the Docker image in a single step with no verification that the image actually starts. This adds a health-check test stage (mirroring the groceries-order-tracking pattern) so broken images are caught before they reach Docker Hub.

Docker build + test will run on both PRs and master pushes; push to registry only happens on master after the test passes.

---

## 1. App Changes

### `/health` endpoint (`src/server/index.ts`)

Add a `GET /health` route that always returns HTTP 200:

```json
{ "status": "ok", "db": "connected" | "disconnected" }
```

`db` is informational — the response is 200 regardless of DB state.

Track DB state with a module-level variable:

```typescript
let dbStatus: 'connected' | 'disconnected' = 'disconnected';
```

Set it to `'connected'` inside the `connectMongo()` success callback.

### Server startup order (`src/server/index.ts`)

Currently the server only binds after `connectMongo()` resolves, so a missing DB prevents the health check from ever responding. Change to:

```typescript
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
connectMongo()
  .then(() => { dbStatus = 'connected'; })
  .catch(err => console.error('MongoDB connection failed:', err));
```

Express starts immediately; MongoDB connects in the background.

### Dockerfile HEALTHCHECK

Update target from `/` to `/health`:

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --spider -q http://localhost:3000/health || exit 1
```

---

## 2. Workflow Files

### `ci.yml` (orchestrator)

Triggers: `push` to master, `pull_request` to master.

Jobs:
| Job | Needs | Condition |
|---|---|---|
| `node-test` | — | always |
| `docker-build` | — | always |
| `docker-test` | `docker-build` | always |
| `docker-push` | `docker-test` | master push only |

Each job calls its corresponding partial workflow via `uses`.

### `part_node_test.yaml`

Reusable (`workflow_call`), no inputs.

Steps: checkout → setup-node 24 (cache: npm) → `npm ci --legacy-peer-deps` → `npm test`

### `part_docker_build.yaml`

Reusable (`workflow_call`), no inputs.

Outputs: `artifact_name`, `image_name`.

Steps: checkout → setup-buildx → build image (no push, `load: true`) → save as `<image_name>.tar` → upload artifact with name `<artifact_name>`.

Image name: `dachrisch/league.finance`  
Artifact name: `league-finance-docker-image`

### `part_docker_test.yaml`

Reusable (`workflow_call`).

Inputs:
- `artifact_name` (required)
- `image_name` (required)

Steps:
1. Download artifact to `/tmp`
2. `docker load --input /tmp/<image_name>.tar`
3. `docker run --rm --detach --name test_container <image_name>:latest`
4. Poll `docker inspect` health status up to 10× (6s sleep between). On `healthy` → break.
5. If not healthy after 10 attempts → print logs → `exit 1`
6. `docker stop test_container`

No `MONGO_URI` passed — server starts with DB disconnected but still responds healthy.

### `part_docker_push.yaml`

Reusable (`workflow_call`).

Inputs:
- `artifact_name` (required)
- `image_name` (required)

Secrets: `DOCKER_TOKEN` (inherited).

Steps:
1. Download artifact to `/tmp`
2. `docker load --input /tmp/<image_name>.tar`
3. Login to Docker Hub (`docker/login-action@v3`)
4. Push tags: `<image_name>:latest` + `<image_name>:${{ github.sha }}`

---

## 3. Files Changed

| File | Change |
|---|---|
| `src/server/index.ts` | Add `/health` route, restructure startup order |
| `Dockerfile` | Update `HEALTHCHECK` to use `/health` |
| `.github/workflows/ci.yml` | Replace current jobs with calls to partials |
| `.github/workflows/part_node_test.yaml` | New |
| `.github/workflows/part_docker_build.yaml` | New |
| `.github/workflows/part_docker_test.yaml` | New |
| `.github/workflows/part_docker_push.yaml` | New |

---

## 4. Verification

1. Open a PR → CI should run `node-test`, `docker-build`, `docker-test` (no push)
2. Merge to master → all four jobs run; Docker Hub gets updated image
3. Confirm health check passes: `docker run --detach dachrisch/league.finance:latest` → `docker inspect --format='{{.State.Health.Status}}'` → `healthy`
4. Confirm `/health` returns 200 without `MONGO_URI`: `curl localhost:3000/health` → `{"status":"ok","db":"disconnected"}`
