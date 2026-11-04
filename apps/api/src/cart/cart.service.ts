import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddItemDto } from './dto/add-item.dto';
import { ProductVariant } from '../products/entities/product-variant.entity';

type CartItemView = CartItem & { available: boolean; currentUnitPrice: number | null };

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId?: string): Promise<Cart> {
    const newCart = this.cartRepository.create({ items: [], userId: userId ?? null, checkedOutAt: null });
    return this.cartRepository.save(newCart);
  }

  async findOne(id: string, userId?: string): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await this.loadCartForUpdate(manager, id, userId);
      return this.buildCartView(manager, cart);
    });
  }

  async addItem(cartId: string, addItemDto: AddItemDto, userId?: string): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cart = await this.loadCartForUpdate(manager, cartId, userId);
      if (cart.checkedOutAt) throw new BadRequestException('This cart has already been checked out.');

      const itemRepository = manager.getRepository(CartItem);
      const variant = await manager.getRepository(ProductVariant).findOne({
        where: { id: addItemDto.variantId },
        relations: { product: true },
      });
      if (!variant) throw new NotFoundException(`Variant with ID "${addItemDto.variantId}" not found`);
      const product = variant.product;
      if (!variant.isActive || !product.isActive) {
        throw new BadRequestException('Product variant is inactive or unavailable.');
      }
      if (!product.availableColours.includes(addItemDto.selectedColour)) {
        throw new BadRequestException(`Colour "${addItemDto.selectedColour}" is unavailable`);
      }

      const existingItem = cart.items.find(
        (item) => item.variantId === addItemDto.variantId && item.selectedColour === addItemDto.selectedColour,
      );
      if (existingItem) {
        if (existingItem.quantity + addItemDto.quantity > 10) {
          throw new BadRequestException('The combined quantity of the same variant and colour cannot exceed 10.');
        }
        existingItem.quantity += addItemDto.quantity;
      } else {
        cart.items.push(itemRepository.create({
          variant,
          variantId: variant.id,
          productName: product.name,
          selectedOptions: variant.options,
          selectedColour: addItemDto.selectedColour,
          unitPrice: variant.price,
          quantity: addItemDto.quantity,
          cart,
        }));
      }
      const saved = await cartRepository.save(cart);
      return this.buildCartView(manager, saved);
    });
  }

  async updateItemQuantity(
    cartId: string,
    cartItemId: number,
    quantity: number,
    userId?: string,
  ): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await this.loadCartForUpdate(manager, cartId, userId);
      if (cart.checkedOutAt) throw new BadRequestException('This cart has already been checked out.');
      const item = cart.items.find((cartItem) => cartItem.id === cartItemId);
      if (!item) throw new NotFoundException(`Item with ID "${cartItemId}" not found in cart "${cartId}".`);
      item.quantity = quantity;
      await manager.getRepository(CartItem).save(item);
      return this.buildCartView(manager, cart);
    });
  }

  async removeItem(cartId: string, cartItemId: number, userId?: string): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await this.loadCartForUpdate(manager, cartId, userId);
      if (cart.checkedOutAt) throw new BadRequestException('This cart has already been checked out.');
      const item = cart.items.find((cartItem) => cartItem.id === cartItemId);
      if (!item) throw new NotFoundException(`Item with ID "${cartItemId}" not found in cart "${cartId}".`);
      await manager.getRepository(CartItem).remove(item);
      return this.buildCartView(manager, cart);
    });
  }

  private async loadCartForUpdate(manager: EntityManager, id: string, userId?: string): Promise<Cart> {
    const repository = manager.getRepository(Cart);
    const cart = await repository.findOne({
      where: { id },
      loadEagerRelations: false,
      lock: { mode: 'pessimistic_write' },
    });
    if (!cart) throw new NotFoundException(`Cart with ID "${id}" not found`);
    if (cart.userId && cart.userId !== userId) {
      throw new ForbiddenException('This cart belongs to another user.');
    }
    if (!cart.userId && userId) {
      cart.userId = userId;
      await repository.save(cart);
    }
    cart.items = await manager.getRepository(CartItem).find({ where: { cart: { id } } });
    return cart;
  }

  private async buildCartView(
    manager: EntityManager,
    cart: Cart,
  ): Promise<Cart & { items: CartItemView[] }> {
    const items = await manager.getRepository(CartItem).find({ where: { cart: { id: cart.id } } });
    const variants = manager.getRepository(ProductVariant);
    const viewItems = await Promise.all(items.map(async (item) => {
      const variant = await variants.findOne({
        where: { id: item.variantId },
        relations: { product: true },
      });
      return {
        ...item,
        unitPrice: variant?.price ?? item.unitPrice,
        currentUnitPrice: variant?.price ?? null,
        available: Boolean(variant?.isActive && variant.product.isActive),
      };
    }));
    return { ...cart, items: viewItems };
  }
}
