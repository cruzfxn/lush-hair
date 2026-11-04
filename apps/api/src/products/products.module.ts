import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { AuthModule } from '../auth/auth.module';
import { ProductImageStorage } from './storage/product-image-storage';
import { LocalProductImageStorage } from './storage/local-product-image-storage';
import { CloudinaryProductImageStorage } from './storage/cloudinary-product-image-storage';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductOption, ProductVariant, ProductImage]), AuthModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    LocalProductImageStorage,
    CloudinaryProductImageStorage,
    {
      provide: ProductImageStorage,
      inject: [ConfigService, LocalProductImageStorage, CloudinaryProductImageStorage],
      useFactory: (config: ConfigService, local: LocalProductImageStorage, cloudinary: CloudinaryProductImageStorage) =>
        config.get('IMAGE_STORAGE') === 'cloudinary' ? cloudinary : local,
    },
  ],
  exports: [ProductsService]
})
export class ProductsModule {}
