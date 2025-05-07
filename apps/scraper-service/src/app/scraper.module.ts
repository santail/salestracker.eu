import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScraperService } from './scraper.service';
import { ProxyProviderService } from './proxy-provider.service';
import { ProductService } from './product.service';
import { RabbitMQService } from '@salestracker/shared';
import { DatabaseModule } from '@salestracker/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistory, Product } from '@salestracker/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Product, PriceHistory])
  ],
  providers: [
    ScraperService,
    ProxyProviderService,
    ProductService,
    RabbitMQService,
  ],
})
export class ScraperModule {}
