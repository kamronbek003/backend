import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiProperty } from '@nestjs/swagger';
import { Attendance, AttendanceStatus } from '@prisma/client';

class PaginatedAttendanceResponse {
    @ApiProperty({ type: [CreateAttendanceDto] })
    data: Attendance[];

    @ApiProperty({ example: 200 })
    total: number;
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  // @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create a new attendance record (Admin/Teacher Role Required)' })
  @ApiResponse({ status: 201, description: 'Attendance record created successfully.', type: CreateAttendanceDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  // @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get all attendance records with filtering, sorting, pagination (Admin/Teacher Role Required)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filterByGroupId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'filterByStudentId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'filterByStatus', required: false, enum: AttendanceStatus })
  @ApiQuery({ name: 'filterByDateFrom', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'filterByDateTo', required: false, type: String, format: 'date-time' })
  @ApiResponse({ status: 200, description: 'List of attendance records retrieved.', type: PaginatedAttendanceResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() queryDto: QueryAttendanceDto): Promise<{ data: Attendance[], total: number }> {
    return this.attendanceService.findAll(queryDto);
  }

  @Get(':id')
  // @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get a specific attendance record by Primary Key (UUID) (Admin/Teacher Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance record details retrieved.', type: CreateAttendanceDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 400, description: 'Bad Request (Invalid UUID format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Attendance> {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  // @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update an attendance record by Primary Key (UUID) (Admin/Teacher Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance record updated successfully.', type: CreateAttendanceDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  // @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attendance record by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance record deleted successfully.', type: CreateAttendanceDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<Attendance> {
    return this.attendanceService.remove(id);

  }
}
