import {
  IsString, IsNotEmpty, IsOptional,
  IsInt, Matches, IsUUID, IsEnum,
  IsPhoneNumber, IsPositive, IsArray, IsBoolean,
  Min,
  IsJSON
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status, FindStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @ApiProperty({ description: 'Unique Student ID (Business ID like N12345)', example: '' })
  @IsString({ message: 'Talaba IDsi satr bo\'lishi kerak' })
  @IsNotEmpty({ message: 'Talaba ID sini kiritishingiz kerak!' })
  studentId: string;

  @ApiProperty({ description: 'Student first name', example: 'Hasanxon' })
  @IsString()
  @IsNotEmpty({ message: 'Ismni kiritishingiz kerak!'})
  firstName: string;

  @ApiProperty({ description: 'Student last name', example: 'Jalilov' })
  @IsString()
  @IsNotEmpty({ message: 'Familiyani kiritishingiz kerak!'})
  lastName: string;

  @ApiProperty({ description: 'Student phone number', example: '+998945895763' })
  @IsString()
  @IsNotEmpty({ message: 'Telefon raqamini kiritishingiz kerak!'})
  @IsPhoneNumber('UZ', { message: 'Telefon raqami O\'zbekiston formatiga mos kelishi kerak (masalan, +998xxxxxxxxx)'})
  phone: string;

  @ApiProperty({ description: 'Student address', example: 'Islomobod' })
  @IsString()
  @IsNotEmpty({ message: 'Manzilni kiritishingiz kerak!'})
  address: string;

  @ApiProperty({
    description: 'Student date of birth in DD-MM-YYYY format',
    example: '10-09-2003',
  })
  @IsString()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: 'Tug\'ilgan sana DD-MM-YYYY formatida bo\'lishi kerak'
  })
  @IsNotEmpty({ message: 'Tug\'ilgan sanani kiritishingiz kerak!'})
  dateBirth: string;

  @ApiProperty({ description: 'Parent phone number', example: '+998945895766' })
  @IsString()
  @IsNotEmpty({ message: 'Ota-ona telefon raqamini kiritishingiz kerak!'})
  @IsPhoneNumber('UZ', { message: 'Ota-ona telefon raqami O\'zbekiston formatiga mos kelishi kerak (masalan, +998xxxxxxxxx)'})
  parentPhone: string;

  @ApiPropertyOptional({
    description: 'Array of group IDs the student belongs to (optional)',
    type: [String],
    example: ['9c311c88-e400-409e-9134-e0c58f50e6c0'],
  })
  @IsArray()
  @IsUUID('all', { each: true, message: 'Har bir guruh IDsi UUID formatida bo\'lishi kerak' })
  @IsOptional()
  groupIds?: string[];

  @ApiPropertyOptional({
    description: 'Student status (optional, defaults to FAOL)',
    enum: Status,
    example: Status.FAOL,
  })
  @IsEnum(Status, { message: 'Status qiymati noto\'g\'ri (FAOL, NOFAOL, TUGATGAN)'})
  @IsOptional()
  status?: Status = Status.FAOL;

  @ApiPropertyOptional({ description: 'Student discount percentage', example: 10 })
  @Type(() => Number)
  @IsInt({ message: 'Chegirma butun son bo\'lishi kerak' })
  @IsPositive({ message: 'Chegirma musbat son bo\'lishi kerak' })
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: 'Student initial score (optional, defaults to 0)', example: 998 })
  @Type(() => Number)
  @IsInt({ message: 'Ball butun son bo\'lishi kerak' })
  @Min(0)
  @IsOptional()
  ball?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Indicates if the student has family members in the institution (optional)', 
    example: true,
    type: Boolean 
  })
  @IsBoolean({ message: "hasFamilyMembers 'true' yoki 'false' bo'lishi kerak" })
  @IsOptional()
  hasFamilyMembers?: boolean;

  @ApiPropertyOptional({ 
    description: 'Which school the student attends (optional)', 
    example: '127-MAKTAB'
  })
  @IsString({ message: "Maktab nomi matn shaklida bo'lishi kerak" })
  @IsOptional()
  whichSchool?: string;

  @ApiPropertyOptional({ 
    description: 'How the student found out about the institution (optional)',
    enum: FindStatus,
    example: FindStatus.SOCIAL_MEDIA,
  })
  @IsEnum(FindStatus, { message: 'Topish manbai qiymati noto\'g\'ri (SOCIAL_MEDIA, FRIEND_REFERRAL, ADVERTISEMENT, OTHER)' })
  @IsOptional()
  howFind?: FindStatus;

  @ApiPropertyOptional({
    description: 'Date when the student enrolled in DD-MM-YYYY format (optional)',
    example: '11-06-2025',
  })
  @IsString()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
    message: 'Qachon kelgan sana DD-MM-YYYY formatida bo\'lishi kerak'
  })
  @IsOptional()
  whenCome?: string;

  @ApiPropertyOptional({
    description: 'Note for the first payment (optional)',
    example: 'Birinchi to\'lov bank orqali amalga oshirildi',
  })
  @IsString({ message: 'Birinchi to\'lov izohi matn shaklida bo\'lishi kerak' })
  @IsOptional()
  firstPaymentNote?: string;

  @ApiProperty({ description: 'Nima uchun ketti', example: 'Qimmatlik qildi!' })
  @IsString()
  @IsOptional()
  whyStop: string;

  @ApiPropertyOptional({ 
    description: 'Aksiyada bormi', 
    example: true,
    type: Boolean
  })
  @IsBoolean({ message: "Aksiya 'true' yoki 'false' bo'lishi kerak" })
  @IsOptional()
  promotion?: boolean;
}