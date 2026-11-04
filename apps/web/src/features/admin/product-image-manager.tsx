'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, apiUrl, clearSessionOnUnauthorized, Product, ProductImage } from '../../lib/api';
import { useCartStore } from '../cart/store';

export function ProductImageManager({ product, onImagesChanged }: { product: Product; onImagesChanged: (images: ProductImage[]) => void }) {
  const token = useCartStore((state) => state.token);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sortedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);

  useEffect(() => {
    const ordered = [...(product.images || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    setImages(ordered);
    setAltTexts(Object.fromEntries(ordered.map((image) => [image.id, image.altText || ''])));
  }, [product.id, product.images]);

  useEffect(() => {
    const objectUrls = files.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    setError('');
    setMessage('');
    if (selected.length > 5) {
      setError('Select no more than five images for one upload.');
      event.target.value = '';
      return;
    }
    if (images.length + selected.length > 10) {
      setError(`This product can have 10 images total. It already has ${images.length}.`);
      event.target.value = '';
      return;
    }
    const oversized = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} is larger than 5 MB.`);
      event.target.value = '';
      return;
    }
    setFiles(selected);
    event.target.value = '';
  }

  async function uploadFiles() {
    if (!token || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setError('');
    setMessage('');
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const uploaded = await new Promise<ProductImage[]>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', apiUrl(`/products/${encodeURIComponent(product.id)}/images`));
        request.setRequestHeader('Authorization', `Bearer ${token}`);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new ApiError('Upload failed because the API could not be reached.', 0));
        request.onload = () => {
          if (request.status === 401) clearSessionOnUnauthorized();
          let payload: unknown;
          try { payload = JSON.parse(request.responseText); } catch { payload = null; }
          if (request.status >= 200 && request.status < 300) resolve(payload as ProductImage[]);
          else {
            const body = payload as { message?: string | string[] } | null;
            const apiMessage = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
            reject(new ApiError(apiMessage || `Upload failed (${request.status}).`, request.status));
          }
        };
        request.send(formData);
      });
      const updatedImages = [...images, ...uploaded].sort((a, b) => a.sortOrder - b.sortOrder);
      setImages(updatedImages);
      onImagesChanged(updatedImages);
      setFiles([]);
      setMessage(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
      setProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : 'Could not upload these images.');
    } finally {
      setUploading(false);
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (!token || destination < 0 || destination >= sortedImages.length) return;
    const reordered = [...sortedImages];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setError('');
    try {
      const saved = await apiFetch<ProductImage[]>(`/products/${encodeURIComponent(product.id)}/images/order`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageIds: reordered.map((image) => image.id) }),
      });
      const ordered = [...saved].sort((a, b) => a.sortOrder - b.sortOrder);
      setImages(ordered);
      onImagesChanged(ordered);
    } catch (orderError) {
      setError(orderError instanceof ApiError ? orderError.message : 'Could not change the image order.');
    }
  }

  async function saveAltText(image: ProductImage) {
    if (!token) return;
    setSavingImageId(image.id);
    setError('');
    try {
      const updated = await apiFetch<ProductImage>(`/products/${encodeURIComponent(product.id)}/images/${encodeURIComponent(image.id)}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ altText: altTexts[image.id] ?? '' }),
      });
      const nextImages = images.map((item) => item.id === image.id ? updated : item);
      setImages(nextImages);
      onImagesChanged(nextImages);
      setMessage('Alt text saved.');
    } catch (altError) {
      setError(altError instanceof ApiError ? altError.message : 'Could not save alt text.');
    } finally {
      setSavingImageId(null);
    }
  }

  async function deleteImage(image: ProductImage) {
    if (!token || !window.confirm('Delete this image?')) return;
    setSavingImageId(image.id);
    setError('');
    try {
      await apiFetch<void>(`/products/${encodeURIComponent(product.id)}/images/${encodeURIComponent(image.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const nextImages = images.filter((item) => item.id !== image.id);
      setImages(nextImages);
      onImagesChanged(nextImages);
      setMessage('Image deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Could not delete this image.');
    } finally {
      setSavingImageId(null);
    }
  }

  return (
    <section className="admin-panel image-manager">
      <div className="admin-section-heading"><div><h2>Product images</h2><p>The first image is the main image shown on the shop.</p></div></div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {message && <p className="admin-success" role="status">{message}</p>}
      <div className="image-upload-row"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectFiles} disabled={uploading || images.length >= 10} /><button className="secondary-button" type="button" onClick={() => void uploadFiles()} disabled={uploading || files.length === 0}>{uploading ? `Uploading ${progress}%` : `Upload ${files.length || ''} image${files.length === 1 ? '' : 's'}`}</button></div>
      {uploading && <progress className="upload-progress" max={100} value={progress}>{progress}%</progress>}
      {previews.length > 0 && <div className="image-preview-grid">{previews.map((preview, index) => <div className="image-preview" key={`${files[index]?.name}-${index}`}><Image src={preview} alt={`Preview ${index + 1}`} fill sizes="140px" unoptimized /><span>{files[index]?.name}</span></div>)}</div>}
      {sortedImages.length === 0 ? <p className="admin-muted">No images uploaded yet. A product name placeholder will appear in the shop.</p> : (
        <div className="managed-image-list">{sortedImages.map((image, index) => (
          <article className="managed-image-row" key={image.id}>
            <div className="managed-image-preview">{image.url ? <Image src={image.url} alt={image.altText || product.name} fill sizes="120px" unoptimized /> : <span>No image</span>}</div>
            <div className="managed-image-fields">
              <div className="image-role-label">{index === 0 ? 'Main image' : `Image ${index + 1}`}</div>
              <label className="admin-field">Alt text<input value={altTexts[image.id] ?? ''} onChange={(event) => setAltTexts((current) => ({ ...current, [image.id]: event.target.value }))} /></label>
              <div className="image-row-actions">
                <button className="secondary-button" type="button" disabled={index === 0 || savingImageId === image.id} onClick={() => void moveImage(index, -1)}>Move up</button>
                <button className="secondary-button" type="button" disabled={index === sortedImages.length - 1 || savingImageId === image.id} onClick={() => void moveImage(index, 1)}>Move down</button>
                <button className="secondary-button" type="button" disabled={savingImageId === image.id} onClick={() => void saveAltText(image)}>{savingImageId === image.id ? 'Saving…' : 'Save alt text'}</button>
                <button className="remove-button" type="button" disabled={savingImageId === image.id} onClick={() => void deleteImage(image)}>Delete</button>
              </div>
            </div>
          </article>
        ))}</div>
      )}
      <p className="admin-muted">JPEG, PNG or WebP · up to 5 MB each · maximum 10 images per product.</p>
    </section>
  );
}
