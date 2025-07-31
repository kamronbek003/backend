import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsEnum,
  IsDateString as IsDateStringValidator,
  IsNumber,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, monthStatus } from '@prisma/client';

export class QueryPaymentDto {
  @ApiPropertyOptional({
    description: 'Sahifa raqami (pagination uchun)',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Har sahifadagi yozuvlar soni',
    default: 10,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Saralash maydoni',
    default: 'createdAt',
    type: String,
    example: 'date',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Saralash tartibi',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Talaba ismi yoki familiyasi bo‘yicha filtr (case-insensitive)',
    type: String,
    example: 'Ali',
  })
  @IsOptional()
  @IsString()
  filterByName?: string;

  @ApiPropertyOptional({
    description: 'Talaba UUID si bo‘yicha filtr',
    type: String,
    example: 'uuid',
  })
  @IsOptional()
  @IsString()
  filterByStudentId?: string;

  @ApiPropertyOptional({
    description: 'Talaba biznes ID si bo‘yicha filtr (masalan, N12345)',
    type: String,
  })
  @IsOptional()
  @IsString()
  filterByStudentBusinessId?: string;

  @ApiPropertyOptional({
    description: 'Guruh biznes ID si bo‘yicha filtr (masalan, G101)',
    type: String,
  })
  @IsOptional()
  @IsString()
  filterByGroupBusinessId?: string;

  @ApiPropertyOptional({
    description: 'To‘lov turi bo‘yicha filtr',
    enum: PaymentType,
  })
  @IsOptional()
  @IsEnum(PaymentType)
  filterByPaymentType?: PaymentType;

  @ApiPropertyOptional({
    description: 'To‘lov boshlang‘ich sanasi (ISO 8601 formatida)',
    example: '2024-04-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateStringValidator()
  filterByDateFrom?: string;

  @ApiPropertyOptional({
    description: 'To‘lov tugash sanasi (ISO 8601 formatida)',
    example: '2024-04-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateStringValidator()
  filterByDateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimal to‘lov summasi bo‘yicha filtr',
    type: Number,
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  filterByMinSumma?: number;

  @ApiPropertyOptional({
    description: 'Maksimal to‘lov summasi bo‘yicha filtr',
    type: Number,
    example: 500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  filterByMaxSumma?: number;

  @ApiPropertyOptional({
    description: 'To‘lov qaysi oy uchun ekanligi bo‘yicha filtr',
    enum: monthStatus,
    example: 'IYUN',
  })
  @IsOptional()
  @IsEnum(monthStatus)
  filterByMonth?: monthStatus;

  @ApiPropertyOptional({
    description: 'To‘lov qaysi yil uchun ekanligi bo‘yicha filtr',
    type: Number,
    example: 2025,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  filterByYear?: number;

  @ApiPropertyOptional({
    description: 'Group ID lar (vergul bilan ajratilgan UUIDlar)',
    type: [String],
    example: [
      '285c2beb-b351-493d-98e5-c755b2717d89',
      'bec99f8e-1e3b-4169-a053-9cb67128979c',
      '4d2fc3ed-3f89-432b-a324-8e4eae5fd2b7',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  groupId_in?: string[];
}