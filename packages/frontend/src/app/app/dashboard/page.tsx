import type { Metadata } from 'next';

import { DashboardView } from './dashboard-view';

export const metadata: Metadata = { title: 'Home' };

const DashboardPage = () => {
  return <DashboardView />;
};

export default DashboardPage;
