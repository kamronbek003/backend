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
import { AttendanceStatus } from '@prisma/client';

export class QueryAttendanceDto {
  // Mavjud maydonlar...
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 500, maximum: 500, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 1000;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt', type: String, example: 'date' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by Group UUID', type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  filterByGroupId?: string;

  @ApiPropertyOptional({ description: 'Filter by Teacher UUID', type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  filterByTeacherId?: string;

  @ApiPropertyOptional({ description: 'Filter by Student Business ID (contains, case-insensitive)', type: String, example: 'N12345' })
  @IsOptional()
  @IsString()
  filterByStudentBusinessId?: string;

  @ApiPropertyOptional({ description: 'Filter by Attendance Status', enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  filterByStatus?: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Filter by a specific date (YYYY-MM-DD format)',
    example: '2024-04-25',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateStringValidator({ strict: true }, { message: "filterByDate yaroqli YYYY-MM-DD sana stringi bo'lishi kerak" })
  filterByDate?: string;

  @ApiPropertyOptional({ description: 'Filter by Student UUID', type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  filterByStudentId?: string;
}