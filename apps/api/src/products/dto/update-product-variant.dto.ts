import { IsBoolean, IsInt, IsString, Min, ValidateIf } from 'class-validator';

export class UpdateProductVariantDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  price?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  sku?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
