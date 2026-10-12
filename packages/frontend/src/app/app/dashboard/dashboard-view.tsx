'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/atoms/card';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { EmptyState, ErrorState, LoadingState, NoResultsState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchProjects, fetchQuotas, fetchRuns, toErrorMessage } from '@/lib/api';
import type { ExperimentRun, ProjectSummary, Quota } from '@/lib/api/types';
import { formatBytes, formatDateTime, formatElapsed } from '@/lib/format';
import { quotaStateLabel, quotaStateTone, runStatusLabel, runStatusTone } from '@/lib/status';

const StatTile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => {
  return (
    <div className='border-border bg-surface rounded-lg border p-4'>
      <p className='text-text-muted text-[11px] font-semibold tracking-wider uppercase'>{label}</p>
      <p className='text-text-primary mt-1 text-2xl font-semibold'>{value}</p>
      {hint ? <p className='text-text-secondary mt-1 text-xs'>{hint}</p> : null}
    </div>
  );
};

const QuotaRow = ({ quota }: { quota: Quota }) => {
  const ratio = quota.limit > 0 ? Math.min(quota.used / quota.limit, 1) : 0;
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-text-secondary capitalize'>
          {quota.resource_type.replace(/_/g, ' ')}
        </span>
        <StatusBadge tone={quotaStateTone(quota.state)} label={quotaStateLabel(quota.state)} />
      </div>
      <progress
        className='progress progress-primary h-1.5'
        value={ratio * 100}
        max={100}
        aria-label={`${quota.resource_type} usage`}
      />
      <span className='text-text-muted font-mono text-xs'>
        {quota.resource_type === 'storage_bytes'
          ? `${formatBytes(quota.used)} of ${formatBytes(quota.limit)}`
          : `${quota.used} of ${quota.limit}`}
      </span>
    </div>
  );
};

const runColumns: DataTableColumn<ExperimentRun>[] = [
  {
    key: 'pipeline',
    header: 'Pipeline',
    render: (run) => (
      <Link href={`/app/runs/${run.id}`} className='text-accent font-medium hover:underline'>
        {run.pipeline_name}
      </Link>
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

const projectColumns: DataTableColumn<ProjectSummary>[] = [
  {
    key: 'name',
    header: 'Project',
    render: (project) => (
      <Link
        href={`/app/projects/${project.id}`}
        className='text-accent font-medium hover:underline'>
        {project.name}
      </Link>
    ),
  },
  {
    key: 'datasets',
    header: 'Datasets',
    render: (project) => <span className='text-text-secondary'>{project.dataset_count}</span>,
  },
  {
    key: 'runs',
    header: 'Runs',
    render: (project) => <span className='text-text-secondary'>{project.run_count}</span>,
  },
  {
    key: 'updated',
    header: 'Updated',
    render: (project) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(project.updated_at)}</span>
    ),
  },
];

export const DashboardView = () => {
  const projects = useQuery({
    queryKey: ['projects', { limit: 5 }],
    queryFn: () => fetchProjects({ limit: 5 }),
  });
  const runs = useQuery({
    queryKey: ['runs', { limit: 5 }],
    queryFn: () => fetchRuns({ limit: 5 }),
  });
  const quotas = useQuery({ queryKey: ['quotas'], queryFn: () => fetchQuotas() });

  const storageQuota = quotas.data?.items.find((quota) => quota.resource_type === 'storage_bytes');
  const runsQuota = quotas.data?.items.find((quota) => quota.resource_type === 'runs');

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Home'
        description='Your projects, recent runs, and workspace usage at a glance.'
        actions={
          <Link href='/app/projects' className='btn btn-primary btn-sm'>
            New project
          </Link>
        }
      />

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatTile
          label='Projects'
          value={projects.data ? String(projects.data.items.length) : '—'}
          hint={projects.data?.has_more ? 'More available' : 'All projects'}
        />
        <StatTile
          label='Recent runs'
          value={runs.data ? String(runs.data.items.length) : '—'}
          hint='Last 5 runs'
        />
        <StatTile
          label='Storage used'
          value={storageQuota ? formatBytes(storageQuota.used) : '—'}
          hint={runsQuota ? `${runsQuota.used} runs submitted` : undefined}
        />
      </div>

      <Card title='Recent runs' description='The most recently requested experiment runs.'>
        {runs.isLoading ? (
          <LoadingState label='Loading runs…' />
        ) : runs.isError ? (
          <ErrorState
            message={toErrorMessage(runs.error)}
            action={
              <button type='button' className='btn btn-sm' onClick={() => runs.refetch()}>
                Retry
              </button>
            }
          />
        ) : runs.data && runs.data.items.length > 0 ? (
          <DataTable columns={runColumns} rows={runs.data.items} getRowKey={(run) => run.id} />
        ) : (
          <EmptyState
            title='No runs yet'
            description='Run an analysis pipeline against a dataset version to see results here.'
            action={
              <Link href='/app/pipelines' className='btn btn-outline btn-sm'>
                Browse pipelines
              </Link>
            }
          />
        )}
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card title='Projects' description='Projects you own or collaborate on.'>
          {projects.isLoading ? (
            <LoadingState label='Loading projects…' />
          ) : projects.isError ? (
            <ErrorState message={toErrorMessage(projects.error)} />
          ) : projects.data && projects.data.items.length > 0 ? (
            <DataTable
              columns={projectColumns}
              rows={projects.data.items}
              getRowKey={(project) => project.id}
            />
          ) : (
            <NoResultsState description='No projects are visible to your account.' />
          )}
        </Card>

        <Card title='Workspace usage' description='Quotas applied to your account.'>
          {quotas.isLoading ? (
            <LoadingState label='Loading usage…' />
          ) : quotas.isError ? (
            <ErrorState message={toErrorMessage(quotas.error)} />
          ) : quotas.data && quotas.data.items.length > 0 ? (
            <div className='flex flex-col gap-5'>
              {quotas.data.items.map((quota) => (
                <QuotaRow key={quota.resource_type} quota={quota} />
              ))}
            </div>
          ) : (
            <NoResultsState description='No quota information is available.' />
          )}
        </Card>
      </div>
    </div>
  );
};
