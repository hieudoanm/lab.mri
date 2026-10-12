'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/atoms/button';
import { DataTable, type DataTableColumn } from '@/components/atoms/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { TextField } from '@/components/atoms/text-field';
import { TextareaField } from '@/components/atoms/textarea-field';
import { PageHeader } from '@/components/molecules/page-header';
import { createProject, fetchProjects, toErrorMessage } from '@/lib/api';
import type { ProjectSummary } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { projectStatusLabel, projectStatusOf, projectStatusTone } from '@/lib/status';

const columns: DataTableColumn<ProjectSummary>[] = [
  {
    key: 'name',
    header: 'Project',
    render: (project) => (
      <div className='flex flex-col'>
        <Link
          href={`/app/projects/${project.id}`}
          className='text-accent font-medium hover:underline'>
          {project.name}
        </Link>
        {project.description ? (
          <span className='text-text-muted line-clamp-1 text-xs'>{project.description}</span>
        ) : null}
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    render: (project) => <span className='text-text-secondary capitalize'>{project.role}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (project) => (
      <StatusBadge
        tone={projectStatusTone(projectStatusOf(project.archived_at))}
        label={projectStatusLabel(projectStatusOf(project.archived_at))}
      />
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

export const ProjectsView = () => {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: ['projects', { limit: 50 }],
    queryFn: () => fetchProjects({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => createProject({ name: name.trim(), description: description.trim() || null }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setFormError(null);
      dialogRef.current?.close();
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => setFormError(toErrorMessage(error)),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setFormError('A project name is required.');
      return;
    }
    setFormError(null);
    createMutation.mutate();
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Projects'
        description='Organise datasets, pipelines, and runs into project-scoped workspaces.'
        actions={
          <Button size='sm' onClick={() => dialogRef.current?.showModal()}>
            New project
          </Button>
        }
      />

      {projects.isLoading ? (
        <LoadingState label='Loading projects…' />
      ) : projects.isError ? (
        <ErrorState
          message={toErrorMessage(projects.error)}
          action={
            <Button size='sm' onClick={() => projects.refetch()}>
              Retry
            </Button>
          }
        />
      ) : projects.data && projects.data.items.length > 0 ? (
        <DataTable
          columns={columns}
          rows={projects.data.items}
          getRowKey={(project) => project.id}
        />
      ) : (
        <EmptyState
          title='No projects yet'
          description='Create your first project to upload datasets and run reproducible analyses.'
          action={
            <Button size='sm' onClick={() => dialogRef.current?.showModal()}>
              Create project
            </Button>
          }
        />
      )}

      <dialog ref={dialogRef} className='modal'>
        <div className='modal-box border-border bg-surface border'>
          <h2 className='text-text-primary text-lg font-semibold'>New project</h2>
          <form className='mt-4 flex flex-col gap-4' onSubmit={handleSubmit}>
            <TextField
              name='name'
              label='Name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder='Alzheimer cohort study'
              required
            />
            <TextareaField
              name='description'
              label='Description'
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='What is this project for?'
            />
            {formError ? (
              <p role='alert' className='text-danger text-sm'>
                {formError}
              </p>
            ) : null}
            <div className='modal-action'>
              <Button variant='ghost' onClick={() => dialogRef.current?.close()}>
                Cancel
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create project'}
              </Button>
            </div>
          </form>
        </div>
        <form method='dialog' className='modal-backdrop'>
          <button type='submit' aria-label='Close'>
            close
          </button>
        </form>
      </dialog>
    </div>
  );
};
