# MRI Lab SaaS — Product Specification

Product strategy · Functional requirements · Architecture · Data model · Delivery roadmap

> This document is the product-strategy source. The normative implementation set is [`01`–`12`](#normative-documents) plus the [`api-specs/`](api-specs/), [`database/`](database/), and [`diagrams/`](diagrams/) assets. Where this document and the numbered documents disagree on implementation detail, the numbered documents govern.

## Normative documents

| #   | Document                                                 | Governs                                                |
| --- | -------------------------------------------------------- | ------------------------------------------------------ |
| 01  | [`01-overview.md`](01-overview.md)                       | Product vision and scope                               |
| 02  | [`02-requirements.md`](02-requirements.md)               | Functional/non-functional requirements (`FR-`, `NFR-`) |
| 03  | [`03-user-stories.md`](03-user-stories.md)               | User goals and acceptance scenarios                    |
| 04  | [`04-features.md`](04-features.md)                       | User-visible behaviour                                 |
| 05  | [`05-architecture.md`](05-architecture.md)               | Module boundaries, request lifecycle, tenancy          |
| 06  | [`06-data-model.md`](06-data-model.md)                   | Schema, constraints, state transitions                 |
| 07  | [`07-api-spec.md`](07-api-spec.md)                       | REST contract, status codes, error envelope            |
| 08  | [`08-tech-stack.md`](08-tech-stack.md)                   | Allowed technologies and dependency policy             |
| 09  | [`09-design.md`](09-design.md)                           | UI tokens, layout, states, accessibility               |
| 10  | [`10-testing-strategy.md`](10-testing-strategy.md)       | Test layers, fixtures, acceptance criteria             |
| 11  | [`11-implementation-plan.md`](11-implementation-plan.md) | Phased delivery plan                                   |
| 12  | [`12-deployment.md`](12-deployment.md)                   | Operations, CI, and Docker Compose deployment          |

### Supporting assets

| Path                              | Purpose                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| [`api-specs/`](api-specs/)        | OpenAPI 3.1 contract (`api-spec.yaml`, `api-spec.json`)                     |
| [`database/`](database/)          | DBML schema (`mri-lab.dbml`) and layout                                     |
| [`diagrams/`](diagrams/)          | Mermaid diagrams (architecture, data flow, upload, experiment, end-to-end, CI/CD) |
| [`design/`](design/)              | HTML design prototype (`html/`) and captured screenshots (`images/`)        |

---

## 1. Product vision

MRI Lab is a cloud-based computational neuroimaging workbench for developers and computational neuroscience enthusiasts.

It enables users to import MRI datasets, explore brain anatomy, run scientific image-processing pipelines, write code against real neuroimaging data, and publish reproducible experiments — without having to build their own infrastructure.

The product should combine three experiences:

- A brain imaging workspace: visualise, navigate, annotate, and compare MRI volumes.
- A computational laboratory: execute pipelines and Python analysis in managed cloud environments.
- A reproducible research platform: version datasets, track parameters, save outputs, and share experiments.

The goal is not to replace every specialist neuroimaging tool. It is to make the journey from “I found an MRI dataset” to “I ran an analysis and can share the results” dramatically easier.

## Product principles

Code-friendly, not code-required

Every major workflow should have a visual interface, with an API or Python interface where appropriate.

Reproducibility by default

Track inputs, parameters, software versions, execution logs, and output artifacts.

Cloud-first, resource-aware

Provide managed storage and computation, with transparent resource limits and costs.

Open science, user-controlled sharing

Public sample projects and reusable workflows, with private-by-default user uploads.

## 2. Target users

| Persona                            | Main need                 | Success looks like                                                  |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| Computational neuroscience learner | Learn with real data      | Complete an analysis without spending days configuring dependencies |
| Scientific software developer      | Build and test tools      | Run code, inspect data, and iterate quickly                         |
| Independent researcher             | Explore hypotheses        | Produce traceable, reproducible results                             |
| Open-source contributor            | Share tools and workflows | Publish a reusable pipeline with documented inputs and outputs      |
| Technical educator                 | Demonstrate neuroimaging  | Share an interactive, guided brain exploration                      |

Primary persona: a technically capable learner or developer who understands Python, is curious about neuroscience, and wants to experiment with real MRI data without maintaining a scientific computing server.

## 3. Scope and prioritisation

Use four priority levels throughout development:

- P0 — Core platform: required for a usable first release.
- P1 — Essential expansion: needed to deliver a compelling computational lab.
- P2 — Advanced capability: differentiates the platform after the core workflows work.
- P3 — Later exploration: expensive, specialised, or dependent on demonstrated demand.

## 4. Functional requirements

### 4.1 P0 — Core platform

| ID     | Feature            | Acceptance criteria                                                                            |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| FR-001 | Authentication     | Users can sign up, sign in, sign out, and recover access                                       |
| FR-002 | Projects           | Users can create, rename, archive, and delete projects                                         |
| FR-003 | Dataset upload     | Upload `.nii` and `.nii.gz` through a resumable cloud upload flow                              |
| FR-004 | Dataset validation | Detect invalid files, read headers, and report dimensions, spacing, orientation, and data type |
| FR-005 | MRI viewer         | Navigate axial, coronal, and sagittal slices with linked crosshairs                            |
| FR-006 | Display controls   | Zoom, pan, adjust contrast, and select colour maps                                             |
| FR-007 | Cloud processing   | Submit a predefined operation and see queued, running, succeeded, or failed status             |
| FR-008 | Artifacts          | Save generated outputs and download them                                                       |
| FR-009 | Experiment history | Record input versions, parameters, tool versions, logs, and output references                  |
| FR-010 | Resource controls  | Enforce file-size, runtime, storage, and compute quotas                                        |
| FR-011 | Security           | Enforce ownership and access permissions for every protected resource                          |
| FR-012 | Sample project     | Explore a bundled public or appropriately licensed sample without uploading data               |

### 4.2 P1 — The computational laboratory

| ID     | Feature            | Acceptance criteria                                              |
| ------ | ------------------ | ---------------------------------------------------------------- |
| FR-013 | Atlas overlays     | Load a compatible atlas and toggle region overlays               |
| FR-014 | Region inspection  | Show voxel coordinates, world coordinates, and region labels     |
| FR-015 | Segmentation       | Generate and inspect a mask; calculate region volumes            |
| FR-016 | Image operations   | Run thresholding, smoothing, resampling, and masking             |
| FR-017 | Dataset import     | Import a dataset from an explicitly supported public source      |
| FR-018 | BIDS support       | Validate a dataset against a selected BIDS specification version |
| FR-019 | Pipeline templates | Run versioned, parameterised processing templates                |
| FR-020 | Reproducibility    | Rerun an experiment from its recorded configuration              |
| FR-021 | Comparisons        | Compare input and derived volumes side by side                   |
| FR-022 | Export and sharing | Export visualisations and selectively share a project            |

NIfTI should be the initial imaging format because it provides standardised image data and spatial-coordinate metadata.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://nifti.nimh.nih.gov&sz=32)

Neuroimaging Informatics Technology Initiative

&#x20;BIDS should be introduced as a dataset organisation and validation layer rather than treated as another image format.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://bids.neuroimaging.io&sz=32)

The Brain Imaging Data Structure

+1

### 4.3 P2 — Advanced platform

- Hosted Python notebooks with controlled access to project datasets.
- Visual pipeline editor with parameter forms and intermediate outputs.
- fMRI time-series exploration and basic GLM workflows.
- Cortical surface rendering and diffusion MRI exploration.
- Dataset provenance, version history, and immutable experiment records.
- API keys, Python SDK, and programmatic job submission.
- Collaborative workspaces with project-level roles.
- Reusable pipeline packages and community publishing.

### 4.4 P3 — Ecosystem

- Plugin SDK for custom analysis tools.
- Public experiment gallery and interactive educational content.
- GPU-enabled processing where algorithms benefit from it.
- Scheduled or batch experiments.
- Integration with selected external repositories and research infrastructures.
- Team billing, institutional workspaces, and advanced governance.

Scope rule: the full platform is the long-term product scope, not a requirement to build every advanced feature before launching. Deliver P0 as a complete product, then expand through working end-to-end workflows.

## 5. User journeys

### Journey A — Explore a brain scan

Goal: get value in the first few minutes.

1. Open the public sample project from the landing page.
2. Inspect the scan in three linked anatomical views.
3. Adjust contrast and navigate to a voxel.
4. Load an atlas and inspect the region at that location.
5. Sign in to save the view and create annotations.

Success metric: percentage of new users who inspect a scan and save or share a result.

### Journey B — Run an analysis

Goal: produce a scientific artifact without manually configuring a server.

1. Create a project and upload a NIfTI volume.
2. Review file validation and spatial metadata.
3. Select a preprocessing template and configure parameters.
4. Submit a cloud job and monitor progress and logs.
5. Inspect the output alongside the input.
6. Download the result and a machine-readable experiment manifest.

Success metric: successful first analysis, time to completion, and repeat analysis rate.

### Journey C — Develop a tool

Goal: iterate on neuroimaging code.

1. Create a Python environment from an approved template.
2. Attach a project dataset through a controlled mount or access mechanism.
3. Run code and inspect console output, plots, and generated files.
4. Save the environment specification and code revision.
5. Turn a successful script into a reusable pipeline template.

Success metric: notebook sessions that produce saved artifacts and reproducible runs.

### Journey D — Publish an experiment

Goal: let another person inspect and reproduce the work.

1. Choose a completed experiment.
2. Review its inputs, code, parameters, and outputs.
3. Remove or exclude sensitive source data as needed.
4. Publish a read-only page with an explicit sharing scope.
5. Let another user inspect the visualisation and reproduce the run if authorised.

Success metric: shared projects viewed, cloned, or successfully reproduced.

## 6. Information architecture

Suggested primary navigation:

Home

Recent projects, usage and activity

Projects

Datasets, experiments, notebooks and artifacts

Datasets

Upload, validate, browse and manage data

Viewer

Multiplanar MRI viewing and overlays

Pipelines

Templates, builder, runs and logs

Notebooks

Hosted Python analysis environments

Explore

Public datasets, templates and community projects

Settings

Account, security, storage, usage and billing

The viewer, notebook, and pipeline runner should all operate on the same project and artifact system. Avoid creating isolated mini-applications with separate file management and inconsistent experiment history.

## 7. Technical architecture

### 7.1 Recommended system design

\#chatgpt-mermaid-\_r_h1\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_h1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_h1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_h1\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_h1\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_h1\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_h1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_h1\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_h1\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_h1\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_h1\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_h1\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_h1\_ p{margin:0;}#chatgpt-mermaid-\_r_h1\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_h1\_ .label text,#chatgpt-mermaid-\_r_h1\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .node rect,#chatgpt-mermaid-\_r_h1\_ .node circle,#chatgpt-mermaid-\_r_h1\_ .node ellipse,#chatgpt-mermaid-\_r_h1\_ .node polygon,#chatgpt-mermaid-\_r_h1\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .rough-node .label text,#chatgpt-mermaid-\_r_h1\_ .node .label text,#chatgpt-mermaid-\_r_h1\_ .image-shape .label,#chatgpt-mermaid-\_r_h1\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_h1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .rough-node .label,#chatgpt-mermaid-\_r_h1\_ .node .label,#chatgpt-mermaid-\_r_h1\_ .image-shape .label,#chatgpt-mermaid-\_r_h1\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_h1\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_h1\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_h1\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_h1\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_h1\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_h1\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_h1\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_h1\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_h1\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_h1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_h1\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_h1\_ .icon-shape,#chatgpt-mermaid-\_r_h1\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_h1\_ .icon-shape p,#chatgpt-mermaid-\_r_h1\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_h1\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_h1\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_h1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_h1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_h1\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_h1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_h1\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_h1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_h1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_h1\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_h1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_h1\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_h1\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_h1\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_h1\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_h1\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .node rect,#chatgpt-mermaid-\_r_h1\_ .node circle,#chatgpt-mermaid-\_r_h1\_ .node ellipse,#chatgpt-mermaid-\_r_h1\_ .node polygon,#chatgpt-mermaid-\_r_h1\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_h1\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_h1\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2px,2px;}#chatgpt-mermaid-\_r_h1\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_h1\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_h1\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}Browser: Next.js +TypeScriptApplication APIPostgreSQLObject StorageJob QueueIsolated Processing WorkersIsolated Notebook RuntimePipeline and Dataset Registry

The main architectural rule is to separate interactive web requests from scientific computation. MRI processing must not run inside ordinary web request handlers.

### 7.2 Technology choices

| Component          | Recommended starting point                                                            | Reason                                              |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Web application    | Next.js, React, TypeScript                                                            | Product UI and server-rendered pages                |
| Imaging viewer     | vtk.js for volumetric and 3D rendering; evaluate Cornerstone3D for relevant workflows | Browser-based scientific visualisation              |
| API                | Python FastAPI                                                                        | Natural integration with scientific Python          |
| Database           | PostgreSQL                                                                            | Relational metadata and access control              |
| File storage       | S3-compatible object storage                                                          | Large source volumes and derived artifacts          |
| Background jobs    | Redis-backed queue initially, or managed queue service                                | Asynchronous processing and retries                 |
| Scientific runtime | Versioned OCI containers                                                              | Repeatable software environments                    |
| Imaging libraries  | NiBabel, Nilearn, SimpleITK; ANTs where needed                                        | File I/O and specialised analysis                   |
| Authentication     | Managed OIDC-compatible identity provider                                             | Avoid building identity infrastructure from scratch |
| Observability      | Structured logs, job metrics, error tracking                                          | Debug failures and monitor cost                     |

A key implementation choice is to run approved container images with explicit resource limits. Containerisation is also an established approach in reproducible neuroimaging workflows, including BIDS Apps.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://pmc.ncbi.nlm.nih.gov&sz=32)

PMC

+1

### 7.3 Deployment evolution

Initial production architecture: a modular monolith for the application API, PostgreSQL, object storage, and a separate worker service.

Later: split out notebook orchestration, pipeline registry, public dataset ingestion, and collaboration only when their scaling or security requirements justify it.

Do not start with Kubernetes, a large microservice fleet, or a general-purpose cloud IDE. Those add operational complexity before product demand is established.

## 8. Data model

Use PostgreSQL for application metadata and object storage for large files. Do not store MRI voxel arrays directly in relational database rows.

### 8.1 Core entities

\#chatgpt-mermaid-\_r_hi\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_hi\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_hi\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_hi\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_hi\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_hi\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_hi\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_hi\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_hi\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_hi\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_hi\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_hi\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_hi\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_hi\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_hi\_ p{margin:0;}#chatgpt-mermaid-\_r_hi\_ .entityBox{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_hi\_ .relationshipLabelBox{fill:rgb(48, 48, 48);opacity:0.7;background-color:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_hi\_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-\_r_hi\_ .labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-\_r_hi\_ .edgeLabel{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_hi\_ .edgeLabel .label rect{fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_hi\_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_hi\_ .edgeLabel .label{fill:rgb(31, 78, 148);font-size:14px;}#chatgpt-mermaid-\_r_hi\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_hi\_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-\_r_hi\_ .node rect,#chatgpt-mermaid-\_r_hi\_ .node circle,#chatgpt-mermaid-\_r_hi\_ .node ellipse,#chatgpt-mermaid-\_r_hi\_ .node polygon{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_hi\_ .relationshipLine{stroke:rgb(175, 175, 175);stroke-width:1px;fill:none;}#chatgpt-mermaid-\_r_hi\_ .marker{fill:none!important;stroke:rgb(175, 175, 175)!important;stroke-width:1;}#chatgpt-mermaid-\_r_hi\_ [data-look=neo].labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-\_r_hi\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_hi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_hi\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_hi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_hi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_hi\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_hi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_hi\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}USERPROJECTPROJECT_MEMBERDATASETDATASET_VERSIONFILE_ASSETPIPELINEPIPELINE_VERSIONEXPERIMENT_RUNARTIFACTANNOTATIONownsincludesparticipatescontainsversionscontainsdefinesversionsexecutesproducesinputcontains

### 8.2 Entity definitions

| Entity              | Important fields                                                                                       | Purpose                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `users`             | `id`, `email`, `display_name`, `created_at`                                                            | User identity                           |
| `projects`          | `id`, `owner_id`, `name`, `description`, `visibility`                                                  | Top-level workspace                     |
| `project_members`   | `project_id`, `user_id`, `role`                                                                        | Project-level access                    |
| `datasets`          | `id`, `project_id`, `name`, `source_type`                                                              | Logical dataset                         |
| `dataset_versions`  | `id`, `dataset_id`, `version`, `manifest`, `created_at`                                                | Immutable dataset snapshots             |
| `file_assets`       | `id`, `dataset_version_id`, `object_key`, `checksum`, `size_bytes`, `media_type`                       | Individual uploaded files               |
| `pipelines`         | `id`, `project_id`, `name`                                                                             | Logical analysis workflow               |
| `pipeline_versions` | `id`, `pipeline_id`, `definition`, `image_digest`                                                      | Versioned workflow and runtime          |
| `experiment_runs`   | `id`, `pipeline_version_id`, `dataset_version_id`, `status`, `parameters`, `started_at`, `finished_at` | Execution history                       |
| `artifacts`         | `id`, `run_id`, `object_key`, `checksum`, `media_type`, `metadata`                                     | Output files and reports                |
| `annotations`       | `id`, `project_id`, `dataset_version_id`, `coordinate_space`, `coordinates`, `body`                    | Spatial notes and markers               |
| `usage_records`     | `id`, `user_id`, `run_id`, `resource_type`, `quantity`                                                 | Billing and quota accounting            |
| `audit_events`      | `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `created_at`                               | Security and administrative audit trail |

These are logical entities, not a final migration. Refine them during implementation, particularly around multi-file BIDS datasets, file lifecycle, collaboration, and billing.

### 8.3 Important modelling rules

1. Use UUIDs or equivalent non-guessable identifiers for externally exposed resources.
2. Separate a dataset's logical identity from immutable dataset versions.
3. Record SHA-256 checksums for uploaded and derived artifacts.
4. Keep pipeline definitions and experiment configurations versioned.
5. Store spatial annotations with explicit coordinate-system metadata, not just three unlabelled numbers.
6. Use database transactions for state changes and idempotency keys for job submissions.
7. Enforce project access in the API and database layer; possession of an object-storage key must not be treated as authorisation.

### 8.4 Example experiment manifest

Every successful run should produce a machine-readable manifest alongside its artifacts.

```
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

The values above illustrate the schema; they are not a promise of a specific runtime version. A real manifest should record the actual environment and software versions. Also record the coordinate conventions, relevant random seeds, and execution details where they affect reproducibility.

## 9. API specification

Start with a versioned REST API. Add WebSocket or server-sent events for job progress only where polling becomes inadequate.

| Method | Endpoint                          | Purpose                           |
| ------ | --------------------------------- | --------------------------------- |
| `POST` | `/api/v1/projects`                | Create a project                  |
| `GET`  | `/api/v1/projects`                | List accessible projects          |
| `GET`  | `/api/v1/projects/{id}`           | Retrieve project details          |
| `POST` | `/api/v1/projects/{id}/datasets`  | Create an upload session          |
| `POST` | `/api/v1/datasets/{id}/complete`  | Finalise and validate upload      |
| `GET`  | `/api/v1/datasets/{id}`           | Retrieve dataset metadata         |
| `GET`  | `/api/v1/datasets/{id}/versions`  | List versions                     |
| `POST` | `/api/v1/pipelines`               | Create a pipeline                 |
| `POST` | `/api/v1/pipelines/{id}/versions` | Create a pipeline version         |
| `POST` | `/api/v1/runs`                    | Submit an experiment run          |
| `GET`  | `/api/v1/runs/{id}`               | Get status and execution metadata |
| `GET`  | `/api/v1/runs/{id}/logs`          | Retrieve authorised logs          |
| `GET`  | `/api/v1/runs/{id}/artifacts`     | List output artifacts             |
| `POST` | `/api/v1/projects/{id}/shares`    | Create a scoped sharing link      |

For large uploads, issue short-lived, scoped upload URLs and have the server validate the completed object before accepting it as a dataset asset.

For experiment execution, the API should return a run identifier promptly. The worker handles the actual computation asynchronously.

## 10. Cloud execution and security

A cloud-first neuroimaging platform needs to treat uploaded scientific data and arbitrary user code as separate threat models.

### Processing lifecycle

\#chatgpt-mermaid-\_r_i2\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_i2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_i2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_i2\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_i2\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_i2\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_i2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_i2\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_i2\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_i2\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_i2\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_i2\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_i2\_ p{margin:0;}#chatgpt-mermaid-\_r_i2\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_i2\_ .label text,#chatgpt-mermaid-\_r_i2\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .node rect,#chatgpt-mermaid-\_r_i2\_ .node circle,#chatgpt-mermaid-\_r_i2\_ .node ellipse,#chatgpt-mermaid-\_r_i2\_ .node polygon,#chatgpt-mermaid-\_r_i2\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .rough-node .label text,#chatgpt-mermaid-\_r_i2\_ .node .label text,#chatgpt-mermaid-\_r_i2\_ .image-shape .label,#chatgpt-mermaid-\_r_i2\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_i2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .rough-node .label,#chatgpt-mermaid-\_r_i2\_ .node .label,#chatgpt-mermaid-\_r_i2\_ .image-shape .label,#chatgpt-mermaid-\_r_i2\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_i2\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_i2\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_i2\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_i2\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_i2\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_i2\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_i2\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_i2\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_i2\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_i2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_i2\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_i2\_ .icon-shape,#chatgpt-mermaid-\_r_i2\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_i2\_ .icon-shape p,#chatgpt-mermaid-\_r_i2\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_i2\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_i2\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_i2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_i2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_i2\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_i2\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_i2\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_i2\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_i2\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_i2\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_i2\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_i2\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_i2\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_i2\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_i2\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_i2\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .node rect,#chatgpt-mermaid-\_r_i2\_ .node circle,#chatgpt-mermaid-\_r_i2\_ .node ellipse,#chatgpt-mermaid-\_r_i2\_ .node polygon,#chatgpt-mermaid-\_r_i2\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_i2\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_i2\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2px,2px;}#chatgpt-mermaid-\_r_i2\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_i2\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_i2\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}Upload or select datasetValidate file and metadataValid and authorised?Report validation errorCreate immutable inputreferenceQueue experimentStart isolated workerRun with quotas and timeoutExecution succeeded?Record failure and logsValidate output artifactsStore checksums andmanifestMark run completeNoYesNoYes

### Security requirements

- Private by default: user datasets and experiment outputs are not public unless explicitly shared.
- Tenant isolation: every read, write, download, and job submission checks the caller's permissions.
- Untrusted files: validate uploads, limit decompression, protect against malformed headers and resource-exhaustion attacks.
- Untrusted code: execute notebooks and custom scripts in isolated runtimes with no default access to application secrets or other users' files.
- Network controls: restrict worker egress and prevent access to cloud metadata endpoints and internal services.
- Least privilege: use short-lived credentials and narrowly scoped object-storage permissions.
- Resource limits: enforce CPU, memory, disk, runtime, concurrency, and cost quotas.
- Deletion: provide clear deletion semantics for source data, derived files, cached copies, and backups.
- Privacy: warn users against uploading identifiable clinical data; establish appropriate retention, data-processing, and privacy policies before accepting such data.

MRI files and their metadata can contain sensitive information. Cloud storage and sharing should be designed around privacy from the start, not added when the collaboration features arrive.

### Non-functional requirements

These are initial engineering targets to validate in load testing, not measured performance claims.

| Area               | Proposed target                                                     |
| ------------------ | ------------------------------------------------------------------- |
| Availability       | 99.5% monthly for the initial production service                    |
| Interactive UI     | Common viewer interactions target under 100 ms after data is loaded |
| API latency        | p95 under 300 ms for ordinary metadata reads under target load      |
| Job submission     | Return a run ID within 2 seconds under normal load                  |
| Upload reliability | Resumable uploads and safe retries                                  |
| Reproducibility    | Every completed run has a manifest and traceable input references   |
| Isolation          | No cross-project access through API, storage, or worker mounts      |
| Observability      | Centralised job status, logs, resource usage, and failure reasons   |
| Recovery           | Documented backup, restore, and disaster-recovery procedures        |

Cloud processing times will depend on dataset size, queue load, algorithm, and compute allocation. Do not promise fixed processing durations before benchmarking representative workloads.

## 11. MVP and delivery milestones

For a full-platform vision, I would plan a sequence of independently useful releases. A small team could aim for a first usable beta in roughly 8–12 weeks, assuming one experienced full-stack developer, limited infrastructure scope, and reuse of existing imaging libraries. This is a planning estimate, not a guaranteed delivery schedule.

### Milestone 0 — Technical proof

P0

Week 1

- Load a representative NIfTI volume.
- Render axial, coronal, and sagittal views.
- Upload a file to object storage.
- Run one scientific operation in a worker.
- Verify that outputs preserve correct spatial metadata.

  Exit criterion: a complete technical path from upload to visualised output.

### Milestone 1 — Platform foundation

P0

Weeks 2–3

- Authentication and project management.
- Database schema and object storage.
- Upload sessions, validation, checksums, and metadata extraction.
- Initial access controls and quotas.

  Exit criterion: users can safely create projects and upload private datasets.

### Milestone 2 — MRI workspace

P0

Weeks 4–5

- Three-plane viewer with linked crosshairs.
- Zoom, pan, contrast, and voxel inspection.
- Project file browser and viewer-state persistence.
- Atlas overlay prototype.

  Exit criterion: a user can explore a scan and save a meaningful view.

### Milestone 3 — Cloud experiments

P0

Weeks 6–8

- Background job queue and isolated worker.
- Two or three useful image operations.
- Run history, logs, cancellation, and error handling.
- Artifact storage and experiment manifests.

  Exit criterion: a user can run an analysis, inspect the result, and reproduce its configuration.

### Milestone 4 — Private beta

P1

Weeks 9–12

- End-to-end security and resource-limit testing.
- Public sample projects and guided onboarding.
- Export, sharing, and deletion workflows.
- Usage tracking, cost dashboards, and basic operational alerts.
- Feedback from a small group of computational neuroscience users.

  Exit criterion: external users can complete the core workflow without developer intervention.

### After the beta

| Release | Focus                  | Main deliverable                                             |
| ------- | ---------------------- | ------------------------------------------------------------ |
| V1      | Analysis toolkit       | Atlas workflows, segmentation, image operations, comparisons |
| V1.5    | Reproducible pipelines | Pipeline templates, versions, parameterised reruns           |
| V2      | Developer environment  | Hosted notebooks, Python SDK, controlled execution           |
| V3      | Research platform      | BIDS workflows, advanced fMRI analysis, collaboration        |
| V4      | Ecosystem              | Public workflow gallery, plugins, community contributions    |

Do not wait until V3 to build the data model for provenance and versioning. Build the foundation early, even if the initial user interface only exposes a small subset of it.

## 12. Testing strategy

| Test category          | What to verify                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                   | Coordinate transforms, metadata parsing, permissions, parameter validation                                                                        |
| Scientific correctness | Output dimensions, voxel spacing, affine transforms, numerical results                                                                            |
| Integration            | Upload, object storage, database, queue, worker, artifact retrieval                                                                               |
| Security               | Cross-user access attempts, malicious uploads, worker isolation, expired links                                                                    |
| End-to-end             | Upload → view → run → inspect → export                                                                                                            |
| Reproducibility        | Identical configuration resolves to the same inputs and environment; numerical equivalence is checked where exact bitwise identity is unrealistic |
| Load                   | Concurrent uploads, queued jobs, large volumes, abandoned jobs                                                                                    |
| Recovery               | Worker crash, retry, duplicate submission, storage interruption                                                                                   |

Create a small, version-controlled collection of synthetic and appropriately licensed test volumes. Include known coordinate landmarks and expected outputs so that regressions in spatial orientation or image processing are detected automatically.

## 13. Product metrics and validation

Measure whether MRI Lab helps people accomplish real scientific tasks, rather than merely whether they open the viewer.

### North-star metric

Weekly users completing a reproducible experiment

A user qualifies when they successfully complete an analysis with recorded inputs, parameters, software environment, and outputs.

### Supporting metrics

# Activation

New users who open a scan and complete a first meaningful action.

# Reliability

Successful experiment runs and upload completion rates.

# Retention

Users who return to explore or run another experiment.

# Efficiency

Time to first successful analysis and cost per completed run.

During the beta, interview users who successfully complete an analysis and those who abandon one. The latter group will often reveal whether the product is too complex, too slow, or missing a crucial workflow.

## 14. Key risks and mitigations

| Risk                                      | Mitigation                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Scope becomes too large                   | Ship one complete MRI workflow before supporting every modality                              |
| Cloud compute becomes expensive           | Quotas, timeouts, per-job accounting, concurrency limits, and user-visible estimates         |
| Scientific outputs are incorrect          | Reference datasets, numerical tests, spatial metadata checks, and explicit software versions |
| Arbitrary code compromises infrastructure | Isolated workers, restricted networking, least privilege, and no shared secrets              |
| Uploads are slow or unreliable            | Resumable uploads, direct-to-object-storage transfer, and integrity checks                   |
| Users do not understand neuroimaging      | Guided examples, explanations of coordinates and metadata, and visual feedback               |
| Users will not pay                        | Validate willingness to pay before building expensive hosted notebooks and advanced compute  |
| Data sharing creates privacy risks        | Private defaults, explicit permissions, controlled downloads, and clear deletion policies    |

## 15. Final recommendation

I'd position MRI Lab around this initial promise:

> Explore real brain MRI data, run computational neuroscience experiments, and share reproducible results — all in the cloud.

The differentiator should not be the number of imaging tools. It should be the integration of a good viewer, approachable scientific computation, and reproducibility.

Build the platform in this order:

1. Reliable NIfTI ingestion and a high-quality MRI viewer.
2. A secure cloud job system with a few scientifically useful operations.
3. Experiment manifests, artifacts, and reproducible reruns.
4. Atlas exploration and public sample workflows.
5. Hosted Python notebooks and a developer API.
6. BIDS, advanced modality-specific tools, and community extensions.

For standards and implementation references, start with the official [NIfTI specification](https://nifti.nimh.nih.gov/nifti-1/), [BIDS website](https://bids.neuroimaging.io/), and [BIDS Apps execution documentation](https://bids-standard.github.io/execution-spec/index.html).&#x20;

[image](https://www.google.com/s2/favicons?domain=https://nifti.nimh.nih.gov&sz=32)

Neuroimaging Informatics Technology Initiative

+2

These provide a strong foundation for building interoperable datasets and reproducible analysis workflows without reinventing established scientific conventions.
