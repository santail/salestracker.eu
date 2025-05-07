import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Channel, ChannelModel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: ChannelModel | undefined;
  private channel!: Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const url = this.configService.get<string>('RABBITMQ_URL');
      this.connection = await amqp.connect(url!);
      this.channel = await this.connection.createChannel();

      // Declare queues
      await this.channel.assertQueue('price-alerts', { durable: true });
      await this.channel.assertQueue('scraping-tasks', { durable: true });

      this.logger.log('RabbitMQ connection established');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  async publishPriceAlert(productId: number, oldPrice: number, newPrice: number, url: string) {
    try {
      const message = {
        productId,
        oldPrice,
        newPrice,
        url,
        timestamp: new Date().toISOString(),
      };

      await this.channel.sendToQueue(
        'price-alerts',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      this.logger.log(`Price alert published for product ${productId}`);
    } catch (error) {
      this.logger.error('Failed to publish price alert:', error);
      throw error;
    }
  }

  async publishScrapingTask(productId: number, url: string) {
    try {
      const message = {
        productId,
        url,
        timestamp: new Date().toISOString(),
      };

      await this.channel.sendToQueue(
        'scraping-tasks',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      this.logger.log(`Scraping task published for product ${productId}`);
    } catch (error) {
      this.logger.error('Failed to publish scraping task:', error);
      throw error;
    }
  }

  async consumePriceAlerts(callback: (message: any) => Promise<void>) {
    try {
      await this.channel.consume('price-alerts', async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing price alert:', error);
            this.channel.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to consume price alerts:', error);
      throw error;
    }
  }

  async consumeScrapingTasks(callback: (message: any) => Promise<void>) {
    try {
      await this.channel.consume('scraping-tasks', async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing scraping task:', error);
            this.channel.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to consume scraping tasks:', error);
      throw error;
    }
  }
}
