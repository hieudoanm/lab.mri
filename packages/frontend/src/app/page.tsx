import Link from 'next/link';

import { ThemeToggle } from '@/components/atoms/theme-toggle';

const CAPABILITIES = [
  {
    title: 'View',
    body: 'Multiplanar navigation of real brain volumes with linked crosshairs, coordinate readouts, atlas overlays, and annotations.',
  },
  {
    title: 'Compute',
    body: 'Versioned pipelines and reproducible runs that record their inputs, parameters, container digest, and provenance.',
  },
  {
    title: 'Share',
    body: 'Explicit, scoped sharing with visible licence and citation, backed by checksums and immutable dataset versions.',
  },
];

const LandingPage = () => {
  return (
    <div className='bg-background min-h-screen'>
      <header className='border-border border-b'>
        <div className='mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6'>
          <Link href='/' className='flex items-center gap-2.5'>
            <span
              aria-hidden='true'
              className='bg-accent text-background flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-bold'>
              M
            </span>
            <span className='text-text-primary text-[15px] font-semibold tracking-tight'>
              MRI Lab
            </span>
          </Link>
          <nav className='flex items-center gap-4 text-sm'>
            <ThemeToggle />
            <Link
              href='/app/projects'
              className='text-text-secondary hover:text-text-primary font-medium'>
              Explore
            </Link>
            <Link href='/login' className='text-text-secondary hover:text-text-primary font-medium'>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-4 sm:px-6'>
        <section className='py-16 sm:py-24'>
          <span className='border-border bg-surface-muted text-text-secondary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium'>
            <span aria-hidden='true' className='bg-success h-1.5 w-1.5 rounded-full' />
            Private by default
          </span>
          <h1 className='text-text-primary mt-5 max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl'>
            Explore real brain MRI data and run computational neuroscience experiments.
          </h1>
          <p className='text-text-secondary mt-5 max-w-2xl text-base'>
            Manage NIfTI datasets, run reproducible image-processing pipelines, and share traceable
            results — all in the cloud, all in one project-scoped workbench.
          </p>
          <div className='mt-8 flex flex-wrap items-center gap-3'>
            <Link href='/login' className='btn btn-primary'>
              Explore the sample scan
            </Link>
            <Link href='/login' className='btn btn-outline'>
              Sign in
            </Link>
          </div>
        </section>

        <section aria-label='Capabilities' className='grid gap-4 pb-16 sm:grid-cols-3'>
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className='card border-border bg-surface border p-5'>
              <h2 className='text-text-primary text-lg font-semibold'>{capability.title}</h2>
              <p className='text-text-secondary mt-2 text-sm'>{capability.body}</p>
            </div>
          ))}
        </section>

        <section className='border-border bg-surface mb-16 rounded-xl border p-6'>
          <div className='border-border bg-surface-muted text-text-muted flex h-40 items-center justify-center rounded-lg border border-dashed font-mono text-sm'>
            Multiplanar viewer preview — axial · coronal · sagittal
          </div>
          <div className='mt-5 flex flex-wrap items-start justify-between gap-4'>
            <div>
              <h2 className='text-text-primary text-base font-semibold'>IXI sample brain</h2>
              <p className='text-text-secondary mt-1 max-w-xl text-sm'>
                A public, anonymised T1-weighted volume for read-only exploration. The sample
                project shows its licence and required citation.
              </p>
            </div>
            <Link href='/login' className='btn btn-outline btn-sm'>
              Open in viewer
            </Link>
          </div>
        </section>
      </main>

      <footer className='border-border text-text-muted border-t'>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6'>
          <span>MRI Lab · v0.1.0</span>
          <span>Research use only. Not a medical device and not for clinical diagnosis.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
