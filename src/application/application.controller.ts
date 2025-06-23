import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { QueryApplicationDto } from './dto/query-application.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';

@ApiBearerAuth()
@ApiTags('Arizalar (Applications)')
@Controller('applications')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi ariza yaratish' })
  @ApiBody({ type: CreateApplicationDto })
  @ApiResponse({ status: 201, description: 'Ariza muvaffaqiyatli yaratildi.' })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov (validatsiya xatosi).",
  })
  @ApiResponse({ status: 404, description: "Bog'liq kurs topilmadi." })
  @ApiResponse({ status: 409, description: 'Telegram ID allaqachon mavjud.' })
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Barcha arizalarni olish (sahifalash, filterlash, saralash bilan)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Sahifa raqami',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementlar soni',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Saralash maydoni',
  })
  @ApiResponse({ status: 200, description: "Arizalar ro'yxati." })
  findAll(@Query() queryDto: QueryApplicationDto) {
    return this.applicationsService.findAll(queryDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "ID bo'yicha arizani olish" })
  @ApiParam({ name: 'id', description: 'Ariza ID si', type: Number })
  @ApiResponse({ status: 200, description: "Ariza ma'lumotlari." })
  @ApiResponse({ status: 404, description: 'Ariza topilmadi.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "ID bo'yicha arizani yangilash" })
  @ApiParam({ name: 'id', description: 'Ariza ID si', type: Number })
  @ApiBody({ type: UpdateApplicationDto })
  @ApiResponse({ status: 200, description: 'Ariza muvaffaqiyatli yangilandi.' })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov (validatsiya xatosi).",
  })
  @ApiResponse({
    status: 401,
    description: "Foydalanuvchi autentifikatsiyadan o'tmagan.",
  })
  @ApiResponse({
    status: 404,
    description: "Ariza yoki bog'liq kurs topilmadi.",
  })
  @ApiResponse({
    status: 409,
    description: 'Yangilanayotgan Telegram ID allaqachon mavjud.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "ID bo'yicha arizani o'chirish" })
  @ApiParam({ name: 'id', description: 'Ariza ID si', type: Number })
  @ApiResponse({ status: 204, description: "Ariza muvaffaqiyatli o'chirildi." })
  @ApiResponse({
    status: 401,
    description: "Foydalanuvchi autentifikatsiyadan o'tmagan.",
  })
  @ApiResponse({ status: 404, description: 'Ariza topilmadi.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
