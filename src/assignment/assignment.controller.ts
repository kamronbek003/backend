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
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto,
  AssignmentResponseDto,
  PaginatedAssignmentResponseDto,
} from './dto/assignment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@ApiTags('Assignment')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Yangi vazifa yaratish' })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vazifa muvaffaqiyatli yaratildi.',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Autentifikatsiyadan o'tmagan",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Ruxsat yo'q (rol mos emas)",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Yaroqsiz ma'lumotlar",
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AssignmentResponseDto> {
    const teacherId = req.user.sub;
    if (!teacherId) {
      throw new Error('Teacher ID not found in token payload');
    }
    return this.assignmentService.create(createAssignmentDto, teacherId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Barcha vazifalarni olish (sahifalash, filterlash, tartiblash bilan)',
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
    description: 'Sahifadagi elementlar soni',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Tartiblash maydoni',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: "Tartiblash yo'nalishi",
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    type: String,
    description: "Guruh IDsi bo'yicha filter",
  })
  @ApiQuery({
    name: 'teacherId',
    required: false,
    type: String,
    description: "O'qituvchi IDsi bo'yicha filter",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Vazifalar ro'yxati.",
    type: PaginatedAssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Autentifikatsiyadan o'tmagan",
  })
  async findAll(
    @Query() queryDto: AssignmentQueryDto,
  ): Promise<PaginatedAssignmentResponseDto> {
    return this.assignmentService.findAll(queryDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Vazifani ID bo'yicha olish" })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Vazifa IDsi (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vazifa topildi.',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Autentifikatsiyadan o'tmagan",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vazifa topilmadi.',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentService.findOne(id);
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }
    return assignment;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('teacher', 'admin')
  @ApiOperation({ summary: "Vazifani ID bo'yicha yangilash" })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Yangilanadigan vazifa IDsi (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vazifa muvaffaqiyatli yangilandi.',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Autentifikatsiyadan o'tmagan",
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Ruxsat yo'q" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vazifa topilmadi.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Yaroqsiz ma'lumotlar",
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AssignmentResponseDto> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    if (userRole === 'teacher') {
      const assignment = await this.assignmentService.findOne(id);
      if (!assignment) {
        throw new NotFoundException(`Assignment with ID ${id} not found`);
      }
      if (assignment.teacherId !== userId) {
        throw new ForbiddenException(
          "Siz faqat o'zingizga tegishli guruhlarning topshiriqlarni yangilay olasiz",
        );
      }
    }
    return this.assignmentService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: "Vazifani ID bo'yicha o'chirish" })
  @ApiParam({
    name: 'id',
    required: true,
    description: "O'chiriladigan vazifa IDsi (UUID)",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Vazifa muvaffaqiyatli o'chirildi.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Autentifikatsiyadan o'tmagan",
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Ruxsat yo'q" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vazifa topilmadi.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    if (userRole === 'teacher') {
      const assignment = await this.assignmentService.findOne(id);
      if (!assignment) {
        throw new NotFoundException(`Assignment with ID ${id} not found`);
      }
      if (assignment.teacherId !== userId) {
        throw new ForbiddenException(
          "Siz faqat o'zingizga tegishli guruhlarning topshiriqlarini o'chira olasiz",
        );
      }
    }
    await this.assignmentService.remove(id);
  }
}
