import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/atoms/states';

import { RunView } from './run-view';

export const metadata: Metadata = { title: 'Run' };

const RunContent = async ({ params }: { params: PageProps<'/app/runs/[runId]'>['params'] }) => {
  const { runId } = await params;
  return <RunView runId={runId} />;
};

const RunPage = (props: PageProps<'/app/runs/[runId]'>) => {
  return (
    <Suspense fallback={<LoadingState label='Loading run…' />}>
      <RunContent params={props.params} />
    </Suspense>
  );
};

export default RunPage;
