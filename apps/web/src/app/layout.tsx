import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { SiteHeader } from '../features/account/site-header';
import { siteConfig } from '../site-config';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-heading', display: 'swap' });

export const metadata: Metadata = {
  title: `${siteConfig.brand.name} | ${siteConfig.brand.tagline}`,
  description: siteConfig.brand.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable}`} style={{ '--ink': siteConfig.colors.black, '--ivory': siteConfig.colors.ivory, '--gold': siteConfig.colors.gold, '--bronze': siteConfig.colors.bronze } as React.CSSProperties}><SiteHeader />{children}</body>
    </html>
  );
}
