import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum } from 'class-validator';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryCourseDto {
  @ApiPropertyOptional({
    description: "Sahifa raqami",
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Sahifa raqami butun son bo'lishi kerak." })
  @Min(1, { message: "Sahifa raqami kamida 1 bo'lishi kerak." })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Har bir sahifadagi elementlar soni",
    default: 10,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Elementlar soni butun son bo'lishi kerak." })
  @Min(1, { message: "Elementlar soni kamida 1 bo'lishi kerak." })
  @Max(100, { message: "Elementlar soni ko'pi bilan 100 bo'lishi kerak." })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Qaysi maydon bo'yicha saralash",
    example: "name",
    enum: ['id', 'name', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString({ message: "Saralash maydoni matn formatida bo'lishi kerak." })
  @IsEnum(['id', 'name', 'createdAt', 'updatedAt'], {
    message: "Saralash maydoni 'id', 'name', 'createdAt' yoki 'updatedAt' bo'lishi kerak.",
  })
  sortBy?: 'id' | 'name' | 'createdAt' | 'updatedAt' = 'createdAt';

  @ApiPropertyOptional({
    description: "Saralash tartibi ('asc' yoki 'desc')",
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: "Saralash tartibi 'asc' yoki 'desc' bo'lishi kerak." })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: "Kurs nomi bo'yicha qidirish (qisman moslik)",
    example: "NestJS",
  })
  @IsOptional()
  @IsString({ message: "Qidiruv so'zi matn formatida bo'lishi kerak." })
  searchName?: string;

  @ApiPropertyOptional({
    description: "Kurs tavsifi bo'yicha qidirish (qisman moslik)",
    example: "framework",
  })
  @IsOptional()
  @IsString({ message: "Qidiruv so'zi matn formatida bo'lishi kerak." })
  searchDescription?: string;
}
