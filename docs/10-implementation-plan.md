# MRI Lab — Implementation Plan

## 1. Purpose

This document defines the phased implementation plan for MRI Lab, an independent computational neuroimaging SaaS portfolio project.

The goal is to deliver a working, self-hosted application that demonstrates:

- Full-stack TypeScript and Python development.
- Secure project-scoped multi-tenant application design.
- NIfTI ingestion, validation, and spatial-metadata extraction.
- Multiplanar MRI visualisation with linked crosshairs.
- Reproducible scientific computation using versioned OCI container images.
- Reliable asynchronous background processing with a transactional outbox.
- PostgreSQL data modelling with explicit SQL and versioned migrations.
- Private S3-compatible object storage for large volumes and artifacts.
- Automated testing and continuous integration.
- Docker Compose self-hosted deployment and CI hardening.
- Production-minded engineering decisions and documented trade-offs.

The project must be implemented incrementally. Each phase produces a testable result before the next phase begins, and each phase maps to a milestone in the product specification (`docs/README.md`, section 11).

Scope references in this plan use the functional requirements `FR-001..FR-022` from the product specification and the feature priorities P0–P3.

## 2. Delivery Principles

### 2.1 Build a vertical slice first

The first objective is not to build every screen or establish the entire infrastructure. Build one complete workflow end to end:

1. Open the application.
2. Authenticate, or use an explicitly configured local development identity.
3. Create a project.
4. Upload a synthetic or appropriately licensed NIfTI volume.
5. Validate the file and extract spatial metadata.
6. Explore the volume in three linked anatomical views.
7. Submit a preprocessing operation.
8. Process it in a background worker inside a versioned container.
9. Retrieve the artifact and its experiment manifest.

This workflow proves that the major components work together before the feature set expands.

### 2.2 Prefer working software over premature abstraction

- Implement only the features required by the current milestone.
- Avoid building a generic workflow engine before two real operations exist.
- Avoid a complex permission framework before the initial roles are understood.
- Avoid a plugin system for a single image operation.
- Add abstractions only when repeated behaviour or a clear architectural boundary justifies them.

### 2.3 Keep scientific claims modest

The initial application performs descriptive image processing and visualisation. It does not diagnose conditions, interpret clinical outcomes, or claim that its outputs are validated for medical use. Display transformations must be distinguished from analytical computations (`docs/04-architecture.md`, section 10).

### 2.4 Protect the development feedback loop

- Run linting and type checking frequently.
- Add tests alongside features.
- Use small pull requests or commits.
- Keep the local development environment reproducible through Docker Compose and pinned dependency locks.
- Treat a broken `master` branch as a delivery problem.

### 2.5 Separation of interactive and scientific workload

Computation must never run inside a web request handler. The API validates, authorises, and returns a run identifier promptly; the worker performs image processing inside an isolated OCI container. This rule is non-negotiable (`docs/08-tech-stack.md`, section 2).

## 3. Milestone Overview

| Phase | Milestone                          | Product spec milestone | Expected outcome                                                         |
| ----- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| 0     | Project foundation                 | Milestone 0 (part)     | Workspace, tooling, Compose services, and CI skeleton                    |
| 1     | Backend foundation                 | Milestone 0 (part)     | FastAPI, PostgreSQL, migrations, health checks, error models             |
| 2     | Frontend foundation                | Milestone 0 (part)     | Next.js application shell, design tokens, routing, API client            |
| 3     | Identity and project tenancy       | Milestone 1            | Authentication, project membership, roles, audit events                  |
| 4     | Projects, datasets, and uploads    | Milestones 1–2         | Resumable uploads, validation, spatial metadata, lifecycle               |
| 5     | MRI viewer                         | Milestone 2            | Multiplanar viewer, linked crosshairs, display controls, atlas prototype |
| 6     | Pipelines and experiment runs      | Milestone 3            | Worker, image operations, logs, artifacts, manifests                     |
| 7     | Provenance and reproducibility     | Milestone 3–4          | Reruns, comparisons, export, sharing, public sample                      |
| 8     | Reliability, security, and quality | Milestone 4            | Hardening, observability, quotas, failure recovery, E2E tests            |
| 9     | Portfolio polish                   | Milestone 4            | README, demo, screenshots, case study, limitations statement             |
| 10    | Docker Compose deployment and CI   | Post-beta              | Self-hosted deployment, CI hardening, release process                    |

A milestone is complete only when its exit criteria are met. The mapping above aligns the phases with the product milestones in `docs/README.md` section 11 and the priority levels in section 3.

## 4. Phase 0 — Project Foundation

### 4.1 Objective

Establish a reproducible development environment and repository structure.

### 4.2 Deliverables

- A pnpm workspace rooted at `@mri-lab/workspace` with `packages/frontend` and `packages/backend`.
- Tooling, conventions, and documentation scaffolding.
- Docker Compose definitions for PostgreSQL, Redis, and MinIO.
- An initial GitHub Actions workflow.

### 4.3 Tasks

- [x] Create the repository and initial README.
- [x] Add `AGENTS.md` with coding and repository conventions.
- [x] Add the core project documentation files under `docs/`.
- [x] Configure the `@mri-lab/workspace` root package and `pnpm-workspace.yaml` (`packages/*`).
- [x] Add the `@mri-lab/web` frontend package and the `packages/backend` Python package.
- [x] Configure `uv` and the pinned Python version (3.15.0).
- [x] Configure pnpm and the pinned Node.js version (`.nvmrc`).
- [x] Add Ruff, ESLint, Prettier, and mypy configuration.
- [x] Configure Husky and lint-staged for staged-source checks before commit.
- [x] Add `.editorconfig`.
- [x] Add environment variable examples (`.env.example` with placeholders only).
- [x] Add a root-level `Makefile` task runner.
- [x] Define `docker-compose.yaml` services for PostgreSQL, Redis, and MinIO.
- [x] Configure GitHub Actions for the initial checks.
- [x] Add a `.gitignore` covering secrets, local data, build outputs, and generated scientific files.
- [ ] Write the initial Architecture Decision Records required by section 21 of `docs/04-architecture.md`.

### 4.4 Suggested repository structure

```text
mri-lab/
├── packages/
│   ├── frontend/            # @mri-lab/web (Next.js + vtk.js viewer)
│   └── backend/             # FastAPI API, workers, migrations
├── infra/
│   └── terraform/           # deferred (cloud only)
├── scripts/
├── docs/
│   └── decisions/
├── .github/
│   └── workflows/
├── docker-compose.yaml
├── pnpm-workspace.yaml
├── Makefile
├── AGENTS.md
├── README.md
└── .gitignore
```

### 4.5 Dependencies

- None. This is the first phase.

### 4.6 Exit criteria

- A new developer can follow the setup guide and start the workspace.
- The frontend and backend start locally, and Compose brings up PostgreSQL, Redis, and MinIO.
- Formatting and linting commands run for both packages.
- Husky installs its pre-commit hook after dependency installation and checks staged files.
- CI executes the initial checks.
- No credentials or real participant data are committed.
- Project documentation reflects the actual chosen tools.

### 4.7 Risks

| Risk                                       | Mitigation                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Tooling churn delays the first feature     | Pin versions early and treat tooling changes as deliberate pull requests |
| Local environment drift between developers | Docker Compose for services and committed lockfiles                      |
| Documentation diverges from implementation | Update docs in the same pull request as the change                       |

## 5. Phase 1 — Backend Foundation

### 5.1 Objective

Create the application API and persistent database layer with explicit SQL and versioned migrations.

### 5.2 Deliverables

- A running FastAPI application.
- Configuration management for development, test, and production settings.
- PostgreSQL connectivity through Psycopg 3 with an async connection pool.
- A versioned migration runner and the initial schema.
- Health, readiness, and structured error responses.

### 5.3 Tasks

- [x] Create the FastAPI application and application factory.
- [x] Add configuration management with validated settings.
- [x] Define development, test, and production settings.
- [x] Add structured logging with request IDs.
- [x] Configure PostgreSQL connectivity using Psycopg 3 (async).
- [x] Implement explicit parameterised SQL access patterns.
- [x] Add connection pooling with bounded connections.
- [x] Configure versioned SQL migrations and a runner under `app/db/migrations/`.
- [x] Create the initial schema (`users`, `projects`, `project_members`, and supporting tables).
- [x] Add `/healthz` (liveness) and `/readyz` (readiness).
- [x] Add consistent error response models (stable code, message, optional field errors, request ID).
- [x] Add pytest and HTTPX.
- [x] Add PostgreSQL integration tests against real PostgreSQL.

### 5.4 Database access conventions

- Use parameterised SQL for all untrusted values.
- Never interpolate user-controlled strings into SQL statements.
- Keep transaction boundaries explicit.
- Never hold a transaction open across a long computation or remote object-storage call.
- Do not share one database connection concurrently across unrelated asynchronous tasks.
- Keep SQL and persistence logic separated from route handlers.
- Migrations are forward-only; never edit an applied migration (`docs/05-data-model.md`, section 26).

### 5.5 Dependencies

- Phase 0.

### 5.6 Exit criteria

- The API starts locally.
- PostgreSQL connectivity is verified and pooled.
- Migrations can build a fresh database and apply cleanly in CI.
- Health endpoints behave correctly.
- A database integration test passes against real PostgreSQL.
- An intentionally failing dependency causes readiness to fail appropriately.
- Error responses never return stack traces, SQL, or internal paths.

### 5.7 Risks

| Risk                                 | Mitigation                                                        |
| ------------------------------------ | ----------------------------------------------------------------- |
| Migration drift between environments | Forward-only checksummed migrations applied as a startup gate     |
| Connection exhaustion under load     | Bounded async pool and integration tests for pool behaviour       |
| Divergent configuration defaults     | Validated settings that fail fast when required values are absent |

## 6. Phase 2 — Frontend Foundation

### 6.1 Objective

Create the initial user interface and reliable communication with the API through the Next.js Backend-for-Frontend (BFF).

### 6.2 Deliverables

- A Next.js App Router application with strict TypeScript.
- Design tokens mapped to the `lab-light`/`lab-dark` daisyUI themes.
- A typed API client and BFF route handlers.
- Accessible page shells and UI states.

### 6.3 Tasks

- [x] Create the Next.js application with TypeScript (`@mri-lab/web`).
- [x] Configure Tailwind CSS and the daisyUI component layer.
- [x] Map the MRI Lab design tokens to two daisyUI themes (`lab-light`/`lab-dark`) with a toggle; do not redefine colours in component code.
- [x] Establish design tokens and typography.
- [x] Create the application layout and primary navigation.
- [x] Add loading, empty, error, partial-success, and not-found states.
- [x] Create a typed API client and BFF route handlers that hold the session cookie.
- [x] Generate or maintain API types consistent with the backend OpenAPI contract.
- [x] Configure `@tanstack/react-query` as the only client-side server-state layer.
- [x] Configure frontend unit tests (Vitest, React Testing Library).
- [x] Add accessible form components.
- [x] Add responsive layouts.
- [x] Add a basic Playwright smoke test.

### 6.4 Initial pages

- Dashboard (recent projects, usage, activity).
- Project list and project detail.
- Dataset detail.
- Viewer shell.
- Run detail.
- Settings and membership, if required by the milestone.

### 6.5 Dependencies

- Phase 1 (for the API contract).

### 6.6 Exit criteria

- The application runs locally.
- Navigation works and the active project is displayed consistently.
- Pages display meaningful loading, empty, and error states.
- API failures do not crash the entire application.
- Core forms provide accessible validation feedback.
- Frontend linting, type checking, and tests run in CI.

### 6.7 Risks

| Risk                                     | Mitigation                                                          |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Frontend duplicates backend domain logic | Keep domain rules server-side; treat the API as the source of truth |
| Viewer library incompatible with SSR     | Render vtk.js only in client components                             |
| Design-system sprawl                     | Reuse daisyUI primitives and the `lab-light`/`lab-dark` themes       |

## 7. Phase 3 — Identity and Project Tenancy

### 7.1 Objective

Enforce secure project-scoped access before introducing real imaging data workflows.

### 7.2 Deliverables

- A documented authentication approach.
- Server-side identity resolution and project membership enforcement.
- Role-based permissions and audit events for membership changes.

### 7.3 Tasks

- [x] Choose and document the authentication approach (`AUTH_MODE: development` for local and CI).
- [x] Implement token or session validation.
- [x] Map authenticated identities to local `users` records.
- [x] Implement project membership lookup against `project_members`.
- [x] Implement role-based permission checks (`owner`, `editor`, `viewer`).
- [x] Add project-scoped query helpers that never trust a client-supplied project ID.
- [x] Add tenant consistency constraints and composite foreign keys (Phase 4 completes the full set).
- [x] Add membership management for owners, including the last-owner invariant.
- [x] Add `audit_events` for membership changes, persisted in the same transaction.
- [x] Test unauthenticated access, role restrictions, and cross-project access attempts.

### 7.4 Required roles

- `owner` — full control, including membership and deletion.
- `editor` — create and modify datasets, pipelines, runs, and annotations.
- `viewer` — read-only access to project resources and artifacts.

Project membership is the tenancy boundary. Do not introduce multi-organisation or institutional tenancy for the MVP (`docs/02-features.md`, section 18).

### 7.5 Dependencies

- Phases 1 and 2.

### 7.6 Exit criteria

- Unauthenticated users cannot access protected endpoints.
- A viewer cannot submit runs or modify datasets.
- A user cannot access another project's resources by changing a URL identifier.
- Referenced resources are checked for project consistency.
- Membership changes require appropriate permissions and are auditable.
- Object-key possession is never treated as authorisation.

Do not move to real imaging data until these controls have been tested.

### 7.7 Risks

| Risk                               | Impact              | Mitigation                                                           |
| ---------------------------------- | ------------------- | -------------------------------------------------------------------- |
| Tenant isolation bug               | Data exposure       | Centralised permission checks, composite FKs, negative tests         |
| Stale membership in cached state   | Unauthorised access | Re-check membership server-side on every request                     |
| Local auth leaking into production | Security            | Isolate development auth and fail fast outside `APP_ENV=development` |

## 8. Phase 4 — Projects, Datasets, and Uploads

### 8.1 Objective

Deliver the core metadata workflow and secure ingestion of NIfTI volumes.

### 8.2 Deliverables

- Project CRUD and membership-scoped listing.
- Dataset identity, versions, and file assets.
- Resumable upload sessions with finalisation, checksums, and validation.
- Spatial metadata extraction and dataset lifecycle.

### 8.3 Initial format

Use NIfTI (`.nii` and `.nii.gz`). Do not claim support for a format until its parser, validation, and tests are implemented. BIDS is a later organisation and validation layer, not an image format (`docs/08-tech-stack.md`, section 8.3).

### 8.4 Tasks

- [x] Implement project creation, listing, detail retrieval, update, and archive.
- [x] Implement pagination with deterministic ordering.
- [x] Implement dataset registration and listing within a project.
- [x] Implement dataset detail retrieval with validation status.
- [x] Create an upload-session API returning short-lived scoped upload instructions.
- [x] Configure private object storage (MinIO locally, S3-compatible elsewhere).
- [x] Implement the upload strategy (direct-to-object-storage or controlled backend endpoint) and resumable transfer.
- [x] Implement idempotent upload finalisation.
- [x] Verify object existence and expected size on completion.
- [x] Calculate or verify the SHA-256 checksum.
- [x] Extract NIfTI metadata: version, dimensions, voxel spacing, orientation, data type, affine, scaling, and coordinate conventions.
- [x] Validate header parseability with bounds and guard against decompression bombs.
- [x] Validate dimensions, voxel spacing, data type, and resource limits.
- [x] Implement dataset lifecycle transitions (`pending_upload` → `validating` → `ready`, with `rejected` and `failed`).
- [x] Add failed-upload recovery and abandoned-session cleanup.
- [x] Add malicious and malformed-file tests.
- [x] Add project creation and dataset registration forms.
- [x] Add an upload form with file selection, metadata, progress, and validation feedback.

### 8.5 Upload and validation invariants

- The user must be authorised to upload into the target project.
- Storage is private; possession of an object key is not authorisation.
- The server validates the file independently of browser checks.
- A dataset version is not ready before validation succeeds.
- Finalisation confirms the object exists, matches the declared size, and has the expected checksum.
- Never load an unbounded volume entirely into API memory; serve viewer data through range requests or derived representations.
- Never load untrusted data with pickle enabled.
- A database failure after object upload must not create an indefinitely invisible object.

Validation may run synchronously during finalisation when file limits make it safe; large or expensive validation moves to the worker in Phase 6 (`docs/04-architecture.md`, section 8).

### 8.6 Dependencies

- Phase 3.

### 8.7 Exit criteria

- An authorised user can create a project and upload a supported NIfTI volume, see `ready`, and view correct spatial metadata.
- Invalid files are `rejected` with safe, actionable messages.
- No MRI voxel arrays are stored in relational rows.
- Every accepted file asset has a recorded checksum.
- A dataset version is immutable once `ready`; further changes create a new version.
- Abandoned uploads are cleaned up and do not leave stuck sessions.

### 8.8 Risks

| Risk                                          | Mitigation                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Decompression-bomb or malformed header        | Bounded header parsing, size and ratio limits                          |
| Object exists but database finalisation fails | Reconciliation task for abandoned sessions and unreferenced objects    |
| Interrupted large uploads                     | Resumable transfer and integrity checks                                |
| Silent metadata errors                        | Persist extracted metadata explicitly and test against known landmarks |

## 9. Phase 5 — MRI Viewer

### 9.1 Objective

Deliver an interactive multiplanar viewer that lets users explore brain anatomy without loading whole volumes into the browser.

### 9.2 Deliverables

- Axial, coronal, and sagittal views with linked crosshairs.
- Display controls: slice scroll, zoom, pan, window/level, colour maps, reset.
- Voxel and world coordinate readout with explicit coordinate space.
- An atlas overlay prototype.

### 9.3 Tasks

- [x] Integrate vtk.js for volumetric and multiplanar rendering in a client component.
- [x] Fetch volume data through short-lived, single-object signed URLs.
- [x] Render axial, coronal, and sagittal views.
- [x] Implement linked crosshairs that synchronise the selected point across views.
- [x] Implement slice scrolling and crosshair dragging.
- [x] Implement zoom, pan, window/level, colour-map selection, and per-view reset.
- [x] Derive voxel and world coordinates from the affine and display the active coordinate space.
- [x] Display dataset spatial metadata alongside the viewer.
- [x] Persist viewer state without treating display settings as analytical parameters.
- [x] Add viewer loading, partial, error, and empty states with retry.
- [x] Handle anisotropic spacing and 4D volumes with a volume/time index.
- [x] Protect the API from unbounded responses with maximum size and range limits.
- [x] Prototype an atlas overlay registered through the volume's affine and coordinate space.
- [x] Add region-label readout with the atlas name and coordinate space.
- [x] Test with volumes of different dimensions, spacing, and orientation.

### 9.4 Viewer requirements

- The viewer is an exploration tool, not a clinical interpretation system.
- Display transforms (window/level, zoom, pan, colour maps) must not modify source data.
- The client requests only the data needed for display; the server enforces maximum response size.
- An incompatible atlas produces a clear explanation rather than a misleading overlay.

### 9.5 Dependencies

- Phase 4.

### 9.6 Exit criteria

- An authorised user can open a ready dataset and navigate three linked views with correct crosshairs.
- Voxel and world coordinates are accurate for known landmarks.
- The complete volume is never loaded into the browser by default.
- Atlas overlays toggle and display region labels with attribution.
- Rendering failures show a safe, retryable state.

### 9.7 Risks

| Risk                                       | Mitigation                                                  |
| ------------------------------------------ | ----------------------------------------------------------- |
| Browser memory exhaustion on large volumes | Derived, downsampled representations and bounded fetches    |
| Incorrect orientation display              | Test affine handling against known coordinate landmarks     |
| Atlas misregistration                      | State the coordinate space and refuse incompatible overlays |

## 10. Phase 6 — Pipelines and Experiment Runs

### 10.1 Objective

Implement durable asynchronous image processing with versioned pipelines and reproducible artifacts.

### 10.2 Deliverables

- Pipeline and pipeline-version records with pinned container digests.
- A Celery worker that launches versioned OCI containers with resource limits.
- A transactional outbox and dispatcher.
- Run lifecycle, logs, artifacts, and experiment manifests.

### 10.3 Initial operations

Implement a small set of well-tested operations (`docs/02-features.md`, section 8):

- Thresholding.
- Gaussian smoothing with an FWHM in millimetres.
- Resampling to a target voxel spacing.
- Masking with a binary mask.
- Segmentation producing a binary or labelled mask, with region volumes in millimetres cubed and voxel counts.

Operations must preserve spatial metadata (affine, orientation, spacing) unless the operation explicitly and visibly changes it.

### 10.4 Tasks

- [x] Define pipeline and parameter schemas with explicit types, units, and validation.
- [x] Implement run submission that validates permissions, parameters, and dataset state.
- [x] Implement idempotency for run submission using `idempotency_keys`.
- [x] Persist the run record and an `outbox_events` row in one transaction.
- [x] Implement the outbox dispatcher with `FOR UPDATE SKIP LOCKED` claiming.
- [x] Configure Redis and Celery.
- [x] Implement the worker that launches the pinned OCI image by `image_digest`.
- [x] Load run inputs from private object storage through a controlled, read-only mechanism.
- [x] Validate worker input independently; do not trust the request payload.
- [x] Apply CPU, memory, disk, and wall-clock limits, and restrict egress.
- [x] Compute the image operation and validate the output before persisting.
- [x] Persist artifacts with SHA-256 checksums and write the experiment manifest.
- [x] Mark the run successful only after artifacts and manifest are persisted and validated.
- [x] Implement run status polling and structured run logs.
- [x] Implement bounded retry handling with backoff and jitter.
- [x] Implement stale-run recovery using a lease or heartbeat.
- [x] Implement cooperative cancellation for `queued` and `running` runs.
- [x] Add worker integration tests, idempotency tests, and scientific-correctness tests.

### 10.5 Required run states

| State       | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `queued`    | Accepted but not yet executing                               |
| `running`   | A worker is processing the run                               |
| `succeeded` | Computation, artifact persistence, and manifest writing done |
| `failed`    | Processing failed and will not be retried automatically      |
| `cancelled` | Processing was cancelled according to documented rules       |

State transitions must be validated, persisted, and enforced at the database boundary. A cancelled or successful run must not be silently reopened by a duplicate worker message.

### 10.6 Dependencies

- Phases 4 and 5 (inputs and result inspection).

### 10.7 Exit criteria

- Submitting a run returns a run identifier promptly, independent of processing time.
- Run state persists across API and worker restarts.
- Duplicate submissions do not create duplicate logical runs; duplicate worker delivery does not corrupt results.
- A failed run returns no fabricated results and exposes a safe failure reason.
- Every successful run produces validated artifacts and a machine-readable manifest.
- Cancel is honoured and recorded.
- Worker crashes are observable and recoverable without restarting live work.

### 10.8 Risks

| Risk                                    | Mitigation                                                             |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Lost queue messages                     | Transactional outbox and idempotent workers                            |
| Duplicate delivery corrupts results     | Conditional state transitions and leases                               |
| Container escapes or overuses resources | Isolated runtime, no default secrets, explicit limits and egress rules |
| Manifest write fails after compute      | A run is not `succeeded` until artifacts and manifest persist          |

## 11. Phase 7 — Provenance, Reproducibility, and Comparisons

### 11.1 Objective

Make results traceable and reproducible, and let users compare and share derived volumes.

### 11.2 Deliverables

- Complete provenance for every run.
- Rerun from a recorded configuration.
- Side-by-side comparisons and export.
- A public sample project and scoped sharing links.

### 11.3 Tasks

- [x] Record provenance: source dataset version and checksum, pipeline name and version, image digest, parameters, environment, coordinate conventions, seeds, and result schema version.
- [x] Expose provenance through the API and UI.
- [x] Implement rerun semantics that distinguish rerunning a run, a new run on the same version, and a run on a newer version.
- [x] Implement `reproducible` / `not_reproducible` states with a clear explanation when an input or digest is unavailable.
- [x] Implement input-versus-derived comparison with synchronised crosshairs and view controls.
- [x] Detect `not_comparable` volumes (dimensions, spacing, orientation) and explain the mismatch.
- [x] Export a viewer snapshot (PNG), the experiment manifest (JSON), and derived volumes and masks (NIfTI).
- [x] Enforce permissions on all exports and use scoped download URLs.
- [x] Build the bundled public sample project with licence and citation display.
- [x] Allow unauthenticated browsing of the sample project's viewer.
- [x] Implement scoped, revocable sharing links with read-only shared pages.
- [x] Test rerun reproducibility with numerical-equivalence checks where exact bitwise identity is unrealistic.

### 11.4 Reproducibility requirements

- Source data must not be silently overwritten.
- Algorithm changes are reflected in the version identifier; results from different versions must not be silently merged.
- A rerun resolves to the same inputs and environment.
- Historical results remain attributable to their original inputs and software version.

### 11.5 Dependencies

- Phase 6.

### 11.6 Exit criteria

- A user can rerun an experiment from its recorded configuration.
- Provenance is visible in the UI and retrievable via the API.
- A user can compare an input and a derived volume with synchronised navigation when comparable.
- An unauthenticated visitor can explore the sample project.
- Private resources are never public unless explicitly shared; sharing links are scoped, revocable, and permission-checked.

### 11.7 Risks

| Risk                               | Mitigation                                                        |
| ---------------------------------- | ----------------------------------------------------------------- |
| Referenced input or digest removed | Immutable versions and pinned digests; explain unavailability     |
| Non-deterministic algorithms       | Require and record random seeds                                   |
| Sharing leaks private data         | Private-by-default, explicit scope, server-side permission checks |
| Sample licence misuse              | Display licence and citation requirements                         |

## 12. Phase 8 — Reliability, Security, and Quality

### 12.1 Objective

Harden the complete vertical slice and establish operational confidence.

### 12.2 Deliverables

- Tested isolation, quotas, and resource controls.
- Observability through structured logs, metrics, and correlation IDs.
- Documented backup, recovery, and retention procedures.
- End-to-end and negative tests.

### 12.3 Tasks

- [x] Review project isolation and cross-project access controls.
- [x] Review authentication and permissions.
- [x] Add request and resource limits (file size, dimensions, runtime, memory, concurrency).
- [x] Enforce quotas before accepting work and persist `usage_records`.
- [x] Review upload security, decompression bounds, and header parsing.
- [x] Review signed-URL handling, scope, and expiry.
- [x] Test transaction rollback behaviour.
- [x] Test duplicate event delivery and stale-run recovery.
- [x] Add structured application and worker logs without secrets or raw voxel data.
- [x] Add run and API metrics.
- [x] Add correlation IDs across submission, dispatch, execution, and artifact persistence.
- [x] Add database backup and recovery guidance.
- [x] Scan dependencies and container images (pip-audit, npm audit, Trivy).
- [x] Review secrets handling and `.env` hygiene.
- [x] Add end-to-end tests for the critical workflow.
- [x] Document known limitations and the scientific limitations statement.
- [x] Verify audit events are append-only and contain no tokens, signed URLs, or raw voxel data.

### 12.4 Dependencies

- Phases 4 through 7.

### 12.5 Exit criteria

- Critical security tests pass, including cross-project negative tests.
- Failures produce actionable logs without leaking secrets.
- Background runs recover from expected transient failures.
- Database and object-storage responsibilities and recovery paths are documented.
- Quotas are enforced server-side and usage is visible.
- The complete workflow passes automated end-to-end tests.

### 12.6 Risks

| Risk                          | Mitigation                                             |
| ----------------------------- | ------------------------------------------------------ |
| Undetected isolation bug      | Centralised checks and repeatable negative tests       |
| Reached quota with no message | Clear, actionable quota errors before work is accepted |
| Secret leakage in logs        | Structured logging review and redaction tests          |
| Unrecoverable deployment      | Documented backup, restore, and teardown procedures    |

## 13. Phase 9 — Portfolio Polish

### 13.1 Objective

Make the project easy to evaluate by engineers, recruiters, and research teams.

### 13.2 Deliverables

- Concise README, architecture diagrams, demo, and screenshots.
- Documented setup, troubleshooting, and engineering decisions.
- Threat model and limitations statement.
- A short portfolio case study.

### 13.3 Tasks

- [x] Write a concise project README.
- [x] Add architecture and data-flow diagrams (`docs/04-architecture/`).
- [x] Add screenshots of key workflows.
- [x] Add a short demonstration video or GIF (`demo/mri-lab-demo.mp4`).
- [x] Include synthetic example data with a documented licence.
- [x] Document setup and common troubleshooting steps.
- [x] Document key engineering decisions under `docs/decisions/`.
- [x] Add a threat model.
- [x] Add a scientific limitations statement.
- [x] Add test and CI status indicators.
- [x] Document resource limits, estimated costs, and teardown instructions for self-hosting.
- [x] Prepare a short portfolio case study.
- [ ] Publish an accessible demo where feasible.

### 13.4 Portfolio narrative

Emphasise the engineering problems solved:

- Secure project-scoped resource access.
- Reliable ingestion and validation of large scientific volumes.
- Reproducible scientific computation in versioned containers.
- Reliable asynchronous processing with a transactional outbox.
- Data integrity, provenance, and experiment manifests.
- Scientific visualisation with explicit coordinate conventions.
- Infrastructure automation with Docker Compose and GitHub Actions.

Explain why decisions were made, what alternatives were considered, and which limitations remain. Do not imply affiliation with or use of proprietary technology from any existing company.

### 13.5 Dependencies

- Phase 8.

### 13.6 Exit criteria

- A reviewer can understand the project from the README and diagrams.
- The demo reflects an implemented, working workflow.
- Limitations and non-clinical scope are explicit.
- No proprietary branding, code, or workflows are present.

### 13.7 Risks

| Risk                                 | Mitigation                                                |
| ------------------------------------ | --------------------------------------------------------- |
| Overstating scientific capability    | Limitations statement and evidence-over-claims discipline |
| Demo drift from the real application | Regenerate the demo after each significant change         |
| Time spent polishing over hardening  | Complete Phase 8 before portfolio work                    |

## 14. Phase 10 — Docker Compose Deployment and CI Hardening

### 14.1 Objective

Deliver a reproducible self-hosted deployment and a hardened continuous-integration pipeline. Cloud infrastructure (GCP or AWS via Terraform) is explicitly deferred and must not be required.

### 14.2 Target deployment

A single environment defined by `docker-compose.yaml` running:

- Next.js frontend.
- FastAPI API.
- Celery worker.
- Outbox dispatcher.
- PostgreSQL.
- Redis.
- MinIO (S3-compatible object storage).
- A one-shot migration task.

Use the same container images for API, worker, and dispatcher across environments, with environment-specific values in configuration rather than image builds (`docs/08-tech-stack.md`, section 10).

### 14.3 Tasks

- [x] Author multi-stage Dockerfiles for the frontend, API, worker, and dispatcher.
- [x] Pin base images and record image digests; avoid floating production tags.
- [x] Define the Compose topology with health checks and explicit dependencies.
- [x] Add a one-shot migration service that gates API and worker startup.
- [x] Configure private object storage with encryption at rest and least-privilege credentials.
- [x] Configure database connectivity without exposing PostgreSQL to the public internet.
- [x] Document required environment variables and provide `.env.example` placeholders.
- [x] Apply migrations in a controlled, one-shot deployment step.
- [x] Run smoke tests against the deployed application.
- [x] Harden the backend CI job (Ruff, mypy, migrations, pytest, pip-audit).
- [x] Harden the frontend CI job (lint, format, typecheck, test, build, audit).
- [x] Harden the end-to-end and security CI jobs (Playwright, Trivy SARIF upload).
- [x] Document the release process (immutable artefacts, checks, promotion).
- [x] Document backup, restore, and disaster-recovery procedures for the self-hosted deployment.
- [x] Document resource limits and estimated costs for the Compose deployment.

### 14.4 Deployment pipeline principles

1. Build immutable artefacts.
2. Run the automated checks.
3. Apply migrations in a controlled, one-shot step.
4. Run smoke tests.
5. Promote only when checks succeed.

Never deploy changes directly from an unreviewed local working tree.

### 14.5 Dependencies

- Phases 8 and 9.

### 14.6 Exit criteria

- The deployment can be provisioned reproducibly from a clean checkout with documented instructions.
- Application credentials are not committed to source control.
- The worker can access only the services it requires.
- PostgreSQL is not exposed unnecessarily to the public internet.
- Object storage is private by default.
- A failed migration blocks application start.
- Deployment failures are visible and the deployed application passes smoke tests.
- Resource limits and estimated self-hosting costs are documented.

### 14.7 Risks

| Risk                                 | Mitigation                                                   |
| ------------------------------------ | ------------------------------------------------------------ |
| Compose deployment drifts from local | One Compose definition used for local, self-hosted, and CI   |
| Migration applied partially          | Transactional migrations and a one-shot gate                 |
| Secrets in Compose files             | Environment variables and excluded `.env` files              |
| Unproven cloud scope creeps in       | Keep cloud and Terraform explicitly deferred until justified |

## 15. Continuous Integration

Every pull request runs the checks relevant to the changed code. CI remains the authoritative quality gate; Husky and lint-staged only pre-check staged files locally.

### 15.1 Frontend

- Formatting (`pnpm format:check`).
- Linting (`pnpm lint`).
- Type checking (`pnpm typecheck`).
- Unit tests (`pnpm test`).
- Production build (`pnpm build`).
- Selected component or browser tests.

### 15.2 Backend

- Formatting (`ruff format --check`).
- Linting (`ruff check`).
- Type checking (`mypy`).
- Unit tests and API tests.
- PostgreSQL integration tests against `postgres:18-alpine`.
- Migration checks (apply to a fresh database).
- Dependency audit (`pip-audit`).

### 15.3 Worker

- Formatting and linting.
- Unit tests.
- Scientific-correctness tests against reference volumes.
- Job lifecycle, retry, and duplicate-delivery tests.

### 15.4 End-to-end and security

- Playwright Chromium smoke test of the critical workflow.
- Trivy filesystem scan with SARIF upload to GitHub Security.
- Selected Tauri desktop build only if the desktop shell is enabled.

Build and test containers using pinned or otherwise controlled dependency versions.

## 16. Suggested Weekly Execution Strategy

Prioritise work by dependency and risk, not visual appeal. This sequence assumes roughly one experienced full-stack developer and maps to the 8–12 week beta estimate in `docs/README.md` section 11.

| Week | Focus                                                          | Phase |
| ---- | -------------------------------------------------------------- | ----- |
| 1    | Workspace, tooling, Compose, CI, technical proof               | 0–1   |
| 2–3  | Backend and frontend foundations, authentication, tenancy      | 1–3   |
| 4–5  | Projects, datasets, uploads, validation                        | 4     |
| 4–5  | Multiplanar viewer and atlas prototype                         | 5     |
| 6–8  | Pipelines, worker, runs, artifacts, manifests                  | 6     |
| 9–12 | Provenance, comparisons, sharing, hardening, portfolio, deploy | 7–10  |

Priority ordering:

| Priority | Work                                                        |
| -------- | ----------------------------------------------------------- |
| P0       | Repository, database, API, authentication, tenant isolation |
| P1       | Projects, datasets, uploads, validation                     |
| P2       | Viewer, pipelines, worker reliability, artifacts, manifests |
| P3       | Provenance, comparisons, sharing, public sample             |
| P4       | Reliability, security, quotas, end-to-end workflow          |
| P5       | Portfolio polish and self-hosted deployment                 |

A small, working deployment is more valuable than a large unfinished feature set. If time is limited, defer hosted notebooks, the visual pipeline editor, BIDS ingestion, fMRI and diffusion workflows, and GPU processing.

## 17. Risk Register

| Risk                                        | Impact                           | Mitigation                                                                                       |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Scope expansion                             | Delayed delivery                 | Ship one complete MRI workflow before supporting every modality; keep the first operations small |
| Tenant isolation bug                        | Data exposure                    | Centralised permission checks, composite foreign keys, and negative integration tests            |
| Unsafe or malformed NIfTI parsing           | Security and reliability issues  | Bounded header parsing, decompression limits, strict validation, and resource limits             |
| Duplicate job delivery                      | Inconsistent results             | Idempotent workers, leases, and database state checks                                            |
| Lost queue messages                         | Stuck runs                       | Transactional outbox and dispatcher with recovery                                                |
| Artifact persisted before manifest          | False success                    | Persist artifacts and manifest, then mark the run successful in one flow                         |
| Lost spatial metadata or wrong orientation  | Scientifically incorrect results | Persist and test affine, spacing, and orientation against known landmarks                        |
| Excessive self-hosting cost                 | Unexpected expense               | Quotas, resource limits, per-run accounting, and documented teardown                             |
| Arbitrary code compromises infrastructure   | Infrastructure breach            | Isolated OCI runtimes, restricted egress, least privilege, no shared secrets                     |
| Scientific misinterpretation                | Misleading claims                | Explicit units, coordinate spaces, provenance, and a limitations statement                       |
| Large volumes exhaust browser or API memory | Poor usability                   | Range requests, derived downsampled representations, and bounded responses                       |
| Complex infrastructure too early            | Slow development                 | Prove the local Docker Compose vertical slice first; keep cloud deferred                         |
| Inconsistent API types                      | Integration defects              | Generate or synchronise client types from OpenAPI                                                |
| Insufficient test realism                   | Hidden database bugs             | Use real PostgreSQL integration tests and reference volumes                                      |

## 18. Definition of Project Completion

The MVP is complete when:

1. A user can sign in and access a project they are a member of.
2. A user can create, rename, archive, and delete a project according to their role.
3. A user can upload or open a supported NIfTI volume and see its validation status and spatial metadata.
4. An invalid file is rejected with a safe, actionable message, and no voxel arrays are stored in the database.
5. The MRI viewer renders axial, coronal, and sagittal views with linked crosshairs, display controls, and accurate voxel and world coordinates.
6. A versioned pipeline can be submitted as a background run and progresses through `queued`, `running`, `succeeded`, `failed`, or `cancelled`.
7. Each successful run produces validated artifacts, checksums, and a machine-readable experiment manifest.
8. Runs are reproducible from their recorded configuration.
9. Comparisons, export, scoped sharing, and the public sample project function within their documented scope.
10. Quotas, usage records, and audit events are enforced and recorded, and health endpoints operate without leaking secrets.
11. Project and role permissions are enforced with automated negative tests for cross-project access.
12. Every primary screen implements the required loading, empty, error, partial-success, disabled, and permission-denied states.
13. Automated checks pass in CI, including scientific-correctness and end-to-end tests.
14. A self-hosted Docker Compose deployment can be reproduced from documented instructions, applies migrations safely, and passes smoke tests.
15. The README explains setup, architecture, testing, limitations, and the deferred cloud evolution.

A feature is not complete merely because its primary happy path works. Validation, failure handling, permission checks, and observability must also be addressed.

## 19. Post-MVP Opportunities

Only consider these after the MVP is stable, and only with a clear user need, documented acceptance criteria, and a test strategy (`docs/02-features.md`, section 18):

- BIDS ingestion and validation as an organisation layer.
- Additional, well-tested image operations and segmentation methods.
- Hosted Python notebooks with controlled access to project datasets.
- A visual pipeline editor with parameter forms and intermediate outputs.
- fMRI time-series exploration and basic GLM workflows.
- Cortical surface rendering and diffusion MRI exploration.
- API keys, a Python SDK, and programmatic job submission.
- Collaborative workspaces with project-level roles beyond the MVP.
- Reusable pipeline packages and community publishing.
- Re-evaluate cloud infrastructure and Terraform only if self-hosting is proven and demand justifies the operational cost.

Do not wait until a late release to build the data model for provenance and versioning. The foundation is established early even when the initial interface exposes only a subset of it.
