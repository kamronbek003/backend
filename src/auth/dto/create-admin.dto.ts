import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Yangi adminning ismi',
    example: 'Kamron',
    required: true,
  })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Yangi adminning familiyasi',
    example: 'Ibrohimov',
    required: true,
  })
  @IsNotEmpty({ message: 'Familiya kiritilishi shart' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: "Yangi adminning telefon raqami (O'zbekiston formati)",
    example: '+998945895766',
    required: true,
    uniqueItems: true,
    pattern: '^\\+998\\d{9}$',
  })
  @IsNotEmpty({ message: 'Telefon raqami kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message:
      "Telefon raqami '+998' bilan boshlanishi va 12 ta raqamdan iborat bo'lishi kerak (masalan: +998901234567)",
  })
  phone: string;

  @ApiProperty({
    description: 'Yangi admin uchun parol (kamida 6 belgi)',
    example: '123456',
    required: true,
    minLength: 6,
    format: 'password',
  })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 belgidan iborat boʻlishi kerak' })
  password: string;

  @ApiPropertyOptional({
    description: 'Adminning profil rasmi uchun URL (ixtiyoriy)',
    example: 'https://example.com/images/admin.jpg',
    format: 'url',
  })
  @IsOptional()
  @IsUrl({}, { message: "Rasm uchun to'g'ri URL kiriting" })
  @IsString()
  image?: string;
}
