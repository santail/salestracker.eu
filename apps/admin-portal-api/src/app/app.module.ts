import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@salestracker/database';
import { Product } from '@salestracker/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, Product],
})
export class AppModule {}
