'use client';

import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/atoms/card';
import { MetadataGrid } from '@/components/atoms/metadata-grid';
import { ErrorState, LoadingState } from '@/components/atoms/states';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PageHeader } from '@/components/molecules/page-header';
import { SignOutButton } from '@/components/molecules/sign-out-button';
import { fetchQuotas, toErrorMessage } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { quotaStateLabel, quotaStateTone } from '@/lib/status';

export const SettingsView = ({
  email,
  displayName,
}: {
  email: string | null;
  displayName: string | null;
}) => {
  const quotas = useQuery({ queryKey: ['quotas'], queryFn: () => fetchQuotas() });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title='Settings' description='Your account, workspace usage, and appearance.' />

      <Card title='Account'>
        <MetadataGrid
          columns={2}
          items={[
            { label: 'Display name', value: displayName ?? '—' },
            { label: 'Email', value: email ?? '—' },
          ]}
        />
        <div className='mt-4'>
          <SignOutButton />
        </div>
      </Card>

      <Card title='Workspace usage' description='Quotas applied to your account.'>
        {quotas.isLoading ? (
          <LoadingState label='Loading usage…' />
        ) : quotas.isError ? (
          <ErrorState message={toErrorMessage(quotas.error)} />
        ) : quotas.data && quotas.data.items.length > 0 ? (
          <ul className='flex flex-col gap-3'>
            {quotas.data.items.map((quota) => (
              <li
                key={quota.resource_type}
                className='border-border flex items-center justify-between border-b pb-3 last:border-0 last:pb-0'>
                <span className='text-text-secondary text-sm capitalize'>
                  {quota.resource_type.replace(/_/g, ' ')}
                </span>
                <span className='flex items-center gap-3'>
                  <span className='text-text-primary font-mono text-xs'>
                    {quota.resource_type === 'storage_bytes'
                      ? `${formatBytes(quota.used)} / ${formatBytes(quota.limit)}`
                      : `${quota.used} / ${quota.limit}`}
                  </span>
                  <StatusBadge
                    tone={quotaStateTone(quota.state)}
                    label={quotaStateLabel(quota.state)}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-text-secondary text-sm'>No quota information is available.</p>
        )}
      </Card>

      <Card title='Appearance'>
        <p className='text-text-secondary text-sm'>
          MRI Lab is optimised for a dark, low-glare laboratory environment. The dark theme is
          applied by default and honours your system colour-scheme preference.
        </p>
      </Card>
    </div>
  );
};
