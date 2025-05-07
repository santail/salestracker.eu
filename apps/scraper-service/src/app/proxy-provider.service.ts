import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

export interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

@Injectable()
export class ProxyProviderService {
  private readonly logger = new Logger(ProxyProviderService.name);
  private readonly proxyApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.proxyApiUrl = this.configService.get<string>('PROXY_API_URL');
  }

  async getProxy(): Promise<Proxy> {
    try {
      const response = await this.httpService.axiosRef.get(`${this.proxyApiUrl}/proxy`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get proxy:', error);
      throw new Error('Failed to get proxy from provider');
    }
  }

  async releaseProxy(proxy: Proxy): Promise<void> {
    try {
      await this.httpService.axiosRef.post(`${this.proxyApiUrl}/release`, proxy);
    } catch (error) {
      this.logger.error('Failed to release proxy:', error);
    }
  }
} 