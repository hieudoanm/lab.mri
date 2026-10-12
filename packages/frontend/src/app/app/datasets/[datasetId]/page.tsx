import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/atoms/states';

import { DatasetView } from './dataset-view';

export const metadata: Metadata = { title: 'Dataset' };

const DatasetContent = async ({
  params,
}: {
  params: PageProps<'/app/datasets/[datasetId]'>['params'];
}) => {
  const { datasetId } = await params;
  return <DatasetView datasetId={datasetId} />;
};

const DatasetPage = (props: PageProps<'/app/datasets/[datasetId]'>) => {
  return (
    <Suspense fallback={<LoadingState label='Loading dataset…' />}>
      <DatasetContent params={props.params} />
    </Suspense>
  );
};

export default DatasetPage;
