import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { QueryDebtorDto } from './dto/query-debtor.dto';
import { DebtorsService, DebtorStudent } from './debtors.service';
import { PrismaService } from '../prisma/prisma.service'; // Bu kerak bo'ladi

@ApiTags('Debtors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debtors')
export class DebtorsController {
  // PrismaService'ni ham shu yerda chaqirib olamiz, chunki findOne'da kerak bo'lyapti
  constructor(
      private readonly debtorsService: DebtorsService,
      private readonly prisma: PrismaService,
    ) {}

  @Get()
  @ApiOperation({ summary: "Qarzdor talabalar ro'yxatini olish (filtrlar va sahifalash bilan)" })
  @ApiResponse({ status: 200, description: 'Qarzdor talabalar ro‘yxati muvaffaqiyatli qaytarildi.' })
  @ApiResponse({ status: 400, description: "So'rov parametrlarida xatolik." })
  async findDebtors(@Query() queryDto: QueryDebtorDto) {
    if ((queryDto.filterByMonth && !queryDto.filterByYear) || (!queryDto.filterByMonth && queryDto.filterByYear)) {
      throw new BadRequestException("Oy va yil bo'yicha filtrlash uchun ikkala qiymat ham kiritilishi shart.");
    }
    return this.debtorsService.findDebtors(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Bitta talabaning batafsil qarzdorlik ma'lumotini olish" })
  @ApiResponse({ status: 200, description: "Talabaning qarzdorlik ma'lumotlari."})
  @ApiResponse({ status: 404, description: "Talaba topilmadi."})
  async findOneDebtorDetails(@Param('id', ParseUUIDPipe) id: string) {
    const debtorDetails = await this.debtorsService.findOneDebtorDetails(id);
    
    // Agar servis 'null' qaytarsa (ya'ni qarzi yo'q bo'lsa),
    // biz talabaning o'zini topib, qarzini 0 qilib qaytaramiz.
    if (!debtorDetails) {
        const student = await this.prisma.student.findUnique({ where: { id } });
        if (!student) {
            throw new NotFoundException(`IDsi ${id} bo'lgan talaba topilmadi.`);
        }
        // Frontend kutayotgan formatga moslab, qarzi yo'q holatini qaytaramiz
        return { 
            ...student, 
            debtAmount: 0, 
            debtorMonths: [],
            monthlyExpectedPayment: 0,
            totalPaid: 0, 
            monthsActive: 0, 
            groupDetails: []
        };
    }
    
    return debtorDetails;
  }
}