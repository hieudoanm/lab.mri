# MRI Lab — Deployment and Operations

## 1. Purpose

This document defines how to run, test, deploy, monitor, maintain, and safely tear down MRI Lab.

MRI Lab is an independent computational-neuroimaging SaaS portfolio project built with:

- Next.js (App Router), React, and TypeScript.
- Python 3.14, FastAPI, and Pydantic.
- PostgreSQL 18 and Psycopg 3.
- Celery and Redis.
- MinIO (S3-compatible) object storage for local and self-hosted environments.
- Docker and Docker Compose.
- GitHub Actions.
- An optional Tauri v2 desktop shell.

The deployment strategy prioritises reproducibility, security, reasonable operating costs, and a clear path from local development to a publicly accessible demonstration.

The primary deployment target is a **CI-first, Docker-Compose-first self-hosted stack**. Cloud providers (GCP or AWS), Terraform, and Kubernetes are explicitly deferred and are documented only as a future evolution. The platform must build, test, and run without them.

## 2. Deployment Principles

1. Keep local development straightforward.
2. Keep production credentials out of source control.
3. Separate frontend, API, background-worker, and dispatcher responsibilities.
4. Keep MRI volumes and derived artifacts in private object storage.
5. Keep PostgreSQL inaccessible to unauthorised public clients.
6. Use least-privilege storage credentials and short-lived signed URLs.
7. Manage the environment as code through `docker-compose.yaml`.
8. Apply database migrations through a controlled, one-shot step.
9. Make deployments observable and recoverable.
10. Minimise always-on infrastructure for a portfolio project.
11. Document recurring costs and resource cleanup.
12. Never use real participant or clinical data in the demonstration without an appropriate data-governance process.
13. Do not introduce a cloud provider, Terraform, or Kubernetes until the Compose deployment is proven and a demonstrated requirement justifies the extra operational cost.

## 3. Environment Strategy

Use three logical environments.

| Environment             | Purpose                        | Data                        | Runtime                                       |
| ----------------------- | ------------------------------ | --------------------------- | --------------------------------------------- |
| Local                   | Daily development              | Synthetic data              | Docker Compose or host processes              |
| CI                      | Automated testing              | Isolated synthetic fixtures | GitHub Actions, `postgres:18-alpine` service  |
| Self-hosted production  | Public portfolio demonstration | Synthetic data only         | Docker Compose on a single hardened host      |

A separate staging environment may be introduced when the deployment complexity justifies it. Until then, the self-hosted stack is promoted only after CI passes on `master`.

### 3.1 Environment isolation

Each environment should have its own:

- Configuration (`.env` file or CI environment variables).
- Database (separate database or instance).
- Object-storage bucket and credentials.
- Authentication configuration.
- Secrets.
- Logging context.

Do not let CI or local development accidentally write to the production database or production storage bucket. CI uses an ephemeral, throwaway `postgres:18-alpine` service and does not require object-storage credentials for the default jobs.

## 4. Local Development

### 4.1 Prerequisites

Install supported versions of:

- Node.js 26 (see `packages/frontend/.nvmrc`, currently `26.11.1`).
- pnpm 12.11.2 (pinned through `packageManager` in `package.json`).
- Python 3.14 managed through `uv`.
- Docker and Docker Compose.
- Git.

Run `pnpm install` from the repository root to install JavaScript dependencies and set up Husky Git hooks. Before each commit, lint-staged runs Ruff on staged backend Python files and ESLint/Prettier on staged frontend source files; these local checks do not replace CI.

Pin or document supported versions. Do not assume that the newest release of every tool is compatible with the repository.

### 4.2 Suggested local services

Run these services with Docker Compose (`docker compose up --build`):

- Next.js frontend (`localhost:3000`).
- FastAPI API (`localhost:8000`, serving `/api/v1`).
- PostgreSQL 18 and Redis.
- MinIO (S3-compatible object storage) with its console on `localhost:9001`.
- Celery worker and outbox dispatcher.
- A one-shot migration service that completes before the API and worker start.

Compose persists PostgreSQL data, MinIO objects, and local uploads in named volumes. Use `docker compose down` to stop the stack without deleting those volumes, or `docker compose down --volumes` to remove the development data.

The frontend's browser API URL can be changed at build time with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`. Server-side frontend requests use `API_INTERNAL_BASE_URL`, which Compose sets to the backend service address.

The frontend Docker build uses the repository-level pnpm workspace lockfile and Next.js standalone output. For running application processes directly on the host, use the package-specific commands instead.

### 4.3 Example `.env.example`

```dotenv
# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
# Client-side display limit for the volume upload form; keep in step with
# MAX_UPLOAD_BYTES. The server remains the authority.
NEXT_PUBLIC_MAX_UPLOAD_BYTES=536870912

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
APP_ENV=development
APP_NAME=mri-lab-api
LOG_LEVEL=DEBUG
LOG_FORMAT=json
API_CORS_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://mri-lab:mri-lab@localhost:5432/mri-lab
DATABASE_POOL_MIN_SIZE=1
DATABASE_POOL_MAX_SIZE=10
DATABASE_STATEMENT_TIMEOUT_MS=15000
REDIS_URL=redis://localhost:6379/0

# ---------------------------------------------------------------------------
# Worker and dispatcher
# ---------------------------------------------------------------------------
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_TASK_TIME_LIMIT_SECONDS=1800
CELERY_TASK_SOFT_TIME_LIMIT_SECONDS=1740
RUN_LEASE_SECONDS=600
RUN_MAX_ATTEMPTS=3
OUTBOX_DISPATCH_MAX_ATTEMPTS=10
IDEMPOTENCY_TTL_SECONDS=86400

# ---------------------------------------------------------------------------
# Object storage (MinIO / S3-compatible)
# ---------------------------------------------------------------------------
STORAGE_BACKEND=s3
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=mri-lab
S3_REGION=us-east-1
S3_ACCESS_KEY=mri-lab
S3_SECRET_KEY=mri-lab-secret
S3_USE_SSL=false
S3_SIGNED_URL_TTL_SECONDS=900

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
# "development" enables the local POST /api/v1/auth/token endpoint.
# Production must use "oidc" and override AUTH_TOKEN_SECRET (or AUTH_PUBLIC_KEY).
AUTH_MODE=development
AUTH_TOKEN_SECRET=insecure-development-secret-change-me
# AUTH_PUBLIC_KEY=          # PEM public key for RS256/ES256 verification
AUTH_JWT_ALGORITHMS=HS256
AUTH_TOKEN_ISSUER=mri-lab
AUTH_TOKEN_AUDIENCE=mri-lab-api
AUTH_TOKEN_TTL_SECONDS=3600
AUTH_COOKIE_NAME=mri-lab_session
AUTH_COOKIE_SAMESITE=lax
# AUTH_COOKIE_SECURE=       # defaults to true in production, false otherwise
# AUTH_COOKIE_DOMAIN=       # defaults to a host-only cookie
# Development identity defaults (used only when AUTH_MODE=development)
DEV_IDENTITY_PROVIDER=local
DEV_IDENTITY_SUBJECT=demo-researcher
DEV_IDENTITY_DISPLAY_NAME=Demo Researcher
DEV_IDENTITY_EMAIL=demo@mri-lab.local

# ---------------------------------------------------------------------------
# Resource limits
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES=536870912
MAX_VOLUME_DIMENSIONS=512
MAX_VOXEL_COUNT=268435456
MAX_FILES_PER_DATASET=1000
MAX_REQUEST_BODY_BYTES=1048576
UPLOAD_SESSION_TTL_SECONDS=3600
RUN_TIMEOUT_SECONDS=1800
MAX_CONCURRENT_RUNS_PER_USER=2
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

These values are examples for local development only. Production must use managed credentials and secure configuration. When `APP_ENV=production`, the API refuses to start with `AUTH_MODE=development`, a default or short `AUTH_TOKEN_SECRET`, or an asymmetric `AUTH_JWT_ALGORITHMS` value without `AUTH_PUBLIC_KEY`.

`S3_ENDPOINT` points at MinIO locally. In the Compose network it resolves to the `minio` service (`http://minio:9000`), while host-side tools use `http://localhost:9000`.

### 4.4 Local setup workflow

The exact commands depend on the package scripts and dependency manager selected for the repository. Document the final commands in the README and Makefile.

The setup process should perform these steps:

1. Install frontend dependencies (`pnpm install`).
2. Install backend and worker dependencies (`uv sync --all-groups` in `packages/backend`).
3. Start PostgreSQL, Redis, and MinIO.
4. Apply database migrations.
5. Generate synthetic NIfTI fixtures.
6. Start the API.
7. Start the worker and outbox dispatcher.
8. Start the frontend.
9. Run the smoke tests.

### 4.5 Local development acceptance criteria

- A new developer can reproduce the environment.
- No production credentials are required.
- Migrations work against a fresh database.
- The frontend can communicate with the API.
- The worker can process a submitted experiment run.
- Synthetic uploads can be validated and opened in the viewer.
- The full analysis workflow can be demonstrated locally.

## 5. Containerisation

Containerise every runtime component so that configuration lives in the environment, not the image.

| Image                       | Dockerfile                                     | Runtime command                                                    | Port |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ | ---- |
| Frontend (`@mri-lab/web`)   | `packages/frontend/Dockerfile`                 | Next.js standalone server (`node server.js`)                       | 3000 |
| Backend API                 | `packages/backend/Dockerfile`                  | `uv`-managed FastAPI ASGI server                                   | 8000 |
| Celery worker               | `packages/backend/Dockerfile.worker`           | `python -m app.workers.celery` / `celery -A ... worker`            | —    |
| Outbox dispatcher           | `packages/backend/Dockerfile.dispatcher`       | `python -m app.workers.outbox_dispatcher` (looped)                 | —    |
| Migrations (one-shot)       | `packages/backend/Dockerfile`                  | `python -m app.db.migrations upgrade`                              | —    |

The API, worker, dispatcher, and migration runner share a Python dependency base image (`uv.lock`, Python 3.14) while retaining separate runtime commands. Sharing an image does not mean sharing the same execution role: the API does not need broker publishing rights, and the dispatcher does not need HTTP exposure.

### 5.1 Container requirements

- Use a maintained, supported base image; pin Python 3.14 and Node 26 deliberately.
- Build the frontend with `output: 'standalone'` so only the traced runtime is shipped.
- Prefer multi-stage builds; do not copy development dependencies into production images.
- Run as a non-root user.
- Do not copy `.env` files or credentials into images; inject configuration at runtime.
- Avoid placing MRI volumes or artifacts in container layers.
- Use a predictable working directory (`/app`).
- Install `init`/a proper PID 1 so the worker and dispatcher handle `SIGTERM` and shut down cleanly.
- Define container health checks for the API and frontend.
- Do not run migrations from the application start-up path; use the dedicated one-shot service.

### 5.2 Example container layout

```text
packages/
├── frontend/
│   └── Dockerfile              # multi-stage: deps -> build -> standalone runner
└── backend/
    ├── Dockerfile              # API
    ├── Dockerfile.worker       # Celery worker
    └── Dockerfile.dispatcher   # outbox dispatcher
```

The frontend build uses the repository-level `pnpm-lock.yaml`. Install with `pnpm install --frozen-lockfile` in the build stage and rely on the workspace lockfile rather than the package-specific one.

## 6. Docker Compose Stack

Docker Compose is the current deployment topology, both for local development and for the self-hosted production demonstration.

```mermaid
flowchart TD
    User["User's browser"]
    Web["Next.js frontend (3000)"]
    API["FastAPI API (8000)"]
    DB["PostgreSQL 18"]
    Redis["Redis broker"]
    Worker["Celery worker"]
    Dispatcher["Outbox dispatcher"]
    MinIO["MinIO (S3-compatible)"]
    Migrate["One-shot migrations"]
    CI["GitHub Actions"]

    User --> Web
    Web --> API
    API --> DB
    API --> Redis
    API --> MinIO
    Dispatcher --> DB
    Dispatcher --> Redis
    Redis --> Worker
    Worker --> DB
    Worker --> MinIO
    Migrate --> DB
    CI --> Web
    CI --> API
    CI --> Worker
```

### 6.1 Services

| Service      | Image / build                       | Purpose                                                        | Depends on                                              |
| ------------ | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| `postgres`   | `postgres:18-alpine`                | Authoritative metadata and run state                           | —                                                       |
| `redis`      | `redis:8-alpine`                    | Celery broker and coordination                                 | —                                                       |
| `minio`      | `minio/minio`                       | Private S3-compatible object storage                           | —                                                       |
| `minio-init` | `minio/mc`                          | One-shot bucket creation and policy setup                      | `minio` healthy                                         |
| `migrate`    | `packages/backend/Dockerfile`       | One-shot schema migration (`app.db.migrations upgrade`)        | `postgres` healthy                                      |
| `backend`    | `packages/backend/Dockerfile`       | FastAPI API on port 8000 (`/api/v1`)                           | `postgres`, `redis`, `minio` healthy; `migrate` done    |
| `worker`     | `packages/backend/Dockerfile.worker`| Celery worker executing experiment runs                        | `postgres`, `redis`, `minio` healthy; `migrate` done    |
| `dispatcher` | `packages/backend/Dockerfile.dispatcher` | Publishes committed outbox events to Redis                | `postgres`, `redis` healthy; `migrate` done            |
| `frontend`   | `packages/frontend/Dockerfile`      | Next.js standalone application on port 3000                    | `backend` healthy                                       |

### 6.2 Example service definitions

The following excerpts are consistent with the repository layout and the environment variables in section 4.3.

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: mri-lab-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-mri-lab}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-mri-lab}
      POSTGRES_DB: ${POSTGRES_DB:-mri-lab}
    ports:
      - '5432:5432'
    volumes:
      - mri-lab-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-mri-lab} -d ${POSTGRES_DB:-mri-lab}']
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  redis:
    image: redis:8-alpine
    container_name: mri-lab-redis
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: mri-lab-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY:-mri-lab}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-mri-lab-secret}
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - mri-lab-minio:/data
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${S3_ACCESS_KEY:-mri-lab} ${S3_SECRET_KEY:-mri-lab-secret} &&
      mc mb --ignore-existing local/${S3_BUCKET:-mri-lab} &&
      mc anonymous set none local/${S3_BUCKET:-mri-lab}
      "
    restart: 'no'
```

```yaml
  migrate:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    command: ['/app/.venv/bin/python', '-m', 'app.db.migrations', 'upgrade']
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-mri-lab}:${POSTGRES_PASSWORD:-mri-lab}@postgres:5432/${POSTGRES_DB:-mri-lab}
    depends_on:
      postgres:
        condition: service_healthy
    restart: 'no'

  backend:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    environment:
      APP_ENV: ${APP_ENV:-development}
      AUTH_MODE: ${AUTH_MODE:-development}
      AUTH_TOKEN_SECRET: ${AUTH_TOKEN_SECRET:-insecure-development-secret-change-me}
      DATABASE_URL: postgresql://${POSTGRES_USER:-mri-lab}:${POSTGRES_PASSWORD:-mri-lab}@postgres:5432/${POSTGRES_DB:-mri-lab}
      REDIS_URL: redis://redis:6379/0
      STORAGE_BACKEND: s3
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: ${S3_BUCKET:-mri-lab}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-mri-lab}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-mri-lab-secret}
      API_CORS_ORIGINS: '["http://localhost:3000","http://127.0.0.1:3000"]'
    ports:
      - '8000:8000'
    healthcheck:
      test: ['CMD', 'python', '-c', "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/ready')"]
      interval: 10s
      timeout: 5s
      retries: 6
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped
```

```yaml
  worker:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile.worker
    environment:
      APP_ENV: ${APP_ENV:-development}
      DATABASE_URL: postgresql://${POSTGRES_USER:-mri-lab}:${POSTGRES_PASSWORD:-mri-lab}@postgres:5432/${POSTGRES_DB:-mri-lab}
      CELERY_BROKER_URL: redis://redis:6379/0
      STORAGE_BACKEND: s3
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: ${S3_BUCKET:-mri-lab}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-mri-lab}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-mri-lab-secret}
    init: true
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped

  dispatcher:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile.dispatcher
    entrypoint: ['/bin/sh', '-c']
    command:
      - |
        set -e
        while true; do
          /app/.venv/bin/python -m app.workers.outbox_dispatcher
          sleep 5
        done
    environment:
      APP_ENV: ${APP_ENV:-development}
      DATABASE_URL: postgresql://${POSTGRES_USER:-mri-lab}:${POSTGRES_PASSWORD:-mri-lab}@postgres:5432/${POSTGRES_DB:-mri-lab}
      REDIS_URL: redis://redis:6379/0
    init: true
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
      args:
        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000/api/v1}
    environment:
      API_INTERNAL_BASE_URL: http://backend:8000/api/v1
    ports:
      - '3000:3000'
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  mri-lab-pgdata:
  mri-lab-minio:
```

### 6.3 Named volumes

Persist state in named volumes so that `docker compose down` does not destroy data:

| Volume             | Mount                       | Contents                                        |
| ------------------ | --------------------------- | ----------------------------------------------- |
| `mri-lab-pgdata`   | `/var/lib/postgresql/data`  | PostgreSQL cluster data                         |
| `mri-lab-minio`    | `/data`                     | Source volumes, derived artifacts, manifests    |

Object storage is the only home for MRI volume bytes and derived artifacts; the database stores only metadata and object references.

### 6.4 Storage abstraction

The object-storage interface must allow MinIO locally and self-hosted, and an S3-compatible provider later, interchangeably. Configure the endpoint, bucket, region, credentials, and TLS through environment variables so the provider can be substituted without code changes. Block public access, keep credentials out of images, and never treat possession of an object key as authorisation.

### 6.5 Self-hosted production notes

For the self-hosted demo:

- Run the same images built from a reviewed `master` commit; do not build on the production host.
- Terminate TLS at a reverse proxy (for example Caddy, Nginx, or Traefik) in front of the frontend and API.
- Expose only the frontend (and the proxy) publicly; keep PostgreSQL, Redis, and the MinIO console on the internal network.
- Set `APP_ENV=production`, `AUTH_MODE=oidc`, a strong `AUTH_TOKEN_SECRET` or asymmetric key, and secure cookies.
- Provide a real `S3_ACCESS_KEY`/`S3_SECRET_KEY` distinct from the defaults.
- Restrict `API_CORS_ORIGINS` to the production origin.
- Configure log rotation and disk capacity alerts on the host.

## 7. Infrastructure as Code

Use **Docker Compose** as the current infrastructure-as-code mechanism. It is version-controlled, reviewable, and reproducible:

- Keep the `docker-compose.yaml` and `docker-compose.prod.yaml` files explicit and minimal.
- Do not commit secrets; use `.env` files excluded from version control.
- Provide an `.env.example` with placeholders only.
- Document resource limits and dependencies for each service.

**Terraform is deferred.** Introduce Terraform only when a cloud deployment is actually pursued. At that point, manage service configuration, database instances, storage buckets, service accounts and IAM bindings, secret references, logging, and networking. When Terraform is introduced:

- Do not commit state files or secrets.
- Use remote state with locking for shared deployments.
- Review plans before applying.
- Separate environments where practical.
- Document resource naming and ownership.

Kubernetes, a microservice decomposition, and a service mesh remain deferred per the architecture and technology-stack documents.

## 8. Configuration and Secrets

### 8.1 Configuration

Keep non-secret, environment-specific settings in explicit configuration:

- Environment name (`APP_ENV`).
- Log level and format.
- API base URL (`NEXT_PUBLIC_API_BASE_URL`, `API_INTERNAL_BASE_URL`).
- CORS origins.
- Resource limits (upload size, volume dimensions, voxel count, run timeout, concurrency).
- Redis and Celery settings.
- Object-storage endpoint, bucket, and region.
- Authentication mode and issuer.

Validate required configuration at start-up and fail clearly when mandatory values are missing.

### 8.2 Secrets

Keep the following only in environment files or a secret store, never in source or images:

- Database credentials (`DATABASE_URL`).
- Redis authentication (if enabled).
- Object-storage access and secret keys.
- `AUTH_TOKEN_SECRET` or signing keys.
- Any third-party credentials.

### 8.3 Rules

- Never commit secrets; `.env` and `.env.*` are ignored, and `!.env.example` is the only exception.
- Never log secret values, full connection strings, or signed URLs.
- Never expose server secrets through `NEXT_PUBLIC_*` variables; these are embedded in the client bundle.
- Rotate credentials according to a documented policy.
- Use separate credentials for local, CI, and production.
- Grant each service access only to the secrets it requires.
- Validate at start-up that production is not running with development defaults.

## 9. Database Migrations

Migrations live under `packages/backend/app/db/migrations/` as ordered SQL files with a Psycopg runner. Apply pending migrations with:

```bash
uv run python -m app.db.migrations upgrade
```

CI runs this command before tests against `postgres:18-alpine`.

### 9.1 Deployment order

A typical release should:

1. Build and test the application images.
2. Review the migration plan.
3. Apply a backward-compatible migration as a one-shot step (the Compose `migrate` service).
4. Start the API, worker, and dispatcher only after migrations complete successfully.
5. Run smoke tests.
6. Verify health and error metrics.
7. Retain a documented recovery option.

Compose enforces ordering with `migrate` using `condition: service_completed_successfully` as a dependency of `backend`, `worker`, and `dispatcher`.

### 9.2 Expand-and-contract

For changes requiring multiple releases, use expand-and-contract migrations:

1. Add the new schema while retaining compatibility.
2. Deploy code that supports the transition.
3. Migrate data if required.
4. Switch reads and writes.
5. Remove obsolete schema in a later release.

### 9.3 Rules

- The runner tracks applied versions and checksums and rejects modified, already-applied migrations.
- Apply each migration transactionally.
- Do not assume that rolling back an application image reverses a database migration safely.
- Avoid destructive automatic schema changes during application start-up.
- Migrations must be repeatable in a clean environment and reviewed before production.

## 10. CI/CD with GitHub Actions

CI is the authoritative quality gate and the first-class deployment concern. The workflow is defined in `.github/workflows/ci.yml` and triggers on pull requests and pushes to `master`, with concurrency cancellation (`cancel-in-progress: true`). Global environment pins are `UV_PYTHON: '3.14'` and `NODE_VERSION_FILE: packages/frontend/.nvmrc`.

### 10.1 Jobs and gates

| Job                | Name                     | Runs on        | Depends on                         | Purpose                                                                 |
| ------------------ | ------------------------ | -------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| `backend`          | `CI - Backend`           | `ubuntu-latest`| —                                  | Ruff format/lint, mypy, migrations, pytest with coverage, `pip-audit`   |
| `frontend`         | `CI - Frontend`          | `ubuntu-latest`| —                                  | pnpm install, lint, format check, typecheck, unit tests, build, audit  |
| `e2e`              | `End-to-End`             | `ubuntu-latest`| `frontend`                         | Playwright Chromium smoke tests                                         |
| `security`         | `Security`               | `ubuntu-latest`| —                                  | Trivy filesystem scan (CRITICAL/HIGH/MEDIUM) uploaded to GitHub Security|
| `tauri-build`      | `Build Tauri (<os>)`     | OS matrix      | `backend`, `frontend`, `e2e`, `security` | Desktop build on `master` pushes (optional)                       |
| `tauri-release`    | `Publish Tauri Release`  | `ubuntu-latest`| `tauri-build`                      | Publishes the `latest` desktop release on `master` (optional)           |

Backend job detail:

1. Checkout.
2. Setup `uv` with Python 3.14, caching against `packages/backend/uv.lock`.
3. `uv sync --all-groups`.
4. `uv run ruff format --check .`.
5. `uv run ruff check .`.
6. `uv run python -m mypy .`.
7. `uv run python -m app.db.migrations upgrade` against the `postgres:18-alpine` service.
8. `uv run pytest -q --cov=app --cov-report=term-missing`.
9. `uv run pip-audit --desc --format=json --output=pip-audit.json`.
10. Upload `pip-audit.json` as an artifact (30-day retention).

Frontend job detail:

1. Checkout.
2. Enable pnpm 12.11.2 and set up Node from `.nvmrc`; cache the pnpm store.
3. `pnpm install --frozen-lockfile`.
4. `pnpm lint && pnpm format:check`.
5. `pnpm typecheck`.
6. `pnpm test`.
7. `pnpm build`.
8. `pnpm audit --json --output=npm-audit.json`.
9. Upload `npm-audit.json` as an artifact (30-day retention).

### 10.2 Pull request pipeline

Every pull request must pass backend, frontend, end-to-end, and security jobs. PR validation never receives production secrets, and forked pull requests do not run deployment steps.

### 10.3 Deployment pipeline

The current workflow produces validated code but does not itself deploy the Compose stack. Self-hosted release is a controlled, manual promotion from a green `master` commit:

1. Trigger only from `master` after all required checks pass.
2. Build immutable frontend, API, worker, and dispatcher images from the reviewed commit.
3. Tag images by commit SHA (and record the digest); do not rely only on a mutable `latest` tag.
4. Publish images to the self-hosted registry or transfer the saved image archive to the host.
5. Apply migrations with the one-shot `migrate` service.
6. Roll the API, worker, and dispatcher, then the frontend.
7. Execute smoke tests against the deployed origin.
8. Report deployment status.

An optional future evolution is a `deploy` job that pushes images to a registry (for example GHCR) and triggers the host over SSH. Until that job exists, document the manual promotion steps in the README.

### 10.4 Immutable artefacts

- Prefer image tags based on commit SHA or image digest.
- Keep previous immutable images available for rollback.
- Do not deploy changes directly from an unreviewed local working tree.
- Keep deployment permissions minimal and separated from PR validation.

### 10.5 Optional Tauri desktop build and release

The workflow already builds and publishes an optional desktop shell; it is an add-on, not a requirement for the web/Compose deployment.

- `Build Tauri (<os>)` runs only on pushes to `master`, depends on the backend, frontend, e2e, and security jobs, and uses a matrix of `macos-latest`, `ubuntu-latest`, and `windows-latest`. It installs frontend dependencies, sets up Rust with per-OS targets (including `x86_64-apple-darwin,aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, and `x86_64-pc-windows-msvc`), installs Linux system dependencies (`libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`), builds with `pnpm tauri:build`, zips the macOS app bundle, and uploads date-stamped build artifacts with 7-day retention. The build passes `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PASSWORD` when configured.
- `Publish Tauri Release` runs on `master` after the build, downloads the per-platform artifacts, collects the installer formats (`*.AppImage`, `*.deb`, `*.rpm`, `*.dmg`, `*.zip`, `*.tar.xz`, `*.msi`, `*.exe`), renames them to `mri-lab.<ext>`, generates and verifies `SHA256SUMS.txt`, and creates or replaces the `latest` GitHub release.

The Tauri configuration lives in `packages/frontend/src-tauri/`. It is a shell over the same web application and must not fork the frontend or duplicate viewer logic. Desktop releases depend on the web quality gates and must never bypass them.

### 10.6 Deployment pipeline principles

1. Build immutable artefacts.
2. Run the automated checks above.
3. Apply migrations in a controlled, one-shot step.
4. Run smoke tests.
5. Promote only when checks succeed.

## 11. Health Checks and Readiness

Implement separate health endpoints in the API.

### 11.1 Liveness

`GET /health/live`

Indicates that the API process is alive and able to respond. This endpoint should not fail solely because an external dependency is temporarily unavailable.

### 11.2 Readiness

`GET /health/ready`

Indicates whether the API can accept work under its defined readiness policy. Check the database connection and any other required dependency cheaply; avoid expensive or unbounded checks. Compose uses this endpoint for the `backend` container health check and gates the `frontend` start on it.

Do not expose credentials, internal network details, or detailed dependency errors through public health responses.

### 11.3 Worker and dispatcher health

A healthy HTTP endpoint does not prove that the asynchronous pipeline is healthy. Track:

- Worker process availability.
- Outbox dispatch lag (oldest unpublished event age).
- Last successful task.
- Broker/queue depth where available.
- Run age and stale `running` runs.
- Failed and retried run counts.

The dispatcher loop retries every few seconds, so a crash or Redis outage delays dispatch but does not lose committed outbox events.

## 12. Logging, Metrics, and Alerts

### 12.1 Logging

Use structured (JSON) logs with fields such as:

- Timestamp.
- Severity.
- Service (`api`, `worker`, `dispatcher`, `frontend`).
- Environment.
- Request or correlation ID.
- Run ID.
- Route template.
- Resource ID.
- Duration.
- Safe error code.

Do not log raw MRI voxel data, signed URLs, access tokens, full connection strings, or participant information. Container logs are collected through the Docker logging driver; configure rotation (`max-size`, `max-file`) so a noisy service cannot fill the disk.

### 12.2 Metrics

Track at least:

- API request count and latency.
- API error rate.
- Database connection utilisation.
- Upload completion and validation-failure counts.
- Outbox queue depth and dispatch lag.
- Run execution duration.
- Run success, failure, and retry counts.
- Stale run count.
- Object-storage usage and growth.
- Host CPU, memory, and disk utilisation.

A `/metrics` endpoint compatible with Prometheus and an optional Prometheus/Grafana sidecar are future additions; the self-hosted MVP may rely on structured logs, `docker stats`, and the MinIO and PostgreSQL metrics that are available.

### 12.3 Alerts

Start with a small number of actionable alerts:

- Sustained API failures.
- Repeated database connection failures.
- A growing backlog of old runs or undispatched outbox events.
- Repeated worker crashes.
- Disk usage approaching capacity (database or MinIO volume).
- Backup failures.

Avoid alerts that trigger on harmless short-lived fluctuations.

## 13. Backups and Recovery

Define a recovery policy for every durable data store. Both durable stores live in named volumes and must be backed up independently.

### 13.1 PostgreSQL

Document:

- Backup frequency (`pg_dump` on a schedule, for example nightly).
- Retention (for example 7 daily plus 4 weekly copies).
- Recovery procedure.
- Who can restore.
- Recovery point objective (RPO).
- Recovery time objective (RTO).

Example logical backup:

```bash
docker compose exec -T postgres \
  pg_dump -U mri-lab -d mri-lab -Fc > backups/mri-lab-$(date +%F).dump
```

A database dump is not a substitute for object-storage backups.

### 13.2 Object storage

Document:

- Source-volume and artifact retention.
- Bucket versioning or object-lock behaviour where enabled.
- Deletion policy and the relationship to `file_assets`, `dataset_versions`, and `artifacts` rows.
- Recovery options.
- How database metadata maps to stored object keys.

For the self-hosted demo, back up the `mri-lab-minio` volume or mirror the bucket with `mc mirror` to a second location. Keep database dumps and object mirrors consistent so a restore does not reference missing volumes.

### 13.3 Recovery testing

A backup is not proven useful until restoration has been tested.

- Document the restore procedure.
- Perform a test restore in a disposable environment.
- Verify that representative metadata and synthetic volume references remain consistent.
- Record any limitations.

## 14. Cost Management

A self-hosted portfolio project should not incur unnecessary ongoing costs.

- Run the whole stack on a single modest host; prefer the smallest instance that meets memory and disk needs.
- Budget for disk first: MRI volumes and derived artifacts dominate cost, not compute.
- Apply object-storage retention and cleanup for abandoned upload sessions and superseded artifacts.
- Enforce upload-size, volume-dimension, and run-time limits so a single job cannot exhaust the host.
- Limit worker concurrency and set Celery time limits.
- Configure Docker log rotation to prevent unbounded log growth.
- Monitor storage growth and provision headroom for backups.
- Avoid keeping unused environments running.
- Document which resources continue to incur charges while idle.

Review provider or host pricing before provisioning. Do not assume a workload remains cheap simply because the demonstration is small.

## 15. Production Readiness Checklist

### Application

- [ ] Production build succeeds for frontend, API, worker, and dispatcher.
- [ ] Images are immutable and tagged by commit SHA or digest.
- [ ] Authentication is enabled and `AUTH_MODE` is not `development`.
- [ ] Project isolation tests pass.
- [ ] Upload and processing limits are configured.
- [ ] Worker retries, time limits, and run leases are configured.
- [ ] Secrets are managed securely and not baked into images.
- [ ] Health and readiness endpoints work.

### Database and storage

- [ ] Migrations are reviewed and applied through the one-shot `migrate` service.
- [ ] Database access is restricted to the internal network.
- [ ] Backups are enabled as required and a restore has been tested.
- [ ] Object storage is private (anonymous access disabled).
- [ ] Storage credentials are distinct from the development defaults.
- [ ] Retention and cleanup policies are defined.

### Operations

- [ ] Structured logs are available with rotation configured.
- [ ] Critical metrics are monitored.
- [ ] Alerts are actionable.
- [ ] Deployment smoke tests pass.
- [ ] Cost controls and disk alerts are configured.
- [ ] Rollback and recovery limitations are documented.
- [ ] TLS terminates in front of the frontend and API.

### Portfolio demonstration

- [ ] Only synthetic data is used.
- [ ] Demo credentials are not privileged production credentials.
- [ ] The README explains limitations.
- [ ] The primary workflow works in the deployed environment.
- [ ] A reviewer can understand the architecture and run the project locally.

## 16. Rollback Strategy

Application rollback and data rollback are separate operations.

### 16.1 Application rollback

Keep previous immutable application images available. If a deployment fails, restore the previous compatible image tag in `docker-compose.prod.yaml` and run smoke tests. Because migrations run as a separate one-shot step, a rollback does not silently re-run schema changes.

### 16.2 Database rollback

Do not automatically reverse a migration without checking its effects. Prefer backward-compatible migrations that allow the application to be rolled back without losing data. For destructive changes, define a specific recovery plan before deployment.

### 16.3 Worker compatibility

During a rollout, old and new workers may temporarily coexist. Ensure that:

- Task payloads remain compatible during the transition.
- Algorithm and pipeline versions are explicit, and `image_digest` is recorded.
- Result and manifest schemas are versioned.
- Workers cannot overwrite results from incompatible executions.
- Queued jobs remain processable after deployment.

## 17. Teardown and Resource Cleanup

Provide a documented teardown process for disposable environments.

Before deleting resources:

1. Identify the environment.
2. Confirm that it contains no data that must be retained.
3. Check for object-storage contents, database backups, and image archives.
4. Review the destruction plan.
5. Confirm that shared resources will not be removed.
6. Apply the approved teardown.
7. Verify that the intended resources were removed.
8. Check for remaining billable resources.

Typical commands:

```bash
# Stop the stack, preserving volumes
docker compose down

# Stop the stack and delete database, MinIO, and upload volumes
docker compose down --volumes

# Remove locally built images for the project
docker compose down --rmi local
```

Use `--volumes` only when the data is disposable. Do not delete backups as part of an ordinary deployment failure handler.

## 18. Troubleshooting Guide

### 18.1 API cannot connect to PostgreSQL

Check:

- PostgreSQL container status and the readiness health check.
- `DATABASE_URL` format and hostname (`postgres` inside Compose, `localhost` on the host).
- Network configuration and service name resolution.
- Authentication and permissions.
- Connection-pool limits and database connection exhaustion.
- That `migrate` completed before the API started.

Do not print passwords or full connection strings into logs.

### 18.2 Worker does not process runs

Check:

- Redis availability and `CELERY_BROKER_URL`.
- Worker container status and task registration.
- Outbox dispatch status and lag (undispatched events remain in PostgreSQL).
- Queue depth and worker concurrency.
- Run state and lease information.
- Resource and time limits.

Inspect run and outbox records before manually resubmitting work.

### 18.3 Dataset upload remains pending

Check:

- Upload-session state and expiry.
- Signed-URL expiry and expiry clock skew.
- Object existence in the MinIO bucket.
- Object size and SHA-256 checksum.
- Storage credentials and bucket policy (anonymous access must be disabled).
- Validation worker health and validation error records.

Do not manually mark a dataset ready without verifying the volume.

### 18.4 Run remains queued

Check:

- Outbox dispatch status.
- Redis connectivity.
- Worker availability.
- Retry policy and attempt counts.
- Resource limits and host pressure.

Use the documented recovery procedure rather than modifying production rows without an approved process.

### 18.5 Frontend cannot reach the API

Check:

- `NEXT_PUBLIC_API_BASE_URL` (browser) and `API_INTERNAL_BASE_URL` (server-side).
- That the frontend build-time API URL matches the deployment origin.
- `API_CORS_ORIGINS`.
- The backend health check and container status.

Remember that `NEXT_PUBLIC_*` values are embedded at build time and require a rebuild to change.

### 18.6 Migration service fails

Check:

- Database reachability and credentials.
- For a rejected modified migration, that the checksum in the migrations table matches the file.
- Migration SQL for syntax errors against PostgreSQL 18.
- That the migration is transactional and repeatable in a clean environment.

### 18.7 Deployment succeeds but the application fails

Check:

- Environment variables and `APP_ENV`-dependent validation.
- Health-check configuration.
- API base URLs.
- Migration status.
- Storage bucket and credentials.
- Worker and broker connectivity.
- Frontend/backend contract compatibility.

## 19. Definition of Done

Deployment is complete when:

1. The application can be run locally using documented instructions and `docker compose up`.
2. CI validates the codebase (backend, frontend, end-to-end, and security jobs).
3. The environment is defined reproducibly in `docker-compose.yaml` and `.env.example`.
4. Production secrets are not stored in source control, images, or logs.
5. Frontend, API, worker, and dispatcher run as separate services with correct dependencies.
6. Database and object-storage access are restricted to the internal network.
7. Migrations run as a controlled, one-shot step before the API and worker start.
8. Liveness and readiness endpoints work, and the asynchronous pipeline is observable.
9. Logs and basic operational metrics are available, with rotation configured.
10. Backups and recovery procedures are documented and restoration has been tested.
11. Self-hosting costs and teardown procedures are documented.
12. A deployed synthetic-data workflow passes smoke tests.
13. Rollback of application images is documented and backward-compatible migrations are preferred.
14. The optional Tauri desktop build and release remain gated behind the same CI checks.
15. Cloud providers, Terraform, and Kubernetes remain optional future evolutions, not requirements.
16. Known operational and scientific limitations are clearly documented.
