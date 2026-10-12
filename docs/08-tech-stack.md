# MRI Lab — Technology Stack

## 1. Purpose

This document defines the technologies, libraries, infrastructure, and development tools used to build MRI Lab.

The stack should demonstrate production-oriented full-stack engineering for a computational neuroimaging research platform. It should favour maintainability, explicit contracts, testability, and reliable scientific data processing over unnecessary complexity.

The implementation must remain consistent with:

- `README.md` (product specification)
- `01-overview.md`
- `docs/design/`
- `docs/database/`
- `docs/api-specs/`

## 2. Technology Principles

1. Use mature, actively maintained technologies.
2. Prefer explicit types and validation at system boundaries.
3. Keep the frontend and backend independently testable.
4. Use asynchronous I/O where it improves throughput.
5. Use PostgreSQL for durable relational state.
6. Keep large scientific files outside the relational database.
7. Use background workers for computationally expensive operations.
8. Keep database access explicit and reviewable.
9. Make the application reproducible through automated setup and infrastructure configuration.
10. Avoid adding dependencies without a documented product or engineering benefit.

Two rules are non-negotiable:

- **Computation must never run in web request handlers.** No MRI processing, voxel manipulation, container invocation, or long-running analysis may execute inside FastAPI request handlers or Next.js server actions. The API returns promptly and the worker performs the computation.
- **Dependency choices require justification.** Every non-trivial library, service, or runtime must have a documented reason, an assigned responsibility, and no overlapping alternative already in the stack. If a dependency cannot be justified against these principles, it is not added.

## 3. Stack Summary

| Layer                  | Technology                                            | Responsibility                                        |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Frontend               | React, TypeScript                                     | Interactive neuroimaging workspace                    |
| Frontend framework     | Next.js (App Router)                                  | Routing, application structure, production builds     |
| Frontend desktop       | Tauri v2 (optional)                                   | Native desktop shell for the viewer                   |
| Frontend data layer    | React Query (`@tanstack/react-query`)                 | Server-state caching and synchronisation              |
| Styling                | Tailwind CSS + daisyUI                                | Responsive styling, design tokens, and UI primitives  |
| UI components          | Accessible reusable React components                  | Forms, tables, navigation, dialogs                    |
| Imaging visualisation  | vtk.js; evaluate Cornerstone3D for relevant workflows | Volumetric, multiplanar, and 3D rendering             |
| Backend                | Python, FastAPI                                       | REST API and business logic                           |
| Validation             | Pydantic                                              | Request, response, and configuration validation       |
| Database               | PostgreSQL                                            | Users, projects, datasets, pipelines, runs, artifacts |
| Database driver        | Psycopg 3 asynchronous API                            | Explicit asynchronous PostgreSQL access               |
| Database migrations    | Ordered SQL files and a Psycopg runner                | Versioned, reviewable schema changes                  |
| Background jobs        | Celery                                                | Asynchronous image-processing pipelines               |
| Queue and broker       | Redis                                                 | Job delivery and coordination                         |
| Reliability            | Transactional outbox plus a dispatcher process        | Durable, at-least-once job submission                 |
| Scientific computing   | NiBabel, Nilearn, SimpleITK; ANTs where needed        | NIfTI I/O, headers, and specialised analysis          |
| Dataset organisation   | BIDS (validation and layout layer)                    | Dataset structure and conformance checks              |
| Initial imaging format | NIfTI (`.nii`, `.nii.gz`)                             | Source volumes and derived images                     |
| Object storage         | S3-compatible storage (MinIO locally)                 | Private source volumes and derived artifacts          |
| Scientific runtime     | Versioned OCI container images                        | Repeatable, resource-limited execution environments   |
| Containerisation       | Docker, Docker Compose                                | Reproducible application and worker environments      |
| Infrastructure as code | Docker Compose (now), Terraform (later)               | Reproducible local and self-hosted provisioning       |
| CI/CD                  | GitHub Actions                                        | Testing, quality checks, and desktop releases         |
| Frontend tests         | Vitest, React Testing Library, Playwright             | Component, interaction, and browser testing           |
| Backend tests          | pytest, HTTPX                                         | Unit and API integration testing                      |
| Python quality         | Ruff, mypy                                            | Linting, formatting, and static type checking         |
| TypeScript quality     | ESLint, Prettier, TypeScript compiler                 | Linting, formatting, and type checking                |
| Authentication         | Managed OIDC-compatible identity provider             | Identity without building identity infrastructure     |
| Observability          | Structured logs, run metrics, error tracking          | Operational diagnostics and cost monitoring           |

Versions should be pinned through the project's dependency-management files and updated deliberately.

## 4. Frontend

### 4.1 React

Use React for reusable, interactive interface components.

Responsibilities include:

- Project and dataset workflows.
- Upload sessions and metadata forms.
- Multiplanar viewer controls and crosshair state.
- Display controls (zoom, pan, contrast, colour maps).
- Atlas and overlay toggles.
- Pipeline parameter forms.
- Run status, logs, and artifacts.
- Accessible loading, empty, and error states.

Keep domain logic separate from visual components wherever practical.

### 4.2 TypeScript

Use strict TypeScript settings.

Requirements:

- Enable `strict`.
- Avoid `any`.
- Represent API resources with explicit types.
- Model run states (`queued`, `running`, `succeeded`, `failed`, `cancelled`) as a finite union of supported values.
- Narrow unknown error values before accessing properties.
- Validate untrusted server responses at appropriate boundaries.
- Keep API request and response definitions synchronised with the backend contract.

Avoid duplicating complex domain logic between the frontend and backend.

### 4.3 Next.js

Use Next.js with the App Router as the frontend application framework.

Requirements:

- Choose one routing approach and follow it consistently.
- Use client-side components only where interactivity requires them, including the viewer and interactive forms.
- Keep scientific visualisation code out of server-rendered execution paths when the library depends on browser APIs; vtk.js renders only in client components.
- Do not run image processing in server components, route handlers, or server actions.

Do not introduce a separate Node.js backend merely to proxy ordinary API calls. The frontend talks to the Python API over a versioned REST contract; server code may forward authenticated requests, but it must not become a compute service.

### 4.4 Styling

Use Tailwind CSS with a centralised design-token system, and daisyUI as the component layer on top of it.

daisyUI supplies accessible, themeable primitives (buttons, inputs, badges, cards, tables, steps, alerts, and so on) that the reusable components wrap, so styling stays consistent without hand-rolling every control.

Requirements:

- Reuse tokens from `docs/design/`.
- Map the MRI Lab palette to a single daisyUI theme; do not redefine colours in component code.
- Prefer reusable components for repeated interface patterns.
- Prefer daisyUI component classes over bespoke utility stacks for standard controls.
- Avoid scattered arbitrary values and unnecessary inline styles.
- Keep responsive behaviour explicit.
- Ensure focus states and accessible contrast.

A small accessible component layer is preferable to building an entire custom design system before the main workflows work.

### 4.5 Data fetching

Use React Query (`@tanstack/react-query`) for server state: caching, retries, and synchronisation for the viewer, dataset metadata, job status, and artifact lists.

Requirements:

- Define a typed client around the versioned REST API.
- Centralise request typing, error normalisation, cancellation, and authentication (bearer token or session cookie) in that client.
- Use React Query as the only client-side cache and query layer; do not add overlapping cache libraries.
- Treat run status and artifact availability as server state, not as locally duplicated data.
- Do not fetch unlimited data because a user zooms out or changes a slice; paginate or bound requests explicitly.
- Revalidate affected queries after mutations.

React Server Components are not used to perform computation; they may compose metadata reads only.

### 4.6 Tauri (optional desktop shell)

Use Tauri v2 to optionally package the viewer as a native desktop application, driven by the CI desktop build.

Responsibilities:

- Provide a native macOS, Windows, and Linux desktop experience.
- Use the system WebView (WebView2 on Windows, WebKit on macOS/Linux) for rendering.
- Expose only the minimal native APIs the viewer needs.
- Keep the frontend codebase identical between web and desktop.

The Tauri configuration lives in `packages/frontend/src-tauri/`. It is an optional shell over the same web application; it must not fork the frontend or introduce a second implementation of viewer logic.

### 4.7 Imaging visualisation

Use vtk.js for volumetric and 3D rendering of MRI data.

Requirements:

- Render axial, coronal, and sagittal views with linked crosshairs.
- Support window/level (contrast) adjustment, zoom, pan, and colour maps.
- Keep rendering on the client; do not load entire volumes for operations better served by derived, down-sampled representations where memory is a constraint.
- Document the coordinate conventions displayed to the user (voxel versus world coordinates) and surface them consistently.
- Handle empty, malformed, and partially loaded volumes explicitly.

Evaluate Cornerstone3D for workflows where its tooling, DICOM-adjacent behaviour, or specific interaction model is a better fit. Adopt it only for a demonstrated workflow, and do not run vtk.js and Cornerstone3D for the same responsibility without justification.

### 4.8 Frontend coding conventions

- Use arrow functions for all function declarations (components, hooks, utilities, handlers, and callbacks). Do not use `function` declarations.
- Prefer `const` for all variables; avoid `var`.
- Use named exports for utilities and components; use default exports for page and layout components where required by the framework.
- Keep components small and focused; extract reusable logic into custom hooks or utilities.
- Use TypeScript for all source files. Avoid `any` unless absolutely necessary and documented.
- Place tests in `__tests__` directories colocated with the code they test (for example, `src/components/__tests__/viewer.test.tsx`).

## 5. Backend

### 5.1 Python

Use Python 3.14, pinned across project tooling, container images, and CI (`UV_PYTHON: '3.14'`).

Python is suitable for the API, scientific data processing, and integration with established neuroimaging libraries.

### 5.2 FastAPI

Use FastAPI for the REST API.

Responsibilities:

- Authentication integration.
- Request validation.
- Authorisation.
- Project-scoped resource access.
- Business rules.
- Dataset metadata and validation state.
- Pipeline and run submission (enqueue only).
- Run and artifact retrieval.
- OpenAPI generation.
- Health and readiness endpoints.

Route handlers must remain thin. Put substantial business logic into service modules and persistence logic into repository modules. No handler may invoke imaging libraries, container runtimes, or perform image operations directly.

### 5.3 Pydantic

Use Pydantic for:

- API request models.
- API response models.
- Environment and application configuration.
- Dataset and header metadata validation.
- Pipeline parameter validation.

Define separate request and response models where their security or lifecycle requirements differ. Do not expose internal database records directly as public API responses.

### 5.4 Asynchronous execution

Use asynchronous FastAPI route handlers for I/O-bound operations.

Do not run expensive numerical computations directly on the event loop. Delegate computational work to Celery workers, and never perform voxel operations, resampling, or container runs inside a request.

### 5.5 Error handling

Use consistent API error responses with:

- A stable error code.
- A human-readable message.
- Optional structured field errors.
- A request identifier where appropriate.

Do not return stack traces, SQL statements, credentials, internal storage paths, or raw voxel data.

## 6. Database

### 6.1 PostgreSQL

Use PostgreSQL for durable application state. CI runs `postgres:18-alpine`.

Store:

- Users and memberships.
- Projects and project roles.
- Datasets, dataset versions, and file assets.
- Dataset validation state and spatial metadata.
- Pipelines and pipeline versions.
- Experiment runs and their parameters.
- Artifacts and their metadata.
- Annotations.
- Usage records.
- Audit events.
- An idempotency and outbox table where required.

Large raw MRI voxel arrays must not be stored directly in PostgreSQL rows.

### 6.2 Explicit SQL

Use Psycopg 3 with its asynchronous interface for database access.

Prefer explicit SQL over a heavyweight ORM to demonstrate clear understanding of:

- Joins.
- Transactions.
- Constraints.
- Indexes.
- Query performance.
- Locking.
- Isolation.
- Data integrity.

Use repository modules to centralise query logic without hiding SQL behind excessive abstractions.

Requirements:

- Parameterise all values.
- Never interpolate untrusted values into SQL.
- Use transactions for multi-step state changes.
- Add constraints for important invariants.
- Review queries for project isolation.
- Add indexes based on expected access patterns.
- Use connection pooling with bounded connections.
- Test migrations against a real PostgreSQL instance in CI.

### 6.3 Database migrations

Maintain an in-repository migration runner under `packages/backend/app/db/migrations/`, storing migrations as ordered SQL files (with matching downgrade where applicable). Apply them with `uv run python -m app.db.migrations upgrade`, which CI runs before tests.

Every schema change must include a migration.

Requirements:

- Keep migration contents in SQL files rather than Python revision scripts.
- The runner tracks applied versions and checksums and rejects modified, already-applied migrations.
- Apply each migration transactionally.
- Migrations must be repeatable in a clean environment.
- Migrations must be reviewed.
- Destructive changes must be treated carefully.
- Production and self-hosted deployment must apply migrations in a controlled, one-shot step.
- Application rollback and schema rollback assumptions must be documented.

### 6.4 Database access rules

Every tenant-owned resource query must enforce the appropriate project scope.

Do not depend on the frontend to provide a trustworthy project identifier.

Consider PostgreSQL row-level security as an additional defence only if its session and transaction semantics are implemented and tested correctly. It must not substitute for application-level authorisation.

## 7. Background Processing

### 7.1 Celery

Use Celery for asynchronous image-processing tasks.

Responsibilities:

- Execute preprocessing and image operations (for example thresholding, smoothing, resampling, masking, segmentation).
- Run approved OCI images with explicit resource limits.
- Record progress where meaningful.
- Handle transient failures.
- Retry eligible tasks with bounded backoff.
- Persist outputs to object storage.
- Record final run states and write the experiment manifest.

Tasks should be small enough to test independently and should not rely on in-memory API state.

### 7.2 Redis

Use Redis as the Celery broker in the initial implementation.

Configure:

- Connection timeouts.
- Authentication and network restrictions in deployed environments.
- Task time limits.
- Retry policies.
- Queue monitoring.
- Appropriate persistence or managed-service durability settings.

Redis is not the source of truth for run records. PostgreSQL remains authoritative for run state, parameters, and results.

### 7.3 Transactional outbox and dispatcher

Use a transactional outbox pattern to make job submission durable.

- The API writes the run row and an outbox record in the same database transaction, then returns the run identifier promptly.
- A separate dispatcher process reads pending outbox records and publishes them to the queue.
- The dispatcher marks records dispatched idempotently and tolerates duplicate publication.
- This prevents the classic failure mode where a run row is committed but the queue message is lost (or vice versa).

### 7.4 Idempotency and recovery

Design tasks to tolerate repeated delivery.

The implementation should account for:

- Duplicate task messages.
- Worker restarts.
- Transient database failures.
- Result persistence failures.
- Jobs that exceed their time limits.
- Tasks that finish after their lease or ownership period expires.

Use explicit run-state transitions and concurrency controls to prevent conflicting workers from corrupting the same logical run. Record the `image_digest` of the execution container in `pipeline_versions`.

## 8. Scientific Computing and MRI Data

### 8.1 Imaging libraries

Use established neuroimaging libraries rather than hand-rolled formats:

- **NiBabel** for NIfTI I/O, header parsing, and affine access.
- **Nilearn** for higher-level image manipulation and masking.
- **SimpleITK** for resampling, registration-oriented operations, and image filters.
- **ANTs** where a specialised algorithm is genuinely required.

Document, for every operation:

- Expected array shape and axis ordering.
- Voxel coordinate versus world coordinate conventions.
- The role of the affine matrix and RAS orientation.
- Voxel spacing units (millimetres) and data types.
- Numerical precision expectations.

### 8.2 Imaging format

Use **NIfTI** (`.nii`, `.nii.gz`) as the initial imaging format. NIfTI provides standardised image data and spatial-coordinate metadata, including the affine transform.

Do not use Python pickle files for untrusted uploads.

Header parsing must be bounded: validate dimensions, spacing, data type, and orientation, and reject malformed or resource-exhausting headers before processing.

### 8.3 BIDS as an organisation layer

Treat **BIDS** as a dataset-organisation and validation layer, not as another image format. BIDS validation checks directory layout, naming, and sidecar metadata; it does not replace NIfTI as the image format.

A dataset may be validated against a selected BIDS specification version as a feature, but BIDS is not required for every upload.

### 8.4 Coordinate conventions

Document and enforce coordinate conventions explicitly:

- Voxel coordinates index the array and must not be presented as physical positions.
- World coordinates are millimetres in a defined space derived from the affine.
- Orientation and the affine must be preserved through every operation; conversions must be tested against known landmarks.
- Annotations store explicit coordinate-system metadata, not three unlabelled numbers.

### 8.5 Resource limits

Set configurable limits for:

- Maximum upload size and decompression ratio.
- Maximum volume dimensions and voxel count.
- Maximum number of files per dataset.
- Maximum analysis execution time.
- Maximum concurrency of runs per user.
- Maximum API response size.

Reject inputs that exceed safe limits before performing expensive processing.

## 9. Object Storage

Use private S3-compatible object storage for source volumes and derived artifacts. Use MinIO locally for development and CI, and any S3-compatible provider in deployment.

Requirements:

- Block public access.
- Apply least-privilege credentials.
- Encrypt data at rest.
- Use TLS for network access.
- Validate upload authorisation before finalising an object.
- Keep bucket identifiers and credentials in configuration or managed identity, never in code.
- Use short-lived, scoped signed URLs for upload and download only when required.
- Never treat possession of an object key as authorisation.
- Avoid logging signed URLs.
- Define retention and deletion behaviour for source data, derived files, and cached copies.
- Validate checksums (SHA-256) and object metadata.

Keep object references in PostgreSQL rather than embedding large file contents in relational rows.

Database and object-storage operations are not automatically atomic. Implement a clear upload-finalisation and failure-recovery workflow.

## 10. Cloud Infrastructure

### 10.1 Current target: Docker Compose

The current deployment target is **Docker Compose**, both for local development and for self-hosted use.

A Compose deployment includes:

- Frontend.
- Backend API.
- Celery worker.
- Outbox dispatcher.
- PostgreSQL.
- Redis.
- MinIO (S3-compatible object storage).
- A one-shot migration task.

Local and self-hosted services approximate the intended architecture. Keep the storage interface independent of MinIO so a managed provider can be substituted later.

Production configuration must not rely on development defaults.

### 10.2 Cloud providers: deferred

Hosted cloud providers are explicitly deferred. Do not introduce a cloud provider, managed queue service, managed database, or managed secret store until Docker Compose self-hosting is proven and a demonstrated requirement justifies the additional operational cost and lock-in.

When revisited, verify that the selected queue service and worker hosting model support the required Celery behaviour before committing.

### 10.3 Development and production parity

- Use the same container images for API, worker, and dispatcher across environments.
- Keep environment-specific values in configuration, not in image builds.
- Document differences between local Compose and any future deployment.

## 11. Infrastructure as Code

Use **Docker Compose** as the current infrastructure-as-code mechanism. It is version-controlled, reviewable, and reproducible.

Requirements:

- Do not commit secrets to Compose files; use environment variables and `.env` files excluded from version control.
- Provide an `.env.example` with placeholders only.
- Keep service definitions explicit and minimal.
- Document resource limits and dependencies for each service.

**Terraform is deferred.** Introduce Terraform only when a cloud deployment is actually pursued. At that point, manage resources such as service configuration, database instances, storage buckets, service accounts and IAM bindings, secret references, logging, and networking. When Terraform is introduced:

- Do not commit state files or secrets.
- Use remote state with locking for shared deployments.
- Review plans before applying.
- Separate environments where practical.
- Document resource naming and ownership.

## 12. Testing and Quality

### Frontend

Use:

- Vitest for unit tests.
- React Testing Library for component and interaction tests.
- Playwright for browser smoke tests.
- TypeScript compiler checks (`pnpm typecheck`).
- ESLint (`pnpm lint`) and Prettier (`pnpm format:check`).

Test user-visible behaviour rather than implementation details.

### Backend

Use:

- pytest with coverage (`pytest -q --cov=app --cov-report=term-missing`).
- HTTPX for API integration tests.
- Real PostgreSQL integration tests.
- Controlled worker and queue tests.
- Ruff (`ruff format --check`, `ruff check`).
- mypy (`python -m mypy .`).

Mock external services in unit tests where appropriate, but use real PostgreSQL for tests involving SQL semantics, constraints, transactions, or migrations.

### Scientific processing

Test:

- Known volumes with known expected outputs.
- Coordinate transforms and affine handling against known landmarks.
- Output dimensions, voxel spacing, and orientation.
- Empty and malformed input and invalid headers.
- Non-finite and out-of-range values.
- Large input boundaries.
- Reproducibility for fixed input, parameters, and image digest; numerical equivalence where exact bitwise identity is unrealistic.

Create a small, version-controlled collection of synthetic and appropriately licensed test volumes. Do not commit large raw datasets.

### End-to-end

Use Playwright Chromium for the critical workflow:

1. Authenticate.
2. Create a project.
3. Upload or select a volume.
4. Inspect dataset metadata and spatial provenance.
5. Explore axial, coronal, and sagittal views.
6. Submit a pipeline run.
7. Observe run completion.
8. Inspect the result artifact.

### Security

Test:

- Cross-project access attempts fail.
- Malicious or oversized uploads are rejected.
- Worker isolation and expired links behave correctly.
- Authorization is enforced on every protected resource.

## 13. CI/CD

Use GitHub Actions, defined in `.github/workflows/ci.yml`. The workflow triggers on pull requests and pushes to `master`, with concurrency cancellation. Global environment pins `UV_PYTHON: '3.14'` and `NODE_VERSION_FILE: packages/frontend/.nvmrc`.

### 13.1 Backend job (`CI - Backend`)

Runs on `ubuntu-latest` with the working directory set to `packages/backend`, a `postgres:18-alpine` service, `DATABASE_URL`, `APP_ENV: test`, and `AUTH_MODE: development`. Steps:

1. Checkout.
2. Setup `uv` (cached against `packages/backend/uv.lock`).
3. `uv sync --all-groups`.
4. `uv run ruff format --check .`.
5. `uv run ruff check .`.
6. `uv run python -m mypy .`.
7. `uv run python -m app.db.migrations upgrade`.
8. `uv run pytest -q --cov=app --cov-report=term-missing`.
9. `uv run pip-audit --desc --format=json --output=pip-audit.json`.
10. Upload `pip-audit.json` as an artifact.

### 13.2 Frontend job (`CI - Frontend`)

Runs on `ubuntu-latest` with the working directory set to `packages/frontend`, using pnpm 12.11.2 and the Node version from `packages/frontend/.nvmrc`. Steps:

1. Checkout.
2. Enable pnpm 12.11.2 and set up Node from `.nvmrc`; cache the pnpm store.
3. `pnpm install --frozen-lockfile`.
4. `pnpm lint && pnpm format:check`.
5. `pnpm typecheck`.
6. `pnpm test`.
7. `pnpm build`.
8. `pnpm audit --json --output=npm-audit.json`.
9. Upload `npm-audit.json` as an artifact.

### 13.3 End-to-End job (`End-to-End`)

Depends on the frontend job, runs on `ubuntu-latest` in `packages/frontend`. Installs dependencies with the frozen lockfile, installs Playwright browser dependencies with `pnpm exec playwright install --with-deps chromium`, and runs `pnpm test:e2e` (Chromium smoke tests).

### 13.4 Security job (`Security`)

Runs on `ubuntu-latest` with `security-events: write`. Runs the Trivy vulnerability scanner in filesystem mode (`scan-type: fs`, severities `CRITICAL,HIGH,MEDIUM`, `ignore-unfixed: true`) producing SARIF, then uploads it to GitHub Security via `github/codeql-action/upload-sarif`.

### 13.5 Tauri desktop build and release

- `Build Tauri (<os>)` runs only on pushes to `master`, depends on backend, frontend, e2e, and security, and uses a matrix of `macos-latest`, `ubuntu-latest`, and `windows-latest`. It installs frontend dependencies, sets up Rust with per-OS targets, installs Linux system dependencies, builds with `pnpm tauri:build`, zips the macOS app bundle, and uploads build artifacts with a date-stamped name.
- `Publish Tauri Release` runs on `master` after the build, collects release artifacts across platforms, renames them to `mri-lab.<ext>`, generates `SHA256SUMS.txt`, and publishes a `latest` GitHub release.

### 13.6 Deployment pipeline principles

The deployment path should:

1. Build immutable artefacts.
2. Run the automated checks above.
3. Apply migrations in a controlled, one-shot step.
4. Run smoke tests.
5. Promote only when checks succeed.

Never deploy changes directly from an unreviewed local working tree.

## 14. Dependency Management

### Python

Use `uv` for Python project and dependency management, with a committed `uv.lock` and a documented Python version (3.14). Install all groups in CI with `uv sync --all-groups`.

Separate runtime dependencies from development and testing dependencies.

### TypeScript

Use `pnpm` (version pinned to 12.11.2 via `packageManager`) for JavaScript dependency management.

Commit `pnpm-lock.yaml` and use `--frozen-lockfile` installation in CI.

### Git hooks

Use Husky to install the repository's Git hooks through the root `prepare` script. The `pre-commit` hook runs `lint-staged`, which applies Ruff fixes and formatting to staged Python files and ESLint plus Prettier to staged frontend JavaScript/TypeScript files. Install dependencies with `pnpm install` to configure hooks; CI remains responsible for full tests, type checks, and builds.

### Version policy

- Pin runtime versions deliberately.
- Avoid floating production image tags; record image digests.
- Review security advisories.
- Upgrade dependencies through tested pull requests.
- Avoid adding multiple libraries for the same responsibility.
- Document important version constraints.

## 15. Repository Organisation

MRI Lab is a pnpm workspace. The root package is `@mri-lab/workspace`; the web application is published as `@mri-lab/web` under `packages/frontend`. `pnpm-workspace.yaml` includes `packages/*`.

A suggested repository structure:

```text
mri-lab/
├── packages/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── db/
│   │   │   │   └── migrations/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── workers/
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── pyproject.toml
│   │   └── uv.lock
│   └── frontend/
│       ├── src/
│       ├── src-tauri/       optional desktop shell
│       ├── public/
│       ├── tests/
│       ├── package.json
│       └── pnpm-lock.yaml
├── infra/
│   └── terraform/           deferred
├── scripts/
├── docs/
├── docker-compose.yaml
├── Makefile
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/
└── README.md
```

This is a proposed structure, not a requirement to create every directory immediately.

Prefer a small, coherent implementation over empty placeholder modules.

## 16. Configuration and Secrets

Use environment variables or a documented configuration mechanism.

Configuration should include:

- Environment name (`APP_ENV`).
- Authentication mode (for example `AUTH_MODE: development` for local and CI).
- API base URL.
- Database connection settings (`DATABASE_URL`).
- Redis broker URL.
- Object-storage configuration (endpoint, bucket, region, credentials).
- Authentication provider settings.
- Scientific runtime image references.
- Upload and processing limits.
- Logging level.
- CORS origins.

Requirements:

- Validate required configuration at startup.
- Fail clearly when mandatory configuration is missing.
- Never commit real credentials.
- Provide an `.env.example` with placeholders only.
- Keep local development secrets out of version control.
- Use managed identities and a secrets manager in deployed environments where supported.

## 17. Deferred Technologies

Do not introduce these technologies in the initial MVP unless a demonstrated requirement justifies them:

- Kubernetes.
- A microservices decomposition.
- A service mesh.
- Kafka or another second broker.
- Multiple databases.
- A heavyweight ORM.
- A second backend language.
- Google Cloud Platform (or any cloud provider) as a required dependency.
- Terraform before a cloud deployment is pursued.
- Hosted managed notebooks.
- GPU-based computation.
- Distributed tracing infrastructure beyond the initial operational needs.
- Large-scale machine-learning orchestration.

These may be relevant to a larger research platform, but they increase implementation and operational cost before the core product is proven.

## 18. Technology Decision Record Requirements

Record major architectural decisions in `docs/decisions/`.

Each decision should include:

- Context.
- Decision.
- Alternatives considered.
- Reasons for the choice.
- Trade-offs.
- Consequences.
- Conditions that would justify revisiting the decision.

Create decision records for at least:

1. Imaging libraries (NiBabel, Nilearn, SimpleITK, ANTs) versus alternatives.
2. Imaging format (NIfTI) and the role of BIDS.
3. Coordinate conventions (voxel versus world coordinates, affine/RAS).
4. Explicit SQL versus ORM.
5. Background job architecture and the transactional outbox.
6. Scientific runtime and container image management.
7. Object-storage strategy (S3-compatible, MinIO locally).
8. Authentication approach.
9. Visualisation library (vtk.js versus Cornerstone3D).
10. Deployment topology (Docker Compose now, Terraform later).

## 19. Definition of Done

The technology stack is correctly implemented when:

1. Frontend and backend have independent build and test commands.
2. Type checking and linting are enforced in CI.
3. PostgreSQL schema changes use migrations.
4. Database queries are parameterised.
5. No computation runs in web request handlers; background processing is separated from the API.
6. Large scientific files are stored outside PostgreSQL.
7. Imaging operations use the documented libraries and preserve spatial metadata.
8. Coordinate conventions are documented and tested.
9. Configuration and secrets are handled safely.
10. Local development is reproducible through Docker Compose.
11. CI validates the critical application workflows and desktop builds.
12. Every selected technology has a clear responsibility and a documented justification.
13. The implementation does not introduce deferred technologies without a documented reason.
