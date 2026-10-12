-- 0002 datasets and uploads
-- Dataset identity, immutable versions, file assets, and resumable uploads.

CREATE TYPE dataset_source_type AS ENUM ('upload', 'import', 'sample');
CREATE TYPE upload_session_status AS ENUM ('pending', 'completed', 'expired', 'aborted');

CREATE TABLE datasets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (btrim(name) <> ''),
    source_type dataset_source_type NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    CONSTRAINT uq_datasets_project_id_id UNIQUE (project_id, id)
);

CREATE INDEX ix_datasets_project_created_at ON datasets (project_id, created_at DESC);

CREATE TABLE dataset_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id uuid NOT NULL REFERENCES datasets (id) ON DELETE RESTRICT,
    version text NOT NULL CHECK (btrim(version) <> ''),
    manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'validating', 'ready', 'failed', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_dataset_versions_dataset_version UNIQUE (dataset_id, version),
    CONSTRAINT uq_dataset_versions_dataset_id_id UNIQUE (dataset_id, id)
);

CREATE INDEX ix_dataset_versions_dataset_created_at
    ON dataset_versions (dataset_id, created_at DESC);

CREATE TABLE file_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version_id uuid NOT NULL REFERENCES dataset_versions (id) ON DELETE CASCADE,
    object_key text NOT NULL CHECK (btrim(object_key) <> ''),
    checksum text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    media_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_file_assets_object_key UNIQUE (object_key)
);

CREATE INDEX ix_file_assets_dataset_version_id ON file_assets (dataset_version_id);

CREATE TABLE upload_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id uuid NOT NULL,
    project_id uuid NOT NULL,
    status upload_session_status NOT NULL DEFAULT 'pending',
    expected_size_bytes bigint CHECK (expected_size_bytes IS NULL OR expected_size_bytes >= 0),
    checksum_sha256 text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_upload_sessions_dataset_project
        FOREIGN KEY (project_id, dataset_id)
        REFERENCES datasets (project_id, id) ON DELETE RESTRICT
);

CREATE INDEX ix_upload_sessions_dataset_created_at
    ON upload_sessions (dataset_id, created_at DESC);
CREATE INDEX ix_upload_sessions_status_expires_at
    ON upload_sessions (status, expires_at);
