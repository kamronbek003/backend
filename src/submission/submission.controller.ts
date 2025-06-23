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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import {
  CreateSubmissionDto,
  GradeSubmissionDto, 
  SubmissionQueryDto,
  SubmissionResponseDto,
  PaginatedSubmissionResponseDto,
} from './dto/submission.dto'; 
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

export enum Role {
    student,
    teacher,
    admin
}

@ApiTags('Submissions (Javoblar)')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller() 
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}


  @Post('assignments/:assignmentId/submissions') 
  // @Roles(Role.student) 
  @ApiOperation({ summary: "Vazifaga javob (topshiriq) yuborish (TALABA)" })
  @ApiParam({ name: 'assignmentId', required: true, description: 'Vazifa IDsi (UUID)', type: String })
  @ApiBody({ type: CreateSubmissionDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Javob muvaffaqiyatli yuborildi.', type: SubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Yaroqsiz ma'lumotlar (masalan, content va fileUrl bo'sh yoki UUID formati noto'g'ri)" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Ruxsat yo'q (rol mos emas yoki talaba bu vazifaga/guruhga tegishli emas)" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vazifa yoki talaba topilmadi.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Bu vazifaga allaqachon javob yuborilgan.' })
  @HttpCode(HttpStatus.CREATED)
  async submitAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SubmissionResponseDto> {
    const studentId = req.user.sub;
    return this.submissionService.create(assignmentId, studentId, createSubmissionDto);
  }

  @Get('student/submissions') 
  // @Roles(Role.student)
  @ApiOperation({ summary: "O'quvchining yuborgan barcha javoblarini olish (TALABA)" })
  @ApiQuery({ type: SubmissionQueryDto, description: "Filterlash va sahifalash parametrlari (studentId avtomatik tarzda tokendan olinadi)"})
  @ApiResponse({ status: HttpStatus.OK, description: 'Javoblar ro\'yxati.', type: PaginatedSubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Ruxsat yo'q." })
  async getMySubmissions(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: SubmissionQueryDto, 
  ): Promise<PaginatedSubmissionResponseDto> {
    const studentId = req.user.sub;
    return this.submissionService.findAll(queryDto, undefined, studentId);
  }

  @Get('student/submissions/:submissionId') 
  // @Roles(Role.student)
  @ApiOperation({ summary: "O'quvchining muayyan javobini ID bo'yicha olish (TALABA)" })
  @ApiParam({ name: 'submissionId', required: true, description: 'Javob IDsi (UUID)', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Javob topildi.', type: SubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Bu javobni ko'rishga ruxsat yo'q." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Javob topilmadi.' })
  async getMySubmissionById(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<SubmissionResponseDto> {
    const studentId = req.user.sub;
    await this.submissionService.validateStudentCanAccessSubmission(studentId, submissionId);
    return this.submissionService.findOneOrFailById(submissionId);
  }

  @Get('teacher/submissions') 
  // @Roles(Role.teacher, Role.ADMIN) 
  @ApiOperation({ summary: "O'qituvchiga tegishli javoblarni olish (filterlash mumkin) (O'QITUVCHI/ADMIN)" })
  @ApiQuery({ type: SubmissionQueryDto, description: "Filterlash va sahifalash parametrlari (teacherId avtomatik tarzda tokendan olinadi)" })
  @ApiResponse({ status: HttpStatus.OK, description: 'Javoblar ro\'yxati.', type: PaginatedSubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Ruxsat yo'q." })
  async getSubmissionsForTeacher(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: SubmissionQueryDto,
  ): Promise<PaginatedSubmissionResponseDto> {
    const teacherId = req.user.sub;
    return this.submissionService.findAll(queryDto, teacherId, undefined);
  }

  @Get('teacher/assignments/:assignmentId/submissions')
  // @Roles(Role.OQITUVCHI, Role.ADMIN)
  @ApiOperation({ summary: "Muayyan vazifaga yuborilgan javoblarni olish (O'QITUVCHI/ADMIN)" })
  @ApiParam({ name: 'assignmentId', required: true, description: 'Vazifa IDsi (UUID)', type: String })
  @ApiQuery({ type: SubmissionQueryDto, description: "Filterlash va sahifalash parametrlari (assignmentId URLdan olinadi)"}) 
  @ApiResponse({ status: HttpStatus.OK, description: 'Javoblar ro\'yxati.', type: PaginatedSubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Bu vazifa javoblarini ko'rishga ruxsat yo'q." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Vazifa topilmadi."})
  async getSubmissionsForAssignmentByTeacher(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Query() queryDto: SubmissionQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedSubmissionResponseDto> {
    const teacherId = req.user.sub;
    await this.submissionService.validateTeacherCanAccessAssignment(teacherId, assignmentId);
    
    const assignmentSpecificQueryDto = { ...queryDto, assignmentId: assignmentId };
    delete assignmentSpecificQueryDto.studentId; 

    return this.submissionService.findAll(assignmentSpecificQueryDto, teacherId, undefined);
  }

  @Get('teacher/submissions/:submissionId') 
  // @Roles(Role.OQITUVCHI, Role.ADMIN)
  @ApiOperation({ summary: "Muayyan javobni ID bo'yicha olish (O'QITUVCHI/ADMIN)" })
  @ApiParam({ name: 'submissionId', required: true, description: 'Javob IDsi (UUID)', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Javob topildi.', type: SubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Bu javobni ko'rishga ruxsat yo'q." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Javob topilmadi.' })
  async getSubmissionByIdForTeacher(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<SubmissionResponseDto> {
    const teacherId = req.user.sub;
    await this.submissionService.validateTeacherCanAccessSubmission(teacherId, submissionId);
    return this.submissionService.findOneOrFailById(submissionId);
  }

  @Patch('teacher/submissions/:submissionId/grade') 
  // @Roles(Role.OQITUVCHI, Role.ADMIN)
  @ApiOperation({ summary: "Javobni baholash yoki izoh qoldirish (O'QITUVCHI/ADMIN)" })
  @ApiParam({ name: 'submissionId', required: true, description: 'Baholanadigan javob IDsi (UUID)', type: String })
  @ApiBody({ type: GradeSubmissionDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Javob muvaffaqiyatli baholandi.', type: SubmissionResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Yaroqsiz ma'lumotlar (masalan, baho diapazondan tashqarida)" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Avtorizatsiyadan o'tmagan" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Bu javobni baholashga ruxsat yo'q." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Javob topilmadi.' })
  async gradeSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() gradeSubmissionDto: GradeSubmissionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SubmissionResponseDto> {
    const teacherId = req.user.sub;
    return this.submissionService.grade(submissionId, gradeSubmissionDto, teacherId);
  }
}
