'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, Cart } from '../../lib/api';
import { useCartStore } from '../cart/store';

type AccountFormProps = { mode: 'login' | 'register' };
type LoginResponse = { access_token: string };
type RegisteredUser = { email: string; firstName: string; lastName: string };

function returnPath(): string {
  if (typeof window === 'undefined') return '/';
  const target = new URLSearchParams(window.location.search).get('returnTo');
  return target?.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export function AccountForm({ mode }: AccountFormProps) {
  const router = useRouter();
  const setAuth = useCartStore((state) => state.setAuth);
  const cartId = useCartStore((state) => state.cartId);
  const setCartId = useCartStore((state) => state.setCartId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let displayName = email.trim();
      if (mode === 'register') {
        const user = await apiFetch<RegisteredUser>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, firstName, lastName }),
        });
        displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      }

      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      let cartToKeep: string | null = null;
      if (cartId) {
        try {
          const guestCart = await apiFetch<Cart>(`/cart/${encodeURIComponent(cartId)}`);
          if (guestCart.items?.length) {
            const claimedCart = await apiFetch<Cart>(`/cart/${encodeURIComponent(cartId)}`, {
              headers: { Authorization: `Bearer ${result.access_token}` },
            });
            if (claimedCart.items?.length) cartToKeep = claimedCart.id;
          }
        } catch (cartError) {
          if (cartError instanceof ApiError && cartError.status === 401) throw cartError;
          // Inaccessible, missing, or temporarily unavailable carts must not follow this new session.
        }
      }
      setAuth(result.access_token, displayName);
      setCartId(cartToKeep);
      router.replace(returnPath());
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'We could not complete that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === 'register';
  return (
    <main className="account-page">
      <section className="account-card">
        <p className="eyebrow">LUSH HAIR ACCOUNT</p>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="account-intro">{isRegister ? 'Save your details and keep your order moving.' : 'Log in to continue to your cart and checkout.'}</p>
        <form className="account-form" onSubmit={submit}>
          {isRegister && (
            <div className="name-fields">
              <label className="select-field">First name<input autoComplete="given-name" required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
              <label className="select-field">Last name<input autoComplete="family-name" required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            </div>
          )}
          <label className="select-field">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="select-field">Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="account-switch">
          {isRegister ? 'Already have an account?' : 'New to Lush Hair?'}{' '}
          <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  );
}
