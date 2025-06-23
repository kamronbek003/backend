import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsEnum,
  IsUUID,
  IsDateString as IsDateStringValidator,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HistoryActionType } from '@prisma/client'; 

export class QueryPaymentHistoryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Sahifa raqam butun son bo'lishi kerak" })
  @Min(1, { message: "Sahifa raqami 1 dan kichik bo'lmasligi kerak" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limit butun son bo'lishi kerak" })
  @Min(1, { message: "Limit 1 dan kichik bo'lmasligi kerak" })
  @Max(100, { message: "Limit 100 dan katta bo'lmasligi kerak" })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'createdAt',
    enum: ['createdAt', 'action'],
    type: String,
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'action'], {
    message: 'Saralash maydoni "createdAt" yoki "action" bo\'lishi kerak',
  }) 
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'Saralash tartibi "asc" yoki "desc" bo\'lishi kerak',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by Payment UUID',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: "To'lov IDsi yaroqli UUID bo'lishi kerak" }) 
  filterByPaymentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Admin UUID',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: "Admin IDsi yaroqli UUID bo'lishi kerak" })
  filterByAdminId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Action Type',
    enum: HistoryActionType,
  })
  @IsOptional()
  @IsEnum(HistoryActionType, { message: "Amal turi noto'g'ri" })
  filterByAction?: HistoryActionType;

  @ApiPropertyOptional({
    description: 'Filter by records created on or after this date (ISO 8601)',
    example: '2024-04-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateStringValidator(
    {},
    {
      message: "Boshlanish sanasi yaroqli ISO 8601 sana stringi bo'lishi kerak",
    },
  )
  filterByDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by records created on or before this date (ISO 8601)',
    example: '2024-04-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateStringValidator(
    {},
    { message: "Tugash sanasi yaroqli ISO 8601 sana stringi bo'lishi kerak" },
  )
  filterByDateTo?: string;
}
