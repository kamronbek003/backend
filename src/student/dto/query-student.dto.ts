import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class QueryStudentDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Sahifa raqami butun son bo'lishi kerak."})
  @Min(1, { message: "Sahifa raqami 1 dan kam bo'lmasligi kerak."})
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Har sahifadagi elementlar soni', default: 10, maximum: 100, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Elementlar soni butun son bo'lishi kerak."})
  @Min(1, { message: "Elementlar soni 1 dan kam bo'lmasligi kerak."})
  @Max(100, { message: "Elementlar soni 100 dan ko'p bo'lmasligi kerak."})
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Saralash maydoni', default: 'createdAt', type: String, example: 'firstName' })
  @IsOptional()
  @IsString({ message: "Saralash maydoni satr bo'lishi kerak."})
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Saralash tartibi', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: "Saralash tartibi 'asc' yoki 'desc' bo'lishi kerak."})
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Talaba IDsi bo\'yicha filtr (qisman moslik, registrsiz)', type: String, example: 'N100' })
  @IsOptional()
  @IsString()
  filterByStudentId?: string;

  @ApiPropertyOptional({ description: 'Ism yoki familiya bo\'yicha filtr (qisman moslik, registrsiz)', type: String })
  @IsOptional()
  @IsString()
  filterByName?: string;

  @ApiPropertyOptional({ description: 'Telefon raqami bo\'yicha filtr (qisman moslik)', type: String })
  @IsOptional()
  @IsString()
  filterByPhone?: string;

  @ApiPropertyOptional({ description: 'Guruh IDsi bo\'yicha filtr (talaba shu guruhga a\'zo bo\'lishi kerak)'})
  @IsOptional()
  @IsUUID('all', {message: "Guruh IDsi UUID formatida bo'lishi kerak."})
  filterByGroupId?: string; 

  @ApiPropertyOptional({ description: 'Talaba statusi bo\'yicha filtr', enum: Status })
  @IsOptional()
  @IsEnum(Status, { message: "Status qiymati noto'g'ri (FAOL, NOFAOL, TUGATGAN)."})
  filterByStatus?: Status;

  @ApiPropertyOptional({ description: 'Talaba bali bo\'yicha filtr (aniq moslik)', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Ball butun son bo'lishi kerak."})
  @Min(0, { message: "Ball 0 dan kam bo'lmasligi kerak."})
  filterByScore?: number;
}
