# Docker Image Test Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor CI to partial reusable workflows and add a Docker health-check test stage that gates the registry push.

**Architecture:** A thin `ci.yml` orchestrator calls four partial workflows: `part_node_test`, `part_docker_build`, `part_docker_test`, `part_docker_push`. The build saves the image as a tar artifact; the test loads it, starts the container, and polls Docker's health status. The app needs a `/health` endpoint that returns 200 regardless of DB state, and Express must bind before `connectMongo()` so the health check can respond.

**Tech Stack:** TypeScript, Express, Vitest, GitHub Actions reusable workflows, Docker buildx

---

## File Map

| Action | File |
|---|---|
| Create | `src/server/health.ts` |
| Create | `src/server/__tests__/health.test.ts` |
| Modify | `src/server/index.ts` |
| Modify | `Dockerfile` |
| Modify | `.github/workflows/ci.yml` |
| Create | `.github/workflows/part_node_test.yaml` |
| Create | `.github/workflows/part_docker_build.yaml` |
| Create | `.github/workflows/part_docker_test.yaml` |
| Create | `.github/workflows/part_docker_push.yaml` |

---

### Task 1: Health module (TDD)

**Files:**
- Create: `src/server/health.ts`
- Create: `src/server/__tests__/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/__tests__/health.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getHealthResponse, setDbStatus } from '../health';

describe('health', () => {
  beforeEach(() => setDbStatus('disconnected'));

  it('returns status ok with db disconnected by default', () => {
    expect(getHealthResponse()).toEqual({ status: 'ok', db: 'disconnected' });
  });

  it('returns db connected after setDbStatus connected', () => {
    setDbStatus('connected');
    expect(getHealthResponse()).toEqual({ status: 'ok', db: 'connected' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/server/__tests__/health.test.ts
```

Expected: FAIL with `Cannot find module '../health'`

- [ ] **Step 3: Create `src/server/health.ts`**

```typescript
import type { Request, Response } from 'express';

let dbStatus: 'connected' | 'disconnected' = 'disconnected';

export function setDbStatus(status: 'connected' | 'disconnected'): void {
  dbStatus = status;
}

export function getHealthResponse(): { status: 'ok'; db: 'connected' | 'disconnected' } {
  return { status: 'ok', db: dbStatus };
}

export function healthHandler(_req: Request, res: Response): void {
  res.json(getHealthResponse());
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/server/__tests__/health.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/server/health.ts src/server/__tests__/health.test.ts
git commit -m "feat: add health module with db status tracking"
```

---

### Task 2: Wire health endpoint into Express and fix startup order

**Files:**
- Modify: `src/server/index.ts`

- [ ] **Step 1: Add the import and register the route**

At the top of `src/server/index.ts`, add the import after the existing imports:

```typescript
import { healthHandler, setDbStatus } from './health';
```

Add the route after `app.use(passport.initialize())` and before the OAuth routes (around line 59):

```typescript
app.get('/health', healthHandler);
```

- [ ] **Step 2: Restructure the startup at the bottom of the file**

Replace the current bottom of `src/server/index.ts` (the `connectMongo().then(...)` block):

```typescript
// Before:
connectMongo().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
```

With:

```typescript
const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

connectMongo()
  .then(() => { setDbStatus('connected'); })
  .catch(err => console.error('MongoDB connection failed:', err));
```

Note: remove the existing `const PORT = ...` declaration since it moves here, or keep it in place and only change the bottom block — whichever matches what's already in the file.

- [ ] **Step 3: Run all tests to verify no regressions**

```bash
npm test
```

Expected: all tests PASS (no new failures)

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: add /health endpoint and start server before mongo connects"
```

---

### Task 3: Update Dockerfile HEALTHCHECK

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Change the HEALTHCHECK target**

In `Dockerfile`, replace:

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --spider -q http://localhost:3000/ || exit 1
```

With:

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --spider -q http://localhost:3000/health || exit 1
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "fix: point HEALTHCHECK at /health endpoint"
```

---

### Task 4: Create `part_node_test.yaml`

**Files:**
- Create: `.github/workflows/part_node_test.yaml`

- [ ] **Step 1: Create the file**

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json

name: 🧪 Node.js Test

on:
  workflow_call:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
      - name: Run tests
        run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/part_node_test.yaml
git commit -m "ci: add reusable node test partial workflow"
```

---

### Task 5: Create `part_docker_build.yaml`

**Files:**
- Create: `.github/workflows/part_docker_build.yaml`

The image is saved as `/tmp/league.finance.tar` via buildx `outputs`. The artifact name is `docker-image-league.finance`. Both are exposed as job outputs so the caller can pass them to test and push.

- [ ] **Step 1: Create the file**

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json

name: 🐳🏗️ Build Docker Image

on:
  workflow_call:
    outputs:
      artifact_name:
        description: "Name of the uploaded artifact containing the Docker image"
        value: ${{ jobs.build.outputs.artifact_name }}
      image_name:
        description: "Local Docker image name (without registry prefix)"
        value: ${{ jobs.build.outputs.image_name }}

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact_name: ${{ steps.set-outputs.outputs.artifact_name }}
      image_name: ${{ steps.set-outputs.outputs.image_name }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          tags: league.finance:latest
          outputs: type=docker,dest=/tmp/league.finance.tar
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Upload Docker image artifact
        uses: actions/upload-artifact@v4
        with:
          name: docker-image-league.finance
          path: /tmp/league.finance.tar
          retention-days: 1

      - name: Set outputs
        id: set-outputs
        run: |
          echo "artifact_name=docker-image-league.finance" >> $GITHUB_OUTPUT
          echo "image_name=league.finance" >> $GITHUB_OUTPUT
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/part_docker_build.yaml
git commit -m "ci: add reusable docker build partial workflow"
```

---

### Task 6: Create `part_docker_test.yaml`

**Files:**
- Create: `.github/workflows/part_docker_test.yaml`

- [ ] **Step 1: Create the file**

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json

name: 🐳🧪 Test Docker Image

on:
  workflow_call:
    inputs:
      artifact_name:
        required: true
        description: The name of the artifact containing the Docker image
        type: string
      image_name:
        required: true
        description: The local name of the Docker image
        type: string

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Download Docker image artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ inputs.artifact_name }}
          path: /tmp

      - name: 🐳 Load Docker image
        run: |
          docker load --input /tmp/${{ inputs.image_name }}.tar
          docker image ls -a

      - name: 🐳🧪 Test Docker image
        run: |
          docker run --rm --detach --name test_container ${{ inputs.image_name }}:latest
          for i in {1..10}; do
            status=$(docker inspect --format='{{.State.Health.Status}}' test_container)
            health_details=$(docker inspect --format='{{json .State.Health}}' test_container)
            echo "Health status: $status"
            echo "Health details: $health_details"
            if [ "$status" = "healthy" ]; then break; fi
            sleep 6
          done
          if [ "$status" != "healthy" ]; then
            echo "Container did not become healthy after 10 attempts."
            docker logs test_container
            exit 1
          fi
          docker stop test_container
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/part_docker_test.yaml
git commit -m "ci: add reusable docker image test partial workflow"
```

---

### Task 7: Create `part_docker_push.yaml`

**Files:**
- Create: `.github/workflows/part_docker_push.yaml`

The push job re-downloads the artifact (built by `part_docker_build`), loads it, tags it with the full registry path, and pushes both `latest` and `${{ github.sha }}` tags.

- [ ] **Step 1: Create the file**

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json

name: 🐳🚀 Push Docker Image

on:
  workflow_call:
    inputs:
      artifact_name:
        required: true
        description: The name of the artifact containing the Docker image
        type: string
      image_name:
        required: true
        description: The local name of the Docker image (without registry prefix)
        type: string
    secrets:
      DOCKER_TOKEN:
        required: true
        description: Docker Hub token for authentication

permissions:
  contents: read

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Download Docker image artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ inputs.artifact_name }}
          path: /tmp

      - name: 🐳 Load Docker image
        run: |
          docker load --input /tmp/${{ inputs.image_name }}.tar
          docker image ls -a

      - name: 🔐 Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          registry: docker.io
          username: ${{ github.actor }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: 🐳🚀 Tag and push Docker image
        run: |
          docker tag ${{ inputs.image_name }}:latest dachrisch/league.finance:latest
          docker tag ${{ inputs.image_name }}:latest dachrisch/league.finance:${{ github.sha }}
          docker push dachrisch/league.finance:latest
          docker push dachrisch/league.finance:${{ github.sha }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/part_docker_push.yaml
git commit -m "ci: add reusable docker push partial workflow"
```

---

### Task 8: Replace `ci.yml` with thin orchestrator

**Files:**
- Modify: `.github/workflows/ci.yml`

`docker-push` lists both `docker-build` and `docker-test` in `needs` so it can access `docker-build`'s outputs after `docker-test` has gated the build.

- [ ] **Step 1: Replace the file contents**

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json

name: CI/CD

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  node-test:
    uses: ./.github/workflows/part_node_test.yaml

  docker-build:
    uses: ./.github/workflows/part_docker_build.yaml

  docker-test:
    needs: docker-build
    uses: ./.github/workflows/part_docker_test.yaml
    with:
      artifact_name: ${{ needs.docker-build.outputs.artifact_name }}
      image_name: ${{ needs.docker-build.outputs.image_name }}

  docker-push:
    needs: [docker-build, docker-test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    uses: ./.github/workflows/part_docker_push.yaml
    with:
      artifact_name: ${{ needs.docker-build.outputs.artifact_name }}
      image_name: ${{ needs.docker-build.outputs.image_name }}
    secrets:
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: refactor to partial reusable workflows with docker image test"
git push
```

- [ ] **Step 3: Verify on GitHub**

Open the Actions tab. Confirm:
- PR run: `node-test`, `docker-build`, `docker-test` all run; `docker-push` is skipped
- Master run: all four jobs run in sequence; Docker Hub receives new image
