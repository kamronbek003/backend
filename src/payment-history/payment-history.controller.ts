import { Controller, Get, Query, UseGuards, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { PaymentHistoryService, PaymentHistoryWithDetails } from './payment-history.service';
import { QueryPaymentHistoryDto } from './dto/query-payment-history.dto'; 
import { JwtAuthGuard } from '../guards/jwt-auth.guard'; 
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HistoryActionType } from '@prisma/client';
import { PaginatedPaymentHistoryResponse } from './dto/payment-history-response.dto'; 

@ApiTags('Payment History') 
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('payment-history') 
export class PaymentHistoryController {
    private readonly logger = new Logger(PaymentHistoryController.name); 

    constructor(private readonly paymentHistoryService: PaymentHistoryService) {}

    @Get()
    @Roles('admin') 
    @ApiOperation({ summary: 'Get payment history (Admin Role Required)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'action'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiQuery({ name: 'filterByPaymentId', required: false, type: String, format: 'uuid' })
    @ApiQuery({ name: 'filterByAdminId', required: false, type: String, format: 'uuid' })
    @ApiQuery({ name: 'filterByAction', required: false, enum: HistoryActionType })
    @ApiQuery({ name: 'filterByDateFrom', required: false, type: String, format: 'date-time' })
    @ApiQuery({ name: 'filterByDateTo', required: false, type: String, format: 'date-time' })
    @ApiResponse({ status: 200, description: 'List of payment history retrieved.', type: PaginatedPaymentHistoryResponse })
    @ApiResponse({ status: 400, description: 'Bad Request (Invalid query parameters).'})
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async findAll(@Query() queryDto: QueryPaymentHistoryDto): Promise<{ data: PaymentHistoryWithDetails[], total: number }> {
        this.logger.log(`Received request for /payment-history with query: ${JSON.stringify(queryDto)}`);
        return this.paymentHistoryService.findAll(queryDto);
    }
}
