import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SalaryService } from './salary.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { QuerySalaryDto } from './dto/query-salary.dto'; 

@ApiTags('Salaries')
@Controller('salaries')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Post()
  @ApiOperation({ summary: "Yangi maosh to'lovini yaratish" })
  @ApiBody({ type: CreateSalaryDto })
  create(@Body() createSalaryDto: CreateSalaryDto) {
    return this.salaryService.create(createSalaryDto);
  }

  @Get()
  @ApiOperation({ summary: "Barcha maoshlar ro'yxatini olish (sahifalash va saralash bilan)" })
  @ApiResponse({
    status: 200,
    description: "Maoshlar ro'yxati va meta-ma'lumotlar.",
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/SalaryEntity' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            lastPage: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  findAll(@Query() query: QuerySalaryDto) {
    return this.salaryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID orqali bitta maosh ma‘lumotini olish' })
  @ApiParam({ name: 'id', description: 'Maoshning UUIDsi', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salaryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ID orqali maosh ma‘lumotini yangilash' })
  @ApiParam({ name: 'id', description: 'Maoshning UUIDsi', type: String })
  @ApiBody({ type: UpdateSalaryDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateSalaryDto: UpdateSalaryDto) {
    return this.salaryService.update(id, updateSalaryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "ID orqali maoshni o'chirish" })
  @ApiParam({ name: 'id', description: 'Maoshning UUIDsi', type: String })
  @ApiResponse({ status: 204, description: "Maosh muvaffaqiyatli o'chirildi." })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salaryService.remove(id);
  }
}