import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, Request, UploadedFiles, UseInterceptors, Put } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';

const imageUploadOptions = {
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
};

type UploadedProductImage = { buffer: Buffer; size: number };

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post(':id/variants/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() variants: CreateProductVariantDto[],
  ) {
    return this.productsService.createVariants(id, variants);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Request() req: { user?: { role?: string } }) {
    return this.productsService.findAll(req.user?.role === 'admin');
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user?: { role?: string } }) {
    return this.productsService.findOne(id, req.user?.role === 'admin');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() updateDto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(id, variantId, updateDto);
  }

  @Delete(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.productsService.removeVariant(id, variantId);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FilesInterceptor('files', 5, imageUploadOptions))
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: UploadedProductImage[],
  ) {
    return this.productsService.addImages(id, files ?? []);
  }

  @Patch(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateImageAltText(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() updateDto: UpdateProductImageDto,
  ) {
    return this.productsService.updateImage(id, imageId, updateDto);
  }

  @Put(':id/images/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reorderDto: ReorderProductImagesDto,
  ) {
    return this.productsService.reorderImages(id, reorderDto.imageIds);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.removeImage(id, imageId);
  }
}
