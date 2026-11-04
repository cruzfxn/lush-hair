'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, Product, ProductOption, ProductType, ProductVariant } from '../../lib/api';
import { useCartStore } from '../cart/store';
import { ProductImageManager } from './product-image-manager';

const productTypes: ProductType[] = ['wig', 'bundle', 'closure', 'frontal', 'accessory'];
type OptionDraft = { key: string; name: string; values: string[]; valueDraft: string };
type AttributeDraft = { key: string; label: string; value: string };
type VariantDraft = { key: string; id?: string; options: Record<string, string>; priceText: string; sku: string; isActive: boolean };

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function combinationKey(options: Record<string, string>): string {
  return JSON.stringify(Object.keys(options).sort().map((name) => [name, options[name]]));
}

function priceKoboToText(kobo: number): string {
  const amount = BigInt(kobo);
  const naira = amount / 100n;
  const koboPart = (amount % 100n).toString().padStart(2, '0');
  return koboPart === '00' ? naira.toString() : `${naira}.${koboPart.replace(/0$/, '')}`;
}

function priceTextToKobo(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const kobo = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
  if (kobo <= 0n || kobo > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(kobo);
}

function suggestedSku(slug: string, values: Record<string, string>, index: number): string {
  const suffix = Object.keys(values).sort().map((name) => values[name]).join('-');
  const cleaned = `${slug}-${suffix || 'standard'}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${cleaned || 'PRODUCT'}-${index + 1}`.slice(0, 90);
}

function combinationsFor(options: OptionDraft[]): Record<string, string>[] {
  const validOptions = options.filter((option) => option.name.trim());
  if (validOptions.length !== options.length || validOptions.some((option) => option.values.length === 0)) return [];
  let combinations: Array<Record<string, string>> = [{}];
  for (const option of validOptions) {
    combinations = combinations.flatMap((current) => option.values.map((value) => ({ ...current, [option.name.trim()]: value })));
  }
  return combinations;
}

function toVariantDrafts(options: OptionDraft[], variants: ProductVariant[], slug: string): VariantDraft[] {
  const existingByCombination = new Map(variants.map((variant) => [combinationKey(variant.options), variant]));
  return combinationsFor(options).map((combination, index) => {
    const existing = existingByCombination.get(combinationKey(combination));
    return {
      key: combinationKey(combination),
      id: existing?.id,
      options: combination,
      priceText: existing ? priceKoboToText(existing.price) : '',
      sku: existing?.sku || suggestedSku(slug, combination, index),
      isActive: existing?.isActive ?? true,
    };
  });
}

function optionDraftsFromProduct(options: ProductOption[]): OptionDraft[] {
  return [...options].sort((a, b) => a.sortOrder - b.sortOrder).map((option) => ({
    key: option.id,
    name: option.name,
    values: [...option.values],
    valueDraft: '',
  }));
}

export function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const token = useCartStore((state) => state.token);
  const [activeProductId, setActiveProductId] = useState(productId || '');
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(Boolean(productId));
  const [type, setType] = useState<ProductType>('wig');
  const [texture, setTexture] = useState('');
  const [origin, setOrigin] = useState('');
  const [description, setDescription] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [availableColours, setAvailableColours] = useState<string[]>([]);
  const [colourDraft, setColourDraft] = useState('');
  const [attributes, setAttributes] = useState<AttributeDraft[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);

  useEffect(() => {
    if (!productId || !token) return;
    let current = true;
    setLoading(true);
    apiFetch<Product>(`/products/${encodeURIComponent(productId)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((product) => {
        if (!current) return;
        setLoadedProduct(product);
        setActiveProductId(product.id);
        setName(product.name);
        setSlug(product.slug);
        setType(product.type);
        setTexture(product.texture || '');
        setOrigin(product.origin || '');
        setDescription(product.description || '');
        setLeadTimeDays(String(product.leadTimeDays));
        setIsActive(product.isActive);
        setAvailableColours(product.availableColours || []);
        setAttributes(Object.entries(product.attributes || {}).map(([label, value]) => ({ key: crypto.randomUUID(), label, value: String(value ?? '') })));
        const currentOptions = optionDraftsFromProduct(product.options || []);
        setOptions(currentOptions);
        setVariants(toVariantDrafts(currentOptions, product.variants || [], product.slug));
      })
      .catch((loadError: unknown) => {
        if (current) setError(loadError instanceof ApiError ? loadError.message : 'Could not load this product.');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [productId, token]);

  function addColour() {
    const value = colourDraft.trim();
    if (value && !availableColours.includes(value)) setAvailableColours((current) => [...current, value]);
    setColourDraft('');
  }

  function addOption() {
    setOptions((current) => [...current, { key: crypto.randomUUID(), name: '', values: [], valueDraft: '' }]);
  }

  function updateOption(key: string, changes: Partial<OptionDraft>) {
    setOptions((current) => current.map((option) => option.key === key ? { ...option, ...changes } : option));
  }

  function addOptionValue(option: OptionDraft) {
    const value = option.valueDraft.trim();
    if (value && !option.values.includes(value)) updateOption(option.key, { values: [...option.values, value], valueDraft: '' });
    else if (!value) updateOption(option.key, { valueDraft: '' });
  }

  function generateVariants() {
    const generated = toVariantDrafts(options, loadedProduct?.variants || [], slug);
    if (options.some((option) => !option.name.trim() || option.values.length === 0)) {
      setError('Give every option a name and at least one value before generating variants.');
      return;
    }
    setError('');
    setVariants(generated);
  }

  function updateVariant(key: string, changes: Partial<VariantDraft>) {
    setVariants((current) => current.map((variant) => variant.key === key ? { ...variant, ...changes } : variant));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError('');
    setSuccess('');
    if (availableColours.length === 0) {
      setError('Add at least one available colour.');
      return;
    }
    if (variants.length === 0) {
      setError('Generate at least one variant combination before saving.');
      return;
    }
    const pricedVariants: Array<{ row: VariantDraft; price: number }> = [];
    for (const variant of variants) {
      const price = priceTextToKobo(variant.priceText);
      if (price === null) {
        setError(`Enter a valid price greater than ₦0.00 for ${Object.values(variant.options).join(' / ') || 'the standard variant'}.`);
        return;
      }
      if (!variant.sku.trim()) {
        setError('Every variant needs a SKU.');
        return;
      }
      pricedVariants.push({ row: variant, price });
    }
    const productOptions = options.map((option, index) => ({
      name: option.name.trim(),
      values: option.values,
      sortOrder: index,
    }));
    const attributesObject: Record<string, string> = {};
    for (const attribute of attributes) {
      const label = attribute.label.trim();
      if (label) attributesObject[label] = attribute.value.trim();
    }
    const productBody = {
      name: name.trim(),
      slug: slugify(slug),
      type,
      texture: texture.trim() || null,
      origin: origin.trim() || null,
      description: description.trim() || null,
      leadTimeDays: Number(leadTimeDays),
      isActive,
      availableColours,
      attributes: attributesObject,
      options: productOptions,
    };

    setSaving(true);
    try {
      const savedProduct = activeProductId
        ? await apiFetch<Product>(`/products/${encodeURIComponent(activeProductId)}`, {
            method: 'PATCH', headers, body: JSON.stringify(productBody),
          })
        : await apiFetch<Product>('/products', { method: 'POST', headers, body: JSON.stringify(productBody) });
      setLoadedProduct(savedProduct);
      setActiveProductId(savedProduct.id);
      setSlugEdited(true);
      if (!activeProductId) router.replace(`/admin/products/${savedProduct.id}`);

      const newVariants = pricedVariants.filter(({ row }) => !row.id).map(({ row, price }) => ({
        options: row.options, price, sku: row.sku.trim(), isActive: row.isActive,
      }));
      if (newVariants.length) {
        await apiFetch<ProductVariant[]>(`/products/${encodeURIComponent(savedProduct.id)}/variants/bulk`, {
          method: 'POST', headers, body: JSON.stringify(newVariants),
        });
      }
      for (const { row, price } of pricedVariants.filter(({ row }) => row.id)) {
        await apiFetch<ProductVariant>(`/products/${encodeURIComponent(savedProduct.id)}/variants/${encodeURIComponent(row.id!)}`, {
          method: 'PATCH', headers, body: JSON.stringify({ price, sku: row.sku.trim(), isActive: row.isActive }),
        });
      }
      setSuccess('Product and variants saved. Existing order prices remain unchanged.');
      if (!activeProductId) setActiveProductId(savedProduct.id);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Could not save the product. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="admin-content"><div className="loading-panel" aria-label="Loading product" /></main>;

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><p className="eyebrow">PRODUCT EDITOR</p><h1>{activeProductId ? 'Edit product' : 'Add product'}</h1></div>
        <Link className="back-link" href="/admin/products">Back to products</Link>
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {success && <p className="admin-success" role="status">{success}</p>}
      <form className="admin-form" onSubmit={submit}>
        <section className="admin-panel">
          <h2>Product details</h2>
          <div className="admin-form-grid">
            <label className="admin-field">Name<input required value={name} onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugify(nextName));
            }} /></label>
            <label className="admin-field">Slug<input required value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} /></label>
            <label className="admin-field">Type<select value={type} onChange={(event) => setType(event.target.value as ProductType)}>{productTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="admin-field">Texture<input value={texture} onChange={(event) => setTexture(event.target.value)} /></label>
            <label className="admin-field">Origin<input value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
            <label className="admin-field">Lead time in days<input type="number" min="0" step="1" required value={leadTimeDays} onChange={(event) => setLeadTimeDays(event.target.value)} /></label>
            <label className="admin-field admin-field-wide">Description<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          </div>
          <label className="admin-toggle"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>Product is active</span></label>
        </section>

        <section className="admin-panel">
          <div className="admin-section-heading"><div><h2>Available colours</h2><p>Add the colours customers can choose from.</p></div></div>
          <div className="tag-entry"><input aria-label="New colour" value={colourDraft} onChange={(event) => setColourDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addColour(); } }} placeholder="e.g. Natural Black" /><button className="secondary-button" type="button" onClick={addColour}>Add colour</button></div>
          <div className="admin-tags">{availableColours.map((colour) => <span className="admin-tag" key={colour}>{colour}<button type="button" aria-label={`Remove ${colour}`} onClick={() => setAvailableColours((current) => current.filter((item) => item !== colour))}>×</button></span>)}</div>
        </section>

        <section className="admin-panel">
          <div className="admin-section-heading"><div><h2>Extra details</h2><p>Label and value pairs are saved to product attributes.</p></div><button className="secondary-button" type="button" onClick={() => setAttributes((current) => [...current, { key: crypto.randomUUID(), label: '', value: '' }])}>Add detail</button></div>
          <div className="admin-pair-list">{attributes.map((attribute) => <div className="admin-pair" key={attribute.key}><input aria-label="Detail label" placeholder="Label (e.g. Lace type)" value={attribute.label} onChange={(event) => setAttributes((current) => current.map((item) => item.key === attribute.key ? { ...item, label: event.target.value } : item))} /><input aria-label="Detail value" placeholder="Value (e.g. HD lace)" value={attribute.value} onChange={(event) => setAttributes((current) => current.map((item) => item.key === attribute.key ? { ...item, value: event.target.value } : item))} /><button className="remove-button" type="button" onClick={() => setAttributes((current) => current.filter((item) => item.key !== attribute.key))}>Remove</button></div>)}</div>
        </section>

        <section className="admin-panel">
          <div className="admin-section-heading"><div><h2>Options</h2><p>Define choices such as Length, Density or Size.</p></div><button className="secondary-button" type="button" onClick={addOption}>Add option</button></div>
          {activeProductId && Boolean(loadedProduct?.variants.length) && <p className="admin-inline-note">Existing variants must continue to match these options. The API has no route to change a saved variant’s option mapping, and it rejects option changes that would orphan a variant.</p>}
          {options.length === 0 && <p className="admin-muted">This product has no selectable options.</p>}
          <div className="admin-option-list">{options.map((option) => (
            <div className="admin-option-card" key={option.key}>
              <div className="admin-option-heading"><label className="admin-field">Option name<input value={option.name} placeholder="Length" onChange={(event) => updateOption(option.key, { name: event.target.value })} /></label><button className="remove-button" type="button" onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}>Remove option</button></div>
              <div className="tag-entry"><input aria-label={`Value for ${option.name || 'option'}`} value={option.valueDraft} onChange={(event) => updateOption(option.key, { valueDraft: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOptionValue(option); } }} placeholder="Add a value" /><button className="secondary-button" type="button" onClick={() => addOptionValue(option)}>Add value</button></div>
              <div className="admin-tags">{option.values.map((value) => <span className="admin-tag" key={value}>{value}<button type="button" aria-label={`Remove ${value}`} onClick={() => updateOption(option.key, { values: option.values.filter((item) => item !== value) })}>×</button></span>)}</div>
            </div>
          ))}</div>
        </section>

        <section className="admin-panel">
          <div className="admin-section-heading"><div><h2>Variants</h2><p>Enter each price in naira. The saved value is converted to integer kobo. Price updates do not change existing order snapshots.</p></div><button className="secondary-button" type="button" onClick={generateVariants}>Generate all combinations</button></div>
          {variants.length === 0 ? <p className="admin-muted">Add options, then generate the variant combinations.</p> : (
            <div className="variant-table-wrap"><table className="variant-table"><thead><tr><th>Combination</th><th>Price (₦)</th><th>SKU</th><th>Active</th></tr></thead><tbody>{variants.map((variant) => (
              <tr key={variant.key}><td>{Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Standard'}</td><td><input className="variant-price-input" inputMode="decimal" placeholder="25000.00" value={variant.priceText} onChange={(event) => updateVariant(variant.key, { priceText: event.target.value })} /></td><td><input className="variant-sku-input" value={variant.sku} onChange={(event) => updateVariant(variant.key, { sku: event.target.value })} /></td><td><input aria-label="Variant active" type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(variant.key, { isActive: event.target.checked })} /></td></tr>
            ))}</tbody></table></div>
          )}
        </section>

        <div className="admin-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving product…' : 'Save product and variants'}</button></div>
      </form>

      {activeProductId && loadedProduct && <ProductImageManager product={loadedProduct} onImagesChanged={(images) => setLoadedProduct((current) => current ? { ...current, images } : current)} />}
    </main>
  );
}
