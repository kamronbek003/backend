import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateSalaryDto {
  @ApiProperty({
    description: "To'lov miqdori",
    example: 500.5,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Qaysi oy uchun maosh (1-12)',
    example: 6,
  })
  @IsInt()
  @IsNotEmpty()
  forMonth: number;

  @ApiProperty({
    description: 'Qaysi yil uchun maosh',
    example: 2025,
  })
  @IsInt()
  @IsNotEmpty()
  forYear: number;

  @ApiProperty({
    description: "O'qituvchining noyob identifikatori (UUID)",
    example: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({
    description: "Maoshni bergan adminning noyob identifikatori (UUID)",
    example: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  issuedByAdminId?: string;

  @ApiProperty({
    description: 'Qo\'shimcha izohlar',
    example: "Iyul oyi uchun bonuslar bilan birga.",
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: "Taxminiy hisoblangan maosh (ma'lumot uchun)",
    example: '550.00',
    required: false,
  })
  @IsString()
  @IsOptional()
  estimatedSalary?: string;
}