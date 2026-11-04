'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, formatNairaFromKobo, isCartUnavailable } from '../../lib/api';
import { useCartStore } from './store';

type CartItemView = {
  id: number;
  variantId: string;
  productName: string;
  selectedOptions: Record<string, string>;
  selectedColour: string;
  unitPrice: number;
  quantity: number;
  available: boolean;
};

type CartView = { id: string; items: CartItemView[]; checkedOutAt: string | null };

export function CartPage() {
  const router = useRouter();
  const cartId = useCartStore((state) => state.cartId);
  const token = useCartStore((state) => state.token);
  const setCartId = useCartStore((state) => state.setCartId);
  const setLastOrder = useCartStore((state) => state.setLastOrder);
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);
  const total = cart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0;
  const hasUnavailableItems = Boolean(cart?.items.some((item) => !item.available));

  useEffect(() => {
    let current = true;
    if (!cartId) {
      setCart(null);
      setLoading(false);
      setError('');
      return () => { current = false; };
    }

    setLoading(true);
    setError('');
    apiFetch<CartView>(`/cart/${encodeURIComponent(cartId)}`, { headers })
      .then((loadedCart) => { if (current) setCart(loadedCart); })
      .catch((loadError: unknown) => {
        if (!current) return;
        if (isCartUnavailable(loadError)) {
          setCartId(null);
          setCart(null);
          setError('');
          return;
        }
        setError(loadError instanceof ApiError ? loadError.message : 'We could not load your cart. Please try again.');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [cartId, headers, setCartId]);

  async function changeQuantity(itemId: number, quantity: number) {
    if (!cartId) return;
    setBusyItem(itemId);
    setError('');
    try {
      const updated = await apiFetch<CartView>(`/cart/${encodeURIComponent(cartId)}/items/${itemId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ quantity }),
      });
      setCart(updated);
    } catch (mutationError) {
      if (isCartUnavailable(mutationError)) {
        setCartId(null);
        setCart(null);
        setError('');
        return;
      }
      setError(mutationError instanceof ApiError ? mutationError.message : 'We could not update this item.');
    } finally {
      setBusyItem(null);
    }
  }

  async function removeItem(itemId: number) {
    if (!cartId) return;
    setBusyItem(itemId);
    setError('');
    try {
      const updated = await apiFetch<CartView>(`/cart/${encodeURIComponent(cartId)}/items/${itemId}`, { method: 'DELETE', headers });
      setCart(updated);
    } catch (mutationError) {
      if (isCartUnavailable(mutationError)) {
        setCartId(null);
        setCart(null);
        setError('');
        return;
      }
      setError(mutationError instanceof ApiError ? mutationError.message : 'We could not remove this item.');
    } finally {
      setBusyItem(null);
    }
  }

  async function checkout() {
    if (!token) {
      router.push('/login?returnTo=%2Fcart');
      return;
    }
    if (!cartId || !cart?.items.length || hasUnavailableItems) return;
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const order = await apiFetch<{
        id: string;
        total: number;
        items: Array<{ id: number; name: string; selectedOptions: Record<string, string>; selectedColour: string; unitPrice: number; quantity: number }>;
      }>('/orders/checkout', {
        method: 'POST', headers, body: JSON.stringify({ cartId }),
      });
      setLastOrder(order);
      setCartId(null);
      router.push('/orders/confirmation');
    } catch (checkoutFailure) {
      setCheckoutError(checkoutFailure instanceof ApiError ? checkoutFailure.message : 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="store-shell cart-page">
      <div className="cart-heading">
        <div><p className="eyebrow">YOUR SELECTION</p><h1>Your cart</h1></div>
        <Link className="text-link" href="/">Continue shopping</Link>
      </div>

      {loading ? <div className="loading-panel" aria-label="Loading cart" /> : error ? (
        <div className="notice-card" role="alert"><h2>We couldn’t load your cart.</h2><p>{error}</p></div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="notice-card cart-empty"><h2>Your cart is empty</h2><p>Find a style you love and add it here.</p><Link className="primary-link-button" href="/">Browse the collection</Link></div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Cart items">
            {cart.items.map((item) => {
              const optionLabel = Object.entries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`).join(' · ');
              return (
                <article className={`cart-item${item.available ? '' : ' cart-item-unavailable'}`} key={item.id}>
                  <div className="cart-item-main">
                    <div>
                      <h2>{item.productName}</h2>
                      <p>{optionLabel ? `${optionLabel} · ` : ''}Colour: {item.selectedColour}</p>
                      {!item.available && <p className="unavailable-label" role="status">Unavailable — remove this item before checkout.</p>}
                    </div>
                    <strong>{formatNairaFromKobo(item.unitPrice)}</strong>
                  </div>
                  <div className="cart-item-controls">
                    <label className="quantity-control">Quantity
                      <select aria-label={`Quantity for ${item.productName}`} value={item.quantity} disabled={busyItem === item.id} onChange={(event) => void changeQuantity(item.id, Number(event.target.value))}>
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                      </select>
                    </label>
                    <span className="line-total">Line total <strong>{formatNairaFromKobo(item.unitPrice * item.quantity)}</strong></span>
                    <button className="remove-button" type="button" disabled={busyItem === item.id} onClick={() => void removeItem(item.id)}>Remove</button>
                  </div>
                </article>
              );
            })}
            {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          </section>

          <aside className="cart-summary">
            <p className="eyebrow">ORDER SUMMARY</p>
            <div className="summary-total"><span>Total</span><strong>{formatNairaFromKobo(total)}</strong></div>
            <p className="summary-note">Prices are shown in Nigerian naira.</p>
            {hasUnavailableItems && <p className="form-message form-message-error" role="alert">Remove unavailable items to continue to checkout.</p>}
            {checkoutError && <p className="form-message form-message-error" role="alert">{checkoutError}</p>}
            <button className="primary-button" type="button" disabled={checkingOut || hasUnavailableItems} onClick={() => void checkout()}>
              {checkingOut ? 'Placing order…' : token ? 'Checkout' : 'Log in to checkout'}
            </button>
            <p className="payment-note">Payment isn’t set up yet. Checkout places your order only; it does not charge you.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
