import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { themeBootScript } from '@/components/atoms/theme-provider';
import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

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
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mri-lab.example.com',
    siteName: 'MRI Lab',
    title: 'MRI Lab — Computational Neuroimaging Workbench',
    description:
      'Explore brain MRI data, run reproducible computational pipelines, and share traceable results in the cloud.',
    images: [{ url: '/og/og.png', width: 1200, height: 630, alt: 'MRI Lab' }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html lang='en' className={`${inter.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className='min-h-full'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
