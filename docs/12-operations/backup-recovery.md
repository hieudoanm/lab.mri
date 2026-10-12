# Backup and Recovery

Define a recovery policy for every durable data store. Both durable stores live in named volumes and must be backed up independently.

## PostgreSQL

Document:

- Backup frequency (`pg_dump` on a schedule, for example nightly).
- Retention (for example 7 daily plus 4 weekly copies).
- Recovery procedure.
- Who can restore.
- Recovery point objective (RPO).
- Recovery time objective (RTO).

Example logical backup:

```bash
docker compose exec -T postgres \
  pg_dump -U mri-lab -d mri-lab -Fc > backups/mri-lab-$(date +%F).dump
```

A database dump is not a substitute for object-storage backups.

## Object storage

Document:

- Source-volume and artifact retention.
- Bucket versioning or object-lock behaviour where enabled.
- Deletion policy and the relationship to `file_assets`, `dataset_versions`, and `artifacts` rows.
- Recovery options.
- How database metadata maps to stored object keys.

For the self-hosted demo, back up the `mri-lab-minio` volume or mirror the bucket with `mc mirror` to a second location. Keep database dumps and object mirrors consistent so a restore does not reference missing volumes.

## Recovery testing

A backup is not proven useful until restoration has been tested.

- Document the restore procedure.
- Perform a test restore in a disposable environment.
- Verify that representative metadata and synthetic volume references remain consistent.
- Record any limitations.

## Cost management

A self-hosted portfolio project should not incur unnecessary ongoing costs.

- Run the whole stack on a single modest host; prefer the smallest instance that meets memory and disk needs.
- Budget for disk first: MRI volumes and derived artifacts dominate cost, not compute.
- Apply object-storage retention and cleanup for abandoned upload sessions and superseded artifacts.
- Enforce upload-size, volume-dimension, and run-time limits so a single job cannot exhaust the host.
- Limit worker concurrency and set Celery time limits.
- Configure Docker log rotation to prevent unbounded log growth.
- Monitor storage growth and provision headroom for backups.
- Avoid keeping unused environments running.
- Document which resources continue to incur charges while idle.

Review provider or host pricing before provisioning. Do not assume a workload remains cheap simply because the demonstration is small.
