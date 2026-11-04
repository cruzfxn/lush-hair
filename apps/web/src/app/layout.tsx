import type { Metadata } from 'next';
import { SiteHeader } from '../features/account/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lush Hair | Made for you',
  description: 'Shop thoughtfully made wigs, bundles and finishing pieces.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
