# Comprehensive Architecture and Data-Flow Diagrams

This document collects the Mermaid diagrams that describe MRI Lab's
architecture end to end. Render them with any Markdown viewer that supports
Mermaid (GitHub, GitLab, VS Code with an extension, and similar).

The canonical rule throughout is that interactive web requests are separated
from scientific computation: MRI processing never runs inside a request handler.

## 1. High-level system architecture

```mermaid
flowchart TB
    subgraph Client["Client layer"]
        Browser["Browser\nNext.js + React + TypeScript"]
        Viewer["vtk.js volume viewer"]
        Desktop["Optional Tauri desktop shell"]
    end

    subgraph Frontend["Frontend server layer"]
        BFF["Next.js BFF\nsession cookie to REST"]
    end

    subgraph ApiLayer["API layer"]
        API["FastAPI REST API\n/api/v1"]
        Health["Health endpoints\n/live, /ready"]
        Auth["Authentication\nOIDC or managed sessions"]
    end

    subgraph Data["Data layer"]
        PG[("PostgreSQL\nprimary metadata")]
        Redis[("Redis\nCelery broker")]
    end

    subgraph Storage["Storage layer"]
        MinIO[("MinIO S3-compatible\nlocal object storage")]
        S3[("S3-compatible\nproduction object storage")]
    end

    subgraph Workers["Background processing"]
        Worker["Celery worker\nrun execution"]
        Dispatcher["Outbox dispatcher\nFOR UPDATE SKIP LOCKED"]
        Cleanup["Cleanup and reconciliation\nabandoned uploads, stale runs"]
        OCI["Versioned OCI container\nimage digest pinned"]
    end

    Browser -->|HTTP| BFF
    Browser --> Viewer
    BFF -->|Authenticated REST| API
    API -->|Parameterised SQL| PG
    API -->|Issue signed URLs| MinIO
    API -->|Issue signed URLs| S3
    Browser -->|Short-lived signed URL| MinIO
    Browser -->|Short-lived signed URL| S3
    API -->|Create run and outbox event| PG
    Dispatcher -->|Claim pending events| Redis
    Dispatcher -->|Mark dispatched| PG
    Redis -->|Task with run ID| Worker
    Worker -->|Read and write runs, artifacts| PG
    Worker -->|Read volumes, write artifacts| MinIO
    Worker -->|Read volumes, write artifacts| S3
    Worker --> OCI
    Cleanup -->|Expire sessions, reconcile objects| PG
    Cleanup -->|Delete unreferenced objects| MinIO

    classDef client fill:#e3f2fd,stroke:#1976d2
    classDef frontend fill:#e1f5fe,stroke:#0277bd
    classDef api fill:#f3e5f5,stroke:#7b1fa2
    classDef data fill:#e8f5e9,stroke:#388e3c
    classDef storage fill:#fff3e0,stroke:#f57c00
    classDef worker fill:#fce4ec,stroke:#c2185b

    class Browser,Viewer,Desktop client
    class BFF frontend
    class API,Health,Auth api
    class PG,Redis data
    class MinIO,S3 storage
    class Worker,Dispatcher,Cleanup,OCI worker
```

## 2. Request lifecycle (experiment run submission)

The browser never calls FastAPI directly: it calls the Next.js BFF route
handlers, which forward authenticated REST requests. The API creates a durable
run and its outbox event in one transaction, then returns promptly.

```mermaid
sequenceDiagram
    participant User as Researcher
    participant Browser as Browser (React)
    participant BFF as Next.js BFF
    participant API as FastAPI
    participant PG as PostgreSQL
    participant Redis as Redis
    participant Worker as Celery worker
    participant Runtime as OCI container
    participant Storage as Object storage

    User->>Browser: Submit experiment run
    Browser->>BFF: POST run request with Idempotency-Key
    BFF->>API: POST /api/v1/runs\nIdempotency-Key: abc123
    API->>PG: BEGIN TRANSACTION
    API->>PG: Verify project membership and dataset version ready
    API->>PG: INSERT idempotency_keys ON CONFLICT DO NOTHING
    API->>PG: INSERT experiment_runs (queued)
    API->>PG: INSERT outbox_events (run.requested)
    API->>PG: INSERT audit_events (run.submitted)
    API->>PG: COMMIT
    API-->>BFF: 202 Accepted {run_id, status: "queued"}
    BFF-->>Browser: {run_id, status: "queued"}
    Browser-->>User: Show "Run queued"

    par Dispatcher loop
        Dispatcher->>PG: SELECT ... FOR UPDATE SKIP LOCKED WHERE status=pending
        Dispatcher->>Redis: Publish task with run_id
        Dispatcher->>PG: UPDATE outbox_events SET status=dispatched
    end

    Worker->>Redis: Reserve task
    Worker->>PG: Claim run (status=running, conditional update)
    Worker->>Storage: Read authorised input volumes
    Worker->>Runtime: Launch image by image_digest with parameters
    Runtime->>Runtime: Read-only inputs, compute, write outputs
    Runtime-->>Worker: Output artifacts and manifest
    Worker->>Storage: Write artifacts to controlled location
    Worker->>PG: BEGIN TRANSACTION
    Worker->>PG: INSERT artifacts (object_key, checksum, media_type)
    Worker->>PG: UPDATE experiment_runs SET status=succeeded, finished_at
    Worker->>PG: INSERT audit_events (run.succeeded)
    Worker->>PG: COMMIT
    Worker-->>Redis: Task complete

    User->>Browser: Poll run status
    Browser->>BFF: GET run and artifacts
    BFF->>API: GET /api/v1/runs/{id} and /artifacts
    API->>PG: SELECT experiment_runs / artifacts
    API-->>BFF: {status, artifacts, manifest}
    BFF-->>Browser: Render status and outputs
    Browser-->>User: Inspect and download artifacts
```

## 3. Project isolation model

Project isolation is a security boundary enforced in the API, in project-scoped
SQL, and through composite foreign keys. Object-key possession is never
authorisation.

```mermaid
flowchart TD
    subgraph ProjectA["Project A: Brain Atlas Study"]
        UserA1["User: alice\nRole: owner"]
        UserA2["User: bob\nRole: editor"]
        DatasetA["Dataset: T1w volume\ndataset_version ready"]
        PipelineA["Pipeline: basic-preprocessing"]
        RunA["Experiment run\nstatus: succeeded"]
        ArtifactA["Artifacts + manifest\nchecksums recorded"]
    end

    subgraph ProjectB["Project B: Diffusion Study"]
        UserB1["User: charlie\nRole: viewer"]
        DatasetB["Dataset: DWI volume"]
    end

    UserA1 -->|owns| ProjectA
    UserA2 -->|member| ProjectA
    ProjectA -->|contains| DatasetA
    ProjectA -->|contains| PipelineA
    DatasetA -->|input to| RunA
    PipelineA -->|executes| RunA
    RunA -->|produces| ArtifactA

    UserB1 -->|member| ProjectB
    ProjectB -->|contains| DatasetB

    classDef projA fill:#e3f2fd,stroke:#1976d2
    classDef projB fill:#fff3e0,stroke:#f57c00
    classDef cross fill:#ffebee,stroke:#c62828,stroke-dasharray: 5 5

    class UserA1,UserA2,DatasetA,PipelineA,RunA,ArtifactA projA
    class UserB1,DatasetB projB

    NoteA["All queries filtered by project_id\nfrom verified membership"]:::cross
    NoteB["Cross-project access denied\n(404 not 403)"]:::cross
```

## 4. Transactional outbox (reliable dispatch)

The API never publishes a queue message in a way that can diverge from committed
database state. Run creation and its outbox event are committed together.

```mermaid
stateDiagram-v2
    [*] --> Pending : INSERT outbox_events\n(status=pending)
    Pending --> Dispatched : Dispatcher claims with FOR UPDATE SKIP LOCKED\nRedis publish OK\nUPDATE status=dispatched
    Pending --> Failed : Redis publish error\nbounded retry
    Failed --> Dispatched : retry succeeds
    Failed --> Exhausted : retry budget spent\nstatus=failed, visible operationally
    Dispatched --> [*]
    Exhausted --> [*] : Manual intervention

    note right of Pending
        Atomic with run creation:
        - experiment_runs (queued)
        - outbox_events (pending)
        - idempotency_keys (reserved)
        - audit_events (run.submitted)
        All in ONE transaction.
    end note

    note right of Dispatched
        Duplicate publication is safe:
        consumers are idempotent and the
        worker verifies run state before
        committing results.
    end note
```

## 5. Experiment run state machine

```mermaid
stateDiagram-v2
    [*] --> Queued : API submit\n(202 Accepted)
    Queued --> Running : Worker claims run\n(state-checked transition)
    Queued --> Cancelled : API cancel\n(idempotent)
    Running --> Succeeded : Worker validates output\nand commits artifacts
    Running --> Failed : Worker records\nsanitised failure
    Running --> Queued : Transient failure\nbounded retry with backoff
    Running --> Failed : Recovery finds stale run\npast retry limit
    Running --> Cancelled : Cooperative cancellation
    Succeeded --> [*]
    Failed --> [*]
    Cancelled --> [*]

    note right of Running
        Terminal runs must not be
        reopened by a duplicate
        worker message; retrying
        creates a new run record.
    end note

    note right of Queued
        Idempotency key scope:
        (user_id, operation="run.submit", key)
        Reuse with a different
        request_hash is rejected.
    end note
```

## 6. Data model relationships

The canonical schema is defined by versioned migrations under
`packages/backend/app/db/migrations/`. The full column-level definition lives in
[`../05-data-model.md`](../05-data-model.md).

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ PROJECT_MEMBERS : participates
    PROJECTS ||--o{ PROJECT_MEMBERS : has
    PROJECTS ||--o{ DATASETS : contains
    DATASETS ||--o{ DATASET_VERSIONS : snapshots
    DATASET_VERSIONS ||--o{ FILE_ASSETS : contains
    DATASETS ||--o{ UPLOAD_SESSIONS : receives
    PROJECTS ||--o{ PIPELINES : contains
    PIPELINES ||--o{ PIPELINE_VERSIONS : versions
    PIPELINE_VERSIONS ||--o{ EXPERIMENT_RUNS : executes
    DATASET_VERSIONS ||--o{ EXPERIMENT_RUNS : inputs
    EXPERIMENT_RUNS ||--o{ ARTIFACTS : produces
    PROJECTS ||--o{ ANNOTATIONS : has
    DATASET_VERSIONS ||--o{ ANNOTATIONS : annotates
    USERS ||--o{ USAGE_RECORDS : accrues
    EXPERIMENT_RUNS ||--o{ USAGE_RECORDS : consumes
    USERS ||--o{ AUDIT_EVENTS : performs
    USERS ||--o{ IDEMPOTENCY_KEYS : scopes

    EXPERIMENT_RUNS {
        uuid id PK
        uuid pipeline_version_id FK
        uuid dataset_version_id FK
        text status
        jsonb parameters
        text error
        timestamptz started_at
        timestamptz finished_at
    }

    PIPELINE_VERSIONS {
        uuid id PK
        uuid pipeline_id FK
        text version
        jsonb definition
        text image_digest
    }

    DATASET_VERSIONS {
        uuid id PK
        uuid dataset_id FK
        text version
        jsonb manifest
        text status
    }

    FILE_ASSETS {
        uuid id PK
        uuid dataset_version_id FK
        text object_key
        text checksum
        bigint size_bytes
        text media_type
    }

    ARTIFACTS {
        uuid id PK
        uuid run_id FK
        text object_key
        text checksum
        text media_type
        jsonb metadata
    }

    OUTBOX_EVENTS {
        uuid id PK
        text event_type
        jsonb payload
        text status
        timestamptz dispatched_at
    }
```

## 7. Deployment architecture

Initial deployment is a single environment defined by `docker-compose.yaml`.
Cloud infrastructure (GCP or AWS, Terraform, Kubernetes) is explicitly deferred
and must not be required to build, test, or run the platform.

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Users and browsers"]
    end

    subgraph Compose["Docker Compose environment"]
        subgraph Edge["Edge"]
            FEC["Next.js frontend container"]
        end

        subgraph AppServices["Application services"]
            APIC["FastAPI API container"]
            WC["Celery worker container"]
            DC["Outbox dispatcher container"]
            CC["Cleanup container"]
        end

        subgraph Managed["Managed local services"]
            PGC[("PostgreSQL")]
            REDISC[("Redis")]
            MINIOC[("MinIO S3-compatible")]
        end
    end

    subgraph Optional["Optional evolution (deferred)"]
        TF["Terraform"]
        K8S["Kubernetes"]
        CLOUD["Managed PostgreSQL, Redis,\nand object storage"]
    end

    subgraph Release["Desktop (optional)"]
        Tauri["Tauri release artifact"]
    end

    Users -->|HTTPS| FEC
    FEC -->|REST| APIC
    APIC -->|SQL| PGC
    APIC -->|Tasks and objects| REDISC
    APIC -->|Objects| MINIOC
    DC -->|SQL| PGC
    DC -->|Publish| REDISC
    REDISC -->|Tasks| WC
    WC -->|SQL| PGC
    WC -->|Objects| MINIOC
    CC -->|SQL| PGC
    CC -->|Objects| MINIOC

    K8S -.-> CLOUD

    classDef edge fill:#e1f5fe,stroke:#0277bd
    classDef app fill:#f3e5f5,stroke:#7b1fa2
    classDef managed fill:#e8f5e9,stroke:#388e3c
    classDef deferred fill:#eceff1,stroke:#607d8b,stroke-dasharray: 5 5
    classDef desktop fill:#fce4ec,stroke:#c2185b

    class Users,FEC edge
    class APIC,WC,DC,CC app
    class PGC,REDISC,MINIOC managed
    class TF,K8S,CLOUD deferred
    class Tauri desktop
```

---

_Diagrams rendered with Mermaid. For interactive viewing, open in GitHub,
GitLab, or VS Code with a Mermaid extension._
