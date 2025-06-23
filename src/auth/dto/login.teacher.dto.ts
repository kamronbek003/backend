import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginTeacherDto {
  @ApiProperty({
    description: "Teacherning tizimga kirish uchun O'zbekiston telefon raqami",
    example: '+998945895766',
    required: true,
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
    description: 'Adminning tizimga kirish paroli (kamida 6 belgi)',
    example: '123456',
    minLength: 6,
    required: true,
    type: 'string',
    format: 'password',
  })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 belgidan iborat boʻlishi kerak' })
  password: string;
}
