# MRI Lab Architecture

This logical architecture shows the application boundaries and runtime
dependencies. The API is a modular monolith; the Celery worker and outbox
dispatcher run as separate processes. PostgreSQL owns durable state, Redis
transports task messages, private S3-compatible object storage holds NIfTI
volumes and artifacts, and scientific computation runs inside a versioned OCI
container pinned by image digest.

```mermaid
flowchart TB
    Researcher[Researcher / viewer / owner]

    subgraph Client["Client"]
        Browser[Web browser]
        Frontend["Next.js App Router\nReact + TypeScript\nBFF route handlers"]
        Viewer["vtk.js volume viewer\naxial, coronal, sagittal\nlinked crosshairs"]
        Desktop["Optional Tauri desktop shell"]
    end

    subgraph Application["Application boundary"]
        BFF["Next.js server BFF\nsession cookie to REST"]
        API["FastAPI REST API /api/v1"]
        Auth["Authentication and\nproject authorisation"]
        Services["Application services"]
        Repositories["Explicit SQL repositories"]
        Validation["NIfTI validation\nNiBabel scientific functions"]
    end

    subgraph Background["Background processes"]
        Dispatcher["Outbox dispatcher\nstale-run recovery"]
        Worker["Celery worker"]
        Runtime["Versioned OCI container\nNiBabel, Nilearn, SimpleITK, ANTs"]
    end

    subgraph Infrastructure["State and storage"]
        Postgres[("PostgreSQL\nmetadata, project membership,\nrun state, artifacts, outbox")]
        Redis[("Redis\nCelery task broker")]
        Objects[("Private S3-compatible storage\nNIfTI source volumes\nand derived artifacts")]
    end

    Researcher --> Browser
    Browser --> Desktop
    Browser <-->|Session-scoped requests| Frontend
    Frontend <-->|Authenticated REST| BFF
    BFF <-->|Authenticated API requests| API
    Frontend --> Viewer
    Browser -->|Short-lived signed URL| Objects
    Objects -->|Volume bytes| Viewer

    API --> Auth
    Auth --> Services
    Services --> Repositories
    Repositories <-->|Parameterised, project-scoped SQL| Postgres
    Services -->|Issue signed URL\nwrite/read objects| Objects
    Services --> Validation
    Validation -->|Extracted spatial metadata| Services
    Services -->|Create run + outbox event atomically| Postgres

    Dispatcher <-->|Claim event, mark dispatched,\nrecover stale runs| Postgres
    Dispatcher -->|Publish run identifier| Redis
    Redis -->|At-least-once task message| Worker
    Worker -->|Load and claim queued run| Postgres
    Worker -->|Read source volume| Objects
    Worker --> Runtime
    Runtime -->|Read-only inputs, output files| Worker
    Worker -->|Persist artifacts, manifest,\nand terminal run state| Postgres
    Worker -->|Write artifacts| Objects

    Postgres -->|Authoritative run status and results| API
    API -->|Scoped resource response| BFF
```

## Boundary notes

- The browser can present project and resource identifiers, but the API derives
  the authenticated identity and verifies `project_members` role before
  authorising access.
- The browser talks to the Python API only through the Next.js BFF, which reads
  the HttpOnly session cookie, resolves the active project on the server, and
  forwards authenticated REST requests; it never bypasses API authorisation.
- Volume bytes move directly between the browser and private object storage
  through short-lived, single-object signed URLs. The API never streams full
  voxel arrays through its own memory as a general-purpose path.
- The dispatcher publishes only a run identifier; it never places voxel data,
  artifacts, or secrets in Redis.
- The worker reloads run, dataset-version, and pipeline-version state from
  PostgreSQL and launches the versioned container by `image_digest`. Duplicate
  messages do not make Redis the source of truth.
- Scientific computation runs only inside the versioned OCI container launched
  by the worker, never inside an API request handler.
- PostgreSQL and object storage do not share a transaction; staged writes and
  reconciliation keep metadata and stored objects consistent.
