"""Outbox dispatcher command.

Publishes pending outbox events to the Celery broker. Run with::

    uv --directory packages/backend run python -m app.workers.outbox_dispatcher

Scheduling this on an interval (Celery beat or a platform cron) belongs to the
reliability phase; this command is the on-demand unit of work.
"""

from __future__ import annotations

import argparse
import asyncio
from typing import Any

from celery import Celery

from app.core.config import Settings, get_settings
from app.db.pool import Database
from app.services.outbox import DispatchReport, dispatch_pending_events
from app.workers.celery_app import celery_app


class CeleryEventPublisher:
    """Publish outbox events as Celery tasks on the shared broker."""

    def __init__(self, app: Celery) -> None:
        self._app = app

    def publish(self, *, task_name: str, payload: dict[str, Any]) -> None:
        self._app.send_task(task_name, kwargs={"payload": payload})


async def run_dispatcher(
    settings: Settings,
    *,
    batch_size: int,
    max_batches: int,
) -> DispatchReport:
    """Publish pending outbox events in bounded batches."""
    database = Database(settings)
    await database.connect()
    try:
        return await dispatch_pending_events(
            database,
            CeleryEventPublisher(celery_app),
            batch_size=batch_size,
            max_batches=max_batches,
        )
    finally:
        await database.close()


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Dispatch pending outbox events.")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="events claimed per transaction (default: 100)",
    )
    parser.add_argument(
        "--max-batches",
        type=int,
        default=20,
        help="upper bound on batches processed in one run (default: 20)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Command-line entry point for outbox dispatch."""
    args = _build_parser().parse_args(argv)
    report = asyncio.run(
        run_dispatcher(
            get_settings(),
            batch_size=args.batch_size,
            max_batches=args.max_batches,
        )
    )
    print(
        f"Dispatch complete: claimed {report.claimed} event(s), "
        f"published {report.published}, failures {report.failed} "
        f"in {report.batches} batch(es)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["CeleryEventPublisher", "main", "run_dispatcher"]
