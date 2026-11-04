import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order} from './entities/order.entity';
import { OrderItem} from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async createFromCart(cartId: string, userId: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cart = await cartRepository.findOne({
        where: { id: cartId },
        loadEagerRelations: false,
        lock: { mode: 'pessimistic_write' },
      });
      if (!cart) throw new NotFoundException(`Cart with ID "${cartId}" not found`);
      if (cart.userId && cart.userId !== userId) {
        throw new ForbiddenException('This cart belongs to another user.');
      }
      if (cart.checkedOutAt) {
        throw new BadRequestException('This cart has already been checked out.');
      }
      cart.items = await manager.getRepository(CartItem).find({ where: { cart: { id: cartId } } });
      if (cart.items.length === 0) {
        throw new BadRequestException('Cannot create an order from an empty cart.');
      }

      // Claim guest carts in the same transaction that creates the order.
      cart.userId = userId;
      const variantRepository = manager.getRepository(ProductVariant);
      const order = new Order();
      order.userId = userId;
      order.cartId = cart.id;
      order.items = [];
      let total = 0;

      for (const cartItem of cart.items) {
        const optionsLabel = Object.entries(cartItem.selectedOptions)
          .map(([name, value]) => `${name}: ${value}`)
          .join(', ') || 'no options';
        const itemLabel = `${cartItem.productName} (${optionsLabel})`;
        // Always re-read the authoritative price; cart input and saved cart snapshots are not trusted for checkout pricing.
        const variant = await variantRepository.findOne({
          where: { id: cartItem.variantId },
          relations: { product: true },
        });
        if (!variant) {
          throw new BadRequestException(`${itemLabel} is no longer available; remove it from the cart.`);
        }
        if (!variant.isActive || !variant.product.isActive) {
          const status = !variant.isActive ? 'variant is inactive' : 'product is inactive';
          throw new BadRequestException(`${itemLabel} cannot be checked out because its ${status}; remove it from the cart.`);
        }
        const unitPrice = variant.price;
        const orderItem = new OrderItem();
        orderItem.variant = variant;
        orderItem.variantId = variant.id;
        orderItem.name = cartItem.productName;
        orderItem.selectedOptions = cartItem.selectedOptions;
        orderItem.selectedColour = cartItem.selectedColour;
        orderItem.unitPrice = unitPrice;
        orderItem.quantity = cartItem.quantity;
        order.items.push(orderItem);
        total += unitPrice * cartItem.quantity;
      }

      order.total = total;
      const savedOrder = await manager.getRepository(Order).save(order);
      cart.checkedOutAt = new Date();
      await cartRepository.save(cart);
      return savedOrder;
    });
  }

  async findUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
        where: { userId },
        relations: ['items'],
        order: { createdAt: 'DESC' },
    });
  }
}
