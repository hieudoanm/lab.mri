# Rollback Strategy

Application rollback and data rollback are separate operations.

## Application rollback

Keep previous immutable application images available. If a deployment fails, restore the previous compatible image tag in `docker-compose.prod.yaml` and run smoke tests. Because migrations run as a separate one-shot step, a rollback does not silently re-run schema changes.

## Database rollback

Do not automatically reverse a migration without checking its effects. Prefer backward-compatible migrations that allow the application to be rolled back without losing data. For destructive changes, define a specific recovery plan before deployment.

## Worker compatibility

During a rollout, old and new workers may temporarily coexist. Ensure that:

- Task payloads remain compatible during the transition.
- Algorithm and pipeline versions are explicit, and `image_digest` is recorded.
- Result and manifest schemas are versioned.
- Workers cannot overwrite results from incompatible executions.
- Queued jobs remain processable after deployment.
