import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  IsPhoneNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { teacherStatus } from '@prisma/client'; 
import { Type } from 'class-transformer'; 

export class CreateTeacherDto {
  @ApiProperty({ description: 'Teacher first name', example: 'Kamron' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Teacher last name', example: 'Ibrohimov' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Teacher phone number', example: '+998945895766' })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('UZ')
  phone: string;

  @ApiProperty({ description: 'Teacher password', example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ description: 'Teacher address', example: '123 Tashkent St.' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Teacher date of birth in DD-MM-YYYY format',
    example: '15-05-1990',
  })
  @IsString()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: 'dateBirth must be in DD-MM-YYYY format',
  })
  @IsNotEmpty()
  dateBirth: string;

  @ApiPropertyOptional({
    description: 'Teacher image URL (optional)',
    example: 'https://example.com/images/teacher.jpg',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ description: 'Teacher experience in years', example: 5.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  experience: number;

  @ApiPropertyOptional({
    description: 'Date when the teacher started working in DD-MM-YYYY format (optional)',
    example: '10-01-2020',
  })
  @IsString()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: 'startedAt must be in DD-MM-YYYY format',
  })
  @IsOptional()
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Subject the teacher teaches (optional)',
    example: 'Mathematics',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Teacher\'s percentage for salary calculation (optional, defaults to 40)',
    example: 40,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Foiz 0 dan kam bo‘lishi mumkin emas' })
  @Max(100, { message: 'Foiz 100 dan ko‘p bo‘lishi mumkin emas' })
  @IsOptional()
  percent?: number;

  @ApiPropertyOptional({
    description: 'Teacher status (optional, defaults to ODDIY)',
    enum: teacherStatus,
    example: teacherStatus.ODDIY,
  })
  @IsEnum(teacherStatus, { message: 'Status qiymati noto‘g‘ri (ODDIY, LIDER)' })
  @IsOptional()
  status?: teacherStatus;
}