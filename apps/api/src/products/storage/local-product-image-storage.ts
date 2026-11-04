import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { basename, extname, resolve } from 'path';
import { ProductImageStorage, SupportedImageMimeType } from './product-image-storage';

const extensions: Record<SupportedImageMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class LocalProductImageStorage extends ProductImageStorage {
  private readonly uploadDirectory = resolve(__dirname, '../../../uploads');

  async save(buffer: Buffer, contentType: SupportedImageMimeType): Promise<string> {
    const filename = `${randomUUID()}${extensions[contentType]}`;
    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(resolve(this.uploadDirectory, filename), buffer, { flag: 'wx' });

    const publicBaseUrl = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
    return `${publicBaseUrl}/uploads/${filename}`;
  }

  async delete(url: string): Promise<void> {
    let filename: string;
    try {
      filename = basename(new URL(url, 'http://localhost').pathname);
    } catch {
      return;
    }
    const extension = extname(filename);
    if (!/^[0-9a-f-]{36}$/i.test(filename.slice(0, -extension.length)) || !Object.values(extensions).includes(extension)) {
      return;
    }
    try {
      await unlink(resolve(this.uploadDirectory, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
