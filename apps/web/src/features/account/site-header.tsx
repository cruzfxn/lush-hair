'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '../cart/store';
import { isAdminToken } from '../admin/admin-auth';

export function SiteHeader() {
  const router = useRouter();
  const token = useCartStore((state) => state.token);
  const customerName = useCartStore((state) => state.customerName);
  const clearAuth = useCartStore((state) => state.clearAuth);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  function logout() {
    clearAuth();
    router.push('/');
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand-mark" href="/" aria-label="Lush Hair home">LUSH<span>HAIR</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/">Shop</Link>
          <Link href="/cart">Cart</Link>
          {ready && isAdminToken(token) && <Link href="/admin">Admin</Link>}
          {ready && token ? (
            <>
              <span className="account-greeting">{customerName || 'Account'}</span>
              <button className="nav-button" type="button" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
