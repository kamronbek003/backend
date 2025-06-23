import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString as IsDateStringValidator } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNoteDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, maximum: 100, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt', type: String, example: 'callDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'; 

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by full name (contains, case-insensitive)', type: String })
  @IsOptional()
  @IsString()
  filterByFullName?: string;

  @ApiPropertyOptional({ description: 'Filter by phone number (contains)', type: String })
  @IsOptional()
  @IsString()
  filterByPhone?: string;

  @ApiPropertyOptional({ description: 'Filter by notes created on or after this date (ISO 8601)', example: '2024-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateStringValidator()
  filterByDateFrom?: string; 
  @ApiPropertyOptional({ description: 'Filter by notes created on or before this date (ISO 8601)', example: '2024-04-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateStringValidator()
  filterByDateTo?: string; 
}
