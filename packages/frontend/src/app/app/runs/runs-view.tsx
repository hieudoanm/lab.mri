'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { buttonClasses } from '@/components/atoms/button';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { EmptyState, ErrorState, LoadingState, NoResultsState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchRuns, toErrorMessage } from '@/lib/api';
import type { ExperimentRun, RunStatus } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { formatDateTime, formatElapsed } from '@/lib/format';
import { runStatusLabel, runStatusTone } from '@/lib/status';

const FILTERS: Array<{ value: RunStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const columns: DataTableColumn<ExperimentRun>[] = [
  {
    key: 'pipeline',
    header: 'Pipeline',
    render: (run) => (
      <div className='flex flex-col'>
        <Link href={`/app/runs/${run.id}`} className='text-accent font-medium hover:underline'>
          {run.pipeline_name}
        </Link>
        <span className='text-text-muted font-mono text-xs'>v{run.pipeline_version}</span>
      </div>
    ),
  },
  {
    key: 'dataset',
    header: 'Dataset',
    render: (run) => (
      <span className='text-text-secondary'>
        {run.dataset_name} · v{run.dataset_version}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (run) => (
      <StatusBadge tone={runStatusTone(run.status)} label={runStatusLabel(run.status)} />
    ),
  },
  {
    key: 'elapsed',
    header: 'Elapsed',
    render: (run) => (
      <span className='text-text-secondary font-mono text-xs'>
        {formatElapsed(run.started_at, run.finished_at)}
      </span>
    ),
  },
  {
    key: 'requested',
    header: 'Requested',
    render: (run) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(run.requested_at)}</span>
    ),
  },
];

export const RunsView = () => {
  const [status, setStatus] = useState<RunStatus | 'all'>('all');
  const runs = useQuery({
    queryKey: ['runs', { status, limit: 50 }],
    queryFn: () => fetchRuns({ limit: 50, status: status === 'all' ? undefined : status }),
  });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Runs'
        description='Every run records its inputs, parameters, and provenance for reproducibility.'
      />

      <div role='tablist' aria-label='Filter by status' className='flex flex-wrap gap-2'>
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <button
              key={filter.value}
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => setStatus(filter.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                active
                  ? 'border-accent bg-accent-muted text-text-primary'
                  : 'border-border text-text-secondary hover:text-text-primary',
              )}>
              {filter.label}
            </button>
          );
        })}
      </div>

      {runs.isLoading ? (
        <LoadingState label='Loading runs…' />
      ) : runs.isError ? (
        <ErrorState
          message={toErrorMessage(runs.error)}
          action={
            <button
              type='button'
              className={buttonClasses('secondary', 'sm')}
              onClick={() => runs.refetch()}>
              Retry
            </button>
          }
        />
      ) : runs.data && runs.data.items.length > 0 ? (
        <DataTable columns={columns} rows={runs.data.items} getRowKey={(run) => run.id} />
      ) : status === 'all' ? (
        <EmptyState
          title='No runs yet'
          description='Submit a pipeline against a dataset version to create your first run.'
          action={
            <Link href='/app/pipelines' className={buttonClasses('secondary', 'sm')}>
              Browse pipelines
            </Link>
          }
        />
      ) : (
        <NoResultsState
          description={`No runs currently have the status “${runStatusLabel(status)}”.`}
        />
      )}
    </div>
  );
};
