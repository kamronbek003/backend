import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum Order {
  ASC = 'asc',
  DESC = 'desc',
}

export class QuerySalaryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: "Har bir sahifadagi ma'lumotlar soni", default: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 500;

  @ApiPropertyOptional({
    description: "Saralash uchun maydon nomi. Mavjud qiymatlar: 'amount', 'paymentDate', 'createdAt', 'teacherId'",
    example: 'createdAt',
  })
  @IsIn(['amount', 'paymentDate', 'createdAt', 'teacherId']) // 'teacherId' qo'shildi
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: "Saralash tartibi ('asc' yoki 'desc')", enum: Order, default: Order.DESC })
  @IsEnum(Order)
  @IsOptional()
  order?: Order = Order.DESC;
  
  @ApiPropertyOptional({ description: "O'qituvchi ismi yoki familiyasi bo'yicha qidiruv" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: "O'qituvchining aniq ID si bo'yicha filtr" })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Oy bo`yicha filtr (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;
  
  @ApiPropertyOptional({ description: 'Yil bo`yicha filtr' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({
    description: 'Group ID lar (vergul bilan ajratilgan UUIDlar)',
    type: [String],
    example: ['uuid1', 'uuid2']
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  @IsArray()
  @Transform(({ value }) => value.split(','))
  groupId_in?: string[];
}