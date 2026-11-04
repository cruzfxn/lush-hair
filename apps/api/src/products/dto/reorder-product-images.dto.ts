import { IsArray, IsUUID } from 'class-validator';

export class ReorderProductImagesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  imageIds!: string[];
}
