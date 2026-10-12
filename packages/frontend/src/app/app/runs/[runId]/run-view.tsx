'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { buttonClasses } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { MetadataGrid } from '@/components/atoms/metadata-grid';
import { ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchRun, fetchRunArtifacts, fetchRunLogs, toErrorMessage } from '@/lib/api';
import type { Artifact, RunLogLine } from '@/lib/api/types';
import { formatBytes, formatChecksum, formatDateTime, formatElapsed } from '@/lib/format';
import { runStatusLabel, runStatusTone } from '@/lib/status';

const artifactColumns: DataTableColumn<Artifact>[] = [
  {
    key: 'name',
    header: 'Artifact',
    render: (artifact) => <span className='text-text-primary font-medium'>{artifact.name}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    render: (artifact) => (
      <span className='text-text-secondary font-mono text-xs'>{artifact.media_type}</span>
    ),
  },
  {
    key: 'size',
    header: 'Size',
    render: (artifact) => (
      <span className='text-text-secondary font-mono text-xs'>
        {formatBytes(artifact.size_bytes)}
      </span>
    ),
  },
  {
    key: 'checksum',
    header: 'Checksum',
    render: (artifact) => (
      <span className='text-text-secondary font-mono text-xs'>
        {formatChecksum(artifact.checksum)}
      </span>
    ),
  },
];

const LOG_TONE: Record<RunLogLine['severity'], string> = {
  debug: 'text-text-muted',
  info: 'text-text-secondary',
  warning: 'text-warning',
  error: 'text-danger',
};

export const RunView = ({ runId }: { runId: string }) => {
  const run = useQuery({ queryKey: ['run', runId], queryFn: () => fetchRun(runId) });
  const artifacts = useQuery({
    queryKey: ['run-artifacts', runId],
    queryFn: () => fetchRunArtifacts(runId),
  });
  const logs = useQuery({ queryKey: ['run-logs', runId], queryFn: () => fetchRunLogs(runId) });

  if (run.isLoading) {
    return <LoadingState label='Loading run…' />;
  }
  if (run.isError) {
    return <ErrorState message={toErrorMessage(run.error)} />;
  }
  if (!run.data) {
    return <ErrorState title='Run not found' message='This run is unavailable.' />;
  }

  const data = run.data;
  const parameterEntries = Object.entries(data.parameters);

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={data.pipeline_name}
        description={`Run ${runId}`}
        breadcrumbs={[{ label: 'Runs', href: '/app/runs' }, { label: data.pipeline_name }]}
        actions={
          <StatusBadge tone={runStatusTone(data.status)} label={runStatusLabel(data.status)} />
        }
      />

      {data.error ? (
        <div role='alert' className='alert alert-soft alert-error'>
          <div>
            <p className='text-sm font-semibold'>{data.error.code}</p>
            <p className='text-sm'>{data.error.message}</p>
          </div>
        </div>
      ) : null}

      <Card title='Provenance'>
        <MetadataGrid
          columns={3}
          items={[
            {
              label: 'Pipeline',
              value: (
                <Link href={`/app/pipelines`} className='text-accent hover:underline'>
                  {data.pipeline_name} · v{data.pipeline_version}
                </Link>
              ),
            },
            {
              label: 'Dataset',
              value: (
                <Link
                  href={`/app/datasets/${data.dataset_id}`}
                  className='text-accent hover:underline'>
                  {data.dataset_name} · v{data.dataset_version}
                </Link>
              ),
            },
            { label: 'Status', value: runStatusLabel(data.status) },
            { label: 'Requested', value: formatDateTime(data.requested_at) },
            { label: 'Started', value: formatDateTime(data.started_at) },
            {
              label: 'Elapsed',
              value: formatElapsed(data.started_at, data.finished_at),
              mono: true,
            },
          ]}
        />
      </Card>

      <Card title='Parameters'>
        {parameterEntries.length > 0 ? (
          <MetadataGrid
            columns={3}
            items={parameterEntries.map(([key, value]) => ({
              label: key,
              value: String(value),
              mono: true,
            }))}
          />
        ) : (
          <p className='text-text-secondary text-sm'>This run was submitted without parameters.</p>
        )}
      </Card>

      <Card title='Artifacts' description='Outputs are content-addressed and downloadable.'>
        {artifacts.isLoading ? (
          <LoadingState label='Loading artifacts…' />
        ) : artifacts.isError ? (
          <ErrorState message={toErrorMessage(artifacts.error)} />
        ) : artifacts.data && artifacts.data.items.length > 0 ? (
          <DataTable
            columns={artifactColumns}
            rows={artifacts.data.items}
            getRowKey={(artifact) => artifact.id}
          />
        ) : (
          <p className='text-text-secondary text-sm'>No artifacts have been produced yet.</p>
        )}
      </Card>

      <Card title='Logs'>
        {logs.isLoading ? (
          <LoadingState label='Loading logs…' />
        ) : logs.isError ? (
          <ErrorState message={toErrorMessage(logs.error)} />
        ) : logs.data && logs.data.items.length > 0 ? (
          <ol className='flex max-h-80 flex-col gap-1 overflow-y-auto font-mono text-xs'>
            {logs.data.items.map((line, index) => (
              <li key={`${line.timestamp}-${index}`} className='flex gap-3'>
                <span className='text-text-muted shrink-0'>{formatDateTime(line.timestamp)}</span>
                <span className={`${LOG_TONE[line.severity]} shrink-0 uppercase`}>
                  {line.severity}
                </span>
                <span className='text-text-secondary truncate'>{line.message}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className='text-text-secondary text-sm'>No log output has been recorded.</p>
        )}
      </Card>

      <div>
        <Link href='/app/runs' className={buttonClasses('ghost', 'sm')}>
          Back to runs
        </Link>
      </div>
    </div>
  );
};
