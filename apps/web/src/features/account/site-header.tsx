'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useCartStore } from '../cart/store';
import { isAdminToken } from '../admin/admin-auth';
import { CartDrawer } from '../cart/cart-drawer';
import { siteConfig } from '../../site-config';

export function SiteHeader() {
  const router = useRouter();
  const token = useCartStore((state) => state.token);
  const customerName = useCartStore((state) => state.customerName);
  const clearAuth = useCartStore((state) => state.clearAuth);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const updateBagCount = useCallback((count: number) => setBagCount(count), []);
  useEffect(() => setReady(true), []);
  useEffect(() => { if (cartOpen || mobileOpen) document.body.classList.add('overlay-open'); else document.body.classList.remove('overlay-open'); return () => document.body.classList.remove('overlay-open'); }, [cartOpen, mobileOpen]);

  function logout() { clearAuth(); router.push('/'); setMobileOpen(false); }
  function links() { return <>
    <Link href="/#curated" onClick={() => setMobileOpen(false)}>Shop</Link>
    <a href={siteConfig.links.wholesale} onClick={() => setMobileOpen(false)}>Wholesale</a>
    {ready && isAdminToken(token) && <Link href="/admin" onClick={() => setMobileOpen(false)}>Admin</Link>}
    {ready && token ? <><span className="account-greeting">{customerName || 'Account'}</span><button className="nav-button" type="button" onClick={logout}>Log out</button></> : <Link href="/login" onClick={() => setMobileOpen(false)}>Account</Link>}
  </>; }
  return <>
    <div className="announcement-bar">{siteConfig.announcement}</div>
    <header className="site-header">
      <div className="site-header-inner">
        <button className="mobile-menu-toggle" type="button" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X /> : <Menu />}</button>
        <Link className="brand-mark" href="/" aria-label={`${siteConfig.brand.name} home`}>
          <span className="brand-wordmark"><span>{siteConfig.brand.wordmark}</span><small>{siteConfig.brand.descriptor}</small></span>
        </Link>
        <nav className="site-nav site-nav-desktop" aria-label="Main navigation">{links()}</nav>
        <button className="bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${bagCount} items`}><span>Bag</span><span className="bag-count">{bagCount}</span></button>
      </div>
      {mobileOpen && <nav className="mobile-menu" aria-label="Mobile navigation">{links()}</nav>}
    </header>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCount={updateBagCount} />
  </>;
}
