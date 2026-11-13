import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { SiteHeader } from '../features/account/site-header';
import { siteConfig } from '../site-config';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-heading', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  title: `${siteConfig.brand.name} | ${siteConfig.brand.tagline}`,
  description: `${siteConfig.brand.name}: ${siteConfig.brand.tagline}. Discover considered luxury hair, selected for the way you move.`,
  applicationName: siteConfig.brand.name,
  icons: { icon: siteConfig.brand.favicon, shortcut: siteConfig.brand.favicon },
  openGraph: {
    title: `${siteConfig.brand.name} | ${siteConfig.brand.tagline}`,
    description: `${siteConfig.brand.name}: ${siteConfig.brand.tagline}.`,
    siteName: siteConfig.brand.name,
    images: [{ url: siteConfig.brand.openGraphImage, width: 1200, height: 630, alt: siteConfig.brand.name }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.brand.name} | ${siteConfig.brand.tagline}`,
    description: `${siteConfig.brand.name}: ${siteConfig.brand.tagline}.`,
    images: [siteConfig.brand.openGraphImage],
  },
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
