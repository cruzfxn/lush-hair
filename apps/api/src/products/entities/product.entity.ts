import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProductOption } from './product-option.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';

export enum ProductType {
  WIG = 'wig',
  BUNDLE = 'bundle',
  CLOSURE = 'closure',
  FRONTAL = 'frontal',
  ACCESSORY = 'accessory',
}

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ProductType })
  type!: ProductType;

  @Column({ type: 'text', nullable: true })
  texture!: string | null;

  @Column({ type: 'text', nullable: true })
  origin!: string | null;

  @Column({ type: 'int', default: 0 })
  leadTimeDays!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  attributes!: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  availableColours!: string[];

  @OneToMany(() => ProductOption, (option) => option.product, { cascade: true, eager: true })
  options!: ProductOption[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
  variants!: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true, eager: true })
  images!: ProductImage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
