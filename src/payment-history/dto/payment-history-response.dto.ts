import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HistoryActionType, PaymentType, Prisma } from '@prisma/client';
import { PaymentHistoryWithDetails } from '../payment-history.service';

class AdminInfoDto {
  @ApiProperty({
    description: 'Adminning UUIDsi',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({ description: 'Adminning ismi', example: 'Admin' })
  firstName: string;

  @ApiProperty({ description: 'Adminning familiyasi', example: 'Adminov' })
  lastName: string;
}

class StudentInfoDto {
  @ApiProperty({ description: 'Talabaning biznes IDsi', example: 'N12345' })
  studentId: string;

  @ApiProperty({ description: 'Talabaning ismi', example: 'Kamron' })
  firstName: string;

  @ApiProperty({ description: 'Talabaning familiyasi', example: 'Ibrohimov' })
  lastName: string;
}

class PaymentInfoDto {
  @ApiProperty({
    description: "To'lovning UUIDsi",
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: "To'lov summasi",
    example: 500000,
    type: Number,
    format: 'float',
  })
  summa: number;

  @ApiProperty({
    description: "To'lov sanasi (ISO 8601 formatida)",
    example: '2024-04-25T00:00:00.000Z',
    type: Date,
  })
  date: Date;

  @ApiPropertyOptional({
    type: () => StudentInfoDto,
    description: "To'lovga bog'liq talaba ma'lumotlari",
    nullable: true,
  })
  student?: StudentInfoDto | null;
}

export class PaymentHistoryDto
  implements Omit<PaymentHistoryWithDetails, 'admin' | 'payment'>
{
  @ApiProperty({
    description: 'Tarix yozuvining UUIDsi',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: "Tegishli to'lovning UUIDsi",
    example: 'uuid',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Amalni bajargan adminning UUIDsi',
    example: 'uuid',
  })
  adminId: string;

  @ApiPropertyOptional({
    type: () => AdminInfoDto,
    description: "Amalni bajargan admin ma'lumotlari",
    nullable: true,
  })
  admin?: AdminInfoDto | null;

  @ApiPropertyOptional({
    type: () => PaymentInfoDto,
    description: "Tegishli to'lov ma'lumotlari",
    nullable: true,
  })
  payment?: PaymentInfoDto | null;

  @ApiProperty({
    description: 'Amal turi',
    enum: HistoryActionType,
    example: HistoryActionType.YARATISH,
  })
  action: HistoryActionType;

  @ApiPropertyOptional()
  details: Prisma.JsonValue | null;

  @ApiProperty({
    description: 'Amal bajarilgan vaqt (ISO 8601)',
    example: '2024-04-25T10:30:00.000Z',
    type: Date,
  })
  createdAt: Date;
}

export class PaginatedPaymentHistoryResponse {
  @ApiProperty({
    type: [PaymentHistoryDto],
    description: "To'lovlar tarixi yozuvlari ro'yxati",
  })
  data: PaymentHistoryDto[];

  @ApiProperty({
    example: 150,
    description: 'Filtrga mos keladigan jami yozuvlar soni',
  })
  total: number;
}
