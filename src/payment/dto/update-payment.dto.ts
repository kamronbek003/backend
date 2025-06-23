import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Matches,
  IsInt,
} from 'class-validator';
import { PaymentType, monthStatus } from '@prisma/client';
import { CreatePaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiPropertyOptional({
    description: 'UUID of the student making the payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString({ message: "Talaba ID si string bo'lishi kerak" })
  studentId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the group associated with the payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString({ message: "Guruh ID si string bo'lishi kerak" })
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Payment amount',
    example: 550000.0,
  })
  @IsOptional()
  @IsNumber({}, { message: "Summa raqam bo'lishi kerak" })
  summa?: number;

  @ApiPropertyOptional({
    description: 'Payment date in DD-MM-YYYY format',
    example: '25-04-2024',
  })
  @IsOptional()
  @IsString({ message: "Sana string bo'lishi kerak" })
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: "Sana DD-MM-YYYY formatida bo'lishi kerak",
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.KARTA,
  })
  @IsOptional()
  @IsEnum(PaymentType, { message: "To'lov turi noto'g'ri" })
  paymentType?: PaymentType;

  @ApiPropertyOptional({
    description: 'Month for which the payment is made',
    enum: monthStatus,
    example: monthStatus.YANVAR,
  })
  @IsOptional()
  @IsEnum(monthStatus, { message: "Oyni noto'g'ri kiritildi" })
  whichMonth?: monthStatus;

  @ApiPropertyOptional({
    description: 'Year for which the payment is made',
    example: 2024,
  })
  @IsOptional()
  @IsInt({ message: "Yil butun son bo'lishi kerak" })
  whichYear?: number;

  @ApiPropertyOptional({
    description: 'UUID of the admin updating the payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString({ message: "Admin ID si string bo'lishi kerak" })
  updatedByAdminId?: string;
}