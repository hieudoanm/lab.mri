# MRI Lab — Feature Specifications

## 1. Purpose

This document describes how MRI Lab features should behave from the user's perspective and how their behaviour should be implemented.

It complements:

- `01-overview.md` — product vision and scope.
- `02-requirements.md` — functional and non-functional requirements (FR-001..FR-022).
- `03-user-stories.md` — user goals and acceptance scenarios.
- `05-architecture.md` — system boundaries and technical responsibilities.
- `06-data-model.md` — entities, relationships, and constraints.
- `07-api-specification.md` — REST endpoints and request/response models.
- `08-tech-stack.md` — technology choices and rationale.
- `09-design.md` — interface and interaction design.

Features should be delivered in vertical slices: a user should be able to complete a useful workflow through the frontend, API, database, and relevant background services before the next major workflow is started.

The canonical entities referenced throughout are `users`, `projects`, `project_members`, `datasets`, `dataset_versions`, `file_assets`, `upload_sessions`, `pipelines`, `pipeline_versions`, `experiment_runs`, `artifacts`, `annotations`, `usage_records`, and `audit_events`.

MRI Lab is a research-software demonstration. It does not diagnose conditions, recommend treatment, or claim clinical or regulatory validity.

Each feature section below states its **user-visible behaviour**, **inputs**, **outputs**, **states**, **edge cases**, and **acceptance conditions**. Priority references map to the P0–P3 definitions in section 2 and to functional requirements FR-001..FR-022 in `02-requirements.md`.

## 2. Feature Priorities

| Priority | Meaning                                             | Product stage            |
| -------- | --------------------------------------------------- | ------------------------ |
| P0       | Required for a usable, secure MVP                   | Core platform            |
| P1       | Important for a convincing portfolio demonstration  | Computational laboratory |
| P2       | Valuable enhancement after the MVP is stable        | Advanced platform        |
| P3       | Later exploration, dependent on demonstrated demand | Ecosystem                |

Priority is assigned per feature section. Where a section spans levels, the individual capability is labelled inline.

## 3. Authentication and Project Context

**Priority:** P0 (FR-001, FR-011)

### Description

Users authenticate and work within a project. Project context determines which datasets, pipelines, runs, artifacts, and annotations they may access.

### User-visible behaviour

- The application provides a clear sign-in experience.
- After authentication, the user sees their available projects.
- The user selects a project or returns to the last valid selection.
- The application displays the active project consistently in navigation and headers.
- If a session expires, the user receives a clear recovery path.
- If the user has no project membership, the application explains what they can do next (create a project or open the public sample).

### Inputs

- Credentials or an OIDC identity-provider callback.
- Active project selection.
- Project identifier supplied in API requests.

### Outputs

- An authenticated session.
- A verified project context.
- Project-scoped resource collections.
- A signed-out state that clears cached project data.

### Behaviour

1. Authenticate the user through the managed OIDC-compatible identity provider.
2. Retrieve the user's identity and `project_members` roles.
3. Select a project for which membership has been verified.
4. Load project-scoped resources.
5. Include the project context in relevant API requests.
6. Independently verify membership and permissions on the server for every request.

### States

- `anonymous`: no session; only public sample content is reachable.
- `authenticated-no-project`: signed in but not a member of any project.
- `active`: signed in with a verified project context.
- `expired`: session invalid; resources hidden and a recovery prompt shown.

### Edge cases

- Invalid or expired session.
- Removed project membership or role downgrade.
- Project archived or deleted while open.
- User belongs to several projects.
- User attempts to alter a project identifier in an API request.
- Identity provider unavailable.
- Concurrent sign-out in another tab.

### Acceptance conditions

- Users cannot access private project resources without authentication.
- Changing the active project changes the visible resource scope.
- Direct API requests cannot bypass membership checks.
- Cross-project reads or writes are rejected even when a valid object-storage key is known.
- Authentication errors are handled without exposing sensitive details.

## 4. Project Management and Membership

**Priority:** P0 (FR-002, FR-011); membership administration P1

### Description

A project is the primary container for organising datasets and their associated analyses. Membership is project-scoped.

### User-visible behaviour

The project list should show:

- Project name.
- Short description, when present.
- Number of datasets.
- Project status (`active` or `archived`).
- Visibility (`private` or `public sample`).
- Last updated timestamp.
- Actions available to the current user.

Users can search, paginate, create, inspect, edit, and archive projects according to their permissions.

### Create a project

Required fields:

- Name.

Optional fields:

- Description.

The form must prevent accidental duplicate submissions and provide inline validation.

On success, the application should navigate to the new project or display a clear confirmation.

### Project details

The detail page should contain:

- Project overview.
- Dataset list.
- Pipeline list.
- Experiment history.
- Relevant provenance information.
- Actions appropriate to the user's role.

### Membership management (P1)

An owner or administrator manages access to the project:

- List `project_members` and inspect each member's role.
- Add a member through the chosen identity mechanism.
- Change roles where permitted (`owner`, `admin`, `member`, `viewer`).
- Remove membership.
- Preserve the last-owner invariant: the final owner cannot be removed or demoted.

If invitations are outside the initial MVP, the UI must not display non-functional invitation controls.

### Inputs

- Project name and description.
- Target user identity and requested role.
- Archive or delete confirmation.

### Outputs

- A project record.
- Project membership records.
- An `audit_events` entry for each membership change.

### States

- `active`: editable according to role.
- `archived`: read-only by default.
- `deleting`: deletion in progress; resources locked.
- `deleted`: resources removed according to deletion semantics.

### Archive behaviour

Archiving a project must not silently destroy its datasets, experiment runs, artifacts, or audit history. Archived projects should be read-only by default. Any exceptions must be explicitly documented.

### Edge cases

- Empty project list.
- Search returns no matches.
- Invalid or overly long name.
- Network failure during save.
- Concurrent edits.
- User loses permission while viewing a project.
- Project is archived while another operation is in progress.
- Attempt to remove the last owner.

### Acceptance conditions

- Only authorised roles can create, rename, archive, or delete a project.
- Membership changes are authorised server-side and recorded as audit events.
- Archiving preserves data and switches the project to read-only.
- Deleting a project follows documented deletion semantics for source data, derived files, cached copies, and backups.

## 5. Dataset Upload and Validation

**Priority:** P0 (FR-003, FR-004)

### Description

Researchers upload MRI volumes into a project. MRI Lab validates each file and extracts spatial metadata before making it available for exploration or analysis.

### Supported initial format

The initial implementation supports NIfTI volumes:

- `.nii`.
- `.nii.gz`.

NIfTI is chosen because it carries standardised image data together with spatial-coordinate metadata (voxel dimensions, orientation, and affine transform). Multi-file BIDS datasets are a later layer and are not required for the MVP.

Do not claim support for a format until its parser, validation, and tests are implemented.

### Upload workflow

1. **Select a project.** The user opens a project and starts a new dataset upload.
2. **Enter metadata.** The user provides a dataset name and source information.
3. **Select the volume.** The interface checks basic file constraints (extension, size) before uploading.
4. **Upload the file.** The file is transferred to private object storage, directly via a short-lived scoped URL or through a controlled backend endpoint. Resumable uploads are used for large volumes.
5. **Validate the volume.** The backend verifies integrity, parses the NIfTI header, and checks consistency with the manifest.
6. **Display the result.** The interface shows whether validation succeeded, failed, or is still in progress.

### Validation behaviour

Validation should check:

- Supported format and extension/content agreement.
- File size against configured limits.
- File integrity and SHA-256 checksum.
- NIfTI header parseability and bounded header fields.
- Image dimensions and voxel spacing.
- Orientation and affine transform.
- Data type and numeric validity (e.g. non-finite values).
- Resource limits (decompression bounds for `.nii.gz`).
- Compatibility between the volume and its supplied metadata.

Validation errors must identify the problem without revealing internal paths, stack traces, or implementation details.

### Dataset lifecycle

`pending_upload` → `validating` → `ready`

Alternative outcomes:

- `rejected`: input violates the supported format or validation rules.
- `failed`: an operational error prevents validation from completing.

A failed validation must not be treated as a successful upload.

A dataset holds a logical identity; each validated upload produces an immutable `dataset_versions` snapshot that references one or more `file_assets`.

### Dataset details

The dataset page should display:

- Name and dataset identifier.
- Source and provenance.
- File format and checksum.
- Image dimensions (voxels per axis).
- Voxel spacing (mm).
- Orientation and affine transform.
- Data type (e.g. `float32`, `int16`).
- Number of volumes for 4D data.
- Validation status.
- Upload and validation timestamps.
- Available visualisation and analysis actions.

### Inputs

- A `.nii` or `.nii.gz` file.
- Dataset name and source metadata.
- Checksum returned by the storage layer.

### Outputs

- An `upload_sessions` record during transfer.
- A `datasets`, `dataset_versions`, and `file_assets` set on success.
- Extracted spatial metadata.

### States

- `pending_upload`, `validating`, `ready`, `rejected`, `failed` as above.
- Per-file: `uploaded`, `verified`, `quarantined`.

### Edge cases

- Interrupted upload.
- Duplicate upload request.
- Missing metadata.
- Unsupported file or wrong extension.
- Checksum mismatch.
- File content does not match its extension.
- Malformed or truncated NIfTI header.
- Non-finite or out-of-range voxel values.
- Extremely large volume or decompression bomb in `.nii.gz`.
- Storage service unavailable.
- User loses permission during upload.
- Object exists in storage but database finalisation fails.

### Important design rule

Never load an unbounded volume entirely into API memory merely to validate it. Apply file-size and resource limits, and use bounded or chunked processing. Serve viewer data through range requests or derived, downsampled representations rather than streaming whole arrays through the API process.

### Acceptance conditions

- An authorised user can upload a supported NIfTI volume and see `ready` with correct spatial metadata.
- Invalid files are `rejected` with a safe, actionable message.
- No MRI voxel arrays are stored in relational database rows.
- Every accepted file asset has a recorded checksum.

## 6. MRI Viewer and Navigation

**Priority:** P0 (FR-005, FR-006)

### Description

Researchers inspect a bounded section of an MRI volume to understand brain anatomy and identify regions of interest. The viewer is an exploration tool, not a clinical interpretation system.

### Multiplanar views

The viewer renders three linked anatomical views:

- Axial.
- Coronal.
- Sagittal.

Linked crosshairs keep the same anatomical point selected across all three views. Moving the cursor in one view updates the other two.

### Display controls

Users should be able to:

- Scroll through slices in each view.
- Drag crosshairs to navigate.
- Zoom and pan per view.
- Adjust window/level (contrast and brightness).
- Select a colour map (greyscale plus suitable scientific maps).
- Reset each view to a default window and zoom.
- Overlay a crosshair coordinate readout.

### Coordinate readout

The viewer must display, for the selected point:

- Voxel coordinates (integer indices per axis).
- World coordinates (millimetres in the volume's coordinate space).
- The active coordinate space and orientation convention.

Voxel and world coordinates must be derived from the volume's affine transform, and the displayed coordinate space must be explicit. Region labels are covered in section 7.

### Data retrieval

The client requests only the data needed for display. The server must enforce maximum response size and permit range or derived representations. Client-side limits alone are insufficient.

### Rendering

vtk.js is the preferred initial rendering library, with Cornerstone3D evaluated for relevant workflows. Rendering is a display transformation and must not modify the source volume.

### Empty and error states

The interface should explain when:

- The dataset is still validating.
- The dataset has no displayable volume.
- The requested slice or window exceeds the allowed limit.
- The volume cannot be retrieved.
- The server returns no image data.

### Inputs

- Dataset version identifier.
- Selected slice indices and crosshair position.
- Window/level, zoom, pan, and colour-map settings.

### Outputs

- Rendered axial, coronal, and sagittal images.
- Voxel and world coordinate readouts.
- Persisted viewer state, where the user chooses to save it.

### States

- `loading`: fetching slices; skeleton views shown.
- `ready`: interactive.
- `partial`: some derived data (e.g. overlays) still loading.
- `error`: retrieval failed with retry.

### Edge cases

- Non-cubic voxel spacing (anisotropic data).
- 4D volume where a time or volume index must be selected.
- Very large volumes requiring derived downsampling.
- Unexpected orientation code from the affine.
- Viewport resized during loading.
- User navigates to another dataset mid-load.

### Acceptance conditions

An authorised user can select a ready dataset, navigate axial, coronal, and sagittal slices with linked crosshairs, adjust contrast, zoom, and pan, choose a colour map, and read voxel and world coordinates — all without loading the complete volume into the browser.

## 7. Atlas Overlays and Region Inspection

**Priority:** P1 (FR-013, FR-014)

### Description

Researchers load a compatible atlas and inspect anatomical regions at a selected location.

### Atlas overlay behaviour

- The user selects an available atlas.
- The overlay is registered to the volume through the volume's affine transform and coordinate space.
- The user toggles the overlay visibility and adjusts its opacity.
- Overlay regions use a documented colour mapping.
- If the atlas cannot be aligned to the volume's coordinate space, the viewer explains the mismatch instead of displaying a misleading overlay.

### Region inspection

For the selected point, the viewer shows:

- Voxel coordinates.
- World coordinates.
- Region label(s) at that location, when an atlas is loaded.
- The atlas name and coordinate space used.

### Inputs

- Atlas identifier and version.
- Overlay visibility, opacity, and colour-map settings.
- Selected crosshair position.

### Outputs

- A registered region overlay per view.
- Region label readout for the selected point.

### States

- `unavailable`: no compatible atlas for the volume's coordinate space.
- `loading`, `ready`, `error` for the overlay resource.

### Edge cases

- Atlas resolution differs from the image resolution.
- Out-of-bounds sample (no region at the point).
- Multiple or probabilistic regions at one voxel.
- Mismatched orientation or units between atlas and volume.
- Atlas licence or attribution requirements.

### Acceptance conditions

- A user can load a compatible atlas, toggle the overlay, and read the region label at the selected voxel.
- Region labels are always accompanied by the atlas name and coordinate space.
- An incompatible atlas produces a clear explanation rather than a silent failure.

## 8. Image Operations and Segmentation

**Priority:** P1 (FR-015, FR-016)

### Description

Researchers run label-preserving image operations and generate segmentations, then inspect the results.

### Initial operations

Implement a small set of well-tested operations:

- Thresholding.
- Smoothing (e.g. Gaussian with an FWHM in millimetres).
- Resampling (to a target voxel spacing).
- Masking (apply a binary mask to a volume).
- Segmentation (produce a binary or labelled mask).

### Behaviour

- Operations preserve correct spatial metadata (affine, orientation, spacing) unless the operation explicitly and visibly changes it (e.g. resampling).
- Region volumes for masks are reported in millimetres cubed and voxel counts.
- Results are stored as artifacts and are inspectable in the viewer alongside the input.
- The operation's parameter schema is explicit and validated before submission.

### Inputs

- Source dataset version.
- Operation type and parameters.
- Optional mask or target-spacing arguments.

### Outputs

- A derived volume or mask artifact.
- Region volume statistics, where a mask is produced.
- An `experiment_runs` record with recorded parameters.

### States

- `queued`, `running`, `succeeded`, `failed`, `cancelled` per the run lifecycle in section 10.
- Mask inspection: `available` or `not_available` (inputs not yet ready).

### Edge cases

- Threshold outside the data range.
- Smoothing kernel larger than the volume.
- Resampling to an extreme or invalid spacing.
- Mask shape or affine mismatch with the source volume.
- Integer type overflow during arithmetic.
- Very large mask region counts.

### Scientific integrity

MRI Lab must not claim that an operation or region volume demonstrates a condition, treatment effect, or clinical outcome. Display transformations must be distinguished from analytical computations.

### Acceptance conditions

- A user can run each supported operation and inspect the output alongside the input.
- Output spatial metadata is correct and verified against reference volumes.
- Region volumes are computed and reported with units.
- Mask and volume results are stored as artifacts with recorded checksums.

## 9. Pipelines and Versioning

**Priority:** P1 (FR-019)

### Description

A pipeline is a versioned, parameterised processing workflow. Researchers run pipelines against a specific dataset version in an isolated worker.

### Pipeline templates

- The platform provides predefined templates (e.g. basic preprocessing: smoothing, skull stripping).
- Each template documents its inputs, outputs, and parameters.
- Parameters are expressed with explicit types, units, defaults, and validation rules.

### Versioning behaviour

- A `pipelines` record holds the logical workflow identity.
- Each change produces an immutable `pipeline_versions` record containing the definition and the `image_digest` of the versioned OCI container.
- Running a pipeline resolves to a specific `pipeline_versions` row.
- Algorithm changes must be reflected in the version identifier.
- Results from different pipeline versions must not be silently merged.

### Inputs

- Pipeline template selection.
- Parameter values.
- Target dataset version.

### Outputs

- A versioned pipeline definition.
- A resolved pipeline version and container digest for execution.

### States

- Pipeline: `draft`, `published`, `deprecated`.
- Pipeline version: immutable once created.

### Edge cases

- Invalid or missing required parameters.
- Pipeline version deprecated before a queued run starts.
- Container image unavailable in the registry.
- Parameter schema changed between versions.
- Attempt to edit a published pipeline version in place.

### Acceptance conditions

- A user can select a template, configure parameters, and submit a run.
- Every run references exactly one pipeline version and one container digest.
- Published pipeline versions are immutable.

## 10. Experiment Runs and Monitoring

**Priority:** P0 (FR-007, FR-009, FR-020)

### Description

Researchers submit experiments that execute in a background worker rather than blocking an API request. They monitor progress, inspect logs, and may cancel eligible runs.

### Submission workflow

1. The user opens a ready dataset version.
2. The user selects a supported pipeline and configures parameters.
3. The frontend submits a run request.
4. The API validates permissions, parameters, and dataset state.
5. The API creates an `experiment_runs` record and schedules work, returning the run identifier promptly.
6. A worker executes the computation in an isolated OCI container with resource limits.
7. The worker persists artifacts, writes the experiment manifest, and finalises the run state.
8. The frontend refreshes or polls the run status.
9. The user opens the results.

### Run states

| State       | Meaning                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `queued`    | Accepted but not yet executing                                         |
| `running`   | A worker is processing the run                                         |
| `succeeded` | Computation, artifact persistence, and manifest writing completed      |
| `failed`    | Processing failed and will not be retried automatically                |
| `cancelled` | Processing was cancelled according to the supported cancellation rules |

State transitions must be validated and persisted.

### Logs

- The user can view logs for a run they are authorised to access.
- Logs are streamed or polled and show progress, warnings, and errors.
- Log lines are structured with timestamp, severity, run identifier, operation name, and outcome.
- Logs must not contain credentials, signed URLs, or unnecessary raw voxel data.

### Cancellation

- A run may be cancelled while `queued` or `running`, subject to documented rules.
- Cancelling a `queued` run prevents it from starting.
- Cancelling a `running` run signals the worker and results in `cancelled`.
- A run that has already `succeeded` cannot be cancelled.
- Cancellation is an auditable operation.

### Reliability requirements

- Run submission must be idempotent under documented conditions (idempotency key).
- Workers must tolerate duplicate delivery.
- Transient failures must use bounded retries.
- Permanent input errors must not be retried indefinitely.
- A worker crash must not leave runs permanently ambiguous.
- Results must not be persisted as successful before computation and validation finish.
- Database state and queue publication must be coordinated to avoid silently losing accepted runs.

A transactional outbox is a suitable approach if the chosen queue cannot participate in the database transaction.

### Result view

The run page should show:

- Pipeline name and version.
- Run status.
- Input dataset version.
- Container image digest.
- Parameters.
- Submission, start, and completion timestamps.
- Links to artifacts and the experiment manifest.
- Safe failure information, if applicable.
- A cancellation control when eligible.

### Inputs

- Pipeline version and parameter values.
- Target dataset version.
- Idempotency key.

### Outputs

- An `experiment_runs` record and its state transitions.
- Run logs.
- Artifacts and manifest on success.

### Edge cases

- Dataset archived before the run starts.
- User loses access after submission.
- Worker crashes during computation.
- Queue temporarily unavailable.
- Same request submitted repeatedly.
- Result persistence fails after computation.
- Run exceeds its execution limit or memory limit.
- Frontend closes while the worker continues.
- Cancellation race with completion.

### Acceptance conditions

- A user can submit a run and observe `queued`, `running`, `succeeded`, `failed`, or `cancelled`.
- A successful run produces artifacts and a manifest.
- Failed runs expose safe error details and a failure reason.
- Cancellation is honoured and recorded.

## 11. Artifacts and Experiment Manifests

**Priority:** P0 (FR-008, FR-009)

### Description

Successful runs produce downloadable output files (artifacts) plus a machine-readable experiment manifest.

### Artifacts

- Each artifact is stored in object storage with an `object_key`, `checksum`, `media_type`, and `metadata`.
- Users can list artifacts for a run, inspect metadata, and download authorised artifacts.
- Downloads use short-lived, scoped URLs.
- Displays of n-dimensional outputs (e.g. overlays, difference maps) link back to the viewer.

### Experiment manifest

Every successful run produces a machine-readable manifest alongside its artifacts. It records:

- `schema_version`.
- `run_id`.
- Pipeline name, version, and `image_digest`.
- Input dataset version identifiers and checksums.
- Parameters.
- Execution environment (software versions, coordinate conventions, relevant random seeds).
- Output references and status.

Illustrative schema (values are examples, not a promise of a specific runtime version):

```json
{
  "schema_version": "1.0",
  "run_id": "run_uuid",
  "pipeline": {
    "name": "basic-preprocessing",
    "version": "1.0.0",
    "image_digest": "sha256:..."
  },
  "inputs": [
    {
      "dataset_version_id": "dataset_version_uuid",
      "checksum": "sha256:..."
    }
  ],
  "parameters": {
    "operation": "gaussian_smoothing",
    "fwhm_mm": 4.0
  },
  "environment": {
    "python": "3.x",
    "libraries": {}
  },
  "outputs": [],
  "status": "succeeded"
}
```

A real manifest records the actual environment, software versions, coordinate conventions, and execution details that affect reproducibility.

### Inputs

- Run outputs from the worker.
- Recorded parameters and environment.

### Outputs

- Artifact files with checksums.
- A downloadable manifest JSON.

### States

- Artifact: `available`, `expired` (lifecycle policy), `deleted`.
- Manifest: `written`, `missing` (failure to write must block `succeeded`).

### Edge cases

- Checksum mismatch on retrieval.
- Artifact too large for inline preview.
- Manifest write fails after computation.
- Artifact deleted by retention policy before download.
- Unsupported preview media type.

### Acceptance conditions

- A user can list and download the artifacts of a completed run they can access.
- Every completed run has a manifest with traceable input references.
- A run is not marked `succeeded` until its artifacts and manifest are persisted and validated.

## 12. Provenance and Reproducibility

**Priority:** P1 (FR-020)

### Description

MRI Lab should make it possible to understand which data and software produced a result, and to rerun an experiment from its recorded configuration.

### Required provenance

Each successful result should identify:

- Source dataset and version.
- Dataset checksum or stable content identifier.
- Pipeline name, version, and container image digest.
- Parameters.
- Execution timestamp.
- Relevant software and library versions.
- Result schema version.
- Coordinate conventions and any relevant random seeds.

### Behaviour

- Source data must not be silently overwritten.
- Rerunning an experiment creates a traceable execution record.
- Algorithm changes are reflected in the version identifier.
- Results from different versions must not be silently merged.
- Rerunning resolves to the same inputs and environment; numerical equivalence is checked where exact bitwise identity is unrealistic.
- Provenance must be available through the UI and API.

### Rerun semantics

The system must distinguish:

- Rerunning an existing run, where supported.
- Creating a new run from the same dataset version and parameters.
- Creating a run against a newer dataset version.

Historical results must remain attributable to the original inputs and software version.

### Inputs

- A completed `experiment_runs` record and its manifest.

### Outputs

- A new `experiment_runs` record linked to the original configuration.

### States

- `reproducible`: inputs and environment are still available.
- `not_reproducible`: a referenced input or container digest is unavailable; the UI explains why.

### Edge cases

- Referenced dataset version deleted.
- Container image digest no longer in the registry.
- Parameters reference deprecated options.
- Non-deterministic algorithms requiring a recorded seed.

### Acceptance conditions

- A user can rerun an experiment from its recorded configuration.
- Provenance is visible in the UI and retrievable via the API.
- The system never presents results from different versions as the same result.

## 13. Comparisons and Export

**Priority:** P1 (FR-021, FR-022)

### Description

Researchers compare input and derived volumes and export visualisations and manifests.

### Comparisons

- Compare two volumes side by side with synchronised crosshairs and view controls.
- Support input versus derived comparisons (e.g. original versus smoothed, image versus mask).
- Optionally offer a difference view.
- Clearly label which volume is input and which is derived, and the coordinate space.

### Export

- Export a viewer snapshot (PNG) of the current multiplanar view.
- Export the experiment manifest (JSON).
- Export derived volumes and masks (NIfTI).
- Exports respect the user's permissions and use scoped download URLs.

### Inputs

- Two comparable volume/artifact references.
- Export format selection and current view state.

### Outputs

- Synchronised comparison rendering.
- Exported image, manifest, or volume files.

### States

- `comparable`: coordinate spaces and dimensions align.
- `not_comparable`: the interface explains the mismatch and disables synchronised comparison.

### Edge cases

- Volumes with different dimensions, spacing, or orientation.
- Derived volume missing its source.
- Export requested without download permission.
- Large export exceeding a size threshold.

### Acceptance conditions

- A user can compare an input and a derived volume with synchronised navigation when they are comparable.
- A user can export a snapshot, manifest, or derived volume they are authorised to access.
- Incomparable volumes are detected and explained.

## 14. Sharing and Public Sample Projects

**Priority:** P0 sample project (FR-012); sharing P1 (FR-022)

### Description

MRI Lab is private by default and provides a bundled public or appropriately licensed sample project for exploration without uploading data. Users may share a project with an explicit scope.

### Public sample project

- The sample is available from the landing page without authentication to browse a demonstration.
- It contains a licensed or synthetic volume with spatial metadata.
- It supports the core viewer workflow (section 6) and, where available, atlas overlays (section 7).
- Its licence and citation requirements are displayed.
- Saving a view, creating annotations, or running a run requires signing in.

### Sharing

- A user with sufficient permission can create a scoped sharing link.
- Sharing is explicit; private data is never public by default.
- The sharing scope can be project-level or limited to a specific run or view.
- Sharing links are revocable.
- Shared read-only pages display provenance and a clear sharing scope.
- A recipient can reproduce a run only if separately authorised.

### Inputs

- Project or resource identifier.
- Requested sharing scope and expiry.

### Outputs

- A scoped, revocable sharing link.
- A read-only shared page.

### States

- `private` (default), `shared`, `revoked`, `expired`.

### Edge cases

- Attempt to share data without permission.
- Expired or revoked link.
- Shared content references sensitive source data that must be excluded.
- Recipient lacking an account views the sample or shared page.
- Licence terms preventing redistribution.

### Privacy

MRI files and metadata can contain sensitive information. Cloud storage and sharing must be designed around privacy from the start. Users must be warned against uploading identifiable clinical data, and sharing must never expose it implicitly.

### Acceptance conditions

- An unauthenticated visitor can explore the sample project.
- Private resources are not public unless explicitly shared.
- Sharing links are scoped, revocable, and permission-checked server-side.

## 15. Usage, Quotas, and Resource Controls

**Priority:** P0 (FR-010); billing is out of scope for the MVP

### Description

MRI Lab enforces file-size, runtime, storage, and compute quotas and records resource usage.

### Controls

- Maximum upload file size per file and per project.
- Maximum storage per project or user.
- Maximum concurrent runs per user or project.
- Maximum run runtime and memory.
- Bounded retry counts.
- Queue concurrency limits.

### Usage accounting

- `usage_records` capture `resource_type` and `quantity` per user and run (e.g. storage bytes, CPU seconds).
- Usage is visible in a project's settings and a cost/usage dashboard.
- Resource estimates are shown before submitting expensive runs.

### Inputs

- Resource requests and observed consumption.

### Outputs

- Enforced quota decisions.
- Usage records and dashboard figures.

### States

- `within_quota`, `approaching_limit`, `limit_reached` (submission blocked with explanation).

### Edge cases

- Run exceeds runtime limit and is terminated.
- Storage quota reached during upload.
- Concurrent-run limit reached at submission.
- Usage record write failure on a successful run.
- Long-running run holds a queue slot.

### Acceptance conditions

- Quota limits are enforced server-side before work is accepted.
- Usage is recorded and visible.
- Reached limits produce a clear, actionable message.

## 16. Audit Trail and Operational Health

**Priority:** P1 audit trail; P0 health

### Audit trail

The application records security-relevant actions to support troubleshooting and accountability.

Initial events:

- Project created, updated, or archived.
- Membership created, changed, or removed.
- Dataset uploaded.
- Dataset validation completed or failed.
- Experiment submitted, retried, cancelled, completed, or failed.
- Sharing created or revoked.
- Access-control changes.

Behaviour:

- Audit events include the actor, project, action, resource, and timestamp when available.
- Audit data must not contain access tokens, passwords, signed URLs, or unnecessary raw scientific data.
- Audit events are immutable and append-only.

### Operational health

- `/healthz`: confirms that the API process is alive.
- `/readyz`: reports whether essential dependencies (database, queue, object storage) are ready.
- Health endpoints must not reveal secrets or connection strings.

### Logs

Use structured logs with:

- Timestamp.
- Severity.
- Request or run identifier.
- Relevant project identifier when safe.
- Operation name.
- Outcome.
- Error classification.

Avoid logging raw voxel arrays, credentials, signed URLs, or sensitive payloads.

### Inputs

- Actions performed by authenticated actors.
- Health probes from infrastructure.

### Outputs

- `audit_events` records.
- Health and readiness responses.
- Structured application and job logs.

### Edge cases

- Audit write failure on a security-relevant action.
- Dependency slow or unavailable at readiness probe.
- High-volume audit logging without sensitive leakage.
- Clock skew across services.

### Acceptance conditions

- Security-relevant actions produce audit events with actor, resource, and timestamp.
- Health endpoints report process liveness and dependency readiness without leaking secrets.
- Logs are structured and free of secrets and raw voxel data.

## 17. User Interface States

**Priority:** P0

Every primary screen must implement the states relevant to its workflow, with concrete MRI examples.

### Loading

Show progress or a skeleton for asynchronous requests. Avoid misleading empty screens while data is still loading.

- Viewer: three skeleton viewports while slices are fetched.
- Dataset page: placeholder rows while validation is in progress.
- Run page: status indicates `queued` or `running` with log output streaming.

### Empty

Explain why there is no content and offer an appropriate next action.

- No datasets: prompt the user to upload a NIfTI volume or open the sample project.
- No runs: prompt the user to select a pipeline and submit a run.
- No artifacts: explain that the run produced no outputs.

### Success

Confirm the completed operation and show the resulting resource or next step.

- Upload success: dataset shows `ready` with dimensions, spacing, and orientation.
- Run success: status `succeeded` with artifact and manifest links.

### Validation error

Identify the invalid field or file property and explain how to fix it.

- Unsupported extension: "Only `.nii` and `.nii.gz` volumes are supported."
- Damaged `.nii.gz`: "The compressed volume could not be decompressed safely."
- Parameter error: "FWHM must be a positive number of millimetres."

### Permission error

Explain that the requested action is unavailable without exposing another project's protected resources.

- Attempting to view a dataset outside the user's projects returns a clear, non-revealing denial.

### Network error

Allow safe retry where appropriate and preserve user-entered form data when possible.

- Upload interrupted: offer resume; preserve the entered dataset name and source.
- Viewer fetch failure: offer retry without losing the current view state.

### Server error

Show a safe message and a request identifier where available. Do not expose internal stack traces.

- A worker failure surfaces a safe failure reason and the run identifier.

### Partial success

Indicate which parts succeeded and which did not.

- A run that produced a mask but failed to compute region volumes shows the mask and flags the missing statistics.

### Disabled

Disable controls that cannot currently be used, and explain why.

- The run submit button is disabled while required parameters are missing or the dataset is not `ready`.
- Cancellation is disabled once a run has `succeeded`.

### Permission-denied

Refer to the permission error above; denied actions must be explicit and must never leak protected resource existence.

### Acceptance conditions

- Each screen implements loading, empty, error, partial-success, disabled, and permission-denied states where relevant.
- Error messages are safe and actionable.
- No state exposes internal paths, stack traces, or other projects' data.

## 18. Deferred Features

The following must not delay the initial MVP:

- Real-time scanner acquisition or live reconstruction.
- fMRI time-series exploration and GLM workflows.
- Cortical surface rendering and diffusion MRI exploration.
- Hosted Python notebooks as a primary workflow.
- Visual pipeline editor with intermediate inspection.
- Arbitrary user-uploaded executable analysis code.
- Full BIDS dataset ingestion and validation app execution.
- GPU-enabled processing.
- Scheduled or batch experiments.
- Plugin SDK and community publishing.
- Public experiment gallery beyond the bundled sample.
- Billing and subscription management.
- Automatic scientific interpretation or clinical claims.
- Multi-organisation or institutional tenancy beyond project-scoped membership.

These may be considered only after the core workflow, security controls, and reproducibility requirements are stable.

## 19. Definition of Feature Completion

A feature is complete only when:

1. Its intended behaviour is documented.
2. The frontend and backend implement the agreed contract.
3. Authorisation is enforced on the server.
4. Validation, failure, and cancellation states are handled.
5. Relevant automated tests pass, including scientific-correctness checks for image operations.
6. Database migrations are included where required.
7. Logs and operational behaviour are adequate.
8. User-facing documentation is updated.
9. No critical security requirement is knowingly violated.
10. The feature has been exercised through an end-to-end workflow where practical.
11. Changed backend and frontend source files pass the repository's Husky pre-commit checks and the GitHub Actions CI gate.

## 20. Definition of Done

The feature set is done for a release when:

- A user can sign in, select a project, and upload or open a supported NIfTI volume.
- Dataset metadata, spatial provenance, and validation status are visible.
- The MRI viewer renders axial, coronal, and sagittal views with linked crosshairs and display controls.
- Where implemented, atlas overlays, region inspection, image operations, and segmentation work end to end.
- A versioned pipeline can be submitted as a background run, with `queued`, `running`, `succeeded`, `failed`, and `cancelled` states observable.
- Logs, artifacts, and a machine-readable experiment manifest are available for successful runs.
- Runs are reproducible from their recorded configuration.
- Comparisons, export, sharing, and the public sample project function within their documented scope.
- Quotas, usage records, and audit events are enforced and recorded.
- Health and readiness endpoints operate and structured logs avoid secrets.
- Project and role permissions are enforced, with automated negative tests for cross-project access.
- Every primary screen implements the required UI states.
- CI runs the required quality checks and the architecture and operational limitations are documented.
- A cloud deployment can be reproduced using the documented infrastructure when cloud credentials are available.
