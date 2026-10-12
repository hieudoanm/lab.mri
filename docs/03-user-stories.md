# MRI Lab — User Stories and Acceptance Criteria

## 1. Purpose

This document defines the user goals MRI Lab must support and the conditions under which each workflow is considered complete.

User stories are organised by role and workflow. They complement:

- `README.md` — product specification, personas, functional requirements (FR-001..FR-022), and user journeys A–D.
- `01-overview.md` — product vision, target users, and MVP definition of done.
- `docs/api-specs/` — REST endpoint contracts.
- `docs/database/` — schema, migrations, and integrity rules.
- `docs/design/` — interface and interaction design.

Acceptance criteria should be used by developers, reviewers, and automated tests. They must describe observable behaviour rather than prescribe unnecessary implementation details. Each story lists its priority (P0–P3), the functional requirements it satisfies, and the user journeys it supports.

### 1.1 Requirement coverage

| FR     | Feature            | Stories                                        |
| ------ | ------------------ | ---------------------------------------------- |
| FR-001 | Authentication     | US-001, US-002                                 |
| FR-002 | Projects           | US-003, US-005, US-006, US-007                 |
| FR-003 | Dataset upload     | US-009                                         |
| FR-004 | Dataset validation | US-010, US-011                                 |
| FR-005 | MRI viewer         | US-014, US-015, US-018                         |
| FR-006 | Display controls   | US-016, US-017                                 |
| FR-007 | Cloud processing   | US-029, US-030, US-031, US-032, US-033, US-046 |
| FR-008 | Artifacts          | US-034                                         |
| FR-009 | Experiment history | US-031, US-035                                 |
| FR-010 | Resource controls  | US-010, US-033, US-044, US-046                 |
| FR-011 | Security           | US-004, US-008, US-039, US-045                 |
| FR-012 | Sample project     | US-040, US-041, US-042                         |
| FR-013 | Atlas overlays     | US-019                                         |
| FR-014 | Region inspection  | US-017, US-020, US-021, US-042, US-047         |
| FR-015 | Segmentation       | US-023, US-024                                 |
| FR-016 | Image operations   | US-022                                         |
| FR-017 | Dataset import     | US-012                                         |
| FR-018 | BIDS support       | US-013                                         |
| FR-019 | Pipeline templates | US-025, US-026, US-028                         |
| FR-020 | Reproducibility    | US-027, US-036                                 |
| FR-021 | Comparisons        | US-037                                         |
| FR-022 | Export and sharing | US-008, US-028, US-038, US-039                 |

### 1.2 Journey coverage

| Journey | Goal                  | Primary stories                                                                                                                        |
| ------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A       | Explore a brain scan  | US-040, US-041, US-014, US-015, US-016, US-017, US-019, US-020, US-021, US-038, US-042                                                 |
| B       | Run an analysis       | US-005, US-009, US-010, US-011, US-022, US-023, US-024, US-026, US-029, US-030, US-031, US-032, US-033, US-034, US-035, US-036, US-037 |
| C       | Develop a tool        | US-022, US-025, US-027, US-028                                                                                                         |
| D       | Publish an experiment | US-028, US-035, US-036, US-038, US-039, US-042, US-045                                                                                 |

## 2. User Roles

### 2.1 Personas

The five personas are defined in `01-overview.md` section 4.

| Persona                            | Primary goal                                                     |
| ---------------------------------- | ---------------------------------------------------------------- |
| Computational Neuroscience Learner | Learn with real MRI data without configuring a scientific server |
| Scientific Software Developer      | Build, run, and iterate on neuroimaging code                     |
| Independent Researcher             | Explore hypotheses and produce traceable, reproducible results   |
| Open-Source Contributor            | Publish reusable pipelines and share projects                    |
| Technical Educator                 | Demonstrate neuroimaging with interactive, guided exploration    |

### 2.2 Project roles

Tenancy in MRI Lab is project-scoped. A user holds one of the following roles on each project they can access.

| Role   | Typical persona                             | Capabilities                                                                   |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Owner  | Any user who creates or is assigned one     | Full control, including members, sharing, deletion, and all editor actions     |
| Editor | Learner, Developer, Researcher, Contributor | Upload datasets, run experiments, create pipelines, annotate, export           |
| Viewer | Educator, invited reviewer                  | Read-only access to datasets, runs, artifacts, and annotations that are shared |

Rules:

- A user may hold different roles on different projects.
- Only owners manage membership and sharing scope.
- Server-side authorisation is authoritative; the frontend only hides or disables unavailable actions.
- Operational (operator) access to the platform does not automatically grant permission to read scientific data.

## 3. Authentication and Project Access

### US-001: Sign up and sign in

**As a** user,
**I want to** create an account and sign in securely,
**so that** I can access the projects and datasets available to me.

Acceptance criteria:

- Given valid credentials, when I sign in, then I receive an authenticated session.
- Given invalid credentials, when I sign in, then I receive a safe error message.
- Given a new user, when I register with a valid email, then an account is created and I can sign in.
- Given an expired session, when I request a protected resource, then the application renews the session or asks me to authenticate again.
- Given an unauthenticated request to a protected API endpoint, then the API rejects the request.
- Authentication errors do not disclose whether another user's account exists unless the identity provider explicitly permits that behaviour.

Priority: P0. Requirements: FR-001. Journeys: all.

### US-002: Sign out and recover access

**As a** user,
**I want to** sign out and recover access to my account,
**so that** my session is safe and I can regain access if needed.

Acceptance criteria:

- Given an active session, when I sign out, then the session is invalidated and I can no longer use it to call protected endpoints.
- Given a forgotten password, when I request recovery, then the flow does not reveal whether the email is registered and uses a time-limited token.
- Given a recovery token that is expired or already used, when I attempt to reset, then the request is rejected safely.
- Sign-out clears client-side cached project data.

Priority: P0. Requirements: FR-001. Journeys: all.

### US-003: Select an active project

**As a** user who belongs to multiple projects,
**I want to** select my active project,
**so that** I work with the correct datasets and runs.

Acceptance criteria:

- Given several project memberships, when I select a project, then the application loads resources belonging to that project.
- Given no membership in the requested project, when I attempt to access it, then the server denies access.
- Changing the active project clears or invalidates cached project-specific data.
- Switching projects does not expose data from the previously selected project.

Priority: P0. Requirements: FR-002, FR-011. Journeys: all.

### US-004: Enforce project role permissions

**As a** project owner,
**I want to** control what members can do,
**so that** access matches their responsibilities.

Acceptance criteria:

- Given a viewer, when they attempt a write operation, then the API rejects it.
- Given an editor, when they upload a dataset or submit a run, then the API permits it.
- Given a non-owner, when they attempt to manage members or sharing, then the API rejects it.
- Given an unauthorised user, when they call the API directly rather than using the UI, then the same permission rules apply.
- Possession of an object-storage key, URL, or resource identifier does not by itself grant access.

Priority: P0. Requirements: FR-011. Journeys: all.

## 4. Project Management

### US-005: Create a project

**As a** user,
**I want to** create a project,
**so that** I can organise related datasets, pipelines, and experiments.

Acceptance criteria:

- Given a valid project name, when I submit the form, then the project is created with me as owner.
- Given an empty or invalid name, when I submit the form, then validation explains what needs to change.
- Given a successful creation, then the project appears in my project list.
- Repeated submission caused by a retry must not unintentionally create duplicate projects when the request uses an idempotency key.
- A new project is private by default.

Priority: P0. Requirements: FR-002. Journeys: B.

### US-006: Browse and search projects

**As a** user,
**I want to** browse and search my projects,
**so that** I can find the work I need.

Acceptance criteria:

- The list displays the project name and relevant summary metadata, such as owner, role, and last activity.
- Search filters results to projects the user can access.
- Pagination does not expose resources outside the user's permitted scope.
- A user with no projects sees a helpful empty state with a create action.
- A search with no matches displays a distinct no-results state.
- Loading and API failures are distinguishable from an empty list.

Priority: P0. Requirements: FR-002. Journeys: all.

### US-007: Edit, archive, or delete a project

**As a** project owner,
**I want to** update, archive, or delete a project,
**so that** the workspace stays organised and I control data lifetime.

Acceptance criteria:

- A permitted user can update supported project fields such as name and description.
- Invalid changes are rejected with actionable feedback.
- A viewer or editor cannot archive or delete a project.
- Archiving does not silently delete datasets, run history, or artifacts.
- Deletion follows documented semantics for source data, derived files, cached copies, and backups.
- An archived project cannot accept new uploads or runs unless that behaviour is explicitly supported and documented.

Priority: P0. Requirements: FR-002, FR-011. Journeys: all.

### US-008: Manage project members and roles

**As a** project owner,
**I want to** manage membership and roles,
**so that** collaborators have appropriate access.

Acceptance criteria:

- An owner can inspect member roles.
- An owner can invite, change, and remove members using the implemented invitation mechanism.
- A non-owner cannot perform owner-only operations.
- The last-owner invariant is preserved.
- Membership changes generate audit events.
- A removed member cannot access protected resources through an existing session after the change takes effect.
- Membership changes take effect for API calls, not only in the UI.

Priority: P0. Requirements: FR-011, FR-022. Journeys: all.

## 5. Dataset Upload and Validation

### US-009: Upload a NIfTI volume with a resumable session

**As an** editor,
**I want to** upload `.nii` and `.nii.gz` files through a resumable flow,
**so that** I can inspect and analyse the volume.

Acceptance criteria:

- Given a project I can modify, when I start an upload, then the API returns a scoped upload session with short-lived, narrowly scoped credentials.
- The upload is resumable after an interruption without restarting from the beginning.
- The application shows upload progress and validation status.
- The dataset becomes available for exploration only after validation succeeds.
- The source volume is stored privately.
- The system records provenance, including a SHA-256 checksum of the uploaded object.
- A viewer cannot upload a dataset.
- Uploading to a project I cannot modify is rejected.
- The server validates the completed object before accepting it as a dataset asset.

Priority: P0. Requirements: FR-003. Journeys: B.

### US-010: Handle invalid or oversized uploads

**As an** editor,
**I want to** understand why an upload failed,
**so that** I can correct the problem.

Acceptance criteria:

- Unsupported formats produce a clear error.
- Malformed NIfTI headers, truncated data, and decompression bombs are rejected safely, with bounded decompression.
- Files exceeding configured size, storage, or concurrency limits are rejected safely.
- A failed upload does not create a dataset version that appears ready for analysis.
- Internal filesystem paths, stack traces, storage keys, and secrets are not shown to the user.
- The failure is logged with a request or operation identifier where appropriate.

Priority: P0. Requirements: FR-004, FR-010. Journeys: B.

### US-011: Inspect dataset and spatial metadata

**As an** editor,
**I want to** inspect the file's spatial metadata,
**so that** I understand the volume before analysis.

Acceptance criteria:

- The dataset page displays available metadata read from the NIfTI header.
- Dimensions, voxel spacing, orientation, data type, and affine matrix are displayed when known.
- Unknown metadata is explicitly represented as unknown rather than fabricated.
- Dataset and dataset-version status determines which actions are available.
- A dataset still being validated cannot be used for analysis or opened in the viewer.
- Editing metadata or uploading a new file creates a new immutable dataset version rather than overwriting the previous one.

Priority: P0. Requirements: FR-004. Journeys: B.

### US-012: Import a dataset from a supported public source

**As a** researcher,
**I want to** import a dataset from an explicitly supported public source,
**so that** I can work with recognised data without manual uploads.

Acceptance criteria:

- Given a supported source, when I start an import, then the system records the source and the fetch is performed by a controlled backend process, not the browser.
- Imported data is checked for integrity before it is accepted.
- Imported data is treated as private to the project unless it is already part of the public sample catalogue.
- An unsupported source or an unavailable resource produces a clear error.
- Fetching does not expose backend network access to arbitrary user-supplied URLs.

Priority: P1. Requirements: FR-017. Journeys: B.

### US-013: Validate a dataset against BIDS

**As a** researcher or developer,
**I want to** validate a dataset against a chosen BIDS specification version,
**so that** I know it is organised correctly.

Acceptance criteria:

- I can select a supported BIDS specification version before validation.
- The validation report lists errors and warnings with their affected paths.
- The selected version is recorded on the dataset and in any downstream run manifest.
- An invalid dataset is clearly marked and does not silently pass as valid.
- BIDS is treated as an organisation and validation layer, not as another image format.

Priority: P1. Requirements: FR-018. Journeys: B.

## 6. MRI Viewer and Navigation

### US-014: Open the multiplanar MRI viewer

**As a** user,
**I want to** view a ready volume in three anatomical planes,
**so that** I can explore brain anatomy.

Acceptance criteria:

- Given a ready dataset, when I open the viewer, then axial, coronal, and sagittal views render.
- The three views are linked so that a selected location is shown consistently across all planes.
- The viewer does not need to load the entire volume into browser memory at once.
- An inaccessible dataset cannot be retrieved by changing the request URL or resource identifier.
- The viewer distinguishes display transformations from analytical computation.

Priority: P0. Requirements: FR-005. Journeys: A, B.

### US-015: Navigate slices and linked crosshairs

**As a** user,
**I want to** move through slices and crosshairs,
**so that** I can inspect a specific anatomical location.

Acceptance criteria:

- I can scroll or step through slices in each plane independently.
- Moving the crosshair in one plane updates the position shown in the others.
- The current slice index and position are visible.
- Navigation remains responsive after the volume is loaded.
- Requests exceeding configured limits are constrained with clear feedback.

Priority: P0. Requirements: FR-005. Journeys: A.

### US-016: Adjust display controls

**As a** user,
**I want to** zoom, pan, adjust contrast, and choose colour maps,
**so that** I can view the volume clearly.

Acceptance criteria:

- Zoom, pan, and reset interactions work as documented.
- Contrast and brightness windowing can be adjusted per view.
- I can select from the supported colour maps.
- Display settings do not modify the source volume.
- A reset restores the documented default display state.

Priority: P0. Requirements: FR-006. Journeys: A.

### US-017: Inspect positional information

**As a** user,
**I want to** inspect voxel and world coordinates and identify the region at a location,
**so that** I can interpret what I am looking at.

Acceptance criteria:

- The viewer shows the voxel index (i, j, k) at the crosshair.
- The viewer shows world coordinates in millimetres derived from the affine transform.
- The coordinate convention and units are stated.
- When an atlas is loaded, the region label at the crosshair is shown with an explicit coordinate space.
- Coordinates are not shown as three unlabelled numbers.
- The viewer handles the volume's orientation correctly and does not mirror anatomy.

Priority: P1. Requirements: FR-006, FR-014. Journeys: A.

### US-018: Handle unavailable viewer data

**As a** user,
**I want to** understand why a volume cannot be displayed,
**so that** I can take the next appropriate action.

Acceptance criteria:

- A dataset still being validated displays its current status.
- A volume that fails to decode shows a useful explanation.
- A request failure does not leave the viewer showing misleading stale data as if it were current.
- A retry is available for recoverable network or service failures.

Priority: P0. Requirements: FR-005. Journeys: A.

## 7. Atlas Overlays and Region Inspection

### US-019: Load and toggle an atlas overlay

**As a** researcher,
**I want to** load a compatible atlas and toggle region overlays,
**so that** I can relate anatomy to a reference space.

Acceptance criteria:

- I can load a compatible atlas for the current volume when coordinate spaces are compatible.
- I can toggle the overlay visibility and adjust its opacity.
- An incompatible atlas is rejected with an explanation rather than being displayed incorrectly.
- The atlas name, version, and coordinate space are displayed.
- The overlay does not modify the source or derived volume.

Priority: P1. Requirements: FR-013. Journeys: A.

### US-020: Inspect region labels

**As a** researcher,
**I want to** see the region label and coordinates at a location,
**so that** I can interpret a structure precisely.

Acceptance criteria:

- The region label at the crosshair is shown when overlays are enabled.
- The label is presented together with the coordinate space it belongs to.
- Labels update as the crosshair moves.
- A location without a labelled region is represented as unlabelled rather than assigned a fabricated label.
- Region information is exported with the visualisation when applicable.

Priority: P1. Requirements: FR-014. Journeys: A.

### US-021: Save spatial annotations

**As an** editor,
**I want to** save markers and notes at locations,
**so that** I can record observations for later.

Acceptance criteria:

- I can add an annotation with coordinates and a note to a dataset version.
- Each annotation stores explicit coordinate-space metadata, not just three numbers.
- Annotations are visible to users who can access the project.
- A viewer cannot create or modify annotations.
- Annotations respect project access controls and are not exposed across projects.

Priority: P1. Requirements: FR-014. Journeys: A.

## 8. Image Operations and Segmentation

### US-022: Run an image operation

**As a** researcher,
**I want to** run thresholding, smoothing, resampling, or masking,
**so that** I can prepare or examine a volume.

Acceptance criteria:

- Given a ready dataset version, when I configure a supported operation with valid parameters, then a run is created.
- Invalid parameters are rejected before execution.
- The operation records its parameters, input version, and container image digest.
- Derived output preserves correct spatial metadata, including affine and spacing, unless the operation is explicitly a resampling.
- The interface distinguishes display transformations from analytical computations.

Priority: P1. Requirements: FR-016. Journeys: B, C.

### US-023: Generate and inspect a segmentation mask

**As a** researcher,
**I want to** generate and inspect a mask,
**so that** I can isolate a region of interest.

Acceptance criteria:

- I can create a mask from a supported segmentation operation.
- The mask can be inspected as an overlay against the source volume.
- The mask references the input version, parameters, and pipeline version that produced it.
- A mask whose geometry does not match the source volume is reported rather than silently displayed.

Priority: P1. Requirements: FR-015. Journeys: B.

### US-024: Calculate region volumes

**As an** independent researcher,
**I want to** calculate region volumes from a mask,
**so that** I can quantify structures.

Acceptance criteria:

- Volumes are computed using voxel spacing, with units shown.
- The result identifies the input mask and the parameters used.
- The output is stored as an artifact with a checksum.
- The interface presents results as computed measurements and makes no clinical claims.

Priority: P1. Requirements: FR-015. Journeys: B.

## 9. Pipelines and Versions

### US-025: Create a pipeline and version

**As a** developer,
**I want to** define a pipeline and create immutable versions,
**so that** analyses are repeatable.

Acceptance criteria:

- Given a project I can modify, when I create a pipeline, then it is stored with a name and owner.
- Creating a version records the definition and the runtime container image digest.
- An existing version cannot be silently modified; changes produce a new version.
- A viewer cannot create or modify pipelines.
- Pipeline access is scoped to the project.

Priority: P1. Requirements: FR-019. Journeys: B, C.

### US-026: Run a parameterised pipeline template

**As an** editor,
**I want to** run a versioned template with my parameters,
**so that** I can process data consistently.

Acceptance criteria:

- I can select a supported template and supply validated parameters.
- Submitting returns a run identifier promptly rather than blocking on computation.
- The run records the pipeline version, parameters, input dataset version, and container image digest.
- A template from the public catalogue or another project is used read-only unless I have explicit permission to modify it.

Priority: P1. Requirements: FR-019. Journeys: B.

### US-027: Develop a script in a hosted Python environment

**As a** scientific software developer,
**I want to** run code against an attached project dataset,
**so that** I can iterate on neuroimaging tools.

Acceptance criteria:

- Given an approved environment template, when I start a session, then I can run code with controlled access to a selected project dataset.
- The environment has no default access to application secrets or other users' files.
- The session is network-restricted according to policy.
- I can inspect console output, plots, and generated files.
- I can save the environment specification together with a code revision.
- If hosted notebooks are not yet enabled for my project, the interface explains availability rather than failing silently.

Priority: P2. Requirements: FR-019, FR-020. Journeys: C.

### US-028: Publish a reusable pipeline template

**As an** open-source contributor,
**I want to** publish a documented, reusable pipeline,
**so that** others can build on my work.

Acceptance criteria:

- I can mark a pipeline version as a template with documented inputs, outputs, and parameters.
- The template records the environment and image digest needed to run it.
- Published templates specify their visibility scope.
- A published template does not expose private datasets used during development.
- Another user can run the template without access to my project's private data.

Priority: P2. Requirements: FR-019, FR-022. Journeys: C, D.

## 10. Experiment Runs and Monitoring

### US-029: Submit an experiment run

**As an** editor,
**I want to** run a pipeline on a dataset version,
**so that** I can produce a scientific artifact.

Acceptance criteria:

- Given a ready dataset version and permission to analyse it, when I submit a supported pipeline, then the API creates a run.
- The submission returns a run identifier and initial state.
- The computation runs asynchronously in an isolated worker rather than in a web request handler.
- The run records the dataset version, pipeline version, parameters, and container image digest.
- Repeated requests with the same idempotency key do not create duplicate logical runs within the documented idempotency scope.
- Invalid parameters and inaccessible datasets are rejected before execution.

Priority: P0. Requirements: FR-007. Journeys: B.

### US-030: Monitor run progress

**As an** editor,
**I want to** see the status of a run,
**so that** I know whether it has completed.

Acceptance criteria:

- The interface distinguishes queued, running, succeeded, failed, and cancelled states.
- The displayed status is refreshed through the supported polling or notification mechanism.
- The UI does not display a failed or incomplete run as successful.
- Temporary status-fetch failures are communicated without losing the run identifier.
- A worker crash or retry does not create contradictory terminal states.

Priority: P0. Requirements: FR-007. Journeys: B.

### US-031: Inspect run logs and results

**As an** editor,
**I want to** inspect logs and outputs,
**so that** I can understand what the run produced.

Acceptance criteria:

- Authorised users can view logs for a run; logs distinguish progress from errors.
- A successful run displays its artifacts and the input version it used.
- The result includes the parameters and execution metadata.
- Failed runs do not display fabricated or partial values as a completed result.
- Logs and results are accessible only to users authorised for the project.
- Logs avoid unnecessary sensitive scientific data and never include credentials or tokens.

Priority: P0. Requirements: FR-007, FR-009. Journeys: B.

### US-032: Recover from a failed run

**As an** editor,
**I want to** understand and recover from a failure,
**so that** I can continue my work.

Acceptance criteria:

- A failed run displays a safe, actionable explanation when available.
- Transient infrastructure errors can be retried according to the retry policy.
- Invalid input is not retried indefinitely.
- A retry is traceable to the relevant previous execution.
- The application does not mark a run successful until its result has been persisted successfully.
- Repeated worker delivery does not silently duplicate or corrupt results.

Priority: P0. Requirements: FR-007. Journeys: B.

### US-033: Cancel a run

**As an** editor,
**I want to** cancel a queued or running experiment,
**so that** I can stop unwanted work and resource use.

Acceptance criteria:

- I can request cancellation of a run in a cancellable state.
- A cancelled run reaches a terminal cancelled state and is not later reported as succeeded.
- Partially produced outputs are not presented as complete artifacts.
- Cancellation releases or accounts for the consumed resources according to the quota policy.

Priority: P1. Requirements: FR-007, FR-010. Journeys: B.

## 11. Artifacts and Reproducibility

### US-034: Save and download artifacts

**As an** editor,
**I want to** save and download generated outputs,
**so that** I can use them outside the platform.

Acceptance criteria:

- Each artifact records its object key, checksum, media type, and metadata.
- I can download an authorized artifact through a short-lived, scoped URL.
- A download attempt without permission is rejected even if the identifier is known.
- Artifacts remain associated with the run that produced them.
- Artifact integrity is verifiable via the recorded checksum.

Priority: P0. Requirements: FR-008. Journeys: B.

### US-035: Review experiment history

**As a** researcher,
**I want to** review previous runs and their manifests,
**so that** I can compare outcomes and investigate failures.

Acceptance criteria:

- The user can view runs associated with an accessible project or dataset.
- Run status, pipeline version, parameters, and timestamps are shown.
- Successful runs link to their artifacts and manifest.
- Failed runs expose safe diagnostic information.
- History respects project and resource-level access controls.
- A new pipeline version does not silently overwrite historical runs.

Priority: P1. Requirements: FR-009. Journeys: B, D.

### US-036: Reproduce an experiment from its manifest

**As a** researcher,
**I want to** rerun an experiment from its recorded configuration,
**so that** I can confirm the result is reproducible.

Acceptance criteria:

- Every successful run produces a machine-readable manifest recording inputs, parameters, environment, and outputs.
- I can trigger a reproduction run from an existing manifest.
- The reproduction records the original run as its reference and resolves the same input versions where they remain available.
- If an input version is no longer available, the system reports the limitation rather than substituting different data silently.
- The manifest records coordinate conventions and relevant random seeds where they affect reproducibility.
- The reproduction is a new, traceable run and does not mutate the original.

Priority: P1. Requirements: FR-020. Journeys: B, D.

## 12. Comparisons, Export, and Sharing

### US-037: Compare input and derived volumes

**As a** researcher,
**I want to** compare volumes side by side,
**so that** I can evaluate the effect of a pipeline.

Acceptance criteria:

- I can place an input volume and a derived volume in a linked comparison view.
- The crosshair position is shared between the compared views where geometry is compatible.
- Incompatible geometry is reported rather than silently misaligned.
- I can identify which view is the input and which is the derived output.
- A comparison does not modify either source volume.

Priority: P1. Requirements: FR-021. Journeys: B.

### US-038: Export a visualisation or manifest

**As a** user,
**I want to** export a figure or a machine-readable record,
**so that** I can include it in reports or teaching material.

Acceptance criteria:

- I can export a viewer snapshot with a shown orientation and coordinate annotation.
- I can export the experiment manifest for a run I can access.
- Exported visualisations identify the project, dataset version, and viewer state they represent.
- Exporting respects project access controls.
- Exports omit data the user is not authorised to view.

Priority: P1. Requirements: FR-022. Journeys: A, D.

### US-039: Share a project with a scoped link

**As a** project owner,
**I want to** share a project or experiment with an explicit scope,
**so that** collaborators and reviewers can inspect it safely.

Acceptance criteria:

- I can create a scoped sharing link with a defined visibility and permission level.
- A shared resource is private by default until sharing is explicitly enabled.
- A read-only share does not permit uploads, runs, or membership changes.
- Expired or revoked links stop granting access.
- Sharing does not expose datasets or artifacts outside the chosen scope.
- Creating, changing, or revoking a share generates an audit event.

Priority: P1. Requirements: FR-022, FR-011. Journeys: D.

## 13. Public Sample Exploration

### US-040: Explore the public sample without signing in

**As a** new or unauthenticated user,
**I want to** explore a bundled public sample,
**so that** I can get value in the first few minutes.

Acceptance criteria:

- Given the public sample, when I open it from the landing page, then I can inspect the scan without uploading data or signing in.
- The sample uses public or appropriately licensed data, and its license and citation are shown.
- The viewer, navigation, and display controls behave as they do for private datasets.
- Anonymous exploration cannot access any private project data.
- The sample's source and provenance are documented.

Priority: P0. Requirements: FR-012. Journeys: A.

### US-041: Sign in to save or annotate a viewed sample

**As a** computational neuroscience learner,
**I want to** save a meaningful view or annotation from the sample,
**so that** I can return to it after I sign in.

Acceptance criteria:

- When I sign in from a sample view, my state is preserved or the sign-in flow returns me to the sample.
- Saving a view or annotation requires authentication and creates it in a project I can access.
- A saved view records the dataset version, viewer state, and crosshair location.
- Saving a view does not copy private data into a public scope.
- Viewer state persists across sessions.

Priority: P1. Requirements: FR-012. Journeys: A.

### US-042: Support guided educational exploration

**As a** technical educator,
**I want to** guide learners through a scan interactively,
**so that** I can demonstrate neuroimaging concepts.

Acceptance criteria:

- I can sequence a sample view with saved orientations and annotations to form a guided walkthrough.
- The walkthrough identifies each step and can be shared with a defined scope.
- Explanations of coordinates, metadata, and region labels are visible where relevant.
- The walkthrough uses public or licensed data consistent with its sharing scope.
- The experience does not make clinical claims.

Priority: P2. Requirements: FR-012, FR-014. Journeys: A, D.

## 14. Usage, Quotas, and Project Administration

### US-043: View usage and quotas

**As a** user,
**I want to** see my storage and compute usage against a quota,
**so that** I can plan my work and avoid surprises.

Acceptance criteria:

- The interface shows current usage for supported resource types, such as storage and compute.
- Usage records are attributable to a user and a run where relevant.
- The interface distinguishes current usage from configured limits.
- Resource estimates are clearly labelled as estimates where they are approximate.

Priority: P1. Requirements: FR-010. Journeys: B.

### US-044: Enforce resource limits

**As an** operator,
**I want** file-size, runtime, storage, concurrency, and cost quotas enforced,
**so that** the platform remains available and costs are bounded.

Acceptance criteria:

- Requests exceeding a configured limit are rejected before expensive processing.
- A run exceeding its runtime or resource budget is terminated and reported.
- Concurrency limits prevent abandoned or runaway work from exhausting capacity.
- Quota enforcement applies consistently regardless of whether the UI or API is used.
- Exceeding a quota produces a clear, actionable message.

Priority: P0. Requirements: FR-010. Journeys: B.

## 15. Audit and Operations

### US-045: Review important actions

**As an** authorised operator or project owner,
**I want to** trace important changes,
**so that** I can investigate unexpected behaviour.

Acceptance criteria:

- Supported security-relevant actions generate audit events, including authentication, membership, sharing, deletion, and run submission.
- Each event includes an actor, action, resource type, resource identifier, and timestamp where available.
- Audit records do not contain credentials, access tokens, or raw voxel data.
- Ordinary users cannot modify audit history through public application endpoints.
- Audit access respects the operator's or owner's scope and does not expose unrelated projects.

Priority: P1. Requirements: FR-011. Journeys: D.

### US-046: Monitor service health

**As an** operator,
**I want to** determine whether the application and its dependencies are healthy,
**so that** I can identify operational problems.

Acceptance criteria:

- The liveness endpoint indicates whether the API process is alive.
- The readiness endpoint reflects the health of essential dependencies, including the database, queue, and object storage.
- Health endpoints do not disclose credentials or connection strings.
- Application and worker logs include enough context to correlate relevant failures.
- Centralised job status, logs, resource usage, and failure reasons are available.
- Logs avoid unnecessary sensitive scientific data.

Priority: P0. Requirements: FR-007, FR-010. Journeys: all.

## 16. Accessibility and Usability

### US-047: Use the application with accessible controls

**As a** user,
**I want to** navigate the application with accessible controls,
**so that** I can complete workflows using different input methods.

Acceptance criteria:

- Primary workflows can be navigated with a keyboard.
- Form fields have meaningful labels.
- Validation errors are associated with the relevant fields.
- Status changes are communicated without relying on colour alone.
- The MRI viewer provides a text-based summary of the current slice, crosshair coordinates, and region label for essential information.
- Focus remains predictable after dialogs, submissions, and navigation.

Priority: P1. Requirements: FR-005, FR-014. Journeys: all.

### US-048: Receive clear loading, empty, and error states

**As a** user,
**I want** meaningful feedback at every stage,
**so that** I am never left guessing.

Acceptance criteria:

- Upload, validation, run, and viewer operations show loading states.
- Empty collections show a helpful message and a relevant next action.
- Errors explain what happened and, where possible, how to recover.
- Long-running operations show progress or an explicit indeterminate state.
- Recovery instructions are available for common failures.

Priority: P0. Requirements: FR-003, FR-007. Journeys: all.

## 17. Cross-Cutting Acceptance Rules

These rules apply to every story.

1. Tenant isolation: every read, write, download, and job submission checks the caller's project permissions; possession of an identifier or storage key is not authorisation.
2. Private by default: user datasets, artifacts, and annotations are private unless explicitly shared.
3. Provenance on every run: each run records its input dataset versions, parameters, pipeline version, container image digest, and software environment.
4. Resumable uploads: interrupted uploads can resume, and the server validates the completed object before accepting it.
5. Coordinate-space metadata: spatial annotations and region labels store an explicit coordinate space, not just three unlabelled numbers.
6. Immutable versions: dataset versions, pipeline versions, and run records are not silently overwritten; changes create new records.
7. Invalid input is rejected before expensive processing.
8. Errors are actionable but do not expose secrets or internal implementation details.
9. Loading, empty, success, and failure states are implemented where relevant.
10. State-changing operations are safe against accidental duplicate submission through idempotency keys.
11. Untrusted files and untrusted code are handled as separate threat models: bounded decompression and header parsing for files, isolated and network-restricted runtimes for code.
12. Relevant unit, integration, and security tests are added, including negative cross-project access tests.
13. Important workflows receive end-to-end coverage.
14. Database changes include migrations using parameterised SQL.
15. API behaviour is documented and consistent with `docs/api-specs/`.
16. Staged backend and frontend source changes pass the configured Husky pre-commit checks; CI runs the complete quality gates.

## 18. MVP Acceptance Checklist

The MVP is ready for demonstration when all P0 stories are implemented and verified.

- [ ] A user can sign up, sign in, and sign out.
- [ ] A user can select an accessible project.
- [ ] Project roles owner, editor, and viewer are enforced by the server.
- [ ] A user can create and browse projects.
- [ ] A supported NIfTI volume can be uploaded or loaded from a documented sample.
- [ ] Resumable upload and validation are demonstrated.
- [ ] Invalid, malformed, and oversized uploads are rejected safely.
- [ ] A ready dataset exposes its spatial metadata and provenance.
- [ ] The MRI viewer renders axial, coronal, and sagittal views with linked crosshairs.
- [ ] Zoom, pan, contrast, and colour-map controls work.
- [ ] Voxel and world coordinates are displayed with units and coordinate convention.
- [ ] A pipeline can be submitted as a background job.
- [ ] Run status, logs, and results are available in the frontend.
- [ ] A successful run produces a machine-readable experiment manifest.
- [ ] Artifacts can be listed and downloaded with integrity checks.
- [ ] Failed and cancelled runs produce understandable, safe errors.
- [ ] Cross-project access is prevented and tested.
- [ ] Resource limits and quotas are enforced.
- [ ] Health checks, structured logs, and automated tests are available.
- [ ] The core workflow can be demonstrated using public or synthetic data without requiring access to private research data.

## Definition of Done

A user story is complete when all of the following hold.

1. Acceptance criteria are implemented and demonstrably met.
2. Server-side authorisation is enforced, with negative cross-project access tests where the story touches protected resources.
3. Loading, empty, success, and failure states are implemented where relevant, and errors are actionable without exposing secrets.
4. State-changing operations are idempotent or otherwise protected against accidental duplicate submission.
5. Data changes are delivered through versioned migrations and use parameterised SQL.
6. API behaviour is documented in `docs/api-specs/` and consistent with the implemented handler.
7. Provenance required by the story, such as input versions, parameters, and container image digests, is recorded.
8. Relevant unit and integration tests are added, and important workflows have end-to-end coverage.
9. Staged backend and frontend changes pass the configured Husky pre-commit checks, and CI runs the complete quality gates.
10. Accessibility expectations from section 16 are met for the interfaces the story introduces.
11. Documentation affected by the story is updated, including any operational limitations.
12. No clinical claims are introduced, and the distinction between display transformations and analytical computations is preserved.
