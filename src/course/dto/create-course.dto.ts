import { ApiProperty } from '@nestjs/swagger'; 
import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    description: "Kurs nomi",
    example: "NestJS Dasturlash Asoslari",
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: "Kurs nomi matn formatida bo'lishi kerak." })
  @IsNotEmpty({ message: "Kurs nomi bo'sh bo'lishi mumkin emas." })
  @MinLength(3, { message: "Kurs nomi kamida 3 belgidan iborat bo'lishi kerak." })
  @MaxLength(100, { message: "Kurs nomi ko'pi bilan 100 belgidan iborat bo'lishi kerak." })
  name: string;

  @ApiProperty({
    description: "Kurs haqida qisqacha ma'lumot (ixtiyoriy)",
    example: "Bu kurs NestJS frameworkini o'rganish uchun mo'ljallangan.",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Kurs tavsifi matn formatida bo'lishi kerak." })
  @MaxLength(500, { message: "Kurs tavsifi ko'pi bilan 500 belgidan iborat bo'lishi kerak." })
  description?: string;
}