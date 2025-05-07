import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsString, IsNumber, IsUrl, IsOptional } from 'class-validator';
import { PriceHistory } from './price-history.entity';
import { TrackedProduct } from './tracked-product.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @IsString()
  name!: string;

  @Column()
  @IsString()
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber()
  currentPrice!: number;

  @Column()
  @IsUrl()
  url!: string;

  @Column()
  @IsString()
  imageUrl!: string;

  @Column()
  @IsString()
  store!: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  category?: string;

  @Column()
  @IsString()
  isActive?: boolean;

  @OneToMany(() => PriceHistory, priceHistory => priceHistory.product)
  priceHistory!: PriceHistory[];

  @OneToMany(() => TrackedProduct, trackedProduct => trackedProduct.product)
  trackedProducts!: TrackedProduct[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  lastPriceCheck?: Date;
}
