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
  Put,
} from '@nestjs/common';
import { CoursesService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Kurslar (Admin Panel uchun)') 
@Controller('courses') 
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })) 
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: "Yangi kurs yaratish" })
  @ApiResponse({ status: 201, description: "Kurs muvaffaqiyatli yaratildi." })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov (validatsiya xatosi)." })
  @ApiResponse({ status: 409, description: "Kurs nomi allaqachon mavjud." })
  @ApiBody({ type: CreateCourseDto })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: "Barcha kurslarni olish (sahifalash, filterlash, saralash bilan)" })
  @ApiResponse({ status: 200, description: "Kurslar ro'yxati." })
  findAll(@Query() queryDto: QueryCourseDto) {
    return this.coursesService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: "ID bo'yicha kursni olish" })
  @ApiResponse({ status: 200, description: "Kurs ma'lumotlari." })
  @ApiResponse({ status: 404, description: "Kurs topilmadi." })
  @ApiParam({ name: 'id', description: "Kurs ID si", type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: "ID bo'yicha kursni yangilash" })
  @ApiResponse({ status: 200, description: "Kurs muvaffaqiyatli yangilandi." })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov (validatsiya xatosi)." })
  @ApiResponse({ status: 404, description: "Kurs topilmadi." })
  @ApiResponse({ status: 409, description: "Yangilanayotgan kurs nomi allaqachon mavjud." })
  @ApiParam({ name: 'id', description: "Kurs ID si", type: Number })
  @ApiBody({ type: UpdateCourseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "ID bo'yicha kursni o'chirish" })
  @ApiResponse({ status: 204, description: "Kurs muvaffaqiyatli o'chirildi." })
  @ApiResponse({ status: 404, description: "Kurs topilmadi." })
  @ApiParam({ name: 'id', description: "Kurs ID si", type: Number })
  @HttpCode(HttpStatus.NO_CONTENT) 
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
