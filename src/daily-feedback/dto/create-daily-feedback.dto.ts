import { IsString, IsInt, IsNotEmpty, IsUUID, Min, Max, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class CreateDailyFeedbackDto {
  @ApiProperty({ description: "O'quvchining UUID si", example: "a1b2c3d4-..." })
  @IsUUID()
  @IsNotEmpty({ message: "O'quvchi ID si bo'sh bo'lishi mumkin emas." })
  studentId: string;

  @ApiProperty({ description: "Guruhning UUID si", example: "e5f6g7h8-..." })
  @IsUUID()
  @IsNotEmpty({ message: "Guruh ID si bo'sh bo'lishi mumkin emas." })
  groupId: string;

  @ApiProperty({ description: "Qo'yilgan ball (0-100 oralig'ida)", example: 85 })
  @IsInt({ message: "Ball butun son bo'lishi kerak." })
  @Min(0, { message: "Ball 0 dan kichik bo'lishi mumkin emas." })
  @Max(100, { message: "Ball 100 dan katta bo'lishi mumkin emas." }) 
  ball: number;

  @ApiProperty({ description: "Fikr-mulohaza matni", example: "Darsda faol qatnashdi." })
  @IsString({ message: "Fikr-mulohaza matn bo'lishi kerak." })
  @IsNotEmpty({ message: "Fikr-mulohaza bo'sh bo'lishi mumkin emas." })
  feedback: string;

  @ApiProperty({ 
    description: "Fikr-mulohaza sanasi (YYYY-MM-DD yoki ISO formatida). Agar yuborilmasa, joriy sana olinadi.",
    example: "2025-05-27",
    required: false 
  })
  @IsOptional()
  @IsDateString({}, { message: "Sana yaroqli ISO 8601 formatida bo'lishi kerak."})
  feedbackDate?: string; 
}