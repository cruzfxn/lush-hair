import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  product!: Product;

  @Column()
  productId!: string;

  @Column()
  url!: string;

  @Column({ type: 'text', nullable: true })
  altText!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
