import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, 
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard'; 
import { Roles } from '../guards/role.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiProperty } from '@nestjs/swagger';
import { Student, Status } from '@prisma/client'; 

type StudentResponseDto = Omit<Student, 'password'> & { studentId: string };

class PaginatedStudentResponse {
    @ApiProperty({ type: [CreateStudentDto], description: 'List of student records (password excluded)' }) 
    data: StudentResponseDto[];

    @ApiProperty({ example: 50, description: 'Total number of students matching the query criteria' })
    total: number;
}

@ApiTags('Student') 
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post() 
  // @Roles('admin') 
  @ApiOperation({ summary: 'Create a new student (Admin Role Required)' })
  @ApiResponse({ status: 201, description: 'Student created successfully.', type: CreateStudentDto })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation failed, invalid format, duplicate ID/phone, group not found)' })
  @ApiResponse({ status: 401, description: 'Unauthorized (JWT token missing or invalid)' })
  @ApiResponse({ status: 403, description: 'Forbidden (User does not have the required "admin" role)' })
  create(@Body() createStudentDto: CreateStudentDto): Promise<StudentResponseDto> {
    return this.studentService.create(createStudentDto);
  }

  @Get() 
  // @Roles('admin', 'teacher') 
  @ApiOperation({ summary: 'Get all students with filtering, sorting, and pagination (Admin Role Required)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination (starts at 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of students per page (max 100)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by (e.g., firstName, studentId, createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sorting order (asc or desc)' })
  @ApiQuery({ name: 'filterByStudentId', required: false, type: String, description: 'Filter by exact Student ID (e.g., N12345)' }) 
  @ApiQuery({ name: 'filterByName', required: false, type: String, description: 'Filter by first/last name (case-insensitive contains)' })
  @ApiQuery({ name: 'filterByPhone', required: false, type: String, description: 'Filter by phone number (contains)' })
  @ApiQuery({ name: 'filterByGroupId', required: false, type: String, format: 'uuid', description: 'Filter by exact Group UUID' })
  @ApiQuery({ name: 'filterByStatus', required: false, enum: Status, description: 'Filter by student status (FAOL, NOFAOL, TUGATGAN)' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved list of students.', type: PaginatedStudentResponse }) 
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() queryDto: QueryStudentDto): Promise<{ data: StudentResponseDto[], total: number }> {
    return this.studentService.findAll(queryDto);
  }

  @Get(':id') 
  // @Roles('admin', "teacher") 
  @ApiOperation({ summary: 'Get a specific student by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the student to retrieve', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved student details.', type: CreateStudentDto })
  @ApiResponse({ status: 404, description: 'Not Found: Student with the specified UUID does not exist.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID format provided.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StudentResponseDto> {
    return this.studentService.findOne(id);
  }

  @Patch(':id') 
  // @Roles('admin') 
  @ApiOperation({ summary: 'Update a student by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the student to update', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Student updated successfully.', type: CreateStudentDto })
  @ApiResponse({ status: 404, description: 'Not Found: Student with the specified UUID does not exist.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation failed, invalid format, duplicate phone, group not found)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentService.update(id, updateStudentDto);
  }

  @Delete(':id') 
  // @Roles('admin') 
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a student by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the student to delete', format: 'uuid' }) 
  @ApiResponse({ status: 200, description: 'Student deleted successfully. Returns the deleted student data.', type: CreateStudentDto })
  @ApiResponse({ status: 404, description: 'Not Found: Student with the specified UUID does not exist.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., deletion blocked by related records, invalid UUID format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<StudentResponseDto> {
    return this.studentService.remove(id);

  }
}
