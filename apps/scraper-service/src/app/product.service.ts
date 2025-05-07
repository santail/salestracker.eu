import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, PriceHistory } from '@salestracker/entities';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async getProductsToScrape(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      relations: ['priceHistory'],
    });
  }

  async updateProductPrice(productId: number, newPrice: number, url: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['priceHistory'],
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const lastPrice = product.priceHistory[product.priceHistory.length - 1]?.price || product.currentPrice;
    const priceChange = newPrice - lastPrice;
    const priceChangePercentage = (priceChange / lastPrice) * 100;

    // Create new price history entry
    const newPriceTag = {
      product,
      price: newPrice,
      timestamp: new Date(),
      url,
    };

    const priceHistory = this.priceHistoryRepository.create(newPriceTag);

    // Update product current price
    product.currentPrice = newPrice;
    product.lastPriceCheck = new Date();

    // Save both entities
    await this.priceHistoryRepository.save(priceHistory);
    await this.productRepository.save(product);

    // If price dropped significantly (e.g., more than 10%), trigger notification
    if (priceChangePercentage <= -10) {
      this.logger.log(`Price dropped by ${Math.abs(priceChangePercentage).toFixed(2)}% for product ${productId}`);
      // TODO: Trigger notification through RabbitMQ
    }
  }

  async addProduct(url: string, name: string, initialPrice: number): Promise<Product> {
    const newProduct = {
      url,
      name,
      currentPrice: initialPrice,
      isActive: true,
      lastPriceCheck: new Date(),
    };

    const product = this.productRepository.create(newProduct);

    const savedProduct = await this.productRepository.save(product);

    // Create initial price history
    const newPriceTag = {
      product: savedProduct,
      price: initialPrice,
      timestamp: new Date(),
      url,
    };

    const priceHistory = this.priceHistoryRepository.create(newPriceTag);

    await this.priceHistoryRepository.save(priceHistory);

    return savedProduct;
  }
}
