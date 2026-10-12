# Disaster Recovery

## Teardown and resource cleanup

Provide a documented teardown process for disposable environments.

Before deleting resources:

1. Identify the environment.
2. Confirm that it contains no data that must be retained.
3. Check for object-storage contents, database backups, and image archives.
4. Review the destruction plan.
5. Confirm that shared resources will not be removed.
6. Apply the approved teardown.
7. Verify that the intended resources were removed.
8. Check for remaining billable resources.

Typical commands:

```bash
# Stop the stack, preserving volumes
docker compose down

# Stop the stack and delete database, MinIO, and upload volumes
docker compose down --volumes

# Remove locally built images for the project
docker compose down --rmi local
```

Use `--volumes` only when the data is disposable. Do not delete backups as part of an ordinary deployment failure handler.

## Troubleshooting guide

### API cannot connect to PostgreSQL

Check:

- PostgreSQL container status and the readiness health check.
- `DATABASE_URL` format and hostname (`postgres` inside Compose, `localhost` on the host).
- Network configuration and service name resolution.
- Authentication and permissions.
- Connection-pool limits and database connection exhaustion.
- That `migrate` completed before the API started.

Do not print passwords or full connection strings into logs.

### Worker does not process runs

Check:

- Redis availability and `CELERY_BROKER_URL`.
- Worker container status and task registration.
- Outbox dispatch status and lag (undispatched events remain in PostgreSQL).
- Queue depth and worker concurrency.
- Run state and lease information.
- Resource and time limits.

Inspect run and outbox records before manually resubmitting work.

### Dataset upload remains pending

Check:

- Upload-session state and expiry.
- Signed-URL expiry and expiry clock skew.
- Object existence in the MinIO bucket.
- Object size and SHA-256 checksum.
- Storage credentials and bucket policy (anonymous access must be disabled).
- Validation worker health and validation error records.

Do not manually mark a dataset ready without verifying the volume.

### Run remains queued

Check:

- Outbox dispatch status.
- Redis connectivity.
- Worker availability.
- Retry policy and attempt counts.
- Resource limits and host pressure.

Use the documented recovery procedure rather than modifying production rows without an approved process.

### Frontend cannot reach the API

Check:

- `NEXT_PUBLIC_API_BASE_URL` (browser) and `API_INTERNAL_BASE_URL` (server-side).
- That the frontend build-time API URL matches the deployment origin.
- `API_CORS_ORIGINS`.
- The backend health check and container status.

Remember that `NEXT_PUBLIC_*` values are embedded at build time and require a rebuild to change.

### Migration service fails

Check:

- Database reachability and credentials.
- For a rejected modified migration, that the checksum in the migrations table matches the file.
- Migration SQL for syntax errors against PostgreSQL 18.
- That the migration is transactional and repeatable in a clean environment.

### Deployment succeeds but the application fails

Check:

- Environment variables and `APP_ENV`-dependent validation.
- Health-check configuration.
- API base URLs.
- Migration status.
- Storage bucket and credentials.
- Worker and broker connectivity.
- Frontend/backend contract compatibility.

## Definition of done

Deployment is complete when:

1. The application can be run locally using documented instructions and `docker compose up`.
2. CI validates the codebase (backend, frontend, end-to-end, and security jobs).
3. The environment is defined reproducibly in `docker-compose.yaml` and `.env.example`.
4. Production secrets are not stored in source control, images, or logs.
5. Frontend, API, worker, and dispatcher run as separate services with correct dependencies.
6. Database and object-storage access are restricted to the internal network.
7. Migrations run as a controlled, one-shot step before the API and worker start.
8. Liveness and readiness endpoints work, and the asynchronous pipeline is observable.
9. Logs and basic operational metrics are available, with rotation configured.
10. Backups and recovery procedures are documented and restoration has been tested.
11. Self-hosting costs and teardown procedures are documented.
12. A deployed synthetic-data workflow passes smoke tests.
13. Rollback of application images is documented and backward-compatible migrations are preferred.
14. The optional Tauri desktop build and release remain gated behind the same CI checks.
15. Cloud providers, Terraform, and Kubernetes remain optional future evolutions, not requirements.
16. Known operational and scientific limitations are clearly documented.
