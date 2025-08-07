import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional, IsUUID, IsString, Matches, IsEnum, IsInt,
  IsPositive, MinLength, IsPhoneNumber, IsArray, Min, IsBoolean,
  isJSON,
  IsJSON,
} from 'class-validator';
import { FindStatus, Status } from '@prisma/client';
import { CreateStudentDto } from './create-student.dto'; 
import { Type } from 'class-transformer';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {

  @ApiPropertyOptional({ description: 'Unique Student ID (Business ID). Generally not updatable.' })
  @IsString()
  @IsOptional()
  studentId?: string; 

  @ApiPropertyOptional({ description: 'Student first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Student last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Student phone number' })
  @IsString()
  @IsOptional()
  @IsPhoneNumber('UZ', { message: 'Telefon raqami O\'zbekiston formatiga mos kelishi kerak (masalan, +998xxxxxxxxx)'})
  phone?: string;

  @ApiPropertyOptional({ description: 'New student password (min 6 characters). Only provide if changing.' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Student address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Student date of birth in DD-MM-YYYY format' })
  @IsString()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, { message: 'Tug\'ilgan sana DD-MM-YYYY formatida bo\'lishi kerak' })
  @IsOptional()
  dateBirth?: string;

  @ApiPropertyOptional({ description: 'Student image URL' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Parent phone number' })
  @IsString()
  @IsOptional()
  @IsPhoneNumber('UZ', { message: 'Ota-ona telefon raqami O\'zbekiston formatiga mos kelishi kerak (masalan, +998xxxxxxxxx)'})
  parentPhone?: string;

  @ApiPropertyOptional({
    description: 'Array of group IDs to assign the student to. Replaces all existing group associations. Provide an empty array to remove from all groups.',
    type: [String],
    example: ['uuid-group-new-1', 'uuid-group-new-2'],
  })
  @IsArray()
  @IsUUID('all', { each: true, message: 'Har bir guruh IDsi UUID formatida bo\'lishi kerak' })
  @IsOptional()
  groupIds?: string[];

  @ApiPropertyOptional({ description: 'Student status', enum: Status })
  @IsEnum(Status, { message: 'Status qiymati noto\'g\'ri (FAOL, NOFAOL, TUGATGAN)'})
  @IsOptional()
  status?: Status;

  @ApiPropertyOptional({ description: 'Student monthly payment amount' })
  @Type(() => Number)
  @IsInt({ message: 'Oylik to\'lov butun son bo\'lishi kerak' })
  @IsPositive({ message: 'Oylik to\'lov musbat son bo\'lishi kerak' })
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: 'Student score', example: 25 })
  @Type(() => Number)
  @IsInt({ message: 'Ball butun son bo\'lishi kerak' })
  @Min(0, { message: 'Ball 0 dan kam bo\'lmasligi kerak' })
  @IsOptional()
  ball?: number;

  @ApiPropertyOptional({ 
      description: 'Which school the student attends (optional)', 
      example: '21-maktab'
    })
    @IsString({ message: "Maktab nomi matn shaklida bo'lishi kerak" })
    @IsOptional()
    whichSchool?: string;
  
    @ApiPropertyOptional({ 
      description: 'How the student found out about the institution (optional)',
      enum: FindStatus,
      example: FindStatus.ADVERTISEMENT,
    })
    @IsEnum(FindStatus, { message: 'Topish manbai qiymati noto\'g\'ri (REKLAMA, TANISHLAR, INSTAGRAM)' })
    @IsOptional()
    howFind?: FindStatus;

    @ApiPropertyOptional({
    description: 'Date when the student enrolled in DD-MM-YYYY format (optional)',
    example: '01-06-2025',
    })
    @IsString()
    @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
      message: 'Qachon kelgan sana DD-MM-YYYY formatida bo\'lishi kerak'
    })
    @IsOptional()
    whenCome?: string;

    @ApiPropertyOptional({
      description: 'Note for the first payment (optional)',
      example: 'First payment made via bank transfer',
    })
    @IsString({ message: 'Birinchi to\'lov izohi matn shaklida bo\'lishi kerak' })
    @IsOptional()
    firstPaymentNote?: string;

    @ApiPropertyOptional({ 
        description: 'Aksiyada bormi', 
        example: true,
        type: Boolean
      })
      @IsBoolean({ message: "Aksiya 'true' yoki 'false' bo'lishi kerak" })
      @IsOptional()
      promotion?: boolean;
}
