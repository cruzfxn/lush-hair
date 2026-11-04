import { Controller, Post, Get, Param, Body, ParseUUIDPipe, ParseIntPipe, Request, UseGuards, Patch, Delete } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Request() req: { user?: { userId: string } }) {
    return this.cartService.create(req.user?.userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user?: { userId: string } }) {
    return this.cartService.findOne(id, req.user?.userId);
  }

  @Post(':id/items')
  @UseGuards(OptionalJwtAuthGuard)
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addItemDto: AddItemDto,
    @Request() req: { user?: { userId: string } },
  ) {
    return this.cartService.addItem(id, addItemDto, req.user?.userId);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  updateItemQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateCartItemDto,
    @Request() req: { user?: { userId: string } },
  ) {
    return this.cartService.updateItemQuantity(id, itemId, updateDto.quantity, req.user?.userId);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Request() req: { user?: { userId: string } },
  ) {
    return this.cartService.removeItem(id, itemId, req.user?.userId);
  }
}
