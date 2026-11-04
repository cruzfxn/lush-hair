'use client';

import Link from 'next/link';
import { useCartStore } from '../../../features/cart/store';
import { formatNairaFromKobo } from '../../../lib/api';

export default function OrderConfirmationPage() {
  const order = useCartStore((state) => state.lastOrder);

  if (!order) {
    return (
      <main className="store-shell confirmation-page">
        <section className="notice-card"><h1>No recent order found</h1><p>Place an order from your cart to see the confirmation here.</p><Link className="text-link" href="/cart">Return to cart</Link></section>
      </main>
    );
  }

  return (
    <main className="store-shell confirmation-page">
      <section className="confirmation-card">
        <p className="eyebrow">ORDER PLACED</p>
        <h1>Thank you for your order.</h1>
        <p className="order-number">Order number <strong>{order.id}</strong></p>
        <div className="confirmation-items">
          {order.items.map((item) => {
            const options = Object.entries(item.selectedOptions).map(([name, value]) => `${name}: ${value}`).join(' · ');
            return (
              <div className="confirmation-item" key={item.id}>
                <div><strong>{item.name}</strong><p>{options}{options ? ' · ' : ''}Colour: {item.selectedColour} · Qty {item.quantity}</p></div>
                <span>{formatNairaFromKobo(item.unitPrice * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="summary-total"><span>Order total</span><strong>{formatNairaFromKobo(order.total)}</strong></div>
        <p className="payment-note">Payment isn’t set up yet. This placed your order only; no payment was taken.</p>
        <Link className="primary-link-button" href="/">Continue shopping</Link>
      </section>
    </main>
  );
}
