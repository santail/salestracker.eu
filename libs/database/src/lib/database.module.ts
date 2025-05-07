import { Module } from '@nestjs/common';
import { PriceHistory, Product } from '@salestracker/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        })
      ],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production'
      }),
      inject: [ConfigService]
    }),
    TypeOrmModule.forFeature([Product, PriceHistory])
  ],
  controllers: [],
  providers: [Product, PriceHistory],
  exports: [Product, PriceHistory]
})
export class DatabaseModule {
}
