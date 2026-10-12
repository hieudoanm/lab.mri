# End-to-End Workflow Sequence

This sequence follows the full journey from upload through validation, viewing,
run submission, artifact inspection, and export. Protected API requests
authenticate the user and verify `project_members` role before accessing
project-scoped records. Upload bytes move directly to object storage through a
signed URL; run computation is asynchronous.

`Web` denotes the Next.js application as a whole: the browser calls BFF route
handlers, which the server executes, reads the HttpOnly session cookie, resolves
the active project, and forwards the request to FastAPI. The browser never calls
FastAPI directly.

```mermaid
sequenceDiagram
    autonumber
    actor Researcher
    participant Web as Next.js app (browser + BFF)
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Storage as Private object storage
    participant Dispatcher as Outbox dispatcher
    participant Redis as Redis broker
    participant Worker as Celery worker
    participant Viewer as vtk.js viewer

    Researcher->>Web: Create project and select NIfTI file
    Web->>API: POST /api/v1/projects
    Note over API: Authenticate and authorise
    API->>DB: Insert project and owner membership
    API-->>Web: 201 Created with project
    Web-->>Researcher: Project created

    Web->>API: POST /api/v1/projects/{id}/datasets (upload session)
    API->>DB: Insert pending upload session, expected size/checksum
    API-->>Web: Session ID and scoped signed upload URL
    Web->>Storage: Upload volume bytes directly (resumable)
    Storage-->>Web: Upload complete
    Web->>API: POST /api/v1/datasets/{id}/complete
    Note over API: Verify size and checksum; record file_assets; schedule validation
    API->>DB: Create draft dataset version and file asset
    API->>DB: Create outbox event for validation
    API-->>Web: Validation scheduled

    Dispatcher->>DB: Claim validation outbox event
    Dispatcher->>Redis: Publish validation task
    Redis-->>Worker: Deliver validation task
    Worker->>Storage: Read volume header
    Worker->>DB: Persist spatial metadata; set version ready
    Note over Researcher,Worker: Volume is now a ready dataset version

    Researcher->>Web: Open the volume in the viewer
    Web->>API: GET dataset version and request signed URL
    API->>DB: Verify project membership; look up file asset
    API-->>Web: Short-lived single-object signed URL
    Web->>Storage: Fetch volume bytes
    Viewer->>Viewer: Slice client-side (axial, coronal, sagittal)\nlinked crosshairs, display transforms only
    Viewer-->>Researcher: Explore volume

    Researcher->>Web: Submit experiment run for the version
    Web->>API: POST /api/v1/runs with Idempotency-Key
    Note over API: Verify role, ready dataset version, and parameter schema
    API->>DB: Begin transaction
    API->>DB: Reserve idempotency key; insert queued run and outbox event; audit
    API-->>Web: 202 Accepted with run_id
    Web-->>Researcher: Run queued

    loop Dispatcher runs periodically
        Dispatcher->>DB: Claim pending run outbox event
        Dispatcher->>Redis: Publish task with run ID
        Dispatcher->>DB: Mark event dispatched
    end

    Redis-->>Worker: Deliver run task
    Worker->>DB: Claim run (queued -> running)
    Worker->>Storage: Read source volumes
    Worker->>Worker: Launch versioned OCI container by image_digest\nwith read-only inputs and limits
    Note over Worker: Scientific MRI processing runs here,\nnever in a request handler
    Worker->>Storage: Write artifacts and manifest
    alt Run succeeds
        Worker->>DB: Commit artifacts, usage, and succeeded state
        DB-->>Worker: Commit partial
        Worker->>Storage: Finalise artifact objects
        Worker->>DB: Mark run succeeded with manifest reference
    else Retryable failure
        Worker->>DB: Requeue run with backoff; create new outbox event
    else Terminal failure
        Worker->>DB: Mark run failed with sanitised error and audit event
    end

    loop Frontend polls run status
        Web->>API: GET /api/v1/runs/{id}
        API->>DB: Read project-scoped run state
        API-->>Web: Current status and logs reference
    end

    opt Run succeeded
        Web->>API: GET /api/v1/runs/{id}/artifacts
        API->>DB: List artifacts and manifest
        API-->>Web: Artifact metadata and download URLs
        Researcher->>Web: Request signed download URL
        Web->>API: POST artifact download (authorised)
        API-->>Web: Short-lived signed URL
        Web-->>Researcher: Download artifact and experiment manifest
    end
```

An identical run request using the same idempotency key replays the original
run instead of creating a second one. Redis delivers task notifications only;
PostgreSQL remains authoritative for run state, artifacts, and provenance.
Display transforms applied in the viewer are never recorded as scientific input
to a run.