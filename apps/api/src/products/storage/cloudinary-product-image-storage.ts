import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ProductImageStorage, SupportedImageMimeType } from './product-image-storage';

@Injectable()
export class CloudinaryProductImageStorage extends ProductImageStorage {
  private readonly cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  private readonly apiKey = process.env.CLOUDINARY_API_KEY!;
  private readonly apiSecret = process.env.CLOUDINARY_API_SECRET!;

  async save(buffer: Buffer, contentType: SupportedImageMimeType): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `zitachi/products/${randomUUID()}`;
    const signature = this.sign(`public_id=${publicId}&timestamp=${timestamp}`);
    const body = new URLSearchParams({
      file: `data:${contentType};base64,${buffer.toString('base64')}`,
      api_key: this.apiKey,
      timestamp,
      public_id: publicId,
      signature,
    });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, { method: 'POST', body });
    if (!response.ok) throw new InternalServerErrorException('Cloudinary image upload failed.');
    try {
      const result = await response.json() as { secure_url?: string };
      if (!result.secure_url) throw new Error('Cloudinary did not return the uploaded image URL.');
      return result.secure_url;
    } catch {
      await this.deletePublicId(publicId).catch(() => undefined);
      throw new InternalServerErrorException('Cloudinary uploaded the image but could not confirm it; cleanup was attempted.');
    }
  }

  async delete(url: string): Promise<void> {
    const match = new URL(url).pathname.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return;
    const publicId = decodeURIComponent(match[1]).replace(/\.[^.]+$/, '');
    await this.deletePublicId(publicId);
  }

  private async deletePublicId(publicId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign(`public_id=${publicId}&timestamp=${timestamp}`);
    const body = new URLSearchParams({ public_id: publicId, timestamp, api_key: this.apiKey, signature });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, { method: 'POST', body });
    if (!response.ok) throw new InternalServerErrorException('Cloudinary image deletion failed.');
  }

  private sign(value: string): string {
    return createHash('sha1').update(`${value}${this.apiSecret}`).digest('hex');
  }
}
