import { IsOptional, IsString, IsUUID, IsInt, Min, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer'; 
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDailyFeedbackDto {
  @ApiPropertyOptional({ description: "Sahifa raqami", default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Sahifadagi elementlar soni", default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "O'quvchining UUID si bo'yicha filtr" })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: "Guruhning UUID si bo'yicha filtr" })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: "Sana bo'yicha filtr (YYYY-MM-DD)", example: "2025-05-27" })
  @IsOptional()
  @IsDateString()
  date?: string; 

  @ApiPropertyOptional({ description: "Tartiblash maydoni", default: 'feedbackDate', enum: ['feedbackDate', 'ball', 'createdAt']})
  @IsOptional()
  @IsString()
  @IsIn(['feedbackDate', 'ball', 'createdAt'])
  sortBy?: string = 'feedbackDate';

  @ApiPropertyOptional({ description: "Tartiblash yo'nalishi", default: 'desc', enum: ['asc', 'desc']})
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}