export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Replaceable storage boundary: a Cloudinary or S3 adapter can implement this later. */
export abstract class ProductImageStorage {
  abstract save(buffer: Buffer, contentType: SupportedImageMimeType): Promise<string>;
  abstract delete(url: string): Promise<void>;
}
