import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsObject()
  options!: Record<string, string>;

  @IsInt()
  @Min(0)
  price!: number;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
