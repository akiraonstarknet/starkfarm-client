import React from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';

import Providers from '@/components/Providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Troves | Yield strategies on Starknet',
  description:
    'Find and invest in high yield pools. Troves is the best Yield strategies on Starknet.',
  openGraph: {
    title: 'Troves | Yield strategies on Starknet',
    description:
      'Find and invest in high yield pools. Troves is the best Yield strategies on Starknet.',
    images: ['https://static-assets-8zct.onrender.com/troves/og-img-png.png'],
    url: 'https://app.troves.fi',
    type: 'website',
    siteName: 'Troves.fi',
  },
  twitter: {
    creator: '@trovesfi',
    title: 'Troves | Yield strategies on Starknet',
    description:
      'Find and invest in high yield pools. Troves is the best Yield strategies on Starknet.',
    card: 'player',
    images: ['https://static-assets-8zct.onrender.com/troves/og-img-png.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <meta name="theme-color" content="black" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body style={{ background: 'black' }}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-K05JV94KM9" />
    </html>
  );
}
