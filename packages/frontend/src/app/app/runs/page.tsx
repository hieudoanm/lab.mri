import type { Metadata } from 'next';

import { RunsView } from './runs-view';

export const metadata: Metadata = { title: 'Runs' };

const RunsPage = () => {
  return <RunsView />;
};

export default RunsPage;
