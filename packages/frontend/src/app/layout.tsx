import type { Metadata, Viewport } from 'next';

import { Providers } from '@/components/providers';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MRI Lab',
    template: '%s · MRI Lab',
  },
  description:
    'MRI Lab is a cloud computational neuroimaging workbench for managing MRI datasets, running reproducible pipelines, and sharing traceable results.',
  metadataBase: new URL('https://mri-lab.example.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mri-lab.example.com',
    siteName: 'MRI Lab',
    title: 'MRI Lab — Computational Neuroimaging Workbench',
    description:
      'Explore brain MRI data, run reproducible computational pipelines, and share traceable results in the cloud.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F14',
  width: 'device-width',
  initialScale: 1,
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html lang='en' className='h-full'>
      <body className='min-h-full'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
