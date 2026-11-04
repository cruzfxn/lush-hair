'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ApiError, apiFetch, Cart, formatNairaFromKobo, isCartUnavailable, Product } from '../../lib/api';
import { useCartStore } from '../cart/store';

function optionsMatch(selected: Record<string, string>, variantOptions: Record<string, string>) {
  const selectedKeys = Object.keys(selected).sort();
  const variantKeys = Object.keys(variantOptions).sort();
  return selectedKeys.length === variantKeys.length &&
    selectedKeys.every((key, index) => key === variantKeys[index] && selected[key] === variantOptions[key]);
}

export function ProductDetail({ product }: { product: Product }) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedColour, setSelectedColour] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const cartId = useCartStore((state) => state.cartId);
  const token = useCartStore((state) => state.token);
  const setCartId = useCartStore((state) => state.setCartId);
  const options = useMemo(() => [...product.options].sort((a, b) => a.sortOrder - b.sortOrder), [product.options]);
  const allOptionsSelected = options.every((option) => selectedOptions[option.name]);
  const variant = allOptionsSelected
    ? product.variants.find((item) => item.isActive && optionsMatch(selectedOptions, item.options))
    : undefined;
  const images = useMemo(() => [...(product.images || [])].sort((a, b) => a.sortOrder - b.sortOrder), [product.images]);
  const image = images.find((item) => item.id === activeImageId) || images[0];

  async function addToCart() {
    if (!variant || !selectedColour) return;
    setIsAdding(true);
    setMessage(null);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const createCart = async () => apiFetch<Cart>('/cart', { method: 'POST', headers });
      const addItem = (id: string) => apiFetch(`/cart/${encodeURIComponent(id)}/items`, {
        method: 'POST', headers,
        body: JSON.stringify({ variantId: variant.id, selectedColour, quantity: 1 }),
      });

      let activeCartId = cartId;
      if (!activeCartId) activeCartId = (await createCart()).id;
      try {
        await addItem(activeCartId);
      } catch (firstError) {
        if (!isCartUnavailable(firstError)) throw firstError;
        setCartId(null);
        activeCartId = (await createCart()).id;
        await addItem(activeCartId);
      }
      setCartId(activeCartId);
      setMessage({ text: `${product.name} was added to your cart.`, error: false });
    } catch (error) {
      setMessage({
        text: error instanceof ApiError ? error.message : 'We could not add this item. Please try again.',
        error: true,
      });
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="store-shell detail-shell">
      <div className="detail-layout">
        <div className="detail-gallery">
        <div className="detail-image product-image-tone-1">
          {image ? <Image src={image.url} alt={image.altText || product.name} fill sizes="(max-width: 680px) 100vw, 55vw" unoptimized /> : (
            <div className="image-placeholder detail-placeholder"><span>{product.name}</span></div>
          )}
        </div>
        {images.length > 1 && <div className="detail-thumbnails" aria-label="Product image gallery">{images.map((galleryImage, index) => <button className={galleryImage.id === image?.id ? 'detail-thumbnail detail-thumbnail-active' : 'detail-thumbnail'} type="button" key={galleryImage.id} aria-label={`Show product image ${index + 1}`} onClick={() => setActiveImageId(galleryImage.id)}><Image src={galleryImage.url} alt={galleryImage.altText || `${product.name} ${index + 1}`} fill sizes="90px" unoptimized /></button>)}</div>}
        </div>

        <section className="detail-copy">
          <p className="eyebrow">{product.type}{product.texture ? ` · ${product.texture}` : ''}</p>
          <h1>{product.name}</h1>
          {product.description && <p className="detail-description">{product.description}</p>}
          <p className="made-to-order">Made to order, ready in about {product.leadTimeDays} days</p>

          <div className="option-list">
            {options.map((option) => (
              <label className="select-field" key={option.id}>
                <span>{option.name}</span>
                <select
                  value={selectedOptions[option.name] || ''}
                  onChange={(event) => setSelectedOptions((current) => ({ ...current, [option.name]: event.target.value }))}
                >
                  <option value="">Choose {option.name.toLowerCase()}</option>
                  {option.values.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
            <label className="select-field">
              <span>Colour</span>
              <select value={selectedColour} onChange={(event) => setSelectedColour(event.target.value)}>
                <option value="">Choose a colour</option>
                {product.availableColours.map((colour) => <option key={colour} value={colour}>{colour}</option>)}
              </select>
            </label>
          </div>

          <div className="detail-purchase">
            <div className="detail-price" aria-live="polite">
              {variant ? formatNairaFromKobo(variant.price) : allOptionsSelected ? 'This combination isn’t available' : 'Choose your options'}
            </div>
            <button className="primary-button" type="button" onClick={addToCart} disabled={!variant || !selectedColour || isAdding}>
              {isAdding ? 'Adding…' : 'Add to cart'}
            </button>
            {message && <p className={message.error ? 'form-message form-message-error' : 'form-message'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
