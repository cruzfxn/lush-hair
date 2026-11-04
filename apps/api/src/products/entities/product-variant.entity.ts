import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  product!: Product;

  @Column()
  productId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  options!: Record<string, string>;

  @Column({ type: 'int' })
  price!: number;

  @Column({ unique: true })
  sku!: string;

  @Column({ default: true })
  isActive!: boolean;
}
