import { useCartStore } from '../features/cart/store';

export type ProductType = 'wig' | 'bundle' | 'closure' | 'frontal' | 'accessory';

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  options: Record<string, string>;
  price: number;
  sku: string;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: ProductType;
  texture: string | null;
  origin: string | null;
  leadTimeDays: number;
  isActive: boolean;
  attributes: Record<string, unknown>;
  availableColours: string[];
  options: ProductOption[];
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Cart {
  id: string;
  items?: unknown[];
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isCartUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || isMissingCart(error));
}

export function isMissingCart(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && /cart/i.test(error.message);
}

export function clearSessionOnUnauthorized(): void {
  if (typeof window !== 'undefined') useCartStore.getState().clearAuth();
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      cache: init.cache ?? 'no-store',
    });
  } catch {
    throw new ApiError('The store API is unavailable. Check that the API is running and try again.', 0);
  }

  if (!response.ok) {
    if (response.status === 401) clearSessionOnUnauthorized();
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json() as { message?: string | string[]; error?: string };
      if (Array.isArray(payload.message)) message = payload.message.join(' ');
      else if (payload.message) message = payload.message;
      else if (payload.error) message = payload.error;
    } catch {
      // Use the status fallback when the server response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${encodeURIComponent(id)}`);
}

export function formatNairaFromKobo(priceKobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceKobo / 100);
}

