import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/atoms/states';
import { getSessionUserHint } from '@/lib/session';

import { SettingsView } from './settings-view';

export const metadata: Metadata = { title: 'Settings' };

const SettingsContent = async () => {
  const user = await getSessionUserHint();
  return <SettingsView email={user?.email ?? null} displayName={user?.displayName ?? null} />;
};

const SettingsPage = () => {
  return (
    <Suspense fallback={<LoadingState label='Loading settings…' />}>
      <SettingsContent />
    </Suspense>
  );
};

export default SettingsPage;
