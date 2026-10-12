'use client';

import { Button } from '@/components/atoms/button';
import { ErrorState } from '@/components/atoms/states';

const RootError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  return (
    <main className='mx-auto w-full max-w-2xl px-4 py-12'>
      <ErrorState
        title='Something went wrong'
        message={error.message || 'An unexpected error occurred.'}
        requestId={error.digest ?? null}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
};

export default RootError;
