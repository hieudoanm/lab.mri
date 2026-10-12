-- 0003 pipelines and runs
-- Versioned pipelines, durable run state, artifacts, annotations, usage.

CREATE TYPE run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

CREATE TABLE pipelines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_pipelines_project_id_id UNIQUE (project_id, id)
);

CREATE INDEX ix_pipelines_project_created_at ON pipelines (project_id, created_at DESC);

CREATE TABLE pipeline_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id uuid NOT NULL REFERENCES pipelines (id) ON DELETE RESTRICT,
    version text NOT NULL CHECK (btrim(version) <> ''),
    definition jsonb NOT NULL,
    image_digest text NOT NULL CHECK (btrim(image_digest) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_pipeline_versions_pipeline_version UNIQUE (pipeline_id, version)
);

CREATE TABLE experiment_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_version_id uuid NOT NULL REFERENCES pipeline_versions (id) ON DELETE RESTRICT,
    dataset_version_id uuid NOT NULL REFERENCES dataset_versions (id) ON DELETE RESTRICT,
    status run_status NOT NULL DEFAULT 'queued',
    parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
    error text,
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_experiment_runs_status_created_at
    ON experiment_runs (status, created_at DESC);
CREATE INDEX ix_experiment_runs_dataset_version_created_at
    ON experiment_runs (dataset_version_id, created_at DESC);
CREATE INDEX ix_experiment_runs_pipeline_version_created_at
    ON experiment_runs (pipeline_version_id, created_at DESC);

CREATE TABLE artifacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES experiment_runs (id) ON DELETE CASCADE,
    object_key text NOT NULL CHECK (btrim(object_key) <> ''),
    checksum text NOT NULL,
    media_type text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_artifacts_object_key UNIQUE (object_key)
);

CREATE INDEX ix_artifacts_run_id ON artifacts (run_id);

CREATE TABLE annotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE RESTRICT,
    dataset_version_id uuid NOT NULL REFERENCES dataset_versions (id) ON DELETE CASCADE,
    coordinate_space text NOT NULL CHECK (btrim(coordinate_space) <> ''),
    coordinates jsonb NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_annotations_dataset_version_created_at
    ON annotations (dataset_version_id, created_at DESC);
CREATE INDEX ix_annotations_project_created_at
    ON annotations (project_id, created_at DESC);

CREATE TABLE usage_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    run_id uuid REFERENCES experiment_runs (id) ON DELETE SET NULL,
    resource_type text NOT NULL,
    quantity bigint NOT NULL CHECK (quantity >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_usage_records_user_created_at ON usage_records (user_id, created_at DESC);
CREATE INDEX ix_usage_records_run_id ON usage_records (run_id);
