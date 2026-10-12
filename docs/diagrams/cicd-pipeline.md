# CI/CD Pipeline

This diagram describes the GitHub Actions quality gate for MRI Lab. The workflow
runs on pull requests and pushes to `main`; CI remains the authoritative full
validation while local Husky and lint-staged hooks apply fast formatting and
lint checks to staged files. Successful builds produce container images used by
the Docker Compose deployment. A separate, optional workflow produces a Tauri
desktop release.

```mermaid
flowchart LR
    Change[Pull request or push / main]

    subgraph GH["GitHub Actions: .github/workflows/ci.yml"]
        Checkout[Checkout source]
        Backend[Backend checks\nRuff, mypy, migration validation,\npytest unit + integration]
        Frontend[Frontend checks\nESLint, Prettier,\ntypecheck, Vitest, build]
        E2E[End-to-end tests\nPlaywright - upload, view, run, inspect]
        Security[Security scan\nTrivy filesystem + image scan,\nSARIF upload]
        Audit[Dependency audit\npnpm and pip audits,\nartifacts]
        Merge[CI result / merge gate]
    end

    subgraph Build["Container build"]
        DockerBuild[Build OCI images\nfrontend, API, worker, dispatcher]
        Digest[Tag with commit SHA\nand immutable image digest]
        Registry[(Container registry\nlocal / configured registry)]
    end

    subgraph Deploy["Docker Compose deployment"]
        Compose[Deploy services\nNext.js, FastAPI, Celery worker,\ndispatcher, PostgreSQL, Redis, MinIO]
        Migrate[Run SQL migrations\nstartup gate]
        Smoke[Smoke test\nhealth endpoints, run end to end]
    end

    subgraph Desktop["Optional desktop release"]
        TauriBuild[Build Tauri shell\nnpm + Rust, notarisation on macOS]
        Asset[Upload release artifacts\nGitHub Release]
    end

    Change --> Checkout
    Checkout --> Backend
    Checkout --> Frontend
    Checkout --> E2E
    Checkout --> Security
    Backend --> Audit
    Frontend --> Audit
    Audit --> Merge
    Backend --> Merge
    Frontend --> Merge
    E2E --> Merge
    Security --> Merge

    Security --> DockerBuild
    Audit --> DockerBuild
    DockerBuild --> Digest
    Digest --> Registry

    Registry --> Compose
    Compose --> Migrate
    Migrate --> Smoke
    Smoke --> Merge

    Checkout -.->|optional tagged release workflow| TauriBuild
    TauriBuild --> Asset
```

**Separation of concerns:** the GitHub Actions workflow validates the change and
builds versioned images; it does not deploy. The Docker Compose environment is
started for the E2E and smoke stages from the freshly built images, with
migrations applied as a startup gate. The optional Tauri release runs only from
an explicit release workflow or tag, consuming the already-tested frontend
build. Cloud deployment remains deferred and is not part of this pipeline.