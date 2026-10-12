'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { buttonClasses } from '@/components/atoms/button';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchDatasets, toErrorMessage } from '@/lib/api';
import type { Dataset } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { datasetVersionStatusLabel, datasetVersionStatusTone } from '@/lib/status';

const columns: DataTableColumn<Dataset>[] = [
  {
    key: 'name',
    header: 'Dataset',
    render: (dataset) => (
      <Link
        href={`/app/datasets/${dataset.id}`}
        className='text-accent font-medium hover:underline'>
        {dataset.name}
      </Link>
    ),
  },
  {
    key: 'source',
    header: 'Source',
    render: (dataset) => (
      <span className='text-text-secondary capitalize'>{dataset.source_type}</span>
    ),
  },
  {
    key: 'version',
    header: 'Latest version',
    render: (dataset) =>
      dataset.latest_version ? (
        <div className='flex items-center gap-2'>
          <span className='font-mono text-xs'>v{dataset.latest_version.version}</span>
          <StatusBadge
            tone={datasetVersionStatusTone(dataset.latest_version.status)}
            label={datasetVersionStatusLabel(dataset.latest_version.status)}
          />
        </div>
      ) : (
        <span className='text-text-muted'>—</span>
      ),
  },
  {
    key: 'versions',
    header: 'Versions',
    render: (dataset) => <span className='text-text-secondary'>{dataset.version_count}</span>,
  },
  {
    key: 'created',
    header: 'Created',
    render: (dataset) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(dataset.created_at)}</span>
    ),
  },
];

export const DatasetsView = () => {
  const datasets = useQuery({
    queryKey: ['datasets', { limit: 50 }],
    queryFn: () => fetchDatasets({ limit: 50 }),
  });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Datasets'
        description='Immutable, versioned MRI datasets with recorded provenance and checksums.'
      />

      {datasets.isLoading ? (
        <LoadingState label='Loading datasets…' />
      ) : datasets.isError ? (
        <ErrorState
          message={toErrorMessage(datasets.error)}
          action={
            <button
              type='button'
              className={buttonClasses('secondary', 'sm')}
              onClick={() => datasets.refetch()}>
              Retry
            </button>
          }
        />
      ) : datasets.data && datasets.data.items.length > 0 ? (
        <DataTable
          columns={columns}
          rows={datasets.data.items}
          getRowKey={(dataset) => dataset.id}
        />
      ) : (
        <EmptyState
          title='No datasets yet'
          description='Datasets appear here once a NIfTI volume has been uploaded to one of your projects.'
          action={
            <Link href='/app/projects' className={buttonClasses('secondary', 'sm')}>
              Go to projects
            </Link>
          }
        />
      )}
    </div>
  );
};
