-- 0001 identity and projects (down)

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS outbox_status;
DROP TYPE IF EXISTS project_visibility;
DROP TYPE IF EXISTS project_role;
