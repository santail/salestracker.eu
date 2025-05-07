import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, PriceHistory, TrackedProduct } from '@salestracker/entities';
import { SearchProductsDto } from '../dto/search-products.dto';
import { TrackProductDto } from '../dto/track-product.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(TrackedProduct)
    private readonly trackedProductRepository: Repository<TrackedProduct>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async searchProducts(searchDto: SearchProductsDto) {
    const { query, minPrice, maxPrice, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const searchQuery: any = {
      index: 'products',
      body: {
        query: {
          bool: {
            must: [],
            filter: [],
          },
        },
        from: skip,
        size: limit,
        sort: [{ _score: 'desc' }],
      },
    };

    if (query) {
      searchQuery.body.query.bool.must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description'],
        },
      });
    }

    if (minPrice !== undefined) {
      searchQuery.body.query.bool.filter.push({
        range: { currentPrice: { gte: minPrice } },
      });
    }

    if (maxPrice !== undefined) {
      searchQuery.body.query.bool.filter.push({
        range: { currentPrice: { lte: maxPrice } },
      });
    }

    const { hits } = await this.elasticsearchService.search(searchQuery);
    const products = hits.hits.map(hit => hit._source);

    return {
      products,
      total: hits.total,
      page,
      limit,
    };
  }

  async getProduct(id: number) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['priceHistory'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async getPriceHistory(id: number) {
    const priceHistory = await this.priceHistoryRepository.find({
      where: { product: { id } },
      order: { createdAt: 'DESC' },
    });

    return priceHistory;
  }

  async trackProduct(trackDto: TrackProductDto, userId: string) {
    const { productId, notificationEmail, targetPrice } = trackDto;

    const product = await this.getProduct(productId);

    const newProduct = {
      product,
      userId,
      notificationEmail,
      targetPrice,
    };

    const trackedProduct = this.trackedProductRepository.create(newProduct);

    return this.trackedProductRepository.save(trackedProduct);
  }

  async getTrackedProducts(userId: string) {
    return this.trackedProductRepository.find({
      where: { userId },
      relations: ['product', 'product.priceHistory'],
    });
  }
}
