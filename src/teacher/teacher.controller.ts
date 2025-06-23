import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiProperty, ApiBody, ApiOkResponse, ApiUnauthorizedResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { Teacher } from '@prisma/client';

type TeacherResponseDto = Omit<Teacher, 'password'>;

class PendingSubmissionsCountDto {
  @ApiProperty({ example: 5 })
  count: number;
}

class PaginatedTeacherResponse {
    @ApiProperty({ type: [CreateTeacherDto] })
    data: TeacherResponseDto[];

    @ApiProperty({ example: 100 })
    total: number;
}


@ApiTags('Teacher') 
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  // @Roles('admin')
  @ApiOperation({ summary: 'Create a new teacher (Admin only)' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully.', type: CreateTeacherDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createTeacherDto: CreateTeacherDto): Promise<TeacherResponseDto> {
    return this.teacherService.create(createTeacherDto);
  }

  @Get()
  // @Roles('admin')
  @ApiOperation({ summary: 'Get all teachers (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filterByName', required: false, type: String })
  @ApiQuery({ name: 'filterBySubject', required: false, type: String })
  @ApiQuery({ name: 'filterByPhone', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of teachers retrieved.', type: PaginatedTeacherResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() queryDto: QueryTeacherDto): Promise<{ data: TeacherResponseDto[], total: number }> {
    return this.teacherService.findAll(queryDto);
  }

  @Get(':id')
  // @Roles('admin')
  @ApiOperation({ summary: 'Get a specific teacher by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher details retrieved.', type: CreateTeacherDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 400, description: 'Bad Request (Invalid UUID format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherResponseDto> {
    return this.teacherService.findOne(id);
  }

  @Patch(':id')
  // @Roles('admin')
  @ApiOperation({ summary: 'Update a teacher by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully.', type: CreateTeacherDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  // @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a teacher by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully.', type: CreateTeacherDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherResponseDto> {
    return this.teacherService.remove(id);
  }
  @Get('stats/pending-submissions-count')
    @Roles('teacher') 
    @UseGuards(RolesGuard) 
    @ApiOperation({ summary: "Get count of pending submissions for the current teacher" })
    @ApiResponse({ status: 200, description: 'Returns the count of pending submissions.', type: PendingSubmissionsCountDto })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async getPendingSubmissionsCount(@Request() req): Promise<PendingSubmissionsCountDto> {
        const teacherId = req.user?.sub; 
        if (!teacherId) {
            throw new UnauthorizedException('Teacher ID not found in token');
        }
        const count = await this.teacherService.countPendingSubmissionsForTeacher(teacherId);
        return { count };
    }

    @Get('submissions/pending')
    @Roles('teacher')
    @UseGuards(RolesGuard) 
    @ApiOperation({ summary: "Get list of pending submissions for the current teacher" })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
    @ApiResponse({ status: 200, description: 'Returns a paginated list of pending submissions.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async getPendingSubmissionsList(
        @Request() req,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ): Promise<{ data: any[], total: number }> { // Javob turini aniqlashtirish kerak
        const teacherId = req.user?.sub;
        if (!teacherId) {
            throw new UnauthorizedException('Teacher ID not found in token');
        }
        return this.teacherService.findPendingSubmissionsForTeacher(teacherId, page, limit);
    }
}
