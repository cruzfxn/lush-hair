'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiFetch, formatNairaFromKobo, isCartUnavailable } from '../../lib/api';
import { useCartStore } from './store';

type CartItem = { id: number; productName: string; selectedOptions: Record<string, string>; selectedColour: string; unitPrice: number; quantity: number; available: boolean };
type Cart = { id: string; items: CartItem[] };

export function CartDrawer({ open, onClose, onCount }: { open: boolean; onClose: () => void; onCount: (count: number) => void }) {
  const router = useRouter();
  const drawer = useRef<HTMLElement>(null);
  const cartId = useCartStore((state) => state.cartId);
  const token = useCartStore((state) => state.token);
  const setCartId = useCartStore((state) => state.setCartId);
  const setLastOrder = useCartStore((state) => state.setLastOrder);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);
  const total = cart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0;
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  useEffect(() => { onCount(count); }, [count, onCount]);

  const load = useCallback(async () => {
    if (!cartId) { setCart(null); setLoading(false); return; }
    setLoading(true); setError('');
    try { setCart(await apiFetch<Cart>(`/cart/${encodeURIComponent(cartId)}`, { headers })); }
    catch (failure) {
      if (isCartUnavailable(failure)) { setCartId(null); setCart(null); }
      else setError(failure instanceof ApiError ? failure.message : 'We could not load your bag.');
    } finally { setLoading(false); }
  }, [cartId, headers, setCartId]);

  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => { if (!cartId) setCart(null); }, [cartId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => drawer.current?.focus());
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && drawer.current) {
        const focusable = [...drawer.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled)')];
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keys);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keys); previous?.focus(); };
  }, [open, onClose]);

  async function mutate(itemId: number, method: 'PATCH' | 'DELETE', quantity?: number) {
    if (!cartId) return;
    setBusy(true); setError('');
    try { setCart(await apiFetch<Cart>(`/cart/${encodeURIComponent(cartId)}/items/${itemId}`, { method, headers, ...(method === 'PATCH' ? { body: JSON.stringify({ quantity }) } : {}) })); }
    catch (failure) { if (isCartUnavailable(failure)) { setCartId(null); setCart(null); } else setError(failure instanceof ApiError ? failure.message : 'We could not update your bag.'); }
    finally { setBusy(false); }
  }

  async function checkout() {
    if (!token) { onClose(); router.push('/login?returnTo=%2Fcart'); return; }
    if (!cartId || !cart?.items.length || cart.items.some((item) => !item.available)) return;
    setCheckoutBusy(true); setError('');
    try {
      const order = await apiFetch<{ id: string; total: number; items: Array<{ id: number; name: string; selectedOptions: Record<string, string>; selectedColour: string; unitPrice: number; quantity: number }> }>('/orders/checkout', { method: 'POST', headers, body: JSON.stringify({ cartId }) });
      setLastOrder(order); setCartId(null); onClose(); router.push('/orders/confirmation');
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'Checkout failed. Please try again.'); }
    finally { setCheckoutBusy(false); }
  }

  return <div className={`drawer-backdrop${open ? ' drawer-open' : ''}`} aria-hidden={!open} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="cart-drawer" ref={drawer} role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1}>
      <div className="drawer-heading"><div><p className="eyebrow">YOUR SELECTION</p><h2 id="drawer-title">Your bag <span>({count})</span></h2></div><button className="drawer-close" type="button" onClick={onClose} aria-label="Close bag">×</button></div>
      {loading ? <div className="drawer-empty" role="status">Loading your bag…</div> : !cart?.items.length ? <div className="drawer-empty"><p>Your bag is waiting.</p><Link className="button button-primary" href="/#curated" onClick={onClose}>Explore the collection</Link></div> : <>
        <div className="drawer-items">{cart.items.map((item) => <article className="drawer-item" key={item.id}>
          <div className="drawer-item-copy"><div><h3>{item.productName}</h3><p>{Object.values(item.selectedOptions).join(' · ')}{item.selectedColour ? ` · ${item.selectedColour}` : ''}</p></div><strong>{formatNairaFromKobo(item.unitPrice * item.quantity)}</strong></div>
          {!item.available && <p className="drawer-unavailable">Unavailable · remove to continue</p>}
          <div className="drawer-item-controls"><label>Qty <select value={item.quantity} disabled={busy} aria-label={`Quantity for ${item.productName}`} onChange={(event) => void mutate(item.id, 'PATCH', Number(event.target.value))}>{Array.from({ length: 10 }, (_, i) => i + 1).map((qty) => <option key={qty}>{qty}</option>)}</select></label><button type="button" disabled={busy} onClick={() => void mutate(item.id, 'DELETE')}>Remove</button></div>
        </article>)}</div>
        <div className="drawer-summary"><p className="drawer-subtotal"><span>Subtotal</span><strong>{formatNairaFromKobo(total)}</strong></p><p className="drawer-note">Shipping calculated at checkout.</p><button className="button button-primary" type="button" disabled={checkoutBusy || cart.items.some((item) => !item.available)} onClick={() => void checkout()}>{checkoutBusy ? 'Processing…' : 'Checkout'}</button><Link className="drawer-view-cart" href="/cart" onClick={onClose}>View full bag</Link></div>
      </>}
      {error && <p className="drawer-error" role="alert">{error}</p>}
    </aside>
  </div>;
}
