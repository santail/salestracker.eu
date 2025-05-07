import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ProxyProviderService } from './proxy-provider.service';
import { ProductService } from './product.service';
import { RabbitMQService } from '@salestracker/shared';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly scrapingInterval: number;
  private readonly priceDropThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly proxyProviderService: ProxyProviderService,
    private readonly productService: ProductService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.scrapingInterval = this.configService.get<number>('SCRAPING_INTERVAL', 3600000); // 1 hour default
    this.priceDropThreshold = this.configService.get<number>('PRICE_DROP_THRESHOLD', 10); // 10% default
  }

  async startScraping() {
    try {
      const products = await this.productService.getProductsToScrape();
      const proxy = await this.proxyProviderService.getProxy();

      for (const product of products) {
        try {
          const price = await this.scrapeProductPrice(product.url, proxy);
          await this.productService.updateProductPrice(product.id, price, product.url);
        } catch (error) {
          this.logger.error(`Error scraping product ${product.id}:`, error);
        }
      }

      await this.proxyProviderService.releaseProxy(proxy);
    } catch (error) {
      this.logger.error('Error during scraping:', error);
    }
  }

  private async scrapeProductPrice(url: string, proxy: any): Promise<number> {
    const browser = await puppeteer.launch({
      args: [
        `--proxy-server=${proxy.host}:${proxy.port}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    try {
      const page = await browser.newPage();

      if (proxy.username && proxy.password) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });
      }

      await page.goto(url, { waitUntil: 'networkidle0' });
      const content = await page.content();
      const $ = cheerio.load(content);

      // Example selectors - these need to be configured per e-commerce site
      const priceElement = $('.product-price').first();
      const priceText = priceElement.text().trim();

      // Extract numeric price value
      const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));

      if (isNaN(price)) {
        throw new Error('Could not extract price from page');
      }

      return price;
    } finally {
      await browser.close();
    }
  }

  async startScheduledScraping() {
    this.logger.log('Starting scheduled scraping...');

    // Initial run
    await this.startScraping();

    // Schedule subsequent runs
    setInterval(async () => {
      await this.startScraping();
    }, this.scrapingInterval);
  }
}
