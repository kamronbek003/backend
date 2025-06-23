import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsUrl,
  IsInt,
  Min,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignmentGroupResponseDto {
  @ApiProperty({ example: 'g1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', description: 'Guruh unikal IDsi' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'G-101', description: 'Guruh biznes IDsi' })
  @IsString()
  groupId: string;

  @ApiProperty({ example: 'Frontend Dasturlash', required: false, description: 'Guruh nomi' })
  @IsOptional()
  @IsString()
  name?: string | null;
}

export class AssignmentTeacherResponseDto {
  @ApiProperty({ example: 't1e2a3c4-h5e6-r7s8-t9e0-a1b2c3d4e5f6', description: 'O\'qituvchi unikal IDsi' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Kamron', description: 'O\'qituvchi ismi' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Ibrohimov', description: 'O\'qituvchi familiyasi' })
  @IsString()
  lastName: string;
}

export class AssignmentResponseDto {
  @ApiProperty({ example: 'uuid', description: 'Vazifa unikal IDsi' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '1-mavzu uy ishi', description: 'Vazifa sarlavhasi' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Kitobdagi 5-10 misollar', required: false, description: 'Vazifa tavsifi' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '2025-06-15T10:00:00.000Z', required: false, description: 'Topshirish muddati (ISO format)' })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  dueDate?: Date | null;

  @ApiProperty({ example: 'https://example.com/files/assignment1.pdf', required: false, description: 'Biriktirilgan fayl manzili' })
  @IsOptional()
  @IsUrl({}, { message: 'Fayl manzili yaroqli URL bo\'lishi kerak.'})
  fileUrl?: string | null;

  @ApiProperty({ example: 'uuid', description: 'Vazifa biriktirilgan guruh IDsi (asosiy kalit)' })
  @IsUUID()
  groupId: string;

  @ApiPropertyOptional({ type: () => AssignmentGroupResponseDto, description: 'Vazifa biriktirilgan guruh haqida ma\'lumot', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentGroupResponseDto)
  group?: AssignmentGroupResponseDto | null;

  @ApiProperty({ example: 'uuid', description: 'Vazifani bergan o\'qituvchi IDsi (asosiy kalit)' })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({ type: () => AssignmentTeacherResponseDto, description: 'Vazifani bergan o\'qituvchi haqida ma\'lumot', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentTeacherResponseDto)
  teacher?: AssignmentTeacherResponseDto | null;

  @ApiProperty({ description: 'Yaratilgan vaqti' })
  @Type(() => Date)
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Yangilangan vaqti' })
  @Type(() => Date)
  @IsDateString()
  updatedAt: Date;

  @ApiPropertyOptional({ example: 5, description: 'Ushbu vazifaga yuborilgan ishlar soni' })
  @IsOptional()
  @IsInt()
  @Min(0)
  submissionCount?: number;
}

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Yangi Algebra Vazifasi', description: 'Vazifa sarlavhasi' })
  @IsString({ message: 'Sarlavha satr bo\'lishi kerak.'})
  @IsNotEmpty({ message: 'Sarlavha kiritilishi shart.'})
  title: string;

  @ApiProperty({ example: '15-20 misollarni yeching.', required: false, description: 'Vazifa tavsifi' })
  @IsOptional()
  @IsString({ message: 'Tavsif satr bo\'lishi kerak.'})
  description?: string;

  @ApiProperty({ example: '2025-07-01T23:59:59.000Z', required: false, description: 'Topshirish muddati (ISO 8601 formatida)' })
  @IsOptional()
  @IsDateString({}, { message: 'Topshirish muddati yaroqli sana (ISO 8601) bo\'lishi kerak.'})
  dueDate?: Date;

  @ApiProperty({ example: 'https://example.com/files/new_assignment.docx', required: false, description: 'Biriktirilgan fayl manzili (URL)' })
  @IsOptional()
  @IsUrl({}, { message: 'Fayl manzili yaroqli URL bo\'lishi kerak.'})
  fileUrl?: string;

  @ApiProperty({ example: 'g1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', description: 'Vazifa biriktirilgan guruh IDsi' })
  @IsUUID('all', { message: 'Guruh IDsi yaroqli UUID bo\'lishi kerak.'})
  @IsNotEmpty({ message: 'Guruh IDsi kiritilishi shart.'})
  groupId: string;
}

export class UpdateAssignmentDto extends PartialType(
  OmitType(CreateAssignmentDto, ['groupId'] as const),
) {
    @ApiPropertyOptional({ example: 'g1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', description: 'Vazifa biriktirilgan guruh IDsi (yangilash uchun)' })
    @IsOptional()
    @IsUUID('all', { message: 'Guruh IDsi yaroqli UUID bo\'lishi kerak.'})
    groupId?: string;
}


export class AssignmentQueryDto {
  @ApiPropertyOptional({ required: false, default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo\'lishi kerak.'})
  @Min(1, { message: 'Sahifa raqami 1 dan kichik bo\'lmasligi kerak.'})
  page?: number = 1;

  @ApiPropertyOptional({ required: false, default: 10, description: 'Sahifadagi elementlar soni (maksimum 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Elementlar soni butun son bo\'lishi kerak.'})
  @Min(1, { message: 'Elementlar soni 1 dan kichik bo\'lmasligi kerak.'})
  limit?: number = 10;

  @ApiPropertyOptional({ required: false, example: 'createdAt', description: 'Tartiblash uchun maydon nomi (masalan, title, dueDate, createdAt)' })
  @IsOptional()
  @IsString({ message: 'Tartiblash maydoni satr bo\'lishi kerak.'})
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ required: false, enum: ['asc', 'desc'], default: 'desc', description: 'Tartiblash yo\'nalishi' })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Tartiblash yo\'nalishi "asc" yoki "desc" bo\'lishi kerak.'})
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    required: false,
    additionalProperties: { type: 'string' },
    example: { title: 'Algebra darsi' },
    description: 'Filterlash uchun maydonlar (masalan, { "title": "qidiruv so\'zi" })',
  })
  @IsOptional()
  filter?: { title?: string; [key: string]: any };

  @ApiPropertyOptional({ required: false, example: 'uuid', description: 'Muayyan guruh IDsi bo\'yicha filterlash' })
  @IsOptional()
  @IsUUID('all', { message: 'Guruh IDsi yaroqli UUID bo\'lishi kerak.'})
  groupId?: string;

  @ApiPropertyOptional({ required: false, example: 'uuid', description: 'Muayyan o\'qituvchi IDsi bo\'yicha filterlash' })
  @IsOptional()
  @IsUUID('all', { message: 'O\'qituvchi IDsi yaroqli UUID bo\'lishi kerak.'})
  teacherId?: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true, type: () => [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  data: T[];

  @ApiProperty({ example: 100, description: 'Jami elementlar soni' })
  @IsInt()
  total: number;

  @ApiProperty({ example: 10, description: 'Joriy sahifadagi elementlar soni' })
  @IsInt()
  limit: number;

  @ApiProperty({ example: 1, description: 'Joriy sahifa raqami' })
  @IsInt()
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Jami sahifalar soni' })
  @IsInt()
  totalPages: number;
}

export class PaginatedAssignmentResponseDto extends PaginatedResponseDto<AssignmentResponseDto> {
  @ApiProperty({ isArray: true, type: () => [AssignmentResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => AssignmentResponseDto)
  data: AssignmentResponseDto[] = []; 
}
