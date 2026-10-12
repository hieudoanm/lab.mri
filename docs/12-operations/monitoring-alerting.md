# Monitoring and Alerting

## Logging

Use structured (JSON) logs with fields such as:

- Timestamp.
- Severity.
- Service (`api`, `worker`, `dispatcher`, `frontend`).
- Environment.
- Request or correlation ID.
- Run ID.
- Route template.
- Resource ID.
- Duration.
- Safe error code.

Do not log raw MRI voxel data, signed URLs, access tokens, full connection strings, or participant information. Container logs are collected through the Docker logging driver; configure rotation (`max-size`, `max-file`) so a noisy service cannot fill the disk.

## Metrics

Track at least:

- API request count and latency.
- API error rate.
- Database connection utilisation.
- Upload completion and validation-failure counts.
- Outbox queue depth and dispatch lag.
- Run execution duration.
- Run success, failure, and retry counts.
- Stale run count.
- Object-storage usage and growth.
- Host CPU, memory, and disk utilisation.

A `/metrics` endpoint compatible with Prometheus and an optional Prometheus/Grafana sidecar are future additions; the self-hosted MVP may rely on structured logs, `docker stats`, and the MinIO and PostgreSQL metrics that are available.

## Alerts

Start with a small number of actionable alerts:

- Sustained API failures.
- Repeated database connection failures.
- A growing backlog of old runs or undispatched outbox events.
- Repeated worker crashes.
- Disk usage approaching capacity (database or MinIO volume).
- Backup failures.

Avoid alerts that trigger on harmless short-lived fluctuations.
