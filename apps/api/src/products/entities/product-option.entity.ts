import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.options, { onDelete: 'CASCADE' })
  product!: Product;

  @Column()
  productId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', array: true })
  values!: string[];

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
