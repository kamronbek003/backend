import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentService, PaymentWithDetails } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { Payment, PaymentType } from '@prisma/client';
import { Request } from 'express';
class PaginatedPaymentResponse {
  @ApiProperty({ type: [CreatePaymentDto] })
  data: PaymentWithDetails[];

  @ApiProperty({ example: 100 })
  total: number;
}

@ApiTags('Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a new payment record (Admin Role Required)',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully.',
    type: CreatePaymentDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentWithDetails> {
    const adminId = (req.user as any)?.sub;
    this.logger.debug(`Admin ID from token (create): ${adminId}`);
    if (!adminId || typeof adminId !== 'string') {
      throw new BadRequestException(
        'Admin ID (sub) not found or invalid in token payload.',
      );
    }
    return this.paymentService.create(createPaymentDto, adminId);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Get all payments with filtering, sorting, pagination (ADMIN Role Required)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments retrieved.',
    type: PaginatedPaymentResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(
    @Query() queryDto: QueryPaymentDto,
  ): Promise<{ data: PaymentWithDetails[]; total: number }> {
    return this.paymentService.findAll(queryDto);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get a specific payment by Primary Key (ADMIN Role Required)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment Primary Key (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved.',
    type: CreatePaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 400, description: 'Bad Request (Invalid ID format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentWithDetails> {
    return this.paymentService.findOne(id);
  }

  @Patch(':id')
  // @Roles('admin')
  @ApiOperation({
    summary: 'Update a payment by Primary Key (Admin Role Required)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment Primary Key (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully.',
    type: CreatePaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentWithDetails> {
    const adminId = (req.user as any)?.sub;
    this.logger.debug(`Admin ID from token (update): ${adminId}`);
    if (!adminId || typeof adminId !== 'string') {
      throw new BadRequestException(
        'Admin ID (sub) not found or invalid in token payload.',
      );
    }
    return this.paymentService.update(id, updatePaymentDto, adminId);
  }

  @Delete(':id')
  // @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a payment by Primary Key (Admin Role Required)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment Primary Key (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment deleted successfully.',
    type: CreatePaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<Payment> {
    const adminId = (req.user as any)?.sub;
    this.logger.debug(`Admin ID from token (remove): ${adminId}`);
    if (!adminId || typeof adminId !== 'string') {
      throw new BadRequestException(
        'Admin ID (sub) not found or invalid in token payload.',
      );
    }
    return this.paymentService.remove(id, adminId);
  }
}
