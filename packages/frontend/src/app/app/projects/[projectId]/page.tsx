import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/atoms/states';

import { ProjectView } from './project-view';

export const metadata: Metadata = { title: 'Project' };

const ProjectContent = async ({
  params,
}: {
  params: PageProps<'/app/projects/[projectId]'>['params'];
}) => {
  const { projectId } = await params;
  return <ProjectView projectId={projectId} />;
};

const ProjectPage = (props: PageProps<'/app/projects/[projectId]'>) => {
  return (
    <Suspense fallback={<LoadingState label='Loading project…' />}>
      <ProjectContent params={props.params} />
    </Suspense>
  );
};

export default ProjectPage;
