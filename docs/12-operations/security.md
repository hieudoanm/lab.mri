# Security

Operational security for the self-hosted MRI Lab deployment.

## Application

- Authentication is enabled and `AUTH_MODE` is not `development`.
- Secrets are managed securely and not baked into images.
- TLS terminates in front of the frontend and API.
- Project isolation tests pass.

## Database and storage

- Migrations are reviewed and applied through the one-shot `migrate` service.
- Database access is restricted to the internal network.
- Backups are enabled as required and a restore has been tested.
- Object storage is private (anonymous access disabled).
- Storage credentials are distinct from the development defaults.
- Retention and cleanup policies are defined.

Never commit secrets; `.env` and `.env.*` are ignored, and `!.env.example` is the only exception. Never log secret values, full connection strings, or signed URLs. Never expose server secrets through `NEXT_PUBLIC_*` variables; these are embedded in the client bundle.

## Portfolio demonstration

- Only synthetic data is used.
- Demo credentials are not privileged production credentials.
- The README explains limitations.
- The primary workflow works in the deployed environment.
