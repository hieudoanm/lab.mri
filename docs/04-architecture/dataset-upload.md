# Dataset Upload and Validation Data Flow

The NIfTI upload is resumable and direct-to-object-storage. Session creation,
finalisation, and validation are API operations executed through the Next.js
BFF. The browser uploads volume bytes directly to a short-lived, scoped signed
URL rather than streaming them through application memory. Finalisation
verifies the object, then validation is scheduled asynchronously or, for small
files, performed synchronously within limits.

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as FastAPI
    participant DB as PostgreSQL
    participant S as Object Storage
    participant V as Validation Worker

    U->>W: Select NIfTI file (.nii / .nii.gz) and metadata
    W->>A: POST /api/v1/projects/{id}/datasets (create upload session)
    A->>DB: Create pending upload session record\n(expected size, optional checksum, expiry)
    A-->>W: Short-lived scoped upload instructions (session ID, upload URL)
    W-->>U: Prompt to continue upload
    U->>W: Continue upload of volume bytes
    W->>S: Write bytes to private object key (resumable, signed URL)
    S-->>W: Parts uploaded
    W->>A: POST /api/v1/datasets/{id}/complete (finalise)
    A->>S: Inspect object and verify size and checksum
    A->>DB: Record file_assets row and draft dataset_version\n(mark session completed)
    A->>V: Schedule validation via outbox event
    V->>S: Read volume header (bounded parsing)
    V->>V: Parse header, affine, dimensions, spacing, orientation\ncheck limits and decompression bounds
    alt Validation succeeds
        V->>DB: Persist extracted spatial metadata and manifest\nset dataset_version ready, record audit event
        V-->>A: Validation success
        A-->>W: Dataset version ready
    else Validation fails
        V->>DB: Persist diagnostic manifest\nset dataset_version failed
        V-->>A: Validation failure
        A-->>W: Safe structured validation error
    end
    W->>A: Poll dataset version status
    A-->>W: Ready or failed
    W-->>U: Show validated spatial metadata or error
```

## Upload invariants

- The user must be authorised to upload into the target project via
  `project_members`.
- Storage is private; the object key is a server-generated path, not a public
  URL.
- The server validates the file independently of browser-side checks.
- The dataset version is not `ready` before validation succeeds.
- Finalisation confirms the object exists, matches the declared size, and has
  the expected SHA-256 checksum (or the server computes one).
- Finalisation is idempotent or protected against duplicate requests using
  `idempotency_keys`.
- Interrupted uploads remain resumable and abandoned sessions are reconciled by
  a cleanup task.
- Upload sessions and signed URLs expire.
- File-size, dimension, rank, decompressed-size, and parser limits are
  enforced.

This path uses the outbox only for validation dispatch when validation is
asynchronous; it never runs MRI processing inside a request handler.