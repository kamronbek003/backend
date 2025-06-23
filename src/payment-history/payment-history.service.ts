import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PaymentHistory, Admin, HistoryActionType } from '@prisma/client';
import { QueryPaymentHistoryDto } from './dto/query-payment-history.dto'; 

export interface PaymentHistoryWithDetails extends PaymentHistory {
    admin: { id: string; firstName: string; lastName: string; } | null;
    payment: { id: string; summa: number; date: Date; student?: { studentId: string; firstName: string; lastName: string } | null } | null; 
}

@Injectable()
export class PaymentHistoryService {
    private readonly logger = new Logger(PaymentHistoryService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAll(queryDto: QueryPaymentHistoryDto): Promise<{ data: PaymentHistoryWithDetails[], total: number }> {
        const {
            page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
            filterByPaymentId, filterByAdminId, filterByAction,
            filterByDateFrom, filterByDateTo
        } = queryDto;

        const skip = (page - 1) * limit;
        const where: Prisma.PaymentHistoryWhereInput = {};

        if (filterByPaymentId) where.paymentId = filterByPaymentId;
        if (filterByAdminId) where.adminId = filterByAdminId;
        if (filterByAction) where.action = filterByAction;

        const dateFilter: Prisma.DateTimeFilter = {};
        if (filterByDateFrom) {
            try { dateFilter.gte = new Date(filterByDateFrom); } catch (e) { this.logger.warn("Invalid dateFrom format"); }
        }
        if (filterByDateTo) {
            try {
                const endDate = new Date(filterByDateTo);
                endDate.setUTCHours(23, 59, 59, 999); 
                dateFilter.lte = endDate;
            } catch (e) { this.logger.warn("Invalid dateTo format"); }
        }
        if (Object.keys(dateFilter).length > 0) {
            where.createdAt = dateFilter;
        }

        const allowedSortByFields = ['createdAt', 'action'];
        const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderBy: Prisma.PaymentHistoryOrderByWithRelationInput = { [safeSortBy]: sortOrder };

        try {
            this.logger.debug(`Finding payment history with WHERE: ${JSON.stringify(where)}`);
            const [history, total] = await this.prisma.$transaction([
                this.prisma.paymentHistory.findMany({
                    where, skip, take: limit, orderBy,
                    include: { 
                        admin: { select: { id: true, firstName: true, lastName: true } },
                        payment: {
                            select: {
                                id: true, summa: true, date: true,
                                student: { select: { studentId: true, firstName: true, lastName: true } } 
                            }
                        }
                    }
                }),
                this.prisma.paymentHistory.count({ where }),
            ]);

             const formattedData: PaymentHistoryWithDetails[] = history.map(h => ({
                ...h,
             }));

            return { data: formattedData, total };
        } catch (error) {
            this.logger.error('Error finding payment history:', error);
            throw new InternalServerErrorException('Could not retrieve payment history due to an internal error.');
        }
    }

    async logHistory(data: {
        paymentId: string;
        adminId: string;
        action: HistoryActionType;
        details?: Prisma.InputJsonValue; 
    }): Promise<void> { 
        try {
            await this.prisma.paymentHistory.create({
                data: {
                    paymentId: data.paymentId,
                    adminId: data.adminId,
                    action: data.action,
                    details: data.details ?? Prisma.JsonNull, 
                },
            });
            this.logger.log(`Payment history logged for payment ${data.paymentId}, action: ${data.action}`);
        } catch (error) {
            this.logger.error(`Failed to log payment history for payment ${data.paymentId}:`, error);
        }
    }

}
