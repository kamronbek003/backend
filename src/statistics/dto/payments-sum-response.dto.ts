import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface PaymentsSumResponse {
    totalSum: number | null;
    count: number;
    dateFrom?: string;
    dateTo?: string;
}

export class PaymentsSumResponseDto implements PaymentsSumResponse {
     @ApiProperty({
         example: 15000000.50,
         description: 'Total sum of payments in the specified period (null if no payments found)',
         nullable: true, 
         type: Number,  
         format: 'float'
        })
     totalSum: number | null;

     @ApiProperty({ example: 55, description: 'Number of payments found in the period' })
     count: number;

     @ApiProperty({
         example: '2024-03-26T00:00:00.000Z',
         description: 'Start date (ISO 8601) used for the calculation',
         type: String,
         format: 'date-time'
        })
     dateFrom?: string; 

     @ApiPropertyOptional({ 
         example: '2024-04-25T23:59:59.999Z',
         description: 'End date (ISO 8601) used for the calculation (if provided)',
         type: String,
         format: 'date-time'
        })
     dateTo?: string;
}

