import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ProductVariant, { eager: true })
  variant!: ProductVariant;

  @Column()
  variantId!: string;

  @Column()
  productName!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  selectedOptions!: Record<string, string>;

  @Column()
  selectedColour!: string;

  @Column({ type: 'int' })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @ManyToOne(() => Cart, (cart) => cart.items)
  cart!: Cart;
}
