import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductOption } from './entities/product-option.entity';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductImage } from './entities/product-image.entity';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImageStorage, SupportedImageMimeType } from './storage/product-image-storage';
import { OrderItem } from '../orders/entities/order-item.entity';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
type UploadedProductImage = { buffer: Buffer; size: number };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
    private readonly imageStorage: ProductImageStorage,
  ) {}

  create(createProductDto: CreateProductDto): Promise<Product> {
    const { options = [], ...productFields } = createProductDto;
    this.validateOptionDefinitions(options);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const product = repository.create({
        ...productFields,
        options: options.map((option) => ({ ...option })),
      });
      return repository.save(product);
    });
  }

  async findAll(isAdmin = false): Promise<Product[]> {
    const products = await this.productRepository.find({
      where: isAdmin ? {} : { isActive: true },
      relations: { options: true, variants: true, images: true },
      order: { options: { sortOrder: 'ASC' }, images: { sortOrder: 'ASC' } },
    });
    if (!isAdmin) {
      for (const product of products) {
        product.variants = product.variants.filter((variant) => variant.isActive);
      }
    }
    return products;
  }

  async findOne(id: string, isAdmin = false): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: isAdmin ? { id } : { id, isActive: true },
      relations: { options: true, variants: true, images: true },
      order: { options: { sortOrder: 'ASC' }, images: { sortOrder: 'ASC' } },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    if (!isAdmin) {
      product.variants = product.variants.filter((variant) => variant.isActive);
    }
    return product;
  }

  async findVariant(id: string): Promise<ProductVariant> {
    const variant = await this.variantRepository.findOne({ where: { id }, relations: ['product'] });
    if (!variant) throw new NotFoundException(`Variant with ID "${id}" not found`);
    return variant;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const { options, ...productFields } = updateProductDto;
    if (options === undefined) {
      const product = await this.productRepository.preload({ id, ...productFields });
      if (!product) throw new NotFoundException(`Product with ID "${id}" not found`);
      return this.productRepository.save(product);
    }

    this.validateOptionDefinitions(options);
    return this.dataSource.transaction(async (manager) => {
      const products = manager.getRepository(Product);
      const optionRepository = manager.getRepository(ProductOption);
      const product = await products.findOne({ where: { id }, relations: { variants: true } });
      if (!product) throw new NotFoundException(`Product with ID "${id}" not found`);
      this.validateOptionsAgainstVariants(options, product.variants);

      Object.assign(product, productFields);
      await optionRepository.delete({ productId: id });
      product.options = options.map((option) => optionRepository.create({ ...option, product, productId: id }));
      await products.save(product);
      return products.findOneOrFail({
        where: { id },
        relations: { options: true, variants: true, images: true },
        order: { options: { sortOrder: 'ASC' }, images: { sortOrder: 'ASC' } },
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException(`Product with ID "${id}" not found`);

      const orderItemCount = await manager.getRepository(OrderItem)
        .createQueryBuilder('orderItem')
        .innerJoin('orderItem.variant', 'variant')
        .where('variant.productId = :productId', { productId: id })
        .getCount();
      if (orderItemCount > 0) {
        throw new ConflictException('Cannot delete this product because it appears in order history. Deactivate it instead to preserve existing orders.');
      }

      const images = await manager.getRepository(ProductImage).find({ where: { productId: id } });
      await Promise.all(images.map((image) => this.imageStorage.delete(image.url)));
      await manager.getRepository(Product).remove(product);
    });
  }

  async addImages(productId: string, files: UploadedProductImage[]): Promise<ProductImage[]> {
    if (files.length === 0) throw new BadRequestException('Choose at least one image to upload.');
    if (files.length > 5) throw new BadRequestException('Upload no more than 5 images at once.');

    const detectedTypes = files.map((file) => {
      if (!file.buffer || file.buffer.length === 0) throw new BadRequestException('Uploaded image file is empty.');
      if (file.buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Each image must be 5 MB or smaller.');
      const contentType = this.detectImageContentType(file.buffer);
      if (!contentType) throw new BadRequestException('Only JPEG, PNG, and WebP image content is accepted.');
      return contentType;
    });

    const storedUrls: string[] = [];
    try {
      return await this.dataSource.transaction(async (manager) => {
        const product = await manager.getRepository(Product).findOne({
          where: { id: productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) throw new NotFoundException(`Product with ID "${productId}" not found`);

        const imageRepository = manager.getRepository(ProductImage);
        const existingImages = await imageRepository.find({ where: { productId } });
        if (existingImages.length + files.length > 10) {
          throw new BadRequestException(`A product can have no more than 10 images. This product has ${existingImages.length}.`);
        }

        let nextSortOrder = existingImages.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
        const newImages: ProductImage[] = [];
        for (let index = 0; index < files.length; index += 1) {
          const url = await this.imageStorage.save(files[index].buffer, detectedTypes[index]);
          storedUrls.push(url);
          newImages.push(imageRepository.create({
            productId,
            url,
            altText: product.name,
            sortOrder: nextSortOrder++,
          }));
        }
        return imageRepository.save(newImages);
      });
    } catch (error) {
      await Promise.all(storedUrls.map((url) => this.imageStorage.delete(url)));
      throw error;
    }
  }

  async updateImage(productId: string, imageId: string, updateDto: UpdateProductImageDto): Promise<ProductImage> {
    const image = await this.imageRepository.findOneBy({ id: imageId, productId });
    if (!image) throw new NotFoundException(`Image "${imageId}" was not found for product "${productId}".`);
    if (updateDto.altText !== undefined) image.altText = updateDto.altText;
    return this.imageRepository.save(image);
  }

  async reorderImages(productId: string, imageIds: string[]): Promise<ProductImage[]> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException(`Product with ID "${productId}" not found`);

      const imageRepository = manager.getRepository(ProductImage);
      const images = await imageRepository.find({ where: { productId } });
      const requestedIds = new Set(imageIds);
      if (requestedIds.size !== imageIds.length || imageIds.length !== images.length || images.some((image) => !requestedIds.has(image.id))) {
        throw new BadRequestException('Provide each image ID for this product exactly once to set its order.');
      }
      const imageById = new Map(images.map((image) => [image.id, image]));
      const orderedImages = imageIds.map((imageId, sortOrder) => {
        const image = imageById.get(imageId)!;
        image.sortOrder = sortOrder;
        return image;
      });
      return imageRepository.save(orderedImages);
    });
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const imageRepository = manager.getRepository(ProductImage);
      const image = await imageRepository.findOne({
        where: { id: imageId, productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!image) throw new NotFoundException(`Image "${imageId}" was not found for product "${productId}".`);

      await this.imageStorage.delete(image.url);
      await imageRepository.remove(image);
    });
  }

  private detectImageContentType(buffer: Buffer): SupportedImageMimeType | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    return null;
  }

  async createVariants(productId: string, variants: CreateProductVariantDto[]): Promise<ProductVariant[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['options', 'variants'],
    });
    if (!product) throw new NotFoundException(`Product with ID "${productId}" not found`);

    const definedOptions = new Map(product.options.map((option) => [option.name, new Set(option.values)]));
    const combinations = new Set(product.variants.map((variant) => this.combinationKey(variant.options)));
    const skuSet = new Set<string>();

    for (const variant of variants) {
      const names = Object.keys(variant.options).sort();
      const unknownNames = names.filter((name) => !definedOptions.has(name));
      if (unknownNames.length > 0) {
        const name = unknownNames[0];
        throw new BadRequestException(`Unknown option "${name}" with value "${variant.options[name]}" for product "${productId}".`);
      }
      const missingNames = [...definedOptions.keys()].filter((name) => !(name in variant.options));
      if (missingNames.length > 0) {
        throw new BadRequestException(`Variant is missing option "${missingNames[0]}"; provide one of its defined values.`);
      }
      for (const name of names) {
        if (!definedOptions.get(name)?.has(variant.options[name])) {
          throw new BadRequestException(`Invalid value "${variant.options[name]}" for option "${name}" on product "${productId}".`);
        }
      }
      const key = this.combinationKey(variant.options);
      if (combinations.has(key)) throw new BadRequestException('Duplicate option combination for this product.');
      if (skuSet.has(variant.sku)) throw new BadRequestException(`Duplicate SKU "${variant.sku}" in request.`);
      combinations.add(key);
      skuSet.add(variant.sku);
    }

    return this.variantRepository.save(variants.map((variant) =>
      this.variantRepository.create({ ...variant, product, productId }),
    ));
  }

  async updateVariant(
    productId: string,
    variantId: string,
    updateDto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepository.findOne({ where: { id: variantId, productId } });
    if (!variant) {
      throw new NotFoundException(`Variant "${variantId}" was not found for product "${productId}".`);
    }
    if (updateDto.sku && updateDto.sku !== variant.sku) {
      const skuOwner = await this.variantRepository.findOneBy({ sku: updateDto.sku });
      if (skuOwner && skuOwner.id !== variantId) {
        throw new BadRequestException(`SKU "${updateDto.sku}" is already in use.`);
      }
    }
    Object.assign(variant, updateDto);
    return this.variantRepository.save(variant);
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    const result = await this.variantRepository.delete({ id: variantId, productId });
    if (result.affected === 0) {
      throw new NotFoundException(`Variant "${variantId}" was not found for product "${productId}".`);
    }
  }

  private combinationKey(options: Record<string, string>): string {
    return JSON.stringify(Object.keys(options).sort().map((name) => [name, options[name]]));
  }

  private validateOptionDefinitions(options: Array<{ name: string; values: string[] }>): void {
    const names = new Set<string>();
    for (const option of options) {
      if (names.has(option.name)) {
        throw new BadRequestException(`Duplicate product option name "${option.name}".`);
      }
      names.add(option.name);
      if (option.values.length === 0) {
        throw new BadRequestException(`Option "${option.name}" must have at least one value.`);
      }
    }
  }

  private validateOptionsAgainstVariants(
    options: Array<{ name: string; values: string[] }>,
    variants: ProductVariant[],
  ): void {
    const definitions = new Map(options.map((option) => [option.name, new Set(option.values)]));
    for (const variant of variants) {
      for (const [name, value] of Object.entries(variant.options)) {
        if (!definitions.has(name)) {
          throw new BadRequestException(`Cannot remove option "${name}" because variant "${variant.sku}" uses it.`);
        }
        if (!definitions.get(name)?.has(value)) {
          throw new BadRequestException(`Cannot remove value "${value}" from option "${name}" because variant "${variant.sku}" uses it.`);
        }
      }
      for (const name of definitions.keys()) {
        if (!(name in variant.options)) {
          throw new BadRequestException(`Cannot add or replace option "${name}" while variant "${variant.sku}" lacks a value for it.`);
        }
      }
    }
  }
}
