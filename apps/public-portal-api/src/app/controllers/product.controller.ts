import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { SearchProductsDto } from '../dto/search-products.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('search')
  async searchProducts(@Query() searchDto: SearchProductsDto) {
    return this.productService.searchProducts(searchDto);
  }

  @Get(':id')
  async getProduct(@Param('id') id: number) {
    return this.productService.getProduct(id);
  }

  @Get(':id/price-history')
  async getPriceHistory(@Param('id') id: number) {
    return this.productService.getPriceHistory(id);
  }
}
