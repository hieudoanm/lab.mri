# Experiment Pipeline Data Flow

Run submission records the run and its outbox event atomically. The dispatcher
publishes only a run identifier; the worker reloads authoritative run, dataset,
and pipeline-version state from PostgreSQL before launching the versioned OCI
container pinned by `image_digest`. Artifacts and the experiment manifest are
persisted only after the container output is validated.

```mermaid
flowchart TD
    User[Researcher]

    subgraph Client["Browser and frontend"]
        Web[Next.js application\nBFF route handlers]
    end

    subgraph API["API trust boundary"]
        APIProcess[FastAPI]
        Auth[Authenticate and verify project role]
        Submit[Validate parameters and ready dataset version]
        Transaction[Single PostgreSQL transaction]
    end

    subgraph Durable["Durable state"]
        DB[(PostgreSQL\nIdempotency key, experiment run,\noutbox event, pipeline version,\naudit, artifacts, usage)]
        Objects[(Private S3-compatible storage\nValidated NIfTI volumes)]
        ObjOut[(Private S3-compatible storage\nArtifacts and manifests)]
    end

    subgraph Queue["Background processing"]
        Dispatcher[Outbox dispatcher\nand stale-run recovery]
        Redis[(Redis task broker)]
        Worker[Celery worker]
        Container[Versioned OCI container\nimage_digest pinned\nCPU, memory, disk, time limits]
        Compute[Re-validate input\ncompute image operations]
    end

    User -->|Run request + Idempotency-Key| Web
    Web -->|POST /api/v1/runs| APIProcess
    APIProcess --> Auth
    Auth --> Submit
    Submit -->|Ensure dataset version belongs to project\nand is ready; resolve pipeline version| DB
    Submit --> Transaction
    Transaction -->|Reserve idempotency key,\ncreate run and outbox event,\nrecord audit event| DB
    Transaction -->|Accepted run response (202)| APIProcess
    APIProcess --> Web

    Dispatcher -->|Claim pending events with row locks| DB
    Dispatcher -->|Publish run ID| Redis
    Dispatcher -->|Mark event dispatched / retry failure| DB
    Redis -->|Task containing run ID| Worker
    Worker -->|Load and atomically claim queued run| DB
    Worker -->|Read dataset version, pipeline version,\nimage digest, and validated parameters| DB
    Worker -->|Read authorised source volumes| Objects
    Worker --> Container
    Container -->|Read-only mounts of inputs| Compute
    Compute -->|Computed outputs and manifest| Container
    Container -->|Validate output dimensions, affine,\nand coordinate conventions| Worker
    Worker -->|Write artifacts to controlled object keys| ObjOut
    Worker -->|Persist artifacts, manifest, usage,\nand succeed run atomically| DB
    Worker -->|Classified failure, bounded retry,\nor terminal failure| DB

    Web -->|Poll run status / list artifacts| APIProcess
    APIProcess --> Auth
    Auth -->|Project-scoped run and artifact lookup| DB
    DB -->|Status or artifact metadata| APIProcess
    APIProcess --> Web
    Web -->|Progress or artifacts + manifest| User
```

The `Idempotency-Key` replays the original run for an identical request and
rejects reuse for a different request. Redis is at-least-once transport, not
authoritative state: duplicate task delivery is safe because the worker claims
only `queued` runs and verifies state in PostgreSQL. A run is marked `succeeded`
only after the container output is validated and artifacts are committed; a
failure to persist artifacts never leaves the run appearing successful. Retries
are bounded with exponential backoff, and stale runs left in `running` after a
worker crash are recovered through a lease or heartbeat.