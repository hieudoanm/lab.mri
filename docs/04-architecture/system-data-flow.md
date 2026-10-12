# System Data Flow

This Level 0/1 data-flow view identifies the main actors, processes, data
stores, and external transports. Project membership and resource access are
verified by the API; the browser is not an authority for access. The browser
talks to the Python API only through the Next.js BFF, which forwards
authenticated REST requests.

```mermaid
flowchart LR
    User[Researcher / viewer / owner]

    subgraph Client["Client boundary"]
        Browser[Browser]
        Web[Next.js web application\nBFF route handlers]
        Viewer[vtk.js volume viewer]
    end

    subgraph App["Application trust boundary"]
        API[FastAPI API]
        Identity[Authenticate and verify project membership]
        Services[Application services]
        Scientific[NIfTI validation and metadata extraction]
        Dispatcher[Outbox dispatcher]
        Worker[Celery run worker]
        Runtime[Versioned OCI container]
    end

    subgraph Stores["Persistence and transport"]
        DB[(PostgreSQL\nusers, projects, members,\ndatasets, versions, pipelines,\nruns, artifacts, outbox, audit)]
        Objects[(Private S3-compatible storage\nNIfTI volumes and artifacts)]
        Redis[(Redis\nTask transport only)]
    end

    User -->|Credentials, metadata, upload,\nrun requests, view inputs| Browser
    Browser -->|UI and session requests| Web
    Web -->|Authenticated HTTPS API requests| API
    API --> Identity
    Identity -->|Verified user and project context| Services
    Services -->|Scoped SQL reads and writes| DB
    Services -->|Register uploads and artifacts, issue signed URLs| Objects
    Services -->|Persist run and outbox event in one transaction| DB
    API -->|Authorise and issue short-lived signed URL| Objects
    Objects -->|Volume bytes over signed URL| Viewer

    Dispatcher -->|Claim pending events| DB
    Dispatcher -->|Publish run identifier| Redis
    Redis -->|Run task identifier| Worker
    Worker -->|Claim run, persist status and artifacts| DB
    Worker -->|Read source volumes, write artifacts| Objects
    Worker --> Runtime
    Runtime -->|Computed outputs, manifest| Worker
    Worker --> Scientific
    Scientific -->|Validated metadata and limits| Worker

    DB -->|Run status and persisted artifacts| API
    API -->|Authorised response| Web
    Web -->|Status, metadata, and artifact links| Browser
```

Redis carries task notifications only and is never the authoritative source of
run state. PostgreSQL stores the authoritative run lifecycle; volumes and
artifacts stay in private storage and are referenced by object key, checksum,
and validated metadata. Scientific computation happens only inside the versioned
container launched by the worker, never inside a request handler.