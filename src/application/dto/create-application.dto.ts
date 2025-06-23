import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsOptional,
  Min,
  IsEnum,
  Matches,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ApplicationStatus {
  KUTILYABDI = 'KUTILYABDI',
  BOGLANILDI = 'BOGLANILDI',
}

export class CreateApplicationDto {
  @ApiProperty({
    description: "Bog'lanmoqchi bo'lgan kursning ID si",
    example: 1,
  })
  @IsNotEmpty({ message: "Kurs ID si bo'sh bo'lmasligi kerak." })
  @IsInt({ message: "Kurs ID si butun son bo'lishi kerak." })
  @Min(1, { message: "Kurs ID si 1 dan kichik bo'lmasligi kerak." })
  courseId: number;

  @ApiProperty({
    description: 'Arizachining Telegram ID si (unikal)',
    example: '1234567890',
    type: String,
  })
  @IsNotEmpty({ message: "Telegram ID bo'sh bo'lmasligi kerak." })
  @IsString({ message: 'Telegram ID satr boʻlishi kerak.' })
  @Matches(/^[0-9]+$/, {
    message: 'Telegram ID faqat raqamlardan iborat boʻlishi kerak.',
  })
  telegramId: string;

  @ApiPropertyOptional({ description: 'Arizachi ismi', example: 'Kamron' })
  @IsOptional()
  @IsString({ message: "Ism satr bo'lishi kerak." })
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Arizachi familiyasi',
    example: 'Ibrohimov',
  })
  @IsOptional()
  @IsString({ message: "Familiya satr bo'lishi kerak." })
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Arizachi yoshi', example: 25 })
  @IsOptional()
  @IsInt({ message: "Yosh butun son bo'lishi kerak." })
  @Min(1, { message: "Yosh 1 dan kichik bo'lmasligi kerak." })
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  age?: number;

  @ApiPropertyOptional({
    description: "Arizachi telefon raqami (O'zbekiston formati)",
    example: '+998945895766',
  })
  @IsOptional()
  @IsPhoneNumber('UZ', {
    message:
      "Telefon raqami O'zbekiston formatiga mos kelishi kerak (masalan, +998XXXXXXXXX).",
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Ariza holati',
    enum: ApplicationStatus,
    default: ApplicationStatus.KUTILYABDI,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: "Holat noto'g'ri qiymatga ega." })
  status?: ApplicationStatus = ApplicationStatus.KUTILYABDI;
}
