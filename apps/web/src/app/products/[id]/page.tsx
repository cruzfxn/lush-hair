import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductDetail } from '../../../features/products/product-detail';
import { ApiError, getProduct } from '../../../lib/api';
import { siteConfig } from '../../../site-config';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    return <ProductDetail product={product} />;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    const message = error instanceof Error ? error.message : 'The store API is unavailable.';
    return (
      <main className="store-shell">
        <header className="store-header"><Link className="brand-mark" href="/"><span>{siteConfig.brand.wordmark}</span><small>{siteConfig.brand.descriptor}</small></Link></header>
        <div className="notice-card" role="alert">
          <h1>We couldn’t load this product.</h1>
          <p>{message}</p>
          <Link className="text-link" href="/">Return to the collection</Link>
        </div>
      </main>
    );
  }
}
