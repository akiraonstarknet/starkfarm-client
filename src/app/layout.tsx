import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
// import { Inter, Courier_Prime } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import React from 'react';
import './globals.css';

// const courier = Courier_Prime({
//   weight: '400',
//   subsets: ['latin']
// });

export const metadata: Metadata = {
  title: 'STRKFarm | Earn $STRK Tokens',
  description: 'Farm on the best pools of Starknet',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-K05JV94KM9" />
    </html>
  );
}
