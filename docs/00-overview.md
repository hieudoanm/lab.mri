# MRI Lab — Project Overview

## 1. Project Summary

**MRI Lab** is a full-stack scientific SaaS application for computational neuroscience researchers and developers to organise projects, upload MRI datasets, explore brain anatomy through interactive 3D viewers, run asynchronous image-processing pipelines, and share reproducible experiments securely with collaborators.

The project demonstrates end-to-end software engineering across a React and TypeScript frontend, asynchronous Python backend, PostgreSQL database, background processing, object storage, cloud infrastructure, and automated deployment.

MRI Lab is an independent portfolio project inspired by the engineering challenges of scientific neuroimaging software. It must not copy proprietary software, branding, source code, or confidential workflows from any existing company.

## 2. Problem Statement

Computational neuroscience research often involves multiple projects, large MRI volumes, spatial metadata, computational pipelines, and collaboration between researchers and developers.

A useful neuroimaging platform needs to make it possible to:

- Organise research projects and associated MRI datasets.
- Upload NIfTI volumes and validate their structure and spatial metadata.
- Inspect brain anatomy through interactive multiplanar and 3D visualisations.
- Execute image-processing pipelines without blocking the web application.
- Track processing status, failures, and output artifacts.
- Preserve pipeline parameters, software versions, and data provenance.
- Control access to research data across projects and collaborators.
- Maintain reliable, secure, and reproducible infrastructure.

MRI Lab brings these workflows together in one coherent application.

## 3. Product Vision

Build a polished, production-style scientific SaaS platform that demonstrates how modern full-stack engineering can support computational neuroscience research.

The product should be sufficiently complete that a reviewer can create a project, upload or select an MRI volume, inspect the brain anatomy in three linked anatomical views, launch a processing pipeline, and examine its results without manually interacting with the database or backend.

The project should prioritise engineering quality, usability, security, and reproducibility over the number of features.

## 4. Target Users

### 4.1 Computational Neuroscience Learner

A technically capable learner who understands Python, is curious about neuroscience, and wants to experiment with real MRI data without maintaining a scientific computing server.

Primary needs:

- Create and manage projects.
- Upload datasets and inspect their spatial metadata.
- Explore brain anatomy in axial, coronal, and sagittal views.
- Submit and monitor processing jobs.
- Review results and their provenance.

### 4.2 Scientific Software Developer

A developer building and testing neuroimaging tools who needs to run code, inspect data, and iterate quickly.

Primary needs:

- Hosted Python environments with controlled access to project datasets.
- Programmatic job submission and monitoring via API.
- Reproducible execution environments with versioned containers.
- Export and share analysis workflows.

### 4.3 Independent Researcher

A researcher exploring hypotheses who needs to produce traceable, reproducible results.

Primary needs:

- Atlas overlays and region inspection.
- Segmentation and volume calculations.
- Image operations (thresholding, smoothing, resampling, masking).
- Experiment history with full reproducibility manifests.

### 4.4 Open-Source Contributor

A contributor who wants to share tools and workflows with the community.

Primary needs:

- Publish reusable pipeline templates with documented inputs and outputs.
- Share projects with controlled access.
- Version control for datasets and pipelines.

### 4.5 Technical Educator

An educator demonstrating neuroimaging concepts who needs interactive, guided brain exploration.

Primary needs:

- Public sample projects with guided onboarding.
- Interactive visualisations for teaching.
- Export visualisations for educational materials.

## 5. Product Goals

### Goal 1: Deliver a complete neuroimaging workflow

A user can move from project creation to dataset exploration and pipeline results within the web application.

### Goal 2: Demonstrate full-stack ownership

The implementation covers frontend development, API design, database modelling, background processing, infrastructure, testing, and deployment.

### Goal 3: Make neuroimaging data understandable

The application presents MRI volumes, spatial metadata, pipeline parameters, and results in a clear and accessible interface.

### Goal 4: Establish secure multi-project tenancy

Different users can use the application without accessing one another's projects, datasets, jobs, or results unless explicitly shared.

### Goal 5: Support reproducible computation

Each pipeline run records its algorithm version, parameters, input dataset version, container image digest, and execution status.

### Goal 6: Provide a maintainable codebase

The repository has clear architectural boundaries, automated tests, reproducible setup instructions, and documented engineering decisions.

## 6. Non-Goals

The initial release will not:

- Diagnose neurological conditions.
- Recommend medical treatment.
- Claim clinical validity or regulatory certification.
- Acquire MRI data directly from physical scanners.
- Implement real-time fMRI neurofeedback.
- Train large-scale deep learning models on neuroimaging data.
- Replace specialist neuroimaging software (FSL, AFNI, SPM, FreeSurfer, etc.).
- Support every scientific file format beyond NIfTI.
- Implement billing, subscriptions, or a commercial pricing system.
- Use microservices or Kubernetes without a demonstrated need.

These features may be considered in future iterations, but they must not compromise the initial delivery.

## 7. Scientific Data

The initial demonstration will use appropriately licensed public MRI datasets such as:

- **IXI Dataset**: https://brain-development.org/ixi-dataset/
- **OASIS Brains**: https://www.oasis-brains.org/
- **Human Connectome Project**: https://www.humanconnectome.org/

The application should preserve available provenance information, including:

- Dataset source and source URL.
- Subject identifier (anonymised).
- Image dimensions, voxel spacing, and orientation.
- Data type and affine transformation matrix.
- File checksum.
- Validation status.
- Preprocessing and analysis parameters.

The project must respect each dataset's published terms and citation requirements.

Large raw datasets must not be committed to the Git repository. Use small synthetic fixtures for automated tests and development, and download public sample data through documented instructions when needed.

Only public or synthetic data should be used in the portfolio demonstration.

## 8. Primary User Workflow

The primary workflow is:

1. A user signs in.
2. The user creates or opens a project.
3. The user uploads a NIfTI volume and supplies its metadata.
4. MRI Lab validates the file, extracts spatial metadata, and records its provenance.
5. The user opens the MRI viewer.
6. The user navigates axial, coronal, and sagittal slices with linked crosshairs.
7. The user adjusts contrast, zoom, and colour maps.
8. The user optionally loads an atlas and inspects region overlays.
9. The user launches a preprocessing pipeline (e.g., Gaussian smoothing, skull stripping).
10. MRI Lab processes the pipeline asynchronously in an isolated worker.
11. The user reviews the job status, logs, and results.
12. The user can revisit the results, inspect the recorded parameters, and download artifacts.
13. The user can share the project or export a reproducible experiment manifest.

Every stage should provide meaningful feedback, including loading states, validation errors, processing progress, and recovery instructions.

## 9. Technology Direction

The intended technology stack is:

- **Frontend:** Next.js, React, and TypeScript.
- **Scientific visualisation:** vtk.js for volumetric and 3D rendering; evaluate Cornerstone3D for relevant workflows.
- **Backend API:** Python, FastAPI, and Pydantic.
- **Database access:** PostgreSQL using asynchronous drivers and explicit SQL.
- **Background processing:** Redis-backed queue initially, or managed queue service.
- **File storage:** S3-compatible object storage for source volumes and derived artifacts.
- **Scientific runtime:** Versioned OCI containers with NiBabel, Nilearn, SimpleITK; ANTs where needed.
- **Infrastructure:** Google Cloud Platform and Terraform (or AWS equivalent).
- **CI/CD:** GitHub Actions.
- **Testing:** Frontend unit and browser tests, backend unit and integration tests, and security-focused tests.

The detailed decisions and rationale are specified in `08-tech-stack.md`.

Local commits use Husky and lint-staged to apply fast formatting and lint checks to staged backend and frontend source files. CI remains the authoritative full quality gate.

## 10. Security and Privacy Principles

Security must be implemented as part of the architecture, not added as a final polishing step.

The application must:

- Authenticate users before granting access to private resources.
- Enforce authorisation on the server.
- Validate project membership for every project-scoped operation.
- Prevent cross-project access to records and stored files.
- Use parameterised SQL.
- Keep secrets out of source control and frontend bundles.
- Limit upload sizes and validate file contents (NIfTI header parsing with bounds).
- Use private object storage and short-lived signed URLs where appropriate.
- Avoid logging credentials, access tokens, or raw voxel data unnecessarily.
- Provide automated tests for unauthorised access attempts.

MRI Lab is a portfolio demonstration and must not claim compliance with HIPAA, ISO 27001, medical-device regulations, or other certifications without independently establishing the applicable requirements and evidence.

MRI files and their metadata can contain sensitive information. Cloud storage and sharing should be designed around privacy from the start, not added when collaboration features arrive.

## 11. MVP Definition of Done

The minimum viable product is complete when:

- A developer can run the application using documented instructions.
- A user can access a workspace and create a project.
- A supported NIfTI volume can be uploaded or loaded from a documented sample.
- Dataset metadata and spatial provenance are visible.
- The MRI viewer renders axial, coronal, and sagittal views with linked crosshairs.
- A preprocessing pipeline can be submitted as a background job.
- Job status, logs, and results are available in the frontend.
- Invalid data and failed jobs produce understandable errors.
- Project and role permissions are enforced.
- Automated tests cover the core workflow and project isolation.
- CI runs the required quality checks.
- The architecture and operational limitations are documented.
- A cloud deployment can be reproduced using Terraform when cloud credentials are available.

## 12. Success Criteria

The project should demonstrate the following outcomes:

| Area                 | Success criterion                                                                 |
| -------------------- | --------------------------------------------------------------------------------- |
| User experience      | A reviewer can complete the primary workflow without developer assistance.        |
| Frontend             | Strictly typed React components with meaningful loading, error, and empty states. |
| Backend              | Documented REST endpoints with validated request and response models.             |
| Database             | Versioned migrations, parameterised SQL, and appropriate indexes.                 |
| Scientific computing | Correct image operations verified against known test data and reference outputs.  |
| Background jobs      | Durable job states, bounded retries, and idempotent processing.                   |
| Security             | Automated negative tests for cross-project access.                                |
| Testing              | Repeatable automated checks covering critical workflows.                          |
| DevOps               | Reproducible infrastructure and documented deployment procedures.                 |
| Portfolio            | A clear README, architecture diagram, demo, and documented trade-offs.            |

## 13. Guiding Principles

1. **Working software first:** deliver a complete vertical slice before expanding the scope.
2. **Scientific integrity:** preserve provenance and distinguish display transformations from analytical computations.
3. **Secure by default:** deny access unless authentication and authorisation checks succeed.
4. **Explicit contracts:** use documented API models and database migrations.
5. **Reliable asynchronous processing:** assume jobs may be delivered more than once or fail midway.
6. **Simple architecture:** prefer a modular monolith and separate worker over unnecessary distributed complexity.
7. **Reproducibility:** record the inputs, parameters, container images, and versions needed to understand an analysis.
8. **Evidence over claims:** document only features that have actually been implemented and tested.
9. **Incremental delivery:** keep every implementation milestone runnable and reviewable.
10. **No clinical claims:** present MRI Lab as a research-software demonstration, not a medical product.
