import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { IsNumber, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Product } from './product.entity';

@Entity('tracked_products')
export class TrackedProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Product, product => product.trackedProducts)
  product!: Product;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsNumber()
  @IsOptional()
  targetPrice?: number;

  @Column({ default: false })
  @IsBoolean()
  isActive!: boolean;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  userId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
