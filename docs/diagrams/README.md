# MRI Lab Architecture and Data Flow Diagrams

These diagrams describe the implemented application architecture and data
flows. They complement the architecture notes in
[`../05-architecture.md`](../05-architecture.md) and the data model in
[`../06-data-model.md`](../06-data-model.md).

| Diagram                                                     | Scope                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Architecture](architecture.md)                             | Logical application components, runtime processes, boundaries, and stores            |
| [Comprehensive architecture](architecture-comprehensive.md) | System, request lifecycle, isolation, outbox, run state machine, data model, deploy  |
| [System data flow](system-data-flow.md)                     | User, frontend, API, persistence, storage, and worker boundaries                     |
| [Dataset upload and validation](dataset-upload.md)          | Resumable upload session, finalisation, checksum verification, and dataset state     |
| [Experiment pipeline](experiment-pipeline.md)               | Idempotent submission, transactional outbox, worker execution, container, artifacts  |
| [End-to-end sequence](end-to-end-sequence.md)               | Upload, validate, view, run, inspect, and export across the whole workflow           |
| [CI/CD pipeline](cicd-pipeline.md)                          | GitHub Actions validation, container builds, security scan, optional Tauri release   |

Update these diagrams when the corresponding implementation or data contract
changes. The upload diagram describes the direct-to-object-storage, resumable
upload with a signed URL; finalisation and validation remain server-side. The
experiment pipeline diagram replaces the EEG Lab analysis-pipeline diagram and
adds the versioned OCI container runtime used for reproducible computation.
