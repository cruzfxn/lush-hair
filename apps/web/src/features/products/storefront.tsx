'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { formatNairaFromKobo, Product, ProductType } from '../../lib/api';

const productTypes: Array<{ value: ProductType; label: string }> = [
  { value: 'wig', label: 'Wigs' },
  { value: 'bundle', label: 'Bundles' },
  { value: 'closure', label: 'Closures' },
  { value: 'frontal', label: 'Frontals' },
  { value: 'accessory', label: 'Accessories' },
];

export function Storefront({ products, loadError }: { products: Product[]; loadError?: string }) {
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const filteredProducts = useMemo(
    () => typeFilter === 'all' ? products : products.filter((product) => product.type === typeFilter),
    [products, typeFilter],
  );

  return (
    <main className="store-shell">
      <section className="hero-panel">
        <p className="eyebrow">THE EVERYDAY LUXE COLLECTION</p>
        <h1>Good hair days,<br /><em>made for you.</em></h1>
        <p className="hero-copy">Shop ready-to-wear wigs, bundles and finishing pieces made to feel like you.</p>
        <a className="text-link" href="#shop">Explore the collection <span aria-hidden="true">↓</span></a>
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      </section>

      <section className="catalog-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR FINISH</p>
            <h2>The collection</h2>
          </div>
          <label className="filter-control">
            <span>Shop by</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ProductType | 'all')}>
              <option value="all">All styles</option>
              {productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
        </div>

        {loadError ? (
          <div className="notice-card" role="alert">
            <h3>We can’t reach the store right now.</h3>
            <p>{loadError}</p>
            <p>Please check back in a moment.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="notice-card">
            <h3>The collection is being prepared.</h3>
            <p>There are no products to browse just yet. Please check back soon.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="notice-card"><p>No products match this category yet.</p></div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product, index) => {
              const prices = product.variants.filter((variant) => variant.isActive).map((variant) => variant.price);
              const fromPrice = prices.length ? Math.min(...prices) : null;
              const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
              return (
                <Link className="product-card" href={`/products/${product.id}`} key={product.id}>
                  <div className={`product-image product-image-tone-${index % 4}`}>
                    {image ? <Image src={image.url} alt={image.altText || product.name} fill sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw" unoptimized /> : (
                      <div className="image-placeholder" aria-label={`${product.name} image coming soon`}>
                        <span>{product.name}</span>
                      </div>
                    )}
                    <span className="product-type-tag">{product.type}</span>
                  </div>
                  <div className="product-card-copy">
                    <div>
                      <h3>{product.name}</h3>
                      <p>{product.texture || product.origin || 'Made to order'}</p>
                    </div>
                    <span className="product-price">{fromPrice === null ? 'Currently unavailable' : `from ${formatNairaFromKobo(fromPrice)}`}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="store-footer"><span>LUSH HAIR</span><span>Made for the way you wear it.</span></footer>
    </main>
  );
}
