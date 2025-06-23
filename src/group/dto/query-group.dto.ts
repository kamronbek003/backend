import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum, IsUUID, Matches as MatchesValidator } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class QueryGroupDto {
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
  @Max(1000)
  limit?: number = 1000;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt', type: String, example: 'groupId' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'; 

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by Group Business ID (exact match)', type: String, example: 'G101' })
  @IsOptional()
  @IsString()
  filterByGroupId?: string;

  @ApiPropertyOptional({ description: 'Filter by group status', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  filterByStatus?: Status;

  @ApiPropertyOptional({ description: 'Filter by assigned Teacher ID (exact match)', type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID() 
  filterByTeacherId?: string;

  @ApiPropertyOptional({ description: 'Filter by groups that have no teacher assigned', type: Boolean })
  @IsOptional()
  @Type(() => Boolean) 
  filterByNoTeacher?: boolean; 
}
