import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
  IsNumberString,
  Matches,
} from 'class-validator';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ApplicationStatus {
  KUTILYABDI = 'KUTILYABDI',
  BOGLANILDI = 'BOGLANILDI',
}

export class QueryApplicationDto {
  @ApiPropertyOptional({
    description: 'Sahifa raqami',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son boʻlishi kerak.' })
  @Min(1, { message: 'Sahifa raqami 1 dan kichik boʻlmasligi kerak.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sahifadagi elementlar soni',
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Elementlar soni butun son boʻlishi kerak.' })
  @Min(1, { message: 'Elementlar soni 1 dan kichik boʻlmasligi kerak.' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      "Saralash maydoni (masalan, 'createdAt', 'firstName', 'status')",
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'Saralash maydoni satr boʻlishi kerak.' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: "Saralash tartibi ('ASC' yoki 'DESC')",
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: "Saralash tartibi 'ASC' yoki 'DESC' bo'lishi kerak.",
  })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Kurs ID si boʻyicha filterlash',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kurs ID si butun son boʻlishi kerak.' })
  filterByCourseId?: number;

  @ApiPropertyOptional({
    description: 'Telegram ID si boʻyicha filterlash (string)',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Telegram ID satr boʻlishi kerak.' })
  @Matches(/^[0-9]+$/, {
    message: 'Telegram ID faqat raqamlardan iborat boʻlishi kerak.',
  })
  filterByTelegramId?: string;

  @ApiPropertyOptional({
    description: 'Holati boʻyicha filterlash',
    enum: ApplicationStatus,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: "Holat noto'g'ri qiymatga ega." })
  filterByStatus?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Ismi boʻyicha qidirish (qisman moslik)',
  })
  @IsOptional()
  @IsString()
  searchFirstName?: string;

  @ApiPropertyOptional({
    description: 'Familiyasi boʻyicha qidirish (qisman moslik)',
  })
  @IsOptional()
  @IsString()
  searchLastName?: string;

  @ApiPropertyOptional({
    description: 'Telefon raqami boʻyicha qidirish (qisman moslik)',
  })
  @IsOptional()
  @IsString()
  searchPhoneNumber?: string;
}
