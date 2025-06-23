import { Controller, Get, Query, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { StatsService } from './statistics.service';
import { IsOptional, IsISO8601 } from 'class-validator'; 

class GetPaymentsSumDto {
  @IsOptional() 
  @IsISO8601({}, { message: '`dateFrom` yaroqli ISO8601 sanasi bo\'lishi kerak (masalan, YYYY-MM-DDTHH:mm:ss.sssZ)' })
  dateFrom?: string;
}

@Controller('stats') 
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly statsService: StatsService) {}

  @Get('counts')
  async getCounts() {
    this.logger.log('GET /stats/counts so\'rovi qabul qilindi');
    return this.statsService.getCounts();
  }

  @Get('payments-sum')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getPaymentsSum(@Query() query: GetPaymentsSumDto) {
    this.logger.log(`GET /stats/payments-sum so'rovi qabul qilindi, query: ${JSON.stringify(query)}`);
    return this.statsService.getPaymentsSum(query.dateFrom);
  }

  @Get('student-trend')
  async getStudentTrend() {
    this.logger.log('GET /stats/student-trend so\'rovi qabul qilindi');
    return this.statsService.getStudentTrend();
  }
}