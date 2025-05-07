import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { IsNumber } from 'class-validator';
import { Product } from './product.entity';

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber()
  price!: number;

  @ManyToOne(() => Product, product => product.priceHistory)
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;
} 