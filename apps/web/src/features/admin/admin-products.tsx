'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, Product } from '../../lib/api';
import { useCartStore } from '../cart/store';

export function AdminProducts() {
  const token = useCartStore((state) => state.token);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<Product[]>('/products', { headers: { Authorization: `Bearer ${token}` } });
      setProducts(result);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  async function toggleActive(product: Product) {
    if (!token) return;
    setUpdatingId(product.id);
    setError('');
    try {
      const updated = await apiFetch<Product>(`/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      setProducts((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    } catch (updateError) {
      setError(updateError instanceof ApiError ? updateError.message : 'Could not change product status.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CATALOGUE</p><h1>Products</h1></div>
        <Link className="primary-link-button" href="/admin/products/new">Add product</Link>
      </div>
      <p className="admin-lede">Products marked inactive stay hidden from public shopping.</p>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel" aria-label="Loading products" /> : products.length === 0 ? (
        <div className="notice-card"><h2>No products yet</h2><p>Add your first product to start building the catalogue.</p></div>
      ) : (
        <div className="admin-product-list">
          {products.map((product) => {
            const mainImage = [...(product.images || [])].sort((a, b) => a.sortOrder - b.sortOrder)[0];
            return (
              <article className="admin-product-row" key={product.id}>
                <div className="admin-thumb">
                  {mainImage ? <Image src={mainImage.url} alt={mainImage.altText || product.name} fill sizes="96px" unoptimized /> : <span>No image</span>}
                </div>
                <div className="admin-product-info">
                  <h2>{product.name}</h2>
                  <p>{product.type} · {product.variants?.length ?? 0} variants</p>
                  <span className={`status-pill ${product.isActive ? 'status-active' : 'status-inactive'}`}>{product.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="admin-product-actions">
                  <Link className="secondary-button" href={`/admin/products/${product.id}`}>Edit</Link>
                  <button className="secondary-button" type="button" disabled={updatingId === product.id} onClick={() => void toggleActive(product)}>
                    {updatingId === product.id ? 'Saving…' : product.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
