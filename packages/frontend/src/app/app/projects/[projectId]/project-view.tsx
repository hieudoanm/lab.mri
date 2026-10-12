'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/atoms/card';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { MetadataGrid } from '@/components/atoms/metadata-grid';
import { EmptyState, ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchProject, fetchProjectDatasets, fetchRuns, toErrorMessage } from '@/lib/api';
import type { Dataset, ExperimentRun } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import {
  datasetVersionStatusLabel,
  datasetVersionStatusTone,
  projectStatusLabel,
  projectStatusOf,
  projectStatusTone,
  runStatusLabel,
  runStatusTone,
} from '@/lib/status';

const datasetColumns: DataTableColumn<Dataset>[] = [
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
    key: 'created',
    header: 'Created',
    render: (dataset) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(dataset.created_at)}</span>
    ),
  },
];

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
    key: 'requested',
    header: 'Requested',
    render: (run) => (
      <span className='text-text-secondary text-xs'>{formatDateTime(run.requested_at)}</span>
    ),
  },
];

export const ProjectView = ({ projectId }: { projectId: string }) => {
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  });
  const datasets = useQuery({
    queryKey: ['datasets', { projectId }],
    queryFn: () => fetchProjectDatasets(projectId, { limit: 20 }),
  });
  const runs = useQuery({
    queryKey: ['runs', { projectId }],
    queryFn: () => fetchRuns({ projectId, limit: 20 }),
  });

  if (project.isLoading) {
    return <LoadingState label='Loading project…' />;
  }
  if (project.isError) {
    return <ErrorState message={toErrorMessage(project.error)} />;
  }
  if (!project.data) {
    return <ErrorState title='Project not found' message='This project is unavailable.' />;
  }

  const status = projectStatusOf(project.data.archived_at);

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={project.data.name}
        description={project.data.description ?? 'No description provided.'}
        breadcrumbs={[{ label: 'Projects', href: '/app/projects' }, { label: project.data.name }]}
        actions={
          <StatusBadge tone={projectStatusTone(status)} label={projectStatusLabel(status)} />
        }
      />

      <Card title='Details'>
        <MetadataGrid
          columns={3}
          items={[
            { label: 'Role', value: project.data.role },
            { label: 'Visibility', value: project.data.visibility },
            { label: 'Datasets', value: String(project.data.dataset_count) },
            { label: 'Runs', value: String(project.data.run_count) },
            { label: 'Created', value: formatDateTime(project.data.created_at) },
            { label: 'Updated', value: formatDateTime(project.data.updated_at) },
          ]}
        />
      </Card>

      <Card
        title='Datasets'
        actions={
          <Link href={`/app/datasets?projectId=${projectId}`} className='btn btn-ghost btn-xs'>
            View all
          </Link>
        }>
        {datasets.isLoading ? (
          <LoadingState label='Loading datasets…' />
        ) : datasets.isError ? (
          <ErrorState message={toErrorMessage(datasets.error)} />
        ) : datasets.data && datasets.data.items.length > 0 ? (
          <DataTable
            columns={datasetColumns}
            rows={datasets.data.items}
            getRowKey={(dataset) => dataset.id}
          />
        ) : (
          <EmptyState
            title='No datasets'
            description='Upload a NIfTI volume to create the first dataset version in this project.'
          />
        )}
      </Card>

      <Card title='Recent runs'>
        {runs.isLoading ? (
          <LoadingState label='Loading runs…' />
        ) : runs.isError ? (
          <ErrorState message={toErrorMessage(runs.error)} />
        ) : runs.data && runs.data.items.length > 0 ? (
          <DataTable columns={runColumns} rows={runs.data.items} getRowKey={(run) => run.id} />
        ) : (
          <EmptyState
            title='No runs'
            description='Submit a pipeline against a dataset version to create a run in this project.'
          />
        )}
      </Card>
    </div>
  );
};
