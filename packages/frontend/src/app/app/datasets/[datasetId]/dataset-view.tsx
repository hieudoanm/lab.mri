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
import { fetchDataset, fetchDatasetVersions, toErrorMessage } from '@/lib/api';
import type { DatasetVersion } from '@/lib/api/types';
import { formatChecksum, formatDateTime, formatDimensions, formatSpacing } from '@/lib/format';
import { datasetVersionStatusLabel, datasetVersionStatusTone } from '@/lib/status';

export const DatasetView = ({ datasetId }: { datasetId: string }) => {
  const dataset = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => fetchDataset(datasetId),
  });
  const versions = useQuery({
    queryKey: ['dataset-versions', datasetId],
    queryFn: () => fetchDatasetVersions(datasetId),
  });

  if (dataset.isLoading) {
    return <LoadingState label='Loading dataset…' />;
  }
  if (dataset.isError) {
    return <ErrorState message={toErrorMessage(dataset.error)} />;
  }
  if (!dataset.data) {
    return <ErrorState title='Dataset not found' message='This dataset is unavailable.' />;
  }

  const latest = dataset.data.latest_version;
  const spatial = latest?.manifest?.spatial_metadata;

  const versionColumns: DataTableColumn<DatasetVersion>[] = [
    {
      key: 'version',
      header: 'Version',
      render: (version) => <span className='font-mono text-xs'>v{version.version}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (version) => (
        <StatusBadge
          tone={datasetVersionStatusTone(version.status)}
          label={datasetVersionStatusLabel(version.status)}
        />
      ),
    },
    {
      key: 'checksum',
      header: 'Checksum',
      render: (version) => (
        <span className='font-mono text-xs'>{formatChecksum(version.checksum_sha256)}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (version) => (
        <span className='text-text-secondary text-xs'>{formatDateTime(version.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (version) => (
        <Link
          href={`/app/datasets/${datasetId}/viewer?versionId=${version.id}`}
          className={buttonClasses('ghost', 'sm')}>
          Open in viewer
        </Link>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={dataset.data.name}
        description={`${dataset.data.source_type} · ${dataset.data.version_count} version${
          dataset.data.version_count === 1 ? '' : 's'
        }`}
        breadcrumbs={[{ label: 'Datasets', href: '/app/datasets' }, { label: dataset.data.name }]}
        actions={
          latest ? (
            <Link
              href={`/app/datasets/${datasetId}/viewer?versionId=${latest.id}`}
              className={buttonClasses('primary', 'sm')}>
              Open in viewer
            </Link>
          ) : null
        }
      />

      <Card title='Summary'>
        <MetadataGrid
          columns={3}
          items={[
            { label: 'Dataset ID', value: datasetId, mono: true },
            {
              label: 'Project',
              value: (
                <Link
                  href={`/app/projects/${dataset.data.project_id}`}
                  className='text-accent hover:underline'>
                  {dataset.data.project_id}
                </Link>
              ),
            },
            { label: 'Source', value: dataset.data.source_type },
            { label: 'Latest version', value: latest ? `v${latest.version}` : '—' },
            { label: 'Created', value: formatDateTime(dataset.data.created_at) },
            { label: 'Updated', value: formatDateTime(dataset.data.updated_at) },
          ]}
        />
      </Card>

      {spatial ? (
        <Card title='Spatial metadata' description='Recorded from the NIfTI header at import.'>
          <MetadataGrid
            columns={3}
            items={[
              { label: 'Modality', value: spatial.modality },
              { label: 'Dimensions', value: formatDimensions(spatial.dimensions), mono: true },
              {
                label: 'Voxel spacing',
                value: formatSpacing(spatial.voxel_spacing_mm),
                mono: true,
              },
              { label: 'Orientation', value: spatial.orientation, mono: true },
              { label: 'Data type', value: spatial.data_type, mono: true },
              { label: 'Checksum', value: formatChecksum(latest?.checksum_sha256), mono: true },
            ]}
          />
        </Card>
      ) : null}

      <Card title='Versions' description='Versions are immutable once created.'>
        {versions.isLoading ? (
          <LoadingState label='Loading versions…' />
        ) : versions.isError ? (
          <ErrorState message={toErrorMessage(versions.error)} />
        ) : versions.data && versions.data.items.length > 0 ? (
          <DataTable
            columns={versionColumns}
            rows={versions.data.items}
            getRowKey={(version) => version.id}
          />
        ) : (
          <ErrorState title='No versions' message='This dataset has no recorded versions yet.' />
        )}
      </Card>
    </div>
  );
};
