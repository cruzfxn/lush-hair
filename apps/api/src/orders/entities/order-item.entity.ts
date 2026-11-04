import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  variant!: ProductVariant | null;

  @Column({ nullable: true })
  variantId!: string | null;

  @Column()
  name!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  selectedOptions!: Record<string, string>;

  @Column()
  selectedColour!: string;

  @Column({ type: 'int' })
  unitPrice!: number;

  @Column()
  quantity!: number;

  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;
}
