import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TrackProductDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsString()
  notificationEmail?: string;

  @IsOptional()
  @IsNumber()
  targetPrice?: number;
} 