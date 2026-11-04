'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '../cart/store';
import { isAdminToken } from './admin-auth';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const token = useCartStore((state) => state.token);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return <main className="store-shell admin-shell"><div className="loading-panel" aria-label="Checking access" /></main>;
  }
  if (!isAdminToken(token)) {
    return (
      <main className="store-shell admin-shell">
        <section className="notice-card admin-denied" role="alert">
          <p className="eyebrow">ADMIN AREA</p>
          <h1>Not authorised</h1>
          <p>This area is for logged-in administrators. Sign in with an admin account to continue.</p>
          <Link className="primary-link-button" href="/login?returnTo=%2Fadmin">Go to login</Link>
        </section>
      </main>
    );
  }

  return (
    <div className="store-shell admin-shell">
      <nav className="admin-subnav" aria-label="Admin navigation">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/products">Products</Link>
        <Link href="/admin/products/new">Add product</Link>
      </nav>
      {children}
    </div>
  );
}
