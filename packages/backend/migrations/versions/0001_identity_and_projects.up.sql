-- 0001 identity and projects
-- Identity, project tenancy, and platform tables for MRI Lab.

CREATE TYPE project_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE project_visibility AS ENUM ('private', 'shared', 'public');
CREATE TYPE outbox_status AS ENUM ('pending', 'dispatched', 'failed');

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_users_email ON users (lower(email));

CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text,
    visibility project_visibility NOT NULL DEFAULT 'private',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE INDEX ix_projects_owner_created_at ON projects (owner_id, created_at DESC);
CREATE INDEX ix_projects_visibility_created_at ON projects (visibility, created_at DESC);

CREATE TABLE project_members (
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role project_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX ix_project_members_user_id ON project_members (user_id);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_events_resource_created_at
    ON audit_events (resource_type, resource_id, created_at DESC);
CREATE INDEX ix_audit_events_actor_created_at
    ON audit_events (actor_id, created_at DESC);

CREATE TABLE idempotency_keys (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key text NOT NULL CHECK (length(key) BETWEEN 1 AND 255),
    request_hash text NOT NULL,
    response jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, key)
);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status outbox_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at timestamptz
);

CREATE INDEX ix_outbox_events_status_created_at ON outbox_events (status, created_at);
CREATE INDEX ix_outbox_events_event_type_created_at
    ON outbox_events (event_type, created_at DESC);
