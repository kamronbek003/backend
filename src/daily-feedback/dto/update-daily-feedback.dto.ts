import { IsString, IsInt, IsOptional, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDailyFeedbackDto {
  @ApiPropertyOptional({ description: "Yangi ball (0-100 oralig'ida)", example: 90 })
  @IsOptional()
  @IsInt({ message: "Ball butun son bo'lishi kerak." })
  @Min(0, { message: "Ball 0 dan kichik bo'lishi mumkin emas." })
  @Max(100, { message: "Ball 100 dan katta bo'lishi mumkin emas." })
  ball?: number;

  @ApiPropertyOptional({ description: "Yangilangan fikr-mulohaza matni", example: "Uyga vazifalarni o'z vaqtida bajardi." })
  @IsOptional()
  @IsString({ message: "Fikr-mulohaza matn bo'lishi kerak." })
  feedback?: string;

  @ApiPropertyOptional({ 
    description: "Fikr-mulohaza sanasini yangilash (YYYY-MM-DD yoki ISO formatida).",
    example: "2025-05-28"
  })
  @IsOptional()
  @IsDateString({}, { message: "Sana yaroqli ISO 8601 formatida bo'lishi kerak."})
  feedbackDate?: string;
}