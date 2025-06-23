import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DailyFeedbackService, DailyFeedbackWithDetails } from './daily-feedback.service';
import { CreateDailyFeedbackDto } from './dto/create-daily-feedback.dto';
import { UpdateDailyFeedbackDto } from './dto/update-daily-feedback.dto';
import { QueryDailyFeedbackDto } from './dto/query-daily-feedback.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger'; 

@ApiTags('Daily Feedbacks') 
@Controller('daily-feedbacks')
export class DailyFeedbackController {
  constructor(private readonly dailyFeedbackService: DailyFeedbackService) {}

  @Post()
  @ApiOperation({ summary: "Yangi kundalik fikr-mulohaza yaratish" })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Yaroqsiz ma'lumotlar." })
  async create(@Body() createDailyFeedbackDto: CreateDailyFeedbackDto): Promise<DailyFeedbackWithDetails> {
    return this.dailyFeedbackService.create(createDailyFeedbackDto); 
  }

  @Get()
  @ApiOperation({ summary: "Barcha kundalik fikr-mulohazalarni olish (filtrlar bilan)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Fikr-mulohazalar ro'yxati.", type: [Object] }) 
  async findAll(@Query() queryDto: QueryDailyFeedbackDto): Promise<{ data: DailyFeedbackWithDetails[]; total: number }> {
    return this.dailyFeedbackService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: "ID bo'yicha kundalik fikr-mulohazani olish" })
  @ApiParam({ name: 'id', description: "Fikr-mulohaza UUID si", type: String })
  @ApiResponse({ status: HttpStatus.OK, description: "Fikr-mulohaza ma'lumotlari.", type: Object }) 
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Fikr-mulohaza topilmadi." })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DailyFeedbackWithDetails> {
    return this.dailyFeedbackService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "ID bo'yicha kundalik fikr-mulohazani yangilash" })
  @ApiParam({ name: 'id', description: "Fikr-mulohaza UUID si", type: String })
  @ApiResponse({ status: HttpStatus.OK, description: "Fikr-mulohaza muvaffaqiyatli yangilandi.", type: Object }) 
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Fikr-mulohaza topilmadi." })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Yaroqsiz ma'lumotlar." })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDailyFeedbackDto: UpdateDailyFeedbackDto,
  ): Promise<DailyFeedbackWithDetails> {
    return this.dailyFeedbackService.update(id, updateDailyFeedbackDto); 
  }

  @Delete(':id')
  @ApiOperation({ summary: "ID bo'yicha kundalik fikr-mulohazani o'chirish" })
  @ApiParam({ name: 'id', description: "Fikr-mulohaza UUID si", type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "Fikr-mulohaza muvaffaqiyatli o'chirildi." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Fikr-mulohaza topilmadi." })
  @HttpCode(HttpStatus.NO_CONTENT) 
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.dailyFeedbackService.remove(id); 
  }
}