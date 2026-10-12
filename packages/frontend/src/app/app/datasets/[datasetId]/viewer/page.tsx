import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/atoms/states';

import { Viewer } from './viewer';

export const metadata: Metadata = { title: 'Viewer' };

const ViewerContent = async ({
  params,
  searchParams,
}: {
  params: PageProps<'/app/datasets/[datasetId]/viewer'>['params'];
  searchParams: PageProps<'/app/datasets/[datasetId]/viewer'>['searchParams'];
}) => {
  const { datasetId } = await params;
  const { versionId } = await searchParams;
  return (
    <Viewer datasetId={datasetId} versionId={typeof versionId === 'string' ? versionId : null} />
  );
};

const ViewerPage = (props: PageProps<'/app/datasets/[datasetId]/viewer'>) => {
  return (
    <Suspense fallback={<LoadingState label='Loading viewer…' />}>
      <ViewerContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
};

export default ViewerPage;
