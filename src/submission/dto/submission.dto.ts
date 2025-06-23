import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsUrl,
  IsInt,
  Min,
  IsEnum,
  IsNumber,
  MinLength,
  ValidateNested,
  IsArray,
  Max, 
} from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, SubmissionStatus } from '@prisma/client'; 
export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object) 
  data: T[];

  @ApiProperty({ example: 100, description: 'Umumiy elementlar soni' })
  @IsInt()
  total: number;

  @ApiProperty({ example: 10, description: 'Sahifadagi elementlar soni' })
  @IsInt()
  limit: number;

  @ApiProperty({ example: 1, description: 'Joriy sahifa raqami' })
  @IsInt()
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Umumiy sahifalar soni' })
  @IsInt()
  totalPages: number;
}


export class StudentShortResponseDto {
  @ApiProperty({ example: 'uuid', description: "Talabaning unikal IDsi" })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Kamron', description: "Talabaning ismi" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Ibrohimov', description: "Talabaning familiyasi" })
  @IsString()
  lastName: string;
}

export class AssignmentShortResponseDto {
  @ApiProperty({ example: 'uuid', description: "Vazifaning unikal IDsi" })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Matematika 1-vazifa', description: "Vazifa sarlavhasi" })
  @IsString()
  title: string;

  @ApiProperty({ example: 'uuid', description: "Vazifa biriktirilgan guruh IDsi" })
  @IsUUID()
  groupId: string;
  
  @ApiProperty({ example: 'uuid', description: "Vazifani biriktirgan o'qituvchi IDsi" })
  @IsUUID()
  teacherId: string;
}


export class SubmissionResponseDto {
  @ApiProperty({ example: 'uuid', description: 'Topshiriq unikal IDsi' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Misollarning yechimlari...', required: false, description: 'Matnli javob' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'https://example.com/files/submission1.pdf', required: false, description: 'Topshirilgan fayl manzili' })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiProperty({ description: 'Topshirilgan vaqti', type: Date })
  submittedAt: Date;

  @ApiProperty({ example: 85.5, required: false, description: "Topshiriq uchun qo'yilgan baho (0-100)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100) 
  grade?: number;

  @ApiProperty({ example: 'Yaxshi ishlangan, lekin 3-misolda xatolik bor.', required: false, description: "O'qituvchi izohi" })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ enum: SubmissionStatus, example: SubmissionStatus.BAHOLANDI, description: 'Topshiriq holati' })
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  @ApiProperty({ example: 'uuid', description: "Topshiriqni yuborgan o'quvchi IDsi" })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 'a1s2s3i4-g5n6-m7e8-n9t0-a1b2c3d4e5f6', description: 'Topshiriq tegishli bo\'lgan vazifa IDsi' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ description: 'Yaratilgan vaqti', type: Date })
  createdAt: Date;

  @ApiProperty({ description: 'Yangilangan vaqti', type: Date })
  updatedAt: Date;

  @ApiProperty({ type: () => StudentShortResponseDto, required: false, description: "Topshiriqni yuborgan o'quvchi haqida qisqacha ma'lumot" })
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentShortResponseDto)
  student?: StudentShortResponseDto;

  @ApiProperty({ type: () => AssignmentShortResponseDto, required: false, description: "Topshiriq tegishli bo'lgan vazifa haqida qisqacha ma'lumot" })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentShortResponseDto)
  assignment?: AssignmentShortResponseDto;
}

export class CreateSubmissionDto {
  @ApiProperty({ example: 'Barcha misollarni yechdim.', required: false, description: "Matnli javob (agar fayl bo'lmasa talab qilinishi mumkin)" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiProperty({ example: 'https://example.com/files/my_submission.pdf', required: false, description: "Topshirilgan fayl manzili (URL)" })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ example: 90, required: false, description: "Baho (0-100 oralig'ida bo'lishi mumkin)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  grade?: number;

  @ApiProperty({ example: 'Juda yaxshi! Keyingi safar grafikni ham chizing.', required: false, description: "O'qituvchi izohi" })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ enum: SubmissionStatus, required: false, example: SubmissionStatus.BAHOLANDI, description: "Topshiriqning yangi holati (masalan, BAHOLANDI, QAYTARILDI)" })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}

export class SubmissionQueryDto {
  @ApiProperty({ required: false, default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Sahifadagi elementlar soni' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false, example: 'submittedAt', description: "Tartiblash uchun maydon nomi (masalan, 'submittedAt', 'grade', 'status')" })
  @IsOptional()
  @IsString()
  @IsEnum(['submittedAt', 'grade', 'status', 'createdAt', 'updatedAt'])
  sortBy?: string = 'submittedAt'; 

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc', description: "Tartiblash yo'nalishi" })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'; 

  @ApiProperty({ required: false, description: "Muayyan vazifa IDsi bo'yicha filterlash" })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({ required: false, description: "Muayyan o'quvchi IDsi bo'yicha filterlash (faqat adminlar uchun)" })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({ required: false, enum: SubmissionStatus, description: 'Topshiriq holati bo\'yicha filterlash' })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiProperty({ required: false, description: "Muayyan guruh IDsi bo'yicha filterlash (vazifa orqali, o'qituvchi/admin uchun)" })
  @IsOptional()
  @IsUUID()
  groupId?: string;
}

export class PaginatedSubmissionResponseDto extends PaginatedResponseDto<SubmissionResponseDto> {
  @ApiProperty({ 
    isArray: true, 
    type: () => SubmissionResponseDto,
    description: "Javoblar ro'yxati"
  })
  @ValidateNested({ each: true })
  @Type(() => SubmissionResponseDto)
  declare data: SubmissionResponseDto[];
}
