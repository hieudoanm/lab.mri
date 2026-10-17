# MRI Lab — Requirements

## 1. Purpose

This document defines the functional requirements, non-functional requirements, technical constraints, and acceptance criteria for MRI Lab.

All implementation decisions must align with these requirements and the project's `00-overview.md`, `README.md`, and any subsequently written feature, architecture, data-model, and tech-stack documents.

Requirements should be implemented incrementally. Do not attempt to implement the entire platform in a single pass. Deliver one complete vertical slice (project creation → dataset upload → validation → viewer → pipeline run → artifact) before expanding scope.

Every requirement in this document carries a stable identifier, a priority, and explicit acceptance criteria. The identifier scheme is described in section 8.

## 2. Scope

### 2.1 In Scope (P0 and P1)

The MVP must provide:

- User authentication and session handling.
- Project management with project-scoped membership and roles.
- NIfTI dataset upload (`.nii`, `.nii.gz`) through a resumable, signed-URL upload flow.
- Dataset validation, header parsing, and provenance tracking.
- An interactive multiplanar MRI viewer (axial, coronal, sagittal) with linked crosshairs.
- Display controls: zoom, pan, contrast/window-level, and colour maps.
- Asynchronous execution of predefined image operations and versioned pipelines in isolated OCI workers.
- Experiment run monitoring, logs, cancellation, and failure recovery.
- Artifact storage, download, and machine-readable experiment manifests.
- Reproducible reruns from recorded configuration.
- Atlas overlays, region inspection, segmentation, and volume calculation.
- Comparisons of input and derived volumes.
- Export, scoped sharing, and public sample projects.
- Role-based access control and project-scoped tenant isolation.
- Usage records and enforced quotas.
- Audit events and operational endpoints.
- Automated tests, continuous integration, and reproducible local development.

### 2.2 Out of Scope (Initial Releases)

The following are explicitly outside the initial scope, though P2 and P3 items are recorded for the longer-term platform:

- Clinical diagnosis, treatment recommendation, or any claim of clinical or regulatory validity.
- Direct acquisition from physical MRI scanners or real-time neurofeedback.
- Large-scale deep-learning training on neuroimaging data.
- Replacement of specialist neuroimaging suites (FSL, AFNI, SPM, FreeSurfer, and similar).
- Non-NIfTI scientific file formats beyond the documented BIDS organisation and validation layer.
- Commercial billing, subscriptions, or payment collection.
- Microservices, Kubernetes, or a general-purpose cloud IDE without demonstrated need.
- Managed cloud infrastructure and Terraform provisioning (deferred; see section 5).

### 2.3 Priority Definitions

Use four priority levels throughout development:

- **P0 — Core platform:** required for a usable first release.
- **P1 — Essential expansion:** needed to deliver a compelling computational laboratory.
- **P2 — Advanced capability:** differentiates the platform after the core workflows work.
- **P3 — Later exploration:** expensive, specialised, or dependent on demonstrated demand.

The P0 scope is described in the product specification as FR-001..FR-012 (core platform) and FR-013..FR-022 (P1 laboratory). Section 3.19 maps the product-specification identifiers to the requirement identifiers used in this document.

## 3. Functional Requirements

Each requirement below states its identifier, title, priority, description, and acceptance criteria. Where a role matrix or shared lifecycle is referenced, it is defined immediately before the requirements that depend on it.

### 3.1 Authentication and Identity

**FR-001 — User authentication**
**Priority:** P0

The application must authenticate users before granting access to any private resource.

Acceptance criteria:

- Unauthenticated requests to protected endpoints are rejected with a consistent `401` response.
- Users can sign up, sign in, and sign out.
- Users can recover access to their account through a documented recovery flow.
- The API never treats a client-supplied user identifier as proof of identity.

**FR-002 — Current user**
**Priority:** P0

The API must expose an endpoint that returns the authenticated user's identity and the projects they can access.

Acceptance criteria:

- `GET /api/v1/me` returns the user's `id`, `email`, `display_name`, and accessible projects.
- The response never includes password material, tokens, or internal-only fields.

**FR-003 — Session handling**
**Priority:** P0

Authentication failures and expired sessions must be handled safely.

Acceptance criteria:

- An expired session produces a `401` with a stable error code and does not expose internal detail.
- The frontend redirects to sign-in without entering an infinite retry or redirect loop.
- Concurrent session refresh does not corrupt state or produce duplicate side effects.

**FR-004 — Development authentication**
**Priority:** P1

Local development may use a seeded account or a development-only authentication mechanism.

Acceptance criteria:

- The development mechanism is disabled by default and cannot be enabled in production configuration.
- Production startup fails closed if authentication configuration is absent or invalid.

**FR-005 — Server-side authorisation**
**Priority:** P0

The API must enforce authorisation on the server for every protected operation, independently of frontend visibility.

Acceptance criteria:

- Direct API requests bypassing the frontend are still subject to the full permission model.
- Possession of a resource identifier or object-storage key is never treated as authorisation.

**FR-006 — Consistent access-denied response**
**Priority:** P0

The application must return a consistent access-denied response without leaking sensitive resource information.

Acceptance criteria:

- Denied access to a non-existent resource and to a resource the caller cannot see return indistinguishable responses where disclosure would be harmful.
- Error responses include a stable error code and request identifier but no protected data.

**FR-007 — Roles and permissions**
**Priority:** P0

The system must support three project-scoped roles: `owner`, `researcher`, and `viewer`.

| Capability                       | Owner | Researcher | Viewer |
| -------------------------------- | ----- | ---------- | ------ |
| View permitted projects          | Yes   | Yes        | Yes    |
| Create projects                  | Yes   | Yes        | No     |
| Edit projects                    | Yes   | Yes        | No     |
| Archive or delete projects       | Yes   | No         | No     |
| Upload and manage datasets       | Yes   | Yes        | No     |
| View datasets and results        | Yes   | Yes        | Yes    |
| Submit experiment runs           | Yes   | Yes        | No     |
| Create and edit pipelines        | Yes   | Yes        | No     |
| Create annotations               | Yes   | Yes        | No     |
| Manage project members and roles | Yes   | No         | No     |
| Create scoped shares             | Yes   | Yes        | No     |

Acceptance criteria:

- Every project-scoped endpoint evaluates the caller's role for that project.
- A viewer attempting a write operation receives a documented authorisation error.

**FR-008 — Role change validation**
**Priority:** P1

Role changes must be validated and recorded.

Acceptance criteria:

- Only owners may change roles.
- Each successful change is written to the audit trail with actor, target, old role, and new role.

**FR-009 — No self-escalation**
**Priority:** P0

Users must not be able to grant themselves additional permissions.

Acceptance criteria:

- A caller cannot raise their own role through any API path.
- Membership changes are keyed on verified identity, not client-supplied values.

**FR-010 — Last-owner protection**
**Priority:** P1

A project must not be left without an active owner.

Acceptance criteria:

- Removing or demoting the last owner is rejected unless a valid ownership transfer is performed atomically.
- Ownership transfer is recorded in the audit trail.

### 3.2 Projects and Membership

**FR-011 — Create projects**
**Priority:** P0

Authorised users must be able to create a project with a required name and optional description.

Acceptance criteria:

- A valid create request persists a `projects` row with the caller recorded as owner in `project_members`.
- The creator immediately sees the project in their list.

**FR-012 — List projects**
**Priority:** P0

Users must be able to list projects they can access.

Acceptance criteria:

- The list supports pagination, deterministic sorting, search by name, and creation/update timestamps.
- Only projects for which the caller has membership are returned.
- Archived projects are excluded by default and can be included explicitly.

**FR-013 — View project details**
**Priority:** P0

Users must be able to view project metadata, membership, datasets, pipelines, and experiment runs.

Acceptance criteria:

- The detail view reflects only resources the caller is permitted to see.
- Missing or inaccessible projects return the consistent access-denied response from FR-006.

**FR-014 — Update projects**
**Priority:** P0

Authorised users must be able to update supported project fields.

Acceptance criteria:

- Name and description changes are validated and persisted.
- Immutable fields such as the project identifier cannot be changed through update endpoints.

**FR-015 — Archive projects**
**Priority:** P0

Projects should be archived rather than permanently deleted by default.

Acceptance criteria:

- Archiving retains datasets, pipelines, runs, and artifacts.
- Archived projects are read-only until restored.

**FR-016 — Delete projects**
**Priority:** P1

Owners must be able to delete a project through an explicit, confirmed workflow.

Acceptance criteria:

- Deletion requires an explicit confirmation and is recorded in the audit trail.
- Deletion applies the documented semantics for source data, derived files, cached copies, and backups (see FR-035 in section 3.18 and NFR-035).
- Deletion never leaves orphaned object-storage references or cross-project records.

**FR-017 — Project membership**
**Priority:** P0

Membership must be represented explicitly in `project_members`.

Acceptance criteria:

- Membership rows capture `project_id`, `user_id`, `role`, and timestamps.
- The API verifies membership server-side for every project-scoped request.
- A user may belong to multiple projects.

**FR-018 — Validate project input**
**Priority:** P0

The server must validate required fields, field lengths, and supported state transitions.

Acceptance criteria:

- Invalid payloads return a documented validation error and create no partial rows.
- Unsupported status transitions are rejected.

**FR-019 — Empty states**
**Priority:** P1

The frontend must explain empty states and provide the appropriate action to authorised users.

Acceptance criteria:

- A user with no projects sees guidance and a create action when permitted.
- A viewer without write permission sees guidance but no create action.

### 3.3 Dataset Upload

**FR-020 — Upload supported volumes**
**Priority:** P0

Researchers must be able to upload NIfTI volumes (`.nii`, `.nii.gz`) through the web application using a resumable cloud upload flow.

Acceptance criteria:

- Files up to the configured per-file limit upload successfully.
- Upload progress is visible and a failed transfer can be resumed without restarting the entire file.

**FR-021 — Upload sessions and signed URLs**
**Priority:** P0

Large uploads must use short-lived, scoped upload credentials.

Acceptance criteria:

- The API creates an `upload_sessions` record and issues scoped, short-lived URLs.
- Signed URLs are scoped to a specific object key and cannot be reused for other resources.
- The server validates the completed object before accepting it as a `file_assets` row.

**FR-022 — Upload metadata**
**Priority:** P0

Dataset metadata must include, where applicable:

- Dataset name.
- Source name and source URL.
- Subject identifier (anonymised).
- Image dimensions and voxel spacing.
- Orientation (affine and any documented coordinate convention).
- Data type.
- File checksum.
- Media type.
- Creation timestamp.
- Validation status.

Acceptance criteria:

- Supported metadata fields are persisted on the `datasets`, `dataset_versions`, and `file_assets` records.
- Missing required metadata produces an actionable validation error.

**FR-023 — Integrity**
**Priority:** P0

The system must calculate and persist a SHA-256 checksum for uploaded and derived files.

Acceptance criteria:

- A checksum is recorded for each `file_asset`.
- A checksum mismatch between upload and stored object marks the upload as failed.

**FR-024 — Immutable source data**
**Priority:** P0

A source volume must not be silently overwritten.

Acceptance criteria:

- Replacing source data creates a new `dataset_versions` row rather than mutating the existing version.
- Existing experiment runs continue to reference the exact dataset version they consumed.

**FR-025 — Private storage**
**Priority:** P0

Raw volumes and large outputs must be stored outside the relational database in private object storage.

Acceptance criteria:

- Voxel arrays are never stored in relational rows.
- Object storage is private by default; access is mediated by authorisation checks and signed URLs.

**FR-026 — Upload completion**
**Priority:** P0

The backend must verify that the expected object exists and passes integrity checks before accepting an upload as complete.

Acceptance criteria:

- A completion request for a missing or corrupted object is rejected and the upload session is closed with a documented status.
- A complete, verified object transitions the dataset version to the validating state.

**FR-027 — Upload cancellation and resumption**
**Priority:** P1

Users must be able to cancel an in-progress upload and resume an interrupted one.

Acceptance criteria:

- Cancelling an upload does not leave partial objects referenced as assets.
- Interrupted uploads can be resumed from documented checkpoints without restarting.

**FR-028 — Import from supported public source**
**Priority:** P1

Authorised users must be able to import a dataset from an explicitly supported public source.

Acceptance criteria:

- Supported sources are documented with their licensing and citation requirements.
- Imported datasets pass the same validation pipeline as manual uploads and record their source URL.

### 3.4 Dataset Validation

**FR-029 — Validate uploads**
**Priority:** P0

The backend must validate:

- File size.
- File extension and actual content.
- Required metadata.
- NIfTI header integrity and bounds.
- Dimensions, voxel spacing, and orientation.
- Data type and finite-value constraints.
- Maximum dimensions and volume size.
- Parser resource limits.

Acceptance criteria:

- Malformed headers, oversized files, and unsupported content are rejected with actionable reasons.
- Parser limits prevent decompression bombs and resource-exhaustion attempts (see NFR-029).

**FR-030 — Read NIfTI headers**
**Priority:** P0

The backend must parse NIfTI-1 and NIfTI-2 headers, including the affine transform, without loading full voxel data where avoidable.

Acceptance criteria:

- Header parsing is performed with bounded memory.
- Parsing succeeds for the documented NIfTI variants and fails safely otherwise.

**FR-031 — Report spatial metadata**
**Priority:** P0

The system must report dimensions, voxel spacing, orientation, and data type.

Acceptance criteria:

- The reported values match an independently verified reference for the test fixtures.
- The report states the coordinate convention used for display and analysis.

**FR-032 — Validation status lifecycle**
**Priority:** P0

A dataset version must have a documented lifecycle:

`pending_upload` → `validating` → `ready`

Alternative terminal states are `rejected` and `failed`.

Acceptance criteria:

- Only versions in the `ready` state may be analysed.
- Terminal states are not silently reverted.

**FR-033 — Validation reports**
**Priority:** P0

The application must store a structured validation report and present actionable validation errors.

Acceptance criteria:

- The report is machine-readable and retrievable through the API.
- Error messages identify the field or check that failed without exposing internal stack traces.

**FR-034 — BIDS support**
**Priority:** P1

The system must validate a dataset against a selected BIDS specification version.

Acceptance criteria:

- BIDS is treated as an organisation and validation layer applied to NIfTI files, not as an image format.
- A validation result records the BIDS specification version used.
- The frontend presents BIDS validation findings with actionable guidance.

**FR-035 — Reject analysis of unready datasets**
**Priority:** P0

The API must refuse to submit experiment runs against dataset versions that are not `ready`.

Acceptance criteria:

- A submission against a `pending_upload`, `validating`, `rejected`, or `failed` version returns a documented error.
- The worker re-verifies readiness before consuming a job.

### 3.5 MRI Viewer

**FR-036 — Multiplanar viewer**
**Priority:** P0

Users must be able to navigate axial, coronal, and sagittal slices of a volume.

Acceptance criteria:

- All three planes render for a ready volume.
- The viewer is implemented with vtk.js (evaluating Cornerstone3D for relevant workflows) on the documented rendering stack.

**FR-037 — Linked crosshairs**
**Priority:** P0

The three planes must share a linked crosshair position.

Acceptance criteria:

- Moving the crosshair in one plane updates the corresponding slice position in the other two within the interactive latency target (NFR-001).
- The crosshair maps correctly through the affine transform.

**FR-038 — Slice navigation**
**Priority:** P0

Users must be able to step through slices and jump to a specific slice index.

Acceptance criteria:

- Slice scrolling and direct index entry both update all linked planes consistently.
- Slice indices are bounded to the volume dimensions.

**FR-039 — Voxel and world coordinates**
**Priority:** P1

The viewer must display voxel coordinates and corresponding world coordinates under the crosshair.

Acceptance criteria:

- Both coordinate values update as the crosshair moves.
- Displayed coordinates use the coordinate convention reported by FR-031.

**FR-040 — Viewer-state persistence**
**Priority:** P1

The viewer must persist meaningful view state per dataset version.

Acceptance criteria:

- At minimum the crosshair position, slice indices, zoom, and window-level are restorable.
- Display transformations are never persisted as if they were analysis inputs (see FR-046).

**FR-041 — Research disclaimer**
**Priority:** P1

The application must communicate that visualisations and derived measurements are for research exploration, not clinical diagnosis.

Acceptance criteria:

- The disclaimer is visible in the viewer and in exported visualisations.
- No feature presents output as a clinical result.

### 3.6 Display Controls

**FR-042 — Zoom**
**Priority:** P0

Users must be able to zoom each plane.

Acceptance criteria:

- Zoom is smooth and within the interactive latency target for a loaded volume.
- A reset-to-fit control restores the default view.

**FR-043 — Pan**
**Priority:** P0

Users must be able to pan each plane.

Acceptance criteria:

- Pan state is independent per plane and resettable.
- Pan does not alter stored voxel data or analysis inputs.

**FR-044 — Contrast and window-level**
**Priority:** P0

Users must be able to adjust contrast and window-level.

Acceptance criteria:

- Adjustments affect display only.
- The current window-level values are visible and resettable.

**FR-045 — Colour maps**
**Priority:** P0

Users must be able to select colour maps for a volume.

Acceptance criteria:

- At least a grayscale map and at least one perceptually reasonable alternative are available.
- Colour map selection never changes stored data or analysis inputs.

**FR-046 — Display versus analysis integrity**
**Priority:** P0

Display transformations must not alter the source volume or become implicit analysis inputs.

Acceptance criteria:

- No display-only operation (zoom, pan, contrast, colour map, orientation flip) is written back to storage or passed to a pipeline unless the user explicitly submits it as an image operation.
- Exported images are clearly labelled as display renderings.

**FR-047 — Accessible labelling**
**Priority:** P1

Viewer controls and canvases must have semantic labels and a meaningful description.

Acceptance criteria:

- Controls are keyboard focusable with visible focus states.
- The viewer exposes a text description of the current orientation, slice indices, and crosshair coordinates.

### 3.7 Atlas and Region Inspection

**FR-048 — Atlas overlays**
**Priority:** P1

Users must be able to load a compatible atlas and overlay it on the volume.

Acceptance criteria:

- Atlas overlays are spatially aligned using the documented affine and coordinate convention.
- An incompatible atlas (mismatched shape or space) produces an actionable error rather than a misaligned overlay.

**FR-049 — Toggle overlays**
**Priority:** P1

Users must be able to toggle region overlays on and off.

Acceptance criteria:

- Toggling is immediate and does not lose the current crosshair or view state.
- Overlay opacity is adjustable.

**FR-050 — Region labels**
**Priority:** P1

The application must show the region label at the current crosshair location.

Acceptance criteria:

- The label corresponds to the voxel under the crosshair for the active atlas.
- Outside labelled regions the application reports "no label" rather than a misleading value.

**FR-051 — Atlas provenance**
**Priority:** P2

Atlas use must record the atlas name, version, and coordinate space.

Acceptance criteria:

- Any annotation or region query references the atlas version used.
- Atlas licensing and citation requirements are documented.

### 3.8 Segmentation and Volumes

**FR-052 — Generate masks**
**Priority:** P1

Users must be able to generate and inspect a segmentation mask.

Acceptance criteria:

- A mask can be produced through a documented operation (for example thresholding or a pipeline template).
- The generated mask is stored as an artifact with provenance.

**FR-053 — Inspect masks**
**Priority:** P1

Users must be able to overlay and inspect a mask against the source volume.

Acceptance criteria:

- Mask overlay alignment is verified against the source affine.
- Mask visibility can be toggled independently of other overlays.

**FR-054 — Region volumes**
**Priority:** P1

The system must calculate region volumes.

Acceptance criteria:

- Volume calculation accounts for voxel spacing and reports units.
- Calculated volumes for known test fixtures match independently verified expected values within the documented tolerance.

### 3.9 Image Operations

**FR-055 — Thresholding**
**Priority:** P1

Users must be able to run thresholding.

Acceptance criteria:

- Threshold parameters are validated and recorded.
- Output preserves the source spatial metadata (FR-059).

**FR-056 — Smoothing**
**Priority:** P1

Users must be able to run smoothing.

Acceptance criteria:

- The smoothing kernel parameter (for example FWHM in millimetres) is recorded.
- Output preserves spatial metadata and reports the algorithm version.

**FR-057 — Resampling**
**Priority:** P1

Users must be able to run resampling.

Acceptance criteria:

- Target spacing or shape is recorded.
- Interpolation method is recorded and output affine is correct for the target grid.

**FR-058 — Masking**
**Priority:** P1

Users must be able to apply a mask to a volume.

Acceptance criteria:

- Mask and input shapes/spaces are validated for compatibility.
- The operation records the mask version used as an input.

**FR-059 — Preserve spatial metadata on output**
**Priority:** P0

Image operations must preserve correct spatial metadata on their outputs.

Acceptance criteria:

- Output dimensions, voxel spacing, and affine are verified against independently computed expected values for reference fixtures.
- A metadata mismatch fails the run rather than silently producing a misaligned artifact.

### 3.10 Pipelines and Versions

**FR-060 — Create pipelines**
**Priority:** P1

Authorised users must be able to create a logical pipeline within a project.

Acceptance criteria:

- A `pipelines` row is created with a name and owning project.
- Pipelines are scoped to a project and isolated from other projects.

**FR-061 — Pipeline versions**
**Priority:** P1

Pipelines must be versioned and immutable once published.

Acceptance criteria:

- Each `pipeline_versions` row records a definition and a container `image_digest`.
- Editing a published version creates a new version rather than mutating history.

**FR-062 — Parameterised templates**
**Priority:** P1

Users must be able to run versioned, parameterised processing templates.

Acceptance criteria:

- Supported parameters are typed, validated, and documented with defaults.
- Invalid parameters are rejected before submission.

**FR-063 — Reusable pipeline packages**
**Priority:** P2

Successful pipelines should be publishable as reusable packages with documented inputs and outputs.

Acceptance criteria:

- A published package declares its inputs, outputs, parameters, and image digest.
- Dependency and compatibility expectations are documented.

**FR-064 — Pipeline validation**
**Priority:** P1

The system must validate a pipeline definition before it can run.

Acceptance criteria:

- References to missing inputs or unsupported parameters are rejected.
- The referenced container image digest is resolved and recorded.

### 3.11 Experiment Runs

**FR-065 — Submit experiment run**
**Priority:** P0

Authorised users must be able to submit an experiment run of a pipeline version against a `ready` dataset version.

Acceptance criteria:

- The API returns a `run_id` promptly (see NFR-003) and accepts the job.
- Submission records the pipeline version, dataset version, and parameters.
- Submission against an unready dataset version is rejected (FR-035).

**FR-066 — Background execution**
**Priority:** P0

Experiment computation must execute outside the synchronous API request handler.

Acceptance criteria:

- Submission enqueues work through the Redis-backed queue for a separate worker.
- The API does not perform the computation itself.

**FR-067 — Run states**
**Priority:** P0

Experiment runs must support:

`queued`, `running`, `succeeded`, `failed`, and `cancelled`.

Acceptance criteria:

- Every run is in exactly one documented state at any time.
- State is persisted in `experiment_runs` and observable through the API.

**FR-068 — State transitions**
**Priority:** P0

The worker must validate run-state transitions.

Acceptance criteria:

- A completed run does not return to `running` or become completed twice without a documented recovery mechanism.
- Illegal transitions are rejected and logged.

**FR-069 — Idempotency**
**Priority:** P0

Repeated submissions with the same dataset version, pipeline version, parameters, and idempotency key must not create duplicate work or conflicting results.

Acceptance criteria:

- Idempotency keys are stored in `idempotency_keys`.
- A repeated submission returns the existing run rather than enqueuing a second one.

**FR-070 — Retry policy**
**Priority:** P0

Transient failures may be retried using bounded attempts and backoff.

Acceptance criteria:

- Invalid parameters and permanently malformed input are never retried indefinitely.
- Retry attempts and reasons are recorded.

**FR-071 — Run monitoring**
**Priority:** P0

The frontend must display run status, creation time, execution timestamps, and safe error information.

Acceptance criteria:

- Status updates are visible without requiring a full page reload.
- Polling, or server-sent events where polling becomes inadequate, is used without overwhelming the API.

**FR-072 — Cancellation**
**Priority:** P1

Users must be able to cancel a queued or running experiment.

Acceptance criteria:

- A cancelled run reaches the `cancelled` state and releases its resources.
- Cancellation is idempotent and recorded in the audit trail.

**FR-073 — Failure recovery**
**Priority:** P0

The system must recover or safely classify runs left in `running` after a worker crash.

Acceptance criteria:

- Stale running runs are detected by heartbeat or lease expiry and moved to a valid state.
- Recovery never produces duplicate artifacts or duplicate billing records.

**FR-074 — Isolated OCI worker**
**Priority:** P0

Experiment computation must run in a versioned OCI container with explicit resource limits.

Acceptance criteria:

- The container image digest is recorded in the run and manifest.
- The worker runs with no default access to application secrets or other projects' files.

**FR-075 — Worker resource limits**
**Priority:** P0

Workers must enforce CPU, memory, disk, and runtime limits.

Acceptance criteria:

- A run exceeding its limits is terminated and marked `failed` with a resource-limit reason.
- Limits are configurable and documented.

### 3.12 Artifacts

**FR-076 — Save artifacts**
**Priority:** P0

Generated outputs must be saved as artifacts.

Acceptance criteria:

- Each artifact references the producing run and stores its object key, checksum, media type, and metadata in `artifacts`.
- Artifacts persist independently of the viewer session.

**FR-077 — Download artifacts**
**Priority:** P0

Users must be able to download artifacts.

Acceptance criteria:

- Downloads use short-lived signed URLs issued after an authorisation check.
- Large downloads do not block the API event loop.

**FR-078 — Artifact metadata**
**Priority:** P0

Artifacts must record enough metadata to identify and verify them.

Acceptance criteria:

- Checksums allow integrity verification after transfer.
- Media type and, for derived volumes, spatial metadata are recorded.

**FR-079 — Artifact access control**
**Priority:** P0

Artifacts must be accessible only to authorised project members.

Acceptance criteria:

- A user outside the project cannot obtain a download URL or object contents.
- Expired signed URLs are rejected.

### 3.13 Provenance and Reproducibility

**FR-080 — Experiment manifest**
**Priority:** P0

Every successful run must produce a machine-readable experiment manifest alongside its artifacts.

Acceptance criteria:

- The manifest includes a `schema_version`, run identifier, pipeline name/version/image digest, input dataset version identifiers and checksums, parameters, environment, outputs, and status.
- The manifest records coordinate conventions, relevant random seeds, and execution details where they affect reproducibility.

**FR-081 — Complete run history**
**Priority:** P0

Experiment history must record input versions, parameters, tool versions, logs, and output references.

Acceptance criteria:

- The run detail view exposes all of these fields to authorised users.
- Logs are access-controlled and do not contain secrets or raw voxel data.

**FR-082 — Reproducible rerun**
**Priority:** P1

Users must be able to rerun an experiment from its recorded configuration.

Acceptance criteria:

- A rerun resolves the same dataset version and pipeline version and records a reference to the source run.
- Numerical equivalence is checked within a documented tolerance where exact bitwise identity is unrealistic.

**FR-083 — Immutable experiment records**
**Priority:** P2

Experiment runs must be immutable records of what was executed.

Acceptance criteria:

- Runs are never edited after completion; corrections are recorded as new runs or annotations.
- Dataset versions and pipeline versions referenced by a run cannot be deleted while the run exists or as governed by the documented retention policy.

### 3.14 Comparisons

**FR-084 — Side-by-side comparison**
**Priority:** P1

Users must be able to compare input and derived volumes side by side.

Acceptance criteria:

- Both volumes share a linked crosshair position where their spaces allow it.
- A mismatch in shape or space is reported rather than silently misaligned.

**FR-085 — Difference views**
**Priority:** P2

Users should be able to inspect differences between two comparable volumes.

Acceptance criteria:

- Difference computation is deterministic and records its inputs.
- The difference view is clearly identified as a derived visualisation.

### 3.15 Sharing and Export

**FR-086 — Scoped sharing links**
**Priority:** P1

Users must be able to create scoped sharing links for a project or experiment.

Acceptance criteria:

- Shares specify an explicit scope (for example read-only project or single experiment) and expiry.
- A share grants only the documented access and is revocable.
- Sharing does not expose resources outside the declared scope.

**FR-087 — Export visualisations**
**Priority:** P1

Users must be able to export visualisations.

Acceptance criteria:

- Exported images carry the research disclaimer and the scale/orientation metadata needed to interpret them.
- Exported files are clearly labelled as display renderings (FR-046).

**FR-088 — Export manifest**
**Priority:** P1

Users must be able to download a reproducible experiment manifest.

Acceptance criteria:

- The downloaded manifest matches the stored manifest for the run.
- The manifest is valid against its declared schema version.

**FR-089 — Public read-only page**
**Priority:** P1

Users must be able to publish a read-only page with an explicit sharing scope.

Acceptance criteria:

- Published pages are inaccessible until explicitly published and can be unpublished.
- Sensitive source data can be excluded before publishing.

### 3.16 Sample and Public Data

**FR-090 — Sample project**
**Priority:** P0

Users must be able to explore a bundled public or appropriately licensed sample without uploading data.

Acceptance criteria:

- A new user can open the sample project and inspect a scan within the first minutes of use.
- The sample's licensing and citation requirements are documented.

**FR-091 — Guided onboarding**
**Priority:** P1

The application should provide guided onboarding.

Acceptance criteria:

- Guidance covers opening the sample, navigating planes, adjusting display, loading an atlas, and saving or sharing a result.
- Guidance can be dismissed and does not block the workflow.

**FR-092 — Explore public content**
**Priority:** P2

The application should provide a gallery of public datasets, templates, and community projects.

Acceptance criteria:

- Public content is curated and its licence is shown.
- Cloning or reusing public content records the source.

### 3.17 Usage and Quotas

**FR-093 — File-size quota**
**Priority:** P0

The system must enforce a maximum upload file size.

Acceptance criteria:

- Oversized uploads are rejected before or during transfer with an actionable message.
- The limit is configurable and documented.

**FR-094 — Runtime quota**
**Priority:** P0

The system must enforce a maximum run runtime.

Acceptance criteria:

- Runs exceeding the runtime limit are terminated and marked `failed` with a timeout reason.
- The limit is configurable and documented.

**FR-095 — Storage quota**
**Priority:** P0

The system must enforce per-project storage limits.

Acceptance criteria:

- Uploads that would exceed the storage quota are rejected with an actionable message.
- Storage usage is derivable from `usage_records` and `file_assets`.

**FR-096 — Compute quota**
**Priority:** P0

The system must enforce CPU, memory, and concurrency limits.

Acceptance criteria:

- Concurrent run submissions beyond the allowed limit are queued or rejected according to the documented policy.
- Resource limits are enforced by the worker (FR-075) and reflected in quota checks.

**FR-097 — Usage records and dashboard**
**Priority:** P1

The system must record usage and expose it to users and operators.

Acceptance criteria:

- `usage_records` capture resource type and quantity per user and run.
- Users can see their usage against quotas; operators can see aggregate usage.

### 3.18 Audit and Operations

**FR-098 — Security-relevant audit events**
**Priority:** P0

The system must record important events, including project creation and archiving/deletion, member and role changes, dataset uploads, validation outcomes, experiment submission, retry, and cancellation, and share creation or revocation.

Acceptance criteria:

- Each event is persisted in `audit_events`.
- Events are emitted reliably, using the transactional outbox pattern (`outbox_events`) where the write must not be lost.

**FR-099 — Audit fields**
**Priority:** P0

An audit event should include actor, project, action, resource type, resource identifier, timestamp, and request identifier when available.

Acceptance criteria:

- Required fields are non-null for security-relevant events.
- Audit records are retained according to the documented retention policy.

**FR-100 — Safe audit data**
**Priority:** P0

Audit records must not contain credentials, access tokens, signed URLs, or unnecessary raw voxel data.

Acceptance criteria:

- Recorded payloads are limited to identifiers and safe metadata.
- A review check confirms no secret material is persisted.

**FR-101 — Health check**
**Priority:** P0

The API must expose `/healthz` to report process health.

Acceptance criteria:

- The endpoint responds promptly without performing expensive dependency checks.

**FR-102 — Readiness check**
**Priority:** P0

The API must expose `/readyz` to report whether required dependencies are available, without exposing secrets or connection strings.

Acceptance criteria:

- Readiness reflects database, queue, and object-storage availability.
- Failure detail is safe for external consumption.

**FR-103 — Structured logging**
**Priority:** P0

Application and worker logs must include useful context, severity, and request or job identifiers.

Acceptance criteria:

- Logs are structured and correlatable by request and run identifiers.
- Logs exclude credentials, tokens, and raw voxel data.

**FR-104 — Local development**
**Priority:** P0

The application must be runnable locally using documented commands and a reproducible dependency setup.

Acceptance criteria:

- Docker Compose brings up the API, worker, PostgreSQL, Redis, and S3-compatible storage (MinIO).
- A clean checkout can start the stack by following the setup guide.

**FR-105 — Continuous integration**
**Priority:** P0

CI must execute relevant formatting, linting, type checks, tests, and build validation.

Acceptance criteria:

- CI runs Ruff, mypy, and pytest for the backend, and ESLint, Prettier, and frontend tests for the web application.
- CI fails the build when a mandatory check fails.

**FR-106 — Versioned REST API**
**Priority:** P0

Application endpoints must be versioned under `/api/v1`.

Acceptance criteria:

- Public endpoints are namespaced under the version prefix.
- Breaking changes require a new API version.

**FR-107 — Pydantic validation**
**Priority:** P0

Request and response payloads must use explicit Pydantic models.

Acceptance criteria:

- Every endpoint declares typed request and response models.
- Untyped dictionaries are not used for API contracts.

**FR-108 — Consistent errors**
**Priority:** P0

The API must return a consistent error envelope with a stable error code, a safe message, and a request identifier.

Acceptance criteria:

- All error responses share the documented envelope shape.
- Internal stack traces are never returned to clients.

**FR-109 — Parameterised SQL**
**Priority:** P0

All SQL values must be passed as query parameters.

Acceptance criteria:

- User input is never concatenated into SQL statements.
- SQL is executed through Psycopg 3 async with explicit queries.

**FR-110 — Pagination**
**Priority:** P0

List endpoints must support pagination with a configurable default page size and a strict maximum.

Acceptance criteria:

- A request exceeding the maximum page size is clamped or rejected according to the documented policy.
- Responses include pagination metadata.

**FR-111 — Safe sorting and filtering**
**Priority:** P0

Sort fields and filter operations must use predefined allowlists.

Acceptance criteria:

- User input never becomes an arbitrary SQL identifier or expression.
- Unsupported sort or filter fields return a documented validation error.

**FR-112 — Object access authorisation**
**Priority:** P0

Object-storage access must verify the caller's permissions before issuing a download URL or returning file contents.

Acceptance criteria:

- Signed URLs are issued only after an authorisation check.
- Direct object-storage access without a valid signed URL is denied.

**FR-113 — Project-scoped isolation**
**Priority:** P0

Every project-owned resource must be isolated from other projects.

Acceptance criteria:

- Every read, write, download, and job submission checks the caller's project membership.
- Tenant context is derived from verified identity, never solely from a client-controlled value.

**FR-114 — Cross-project testing**
**Priority:** P0

Automated tests must verify isolation for projects, datasets, uploads, runs, artifacts, annotations, and downloadable objects.

Acceptance criteria:

- Negative tests assert denial without information leakage.
- The isolation test suite runs in CI.

**FR-115 — API documentation**
**Priority:** P1

The application must expose generated OpenAPI documentation for the implemented API.

Acceptance criteria:

- The documentation is generated from the typed models and kept current.
- Undocumented or internal endpoints are excluded.

**FR-116 — Self-hosted deployment**
**Priority:** P1

The application must be deployable through Docker Compose for local and self-hosted use.

Acceptance criteria:

- A documented Compose configuration runs the full stack.
- Deployment and migration procedures are documented.

**FR-117 — Tauri desktop shell**
**Priority:** P3

The project may provide an optional Tauri desktop shell.

Acceptance criteria:

- The desktop shell reuses the web application and does not create a divergent feature set.
- The shell is optional and does not block the web workflow.

**FR-118 — Hosted notebooks**
**Priority:** P2

The project may provide hosted Python notebooks with controlled access to project datasets.

Acceptance criteria:

- Notebooks execute in isolated runtimes with no default access to application secrets.
- Notebook sessions that produce saved artifacts become tracked runs with manifests.

**FR-119 — API keys and Python SDK**
**Priority:** P2

The project may provide API keys, a Python SDK, and programmatic job submission.

Acceptance criteria:

- API keys are scoped, revocable, and never logged in plaintext.
- Programmatic submission follows the same authorisation and idempotency rules as the web application.

**FR-120 — Scheduled and batch experiments**
**Priority:** P3

The project may support scheduled or batch experiments.

Acceptance criteria:

- Scheduled runs record their trigger and use the same manifest and provenance rules.
- Batch failures are individually visible and retryable.

**FR-121 — GPU-enabled processing**
**Priority:** P3

The project may enable GPU processing where algorithms benefit from it.

Acceptance criteria:

- GPU runs record the accelerator type in the manifest.
- GPU availability degrades gracefully to CPU where documented.

### 3.19 Traceability to the Product Specification

The product specification (`README.md`) defines FR-001..FR-022. Every specification requirement is represented and expanded in this document as follows.

| Product-spec ID | Title              | Requirements in this document                  |
| --------------- | ------------------ | ---------------------------------------------- |
| FR-001          | Authentication     | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 |
| FR-002          | Projects           | FR-011, FR-012, FR-013, FR-014, FR-015, FR-016 |
| FR-003          | Dataset upload     | FR-020, FR-021, FR-022, FR-023, FR-026, FR-027 |
| FR-004          | Dataset validation | FR-029, FR-030, FR-031, FR-032, FR-033, FR-035 |
| FR-005          | MRI viewer         | FR-036, FR-037, FR-038, FR-039, FR-040         |
| FR-006          | Display controls   | FR-042, FR-043, FR-044, FR-045, FR-046, FR-047 |
| FR-007          | Cloud processing   | FR-065, FR-066, FR-067, FR-068, FR-071         |
| FR-008          | Artifacts          | FR-076, FR-077, FR-078, FR-079                 |
| FR-009          | Experiment history | FR-080, FR-081                                 |
| FR-010          | Resource controls  | FR-093, FR-094, FR-095, FR-096, FR-097         |
| FR-011          | Security           | FR-005, FR-112, FR-113, FR-114, FR-098         |
| FR-012          | Sample project     | FR-090, FR-091                                 |
| FR-013          | Atlas overlays     | FR-048, FR-049, FR-051                         |
| FR-014          | Region inspection  | FR-039, FR-050                                 |
| FR-015          | Segmentation       | FR-052, FR-053, FR-054                         |
| FR-016          | Image operations   | FR-055, FR-056, FR-057, FR-058, FR-059         |
| FR-017          | Dataset import     | FR-028                                         |
| FR-018          | BIDS support       | FR-034                                         |
| FR-019          | Pipeline templates | FR-060, FR-061, FR-062, FR-064                 |
| FR-020          | Reproducibility    | FR-080, FR-082, FR-083, FR-088                 |
| FR-021          | Comparisons        | FR-084, FR-085                                 |
| FR-022          | Export and sharing | FR-086, FR-087, FR-088, FR-089                 |

## 4. Non-Functional Requirements

These are initial engineering targets to validate through measurement and load testing, not measured performance claims. Numbers such as latency and availability targets apply to the initial production configuration and reference hardware profile.

### 4.1 Performance

| ID      | Area                   | Requirement                                                                                                                                              |
| ------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | Interactive UI latency | Common viewer interactions (slice scroll, crosshair move, zoom, pan, contrast) respond in under 100 ms after the volume is loaded in the target browser. |
| NFR-002 | API latency            | p95 under 300 ms for ordinary metadata reads under target load.                                                                                          |
| NFR-003 | Job submission latency | `POST /api/v1/runs` returns a run identifier within 2 s under normal load.                                                                               |
| NFR-004 | Computation placement  | Expensive scientific computation must never run inside synchronous API request handlers.                                                                 |
| NFR-005 | Bounded responses      | Volume and data endpoints must enforce strict response-size limits; full volumes are never returned by default.                                          |
| NFR-006 | Pagination limits      | List endpoints must enforce pagination limits.                                                                                                           |
| NFR-007 | Large-file storage     | Large files must use object storage rather than large relational database fields.                                                                        |
| NFR-008 | Client rendering       | The client must avoid rendering unnecessarily large arrays and should fetch only windowed or downsampled data where appropriate.                         |
| NFR-009 | Measured optimisation  | Performance decisions must be supported by measurements where possible rather than arbitrary optimisation.                                               |

### 4.2 Availability and Reliability

| ID      | Area                 | Requirement                                                                                                     |
| ------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| NFR-010 | Availability         | 99.5% monthly for the initial production service.                                                               |
| NFR-011 | Upload reliability   | Resumable uploads with safe retries and integrity verification.                                                 |
| NFR-012 | Job delivery         | Background jobs must tolerate repeated delivery (at-least-once) without corrupting results.                     |
| NFR-013 | Retry policy         | Failed jobs must have clear states and bounded retry policies that distinguish transient from permanent errors. |
| NFR-014 | Transactions         | Database transactions must protect consistency-critical operations such as submission and state transitions.    |
| NFR-015 | Migrations           | Database migrations must be versioned, reviewed, and repeatable.                                                |
| NFR-016 | Recovery of runs     | The system must recover or safely classify runs left running after a worker crash.                              |
| NFR-017 | Backup and restore   | Documented backup, restore, and disaster-recovery procedures must exist.                                        |
| NFR-018 | Recovery point       | Backup and restore procedures must state and test a recovery point and recovery time objective.                 |
| NFR-019 | Graceful degradation | Dependency failures must degrade gracefully with actionable errors rather than silent data loss.                |

### 4.3 Reproducibility

| ID      | Area                   | Requirement                                                                                                              |
| ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| NFR-020 | Manifest completeness  | Every completed run has a machine-readable manifest with traceable input references.                                     |
| NFR-021 | Immutable versions     | Dataset versions and pipeline versions are immutable once referenced by a run.                                           |
| NFR-022 | Runtime capture        | Runs record the container image digest and relevant library versions.                                                    |
| NFR-023 | Coordinate conventions | Runs record the coordinate conventions used, plus relevant random seeds and execution details affecting reproducibility. |
| NFR-024 | Numerical equivalence  | Reproducibility checks define an explicit numerical tolerance where exact bitwise identity is unrealistic.               |

### 4.4 Security, Privacy and Isolation

| ID      | Area                     | Requirement                                                                                                                                                     |
| ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-025 | Server-side enforcement  | Authentication and authorisation must be enforced on the server.                                                                                                |
| NFR-026 | Deny by default          | Access must be denied unless authentication and authorisation checks succeed.                                                                                   |
| NFR-027 | Tenant isolation         | No cross-project access through the API, storage, or worker mounts.                                                                                             |
| NFR-028 | Parameterised SQL        | All database queries must use parameterised SQL.                                                                                                                |
| NFR-029 | Secret protection        | Secrets must never be committed to source control or exposed to frontend code.                                                                                  |
| NFR-030 | Transport security       | Production traffic must use HTTPS.                                                                                                                              |
| NFR-031 | Private object storage   | Object storage must be private by default; access is via short-lived signed URLs after authorisation.                                                           |
| NFR-032 | Upload safety            | File uploads must have strict size limits and bounded parsing limits against malformed headers and decompression bombs.                                         |
| NFR-033 | Untrusted code isolation | Notebooks and custom scripts must run in isolated runtimes with no default access to application secrets or other projects' files.                              |
| NFR-034 | Network controls         | Worker egress must be restricted, preventing access to internal services and cloud metadata endpoints.                                                          |
| NFR-035 | Least privilege          | Short-lived credentials and narrowly scoped object-storage permissions must be used.                                                                            |
| NFR-036 | Data safety in logs      | Logs and error responses must not expose credentials, raw sensitive data, or internal stack traces.                                                             |
| NFR-037 | Privacy posture          | The application must warn users against uploading identifiable clinical data and must define retention and data-processing policies before accepting such data. |
| NFR-038 | Deletion semantics       | Clear deletion semantics must be defined for source data, derived files, cached copies, and backups.                                                            |
| NFR-039 | Dev-auth safety          | Development authentication must not be enabled accidentally in production.                                                                                      |
| NFR-040 | Security tests           | Security-critical behaviours must have automated tests, including negative cross-project access tests.                                                          |

### 4.5 Resource Limits and Cost

| ID      | Area               | Requirement                                                                                                |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| NFR-041 | Quota enforcement  | CPU, memory, disk, runtime, concurrency, and cost quotas must be enforced.                                 |
| NFR-042 | Per-run accounting | Resource consumption must be recorded per run.                                                             |
| NFR-043 | Visibility of cost | Users must have visibility of their usage and of the resource limits that apply to them.                   |
| NFR-044 | Bounded scheduling | Queue and concurrency controls must prevent unbounded resource consumption and abandoned-job accumulation. |

### 4.6 Observability

| ID      | Area                    | Requirement                                                                               |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| NFR-045 | Traceability            | Requests and jobs must be traceable through stable identifiers across the API and worker. |
| NFR-046 | Structured logs         | Logs must be structured and suitable for operational troubleshooting.                     |
| NFR-047 | Health versus readiness | Health and readiness checks must distinguish process health from dependency availability. |
| NFR-048 | Failure visibility      | Job failures, queue delays, and retry patterns must be observable.                        |
| NFR-049 | Minimal collection      | Monitoring must avoid unnecessary collection of personal or scientific data.              |

### 4.7 Accessibility and Usability

| ID      | Area               | Requirement                                                                             |
| ------- | ------------------ | --------------------------------------------------------------------------------------- |
| NFR-050 | Keyboard access    | Primary workflows must be keyboard accessible.                                          |
| NFR-051 | Semantic labelling | Interactive controls, including viewer canvases, must have semantic labels.             |
| NFR-052 | Focus and contrast | Focus states and sufficient colour contrast must be provided.                           |
| NFR-053 | Non-colour status  | Status must not be communicated by colour alone.                                        |
| NFR-054 | Viewer alternative | Viewers and charts must provide a meaningful textual or tabular alternative.            |
| NFR-055 | Actionable errors  | Forms must provide actionable validation errors.                                        |
| NFR-056 | Consistent states  | Loading, empty, success, and error states must be implemented consistently.             |
| NFR-057 | Conformance target | Core workflows should target WCAG 2.1 AA conformance, verified for the primary journey. |

### 4.8 Maintainability and Portability

| ID      | Area                   | Requirement                                                                                                                          |
| ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-058 | Strict typing          | TypeScript must use strict type checking.                                                                                            |
| NFR-059 | Python typing          | Python code must use type annotations for application interfaces and pass mypy checks.                                               |
| NFR-060 | Migrations             | Database changes must use versioned migrations.                                                                                      |
| NFR-061 | Clear boundaries       | Frontend, API, persistence, queue, worker, and scientific computation must have clear boundaries.                                    |
| NFR-062 | Documented contracts   | Public API contracts and operational procedures must be documented.                                                                  |
| NFR-063 | Simplicity             | Avoid unnecessary abstractions, dependencies, and distributed services.                                                              |
| NFR-064 | Local independence     | Local development must not require paid cloud services.                                                                              |
| NFR-065 | Opt-in cloud           | Cloud deployment must be opt-in and explicitly deferred from the initial scope.                                                      |
| NFR-066 | Cost documentation     | Infrastructure documentation must explain likely costs and cleanup procedures when cloud deployment is introduced.                   |
| NFR-067 | Container portability  | Local and self-hosted deployment must be reproducible through Docker Compose.                                                        |
| NFR-068 | Isolated cloud details | Cloud-specific operations should be isolated behind small interfaces when this materially improves local testing or maintainability. |

## 5. Technical Constraints

1. Use Next.js (App Router), React, TypeScript, TailwindCSS, and daisyUI for the web application.
2. Use vtk.js for volumetric and 3D rendering, and evaluate Cornerstone3D for relevant workflows. An optional Tauri desktop shell may reuse the web application.
3. Use Python, FastAPI, and Pydantic for the API.
4. Use PostgreSQL as the source of truth for application metadata and job state.
5. Use asynchronous PostgreSQL access through Psycopg 3 with explicit SQL rather than an ORM.
6. Use Celery with Redis for the queue, with a separate worker process and a separate outbox dispatcher; background jobs must not run inside API request handlers.
7. Store raw volumes and large outputs in S3-compatible object storage (MinIO locally) and issue signed URLs after authorisation checks.
8. Use NiBabel, Nilearn, and SimpleITK for file I/O and analysis, adding ANTs where needed.
9. Run experiment computation in versioned OCI container images with explicit resource limits.
10. Use `uv` as the Python dependency manager.
11. Use Ruff and mypy for Python quality gates, and ESLint and Prettier for frontend quality gates.
12. Use pytest for backend tests and Vitest and Playwright for frontend tests.
13. Use GitHub Actions for continuous integration.
14. Use Docker Compose for local and self-hosted deployment.
15. Use small synthetic or appropriately licensed fixtures in the repository rather than large raw scientific datasets.
16. Keep secrets out of source control and out of frontend bundles.
17. Managed cloud infrastructure and Terraform provisioning are explicitly deferred; do not introduce them without a demonstrated need.
18. Follow existing repository conventions where they are sound; do not restructure a working repository unnecessarily.

## 6. Acceptance Criteria

The MVP must satisfy the following end-to-end acceptance conditions.

### AC-001 — Project creation

Given an authenticated researcher, when they create a project with a valid name, the project is persisted with the caller as owner and appears in their project list.

### AC-002 — Invalid project input

Given an invalid project payload, when the API receives it, the API returns a documented validation error and does not create a partial project.

### AC-003 — Dataset upload and validation

Given a supported NIfTI file and valid metadata, when the upload and validation workflow completes, the dataset version becomes `ready` and its spatial metadata is available.

### AC-004 — Invalid dataset

Given an oversized, malformed, or unsupported file, when validation runs, the dataset version is `rejected` or `failed` with an actionable reason and is not available for analysis.

### AC-005 — Viewer rendering

Given a ready volume, when an authorised user opens the viewer, axial, coronal, and sagittal planes render with linked crosshairs that update consistently across planes.

### AC-006 — Display controls

Given a loaded volume, when the user zooms, pans, adjusts contrast, and changes the colour map, the display updates within the interactive latency target and the stored volume is unchanged.

### AC-007 — Atlas and region inspection

Given a loaded volume and a compatible atlas, when the user enables the overlay and moves the crosshair, the indicated region label corresponds to the voxel under the crosshair for the active atlas version.

### AC-008 — Asynchronous experiment

Given a ready dataset version and a valid pipeline version, when an authorised user submits a run, the API returns promptly with an accepted run resource, and the worker processes the run asynchronously.

### AC-009 — Scientific correctness

Given a known test volume, when an image operation runs, the output dimensions, voxel spacing, affine transform, and numerical results match independently verified expected values within the documented tolerance.

### AC-010 — Idempotency

Given the same dataset version, pipeline version, parameters, and idempotency key, when a submission is repeated, the system returns the existing run and does not create conflicting duplicate work or results.

### AC-011 — Artifacts and manifest

Given a successful run, when it completes, its artifacts are downloadable by authorised members and a machine-readable manifest is stored alongside them.

### AC-012 — Reproducible rerun

Given a completed run, when an authorised user reruns it from its recorded configuration, the system resolves the same input and pipeline versions and records a reference to the source run.

### AC-013 — Role enforcement

Given a viewer, when they attempt a write operation, the API rejects the operation even if the request is made directly without using the frontend.

### AC-014 — Project isolation

Given users in separate projects, when one user attempts to access another project's datasets, runs, artifacts, annotations, or files, the request is denied without leaking protected information.

### AC-015 — Worker recovery

Given a worker failure during processing, when recovery or retry occurs, the run eventually reaches a valid state without producing duplicate artifacts or duplicate usage records.

### AC-016 — Resource quotas

Given a project at its storage or concurrency limit, when a user attempts an operation that would exceed the limit, the operation is rejected or queued with an actionable message.

### AC-017 — Local reproducibility

Given a clean checkout and the documented prerequisites, when a developer follows the setup guide, the Docker Compose stack starts and the application is usable.

### AC-018 — CI quality gates

Given a pull request, CI runs the required automated checks and fails when a mandatory check fails.

### AC-019 — Sample project without upload

Given a new user, when they open the bundled sample project, they can inspect a scan without uploading any data.

### AC-020 — Scoped sharing and export

Given a project or experiment, when an owner creates a scoped sharing link, the link grants only the declared scope and can be revoked; exported visualisations carry the research disclaimer.

## 7. Assumptions and Open Decisions

The following decisions should be resolved early and documented in the relevant project files:

- Which authentication provider or local development mechanism will be used.
- Which NIfTI variants (NIfTI-1, NIfTI-2, gzip) are supported in the first release.
- Whether the first processing templates use NiBabel, Nilearn, SimpleITK, or ANTs for their implementations.
- Which durable queue configuration (Celery plus Redis settings and outbox dispatcher behaviour) best fits local and self-hosted environments.
- Whether project-scoped isolation is delivered as a thoroughly tested shared-schema model first, with stricter isolation documented as a subsequent milestone.
- Which object-storage adapter is used for local development (MinIO is the assumed default).
- Whether the optional Tauri desktop shell is pursued and on what schedule.
- Which atlases are bundled and under what licence.
- The exact scope of BIDS support in the first BIDS iteration.
- The numerical tolerance used for reproducibility checks.

When a decision is not blocking, choose the simplest secure option, document the rationale, and avoid introducing unnecessary complexity.

## 8. Requirement Management

- Keep requirement identifiers stable when updating this document. New requirements are appended with new identifiers rather than renumbering existing ones.
- Use the prefix `FR-` for functional requirements, `NFR-` for non-functional requirements, and `AC-` for acceptance criteria.
- Every requirement carries a priority from section 2.3.
- Update affected documentation when scope or behaviour changes, and keep the traceability table in section 3.19 current.
- Link critical requirements to tests where practical.
- Do not mark a requirement complete merely because a placeholder or interface exists.
- Treat project isolation, safe file handling, parameterised SQL, secret protection, and reproducibility metadata as release-blocking requirements.
- Record deferred requirements explicitly rather than silently omitting them.
- When a specification-level requirement (product-spec FR-001..FR-022) is expanded into several requirements, the traceability table records the relationship.

## Definition of Done

A requirement is Done when all of the following are true:

- The behaviour described in its acceptance criteria is implemented and demonstrated end to end.
- Automated tests cover the requirement, including negative and isolation cases where applicable.
- Formatting, linting, and type checking pass for the affected backend and frontend code.
- The API contract, migrations, or documentation are updated where the requirement changes them.
- Security-relevant changes have been reviewed for authorisation, input validation, and secret handling.
- Observability is in place for any new asynchronous behaviour, including run status, logs, and failure reasons.
- No clinical, regulatory, or compliance claim is made beyond what has been independently established.

The MVP is Done when:

- A developer can run the application using documented instructions.
- A user can sign in, create a project, and manage membership.
- A supported NIfTI volume can be uploaded or loaded from a documented sample, validated, and its metadata and provenance shown.
- The MRI viewer renders axial, coronal, and sagittal views with linked crosshairs and display controls.
- An atlas overlay and region inspection work against a documented atlas.
- At least one segmentation or image operation and one versioned pipeline can be submitted as a background job.
- Run status, logs, cancellation, and artifacts are available in the frontend, with a machine-readable manifest per successful run.
- A run can be reproduced from its recorded configuration.
- Invalid data and failed runs produce understandable errors.
- Project roles and project isolation are enforced and covered by automated negative tests.
- Resource quotas are enforced and usage is recorded.
- Automated tests cover the core workflow and project isolation, and CI runs the required quality checks.
- The architecture, operational limitations, and deferred scope are documented.
