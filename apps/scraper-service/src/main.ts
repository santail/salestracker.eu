import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ScraperModule } from './app/scraper.module';
import { ScraperService } from './app/scraper.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(ScraperModule);
  
  // Get the scraper service instance
  const scraperService = app.get(ScraperService);
  
  // Start scheduled scraping
  await scraperService.startScheduledScraping();
  
  logger.log('Scraper service started');
}

bootstrap().catch((error) => {
  console.error('Failed to start scraper service:', error);
  process.exit(1);
}); 