import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTeacherDto {
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

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt', type: String })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by first or last name (contains, case-insensitive)', type: String })
  @IsOptional()
  @IsString()
  filterByName?: string;

  @ApiPropertyOptional({ description: 'Filter by subject (contains, case-insensitive)', type: String })
  @IsOptional()
  @IsString()
  filterBySubject?: string;

  @ApiPropertyOptional({ description: 'Filter by phone number (contains)', type: String })
  @IsOptional()
  @IsString()
  filterByPhone?: string;
}
