import { siteConfig } from '../site-config';

export default function Loading() {
  return (
    <main className="store-shell" aria-label="Loading store">
      <header className="store-header"><span className="brand-mark"><span>{siteConfig.brand.wordmark}</span><small>{siteConfig.brand.descriptor}</small></span></header>
      <div className="loading-panel" />
      <div className="loading-panel" />
    </main>
  );
}
