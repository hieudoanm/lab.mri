# MRI Lab — API Specification

## 1. Purpose

This document defines the REST API for MRI Lab, a cloud-based computational neuroimaging workbench for managing MRI datasets, running reproducible image-processing pipelines, and publishing traceable experiment results.

The API must support:
- Project-scoped access control and organisation of scientific work.
- Dataset ingestion with resumable uploads and validation of NIfTI volumes.
- Versioned datasets and file assets with checksums and spatial metadata.
- Versioned pipelines and asynchronous experiment runs.
- Artifact storage with short-lived download URLs.
- Annotations, usage accounting, and audit events.
- Consistent errors, pagination, and idempotency.
- Reproducibility through explicit manifests and pinned container digests.

## 2. API Conventions

### Base URL
Local development: `http://localhost:8000/api/v1`
Production: `https://<configured-api-host>/api/v1`

### HTTP Methods
| Method | Purpose |
|---|---|
| `GET` | Retrieve a resource or collection |
| `POST` | Create a resource or initiate an operation |
| `PATCH` | Partially update a resource |
| `DELETE` | Delete a resource when explicitly supported |

Use `202 Accepted` for asynchronous operations.

### Content Types
- `application/json` for JSON requests and responses.
- Binary uploads use the selected upload protocol (backend-mediated or short-lived object-storage upload URL).

### Identifiers
All resources use UUIDv4/v7-style UUIDs (non-guessable).

### Timestamps
All timestamps are returned in ISO 8601 format with UTC offset `Z`, e.g. `2026-10-09T16:30:00Z`.

### Naming
- `snake_case` for JSON field names.
- Plural nouns for collection endpoints.
- Stable, machine-readable error codes.
- No database table names or internal implementation details exposed.

## 3. Authentication and Authorisation

### Authentication
Protected endpoints require authentication. Clients may present:
- `Authorization: Bearer <token>` for API/machine clients.
- HttpOnly session cookie (default `mri-lab_session`) for browser clients.

On missing/invalid credentials, return `401 Unauthorized` with `WWW-Authenticate: Bearer` and an appropriate error code.

### Project-Scoped Authorisation
Every protected resource is scoped to a project. For each request the backend must:
1. Authenticate the caller.
2. Resolve the target project.
3. Verify caller has active membership with appropriate role.
4. Verify all referenced resources belong to that project.
5. Enforce the required permission.

### Roles
| Role | Capabilities |
|---|---|
| `owner` | Full control: projects, members, datasets, pipelines, runs, artifacts, annotations, deletion. |
| `editor` | Create/update datasets, pipelines, runs, annotations; read everything. |
| `viewer` | Read-only access to project resources and artifacts. |

### Security Rules
- Project membership checks on every protected resource.
- Object-storage key possession is not authorisation.
- Signed upload/download URLs are short-lived and single-object scoped.
- Return `404 Not Found` for inaccessible resources to avoid information leakage.
- Cross-project access is denied by default.

## 4. Common Response Formats

### Error Envelope
```json
{
  "error": {
    "code": "validation_error",
    "message": "The request contains invalid fields.",
    "details": [
      {"field": "name", "code": "must_not_be_blank", "message": "Name is required."}
    ],
    "request_id": "req_..."
  }
}
```

### Pagination
```json
{
  "items": [],
  "next_cursor": null,
  "has_more": false
}
```
Cursor pagination with deterministic ordering; max page size configurable (default 100).

### Generic Page Schema
`Page<T>` is used where cursor/offset pagination applies.

## 5. HTTP Status Codes
| Status | Meaning |
|---|---|
| `200 OK` | Successful read/update |
| `201 Created` | Resource created |
| `202 Accepted` | Asynchronous operation accepted |
| `204 No Content` | Success with no response body |
| `400 Bad Request` | Malformed/invalid request |
| `401 Unauthorized` | Missing/invalid authentication |
| `403 Forbidden` | Lacks permission |
| `404 Not Found` | Resource missing/inaccessible |
| `409 Conflict` | State conflict or idempotency mismatch |
| `413 Content Too Large` | Upload exceeds limit |
| `415 Unsupported Media Type` | Unsupported format |
| `422 Unprocessable Entity` | Schema/semantic validation failure |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected failure |
| `503 Service Unavailable` | Dependency unavailable |

## 6. Endpoint Overview

All API paths under `/api/v1`.

### Auth/Session
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/me` | Current user and memberships |
| `POST` | `/auth/register` | Register user (if enabled) |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/logout` | Logout |
| `POST` | `/auth/password-reset` | Password reset flow |

### Projects
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects` | List accessible projects |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/{id}` | Get project |
| `PATCH` | `/projects/{id}` | Update project |
| `DELETE` | `/projects/{id}` | Delete/archive project |
| `GET` | `/projects/{id}/members` | List members |
| `POST` | `/projects/{id}/members` | Add member |
| `PATCH` | `/projects/{id}/members/{userId}` | Update member role |
| `DELETE` | `/projects/{id}/members/{userId}` | Remove member |
| `POST` | `/projects/{id}/shares` | Create scoped sharing link |

### Datasets
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects/{id}/datasets` | List project datasets |
| `POST` | `/projects/{id}/datasets` | Create dataset (init upload) |
| `GET` | `/datasets/{id}` | Get dataset |
| `PATCH` | `/datasets/{id}` | Update dataset |
| `DELETE` | `/datasets/{id}` | Delete dataset |
| `GET` | `/datasets/{id}/versions` | List dataset versions |
| `POST` | `/datasets/{id}/uploads` | Create upload session |
| `GET` | `/uploads/{id}` | Get upload session |
| `POST` | `/uploads/{id}/complete` | Finalise upload & validate |
| `GET` | `/file-assets/{id}/download-url` | Get short-lived download URL |

### Pipelines
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/pipelines` | List pipelines |
| `POST` | `/pipelines` | Create pipeline |
| `GET` | `/pipelines/{id}` | Get pipeline |
| `PATCH` | `/pipelines/{id}` | Update pipeline |
| `DELETE` | `/pipelines/{id}` | Delete pipeline |
| `GET` | `/pipelines/{id}/versions` | List versions |
| `POST` | `/pipelines/{id}/versions` | Create version |
| `GET` | `/pipeline-versions/{id}` | Get version |

### Runs
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/runs` | Submit run (idempotent with key) |
| `GET` | `/runs` | List runs |
| `GET` | `/runs/{id}` | Get run |
| `POST` | `/runs/{id}/cancel` | Cancel run |
| `POST` | `/runs/{id}/rerun` | Rerun (new run id) |
| `GET` | `/runs/{id}/logs` | Get authorised logs |
| `GET` | `/runs/{id}/artifacts` | List artifacts |
| `GET` | `/artifacts/{id}/download-url` | Get short-lived artifact URL |

### Annotations
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects/{id}/annotations` | List annotations |
| `POST` | `/projects/{id}/annotations` | Create annotation |
| `GET` | `/annotations/{id}` | Get annotation |
| `PATCH` | `/annotations/{id}` | Update annotation |
| `DELETE` | `/annotations/{id}` | Delete annotation |

### Usage/Quotas
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/usage` | Get usage records |
| `GET` | `/quotas` | Get quotas |

### Health
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health/live` | Liveness |
| `GET` | `/health/ready` | Readiness |

## 7. Authentication Details

### POST `/auth/login`
Request:
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```
Response `200 OK`:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_at": "2026-10-09T17:30:00Z"
}
```

### POST `/auth/register`
Request:
```json
{
  "email": "user@example.com",
  "password": "secret",
  "display_name": "User Name"
}
```
Response `201 Created`.

### POST `/auth/logout`
Expires session/cookie; returns `204 No Content`.

All auth endpoints return appropriate error codes on failure.

## 8. Projects

### POST `/projects`
Request:
```json
{
  "name": "My Project",
  "description": "Optional description",
  "visibility": "private"
}
```
Constraints: `name` required, non-blank; `visibility` in `["private","public"]`.

Response `201 Created` with project.

### PATCH `/projects/{id}`
Partial update of mutable fields (`name`, `description`, `visibility`, `archived_at`).

### Project Membership
Roles `owner|editor|viewer`. Last-owner invariant enforced; cannot remove/demote last owner. Membership changes require appropriate role and are audited.

### POST `/projects/{id}/shares`
Creates a scoped sharing link (read-only or specified scope). Returns link metadata with expiry.

## 9. Datasets & Uploads

### POST `/projects/{id}/datasets`
Create a dataset and optionally initiate upload session.
Request:
```json
{
  "name": "T1w Volume",
  "source_type": "upload"
}
```
Response includes dataset + upload session info if initiated.

### POST `/datasets/{id}/uploads`
Create resumable upload session.
Request:
```json
{
  "file_name": "T1w.nii.gz",
  "file_size_bytes": 18740224,
  "expected_checksum_sha256": "sha256:...",
  "media_type": "application/gzip"
}
```
Response:
```json
{
  "upload_session_id": "uuid",
  "status": "pending",
  "upload_method": "backend",
  "upload_url": "/api/v1/uploads/{id}/content",
  "expires_at": "2026-10-09T17:00:00Z"
}
```
Short-lived upload authorisation; client cannot choose arbitrary keys.

### Upload Content
`PUT /uploads/{id}/content` uploads raw bytes (`application/octet-stream`). Returns `204 No Content` on success.

### POST `/uploads/{id}/complete`
Finalise and validate.
Request (optional):
```json
{
  "checksum_sha256": "sha256:..."
}
```
Validation: size/checksum match, NIfTI header parse, affine valid, dimensions/spacings valid, bounded decompression. On success creates `dataset_version` in `ready` with file assets. On failure returns `422` with `invalid_recording` and marks version `failed`.

Idempotent: completing already-completed session returns existing result.

### GET `/datasets/{id}/versions`
List versions ordered by created_at desc; includes manifest summary.

### GET `/file-assets/{id}/download-url`
Returns short-lived signed download URL for authorised access. `object_key` never exposed in public responses.

## 10. Pipelines & Versions

### POST `/pipelines`
Create logical pipeline in project.

### POST `/pipelines/{id}/versions`
Create immutable version.
Request:
```json
{
  "version": "1.0.0",
  "definition": {"steps": [], "parameters_schema": {}},
  "image_digest": "sha256:..."
}
```
Constraints: unique (pipeline_id, version); `image_digest` is immutable digest (not tag). Definition validated against schema.

### GET `/pipeline-versions/{id}`
Returns full version details including definition and image_digest.

## 11. Experiment Runs

### POST `/runs`
Submit run. **Requires `Idempotency-Key` header**.
Request:
```json
{
  "pipeline_version_id": "uuid",
  "dataset_version_id": "uuid",
  "parameters": {"operation": "gaussian_smoothing", "fwhm_mm": 4.0}
}
```
Validation: parameters match pipeline schema; inputs belong to consistent project; dataset version is `ready`.

Response `202 Accepted`:
```json
{
  "id": "uuid",
  "status": "queued",
  "requested_at": "2026-10-09T16:40:00Z"
}
```

Idempotency: identical request + same key returns original run; different request hash returns `409 Conflict`. Transactional outbox ensures dispatch.

### GET `/runs`
Cursor-paginated; filters: `project_id`, `status`, `dataset_version_id`, `pipeline_version_id`.

### GET `/runs/{id}`
Returns full run state: status, timestamps, parameters, error (sanitised), links to artifacts.

### POST `/runs/{id}/cancel`
Cancel queued/running run if supported. Idempotent. Cannot cancel terminal succeeded.

### POST `/runs/{id}/rerun`
Creates new run with same inputs/params (new id). Preserves original history.

### GET `/runs/{id}/logs`
Authorised logs only; no secrets/tokens/URLs. May be streamed or paginated.

### GET `/runs/{id}/artifacts`
List artifacts produced by run with checksums/media_type/metadata.

### GET `/artifacts/{id}/download-url`
Short-lived signed URL for authorised artifact download.

## 12. Annotations

### POST `/projects/{id}/annotations`
Request:
```json
{
  "dataset_version_id": "uuid",
  "coordinate_space": "voxel",
  "coordinates": {"x": 10, "y": 20, "z": 30},
  "body": "Lesion marker"
}
```
Constraints: `coordinate_space` explicit; `coordinates` shape matches space; project matches dataset version.

### PATCH/DELETE
Standard partial update/delete with ownership checks.

## 13. Usage & Quotas

### GET `/usage`
Cursor-paginated usage records: `resource_type`, `quantity`, `run_id`, timestamps.

### GET `/quotas`
Current quotas and usage vs limits.

## 14. Health

### GET `/health/live`
Liveness; no dependency checks. Returns `200` with minimal payload.

### GET `/health/ready`
Readiness; checks DB/connectivity. Returns `200` if ready, else `503`.

## 15. Validation & Schemas

Pydantic models define all request/response shapes. Key schemas:
- `User`, `Project`, `ProjectMember`
- `Dataset`, `DatasetVersion`, `FileAsset`, `UploadSession`
- `Pipeline`, `PipelineVersion`, `ExperimentRun`
- `Artifact`, `Annotation`, `UsageRecord`
- `Error`, `Page<T>`

Validation rules:
- Reject unknown fields on write ops where practical.
- Strict type coercion disabled where inappropriate.
- Trim strings, enforce non-blank.
- Cross-project FK consistency enforced.
- Immutability for versioned entities enforced at API layer.

## 16. Rate Limits & Resource Limits

Configurable limits:
- Upload size (`MAX_UPLOAD_BYTES`)
- Request body size
- Pagination size
- Analysis/run submissions per user/project
- Concurrent jobs
- Max NIfTI dimensions/decompressed size
- Auth failures

Return `429 Too Many Requests` with `Retry-After` when exceeded.

## 17. Observability

- Request ID on all responses (`X-Request-Id`).
- Structured logs (request_id, method, path, status, duration, project_id when safe).
- No secrets, tokens, signed URLs, raw voxel data in logs.
- Prometheus metrics at `/metrics` (unauthenticated; restrict by network policy).
- Correlation IDs propagate across API/worker.

## 18. Reproducibility Requirements

- Every successful run produces experiment manifest with: run_id, pipeline (name/version/image_digest), inputs (dataset_version_id/checksum), parameters, environment, outputs, status.
- Runs reference immutable pipeline_version and dataset_version.
- Artifacts and sources have SHA-256 checksums.
- Annotations record explicit coordinate_space.
- Idempotency keys prevent duplicate run submission.
- Processing is asynchronous; submission returns id promptly.

## 19. Security Requirements

- Private-by-default; explicit sharing only.
- Server-side authorisation on every operation.
- Short-lived signed URLs, single-object scoped.
- Object key possession != authorisation.
- Upload validation, bounded decompression.
- Worker isolation: no cross-project access, no app secrets by default, restricted egress.
- Least privilege credentials.
- Audit events for membership/role changes and key operations.
- No execution of uploaded code outside isolated runtime.

## 20. API Testing Requirements

Cover: auth/permissions, project isolation, upload validation, idempotency, state transitions, pagination, error envelope, cross-tenant denial, run lifecycle, artifact URLs, health.

## 21. Definition of Done

1. Endpoints match canonical list above.
2. All operations enforce project membership.
3. Error envelope and status codes consistent.
4. Pagination tenant-scoped and deterministic.
5. Upload finalisation validates NIfTI with checksum/size checks.
6. Run submission requires idempotency key and is transactional+outboxed.
7. Signed URLs are short-lived and authorised.
8. Manifests capture provenance (image_digest, versions, checksums).
9. Annotations require explicit coordinate_space.
10. OpenAPI artifacts valid and in sync conceptually.
11. Critical isolation/security cases tested.
12. No PII/secrets in logs/responses.
