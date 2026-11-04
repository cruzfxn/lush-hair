import { IsUUID, IsInt, Min, Max, IsString } from 'class-validator';

export class AddItemDto {
  @IsUUID()
  variantId!: string;

  @IsString()
  selectedColour!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
}
