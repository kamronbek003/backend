import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Matches,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, monthStatus } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'UUID of the student making the payment',
    format: 'uuid',
    example: 'uuid',
  })
  @IsNotEmpty({ message: "Talaba ID si kiritilishi shart" })
  @IsString({ message: "Talaba ID si string bo'lishi kerak" })
  studentId: string;

  @ApiProperty({
    description: 'UUID of the group associated with the payment',
    format: 'uuid',
    example: 'uuid',
  })
  @IsNotEmpty({ message: "Guruh ID si kiritilishi shart" })
  @IsString({ message: "Guruh ID si string bo'lishi kerak" })
  groupId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 500000.0,
  })
  @IsNumber({}, { message: "Summa raqam bo'lishi kerak" })
  @IsNotEmpty({ message: "Summa kiritilishi shart" })
  summa: number;

  @ApiProperty({
    description: 'Payment date in DD-MM-YYYY format',
    example: '24-04-2024',
  })
  @IsString({ message: "Sana string bo'lishi kerak" })
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: "Sana DD-MM-YYYY formatida bo'lishi kerak",
  })
  @IsNotEmpty({ message: "Sana kiritilishi shart" })
  date: string;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.NAQD,
  })
  @IsEnum(PaymentType, { message: "To'lov turi noto'g'ri" })
  @IsNotEmpty({ message: "To'lov turi kiritilishi shart" })
  paymentType: PaymentType;

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
    description: 'UUID of the admin creating the payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString({ message: "Admin ID si string bo'lishi kerak" })
  createdByAdminId?: string;
}