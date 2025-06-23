import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PaymentsSumQueryDto {
    @ApiProperty({
        description: 'Start date (ISO 8601 format) for payment sum calculation',
        example: '2024-03-26T00:00:00.000Z',
        required: true,
        type: String,
        format: 'date-time', 
    })
    @IsDateString({}, { message: 'dateFrom must be a valid ISO 8601 date string' })
    dateFrom: string; 

    @ApiPropertyOptional({
        description: 'End date (ISO 8601 format) for payment sum calculation (optional, defaults to now if not provided)',
        example: '2024-04-25T23:59:59.999Z', 
        required: false,
        type: String,
        format: 'date-time', 
    })
    @IsOptional()
    @IsDateString({}, { message: 'dateTo must be a valid ISO 8601 date string' })
    dateTo?: string; 
}
