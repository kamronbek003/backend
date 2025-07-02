import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDebtorDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Har sahifadagi elementlar soni', default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
  
  @ApiPropertyOptional({ description: "Ism yoki familiya bo'yicha filtr" })
  @IsOptional()
  @IsString()
  filterByName?: string;

  @ApiPropertyOptional({ description: "Talaba IDsi bo'yicha filtr" })
  @IsOptional()
  @IsString()
  filterByStudentId?: string;
  
  @ApiPropertyOptional({ description: "Guruh IDsi (UUID) bo'yicha filtr" })
  @IsOptional()
  @IsUUID('all', { message: "Guruh IDsi UUID formatida bo'lishi kerak." })
  @Transform(({ value }) => (value === '' ? undefined : value))
  filterByGroupId?: string;

  @ApiPropertyOptional({
    description: "Qarzdorlikni tekshirish uchun oy raqami (1-12). 'filterByYear' bilan birga ishlatilishi kerak.",
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  filterByMonth?: number;

  @ApiPropertyOptional({
    description: "Qarzdorlikni tekshirish uchun yil. 'filterByMonth' bilan birga ishlatilishi kerak.",
    example: 2025,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  filterByYear?: number;

  @ApiPropertyOptional({ description: "Guruh o'qituvchisi IDsi (UUID) bo'yicha filtr" })
  @IsOptional()
  @IsUUID('all', { message: "O'qituvchi IDsi UUID formatida bo'lishi kerak." })
  filterByTeacherId?: string;
}