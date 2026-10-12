'use client';

import { useQuery } from '@tanstack/react-query';

import { buttonClasses } from '@/components/atoms/button';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchPipelines, toErrorMessage } from '@/lib/api';
import type { Pipeline } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { pipelineVersionStatusLabel, pipelineVersionStatusTone } from '@/lib/status';

const columns: DataTableColumn<Pipeline>[] = [
  {
    key: 'name',
    header: 'Pipeline',
    render: (pipeline) => <span className='text-text-primary font-medium'>{pipeline.name}</span>,
  },
  {
    key: 'version',
    header: 'Latest version',
    render: (pipeline) =>
      pipeline.latest_version ? (
        <div className='flex items-center gap-2'>
          <span className='font-mono text-xs'>v{pipeline.latest_version.version}</span>
          <StatusBadge
            tone={pipelineVersionStatusTone(pipeline.latest_version.status)}
            label={pipelineVersionStatusLabel(pipeline.latest_version.status)}
          />
        </div>
      ) : (
        <span className='text-text-muted'>Not published</span>
      ),
  },
  {
    key: 'versions',
    header: 'Versions',
    render: (pipeline) => <span className='text-text-secondary'>{pipeline.version_count}</span>,
  },
  {
    key: 'runs',
    header: 'Runs',
    render: (pipeline) => <span className='text-text-secondary'>{pipeline.run_count}</span>,
  },
  {
    key: 'updated',
    header: 'Updated',
    render: (pipeline) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(pipeline.updated_at)}</span>
    ),
  },
];

export const PipelinesView = () => {
  const pipelines = useQuery({
    queryKey: ['pipelines', { limit: 50 }],
    queryFn: () => fetchPipelines({ limit: 50 }),
  });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Pipelines'
        description='Versioned analysis pipelines with parameterised, reproducible runs.'
      />

      {pipelines.isLoading ? (
        <LoadingState label='Loading pipelines…' />
      ) : pipelines.isError ? (
        <ErrorState
          message={toErrorMessage(pipelines.error)}
          action={
            <button
              type='button'
              className={buttonClasses('secondary', 'sm')}
              onClick={() => pipelines.refetch()}>
              Retry
            </button>
          }
        />
      ) : pipelines.data && pipelines.data.items.length > 0 ? (
        <DataTable
          columns={columns}
          rows={pipelines.data.items}
          getRowKey={(pipeline) => pipeline.id}
        />
      ) : (
        <EmptyState
          title='No pipelines available'
          description='Published pipelines appear here once they are registered in one of your projects.'
        />
      )}
    </div>
  );
};
