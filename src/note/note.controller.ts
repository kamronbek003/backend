import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNoteDto } from './dto/query-note.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/role.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiProperty } from '@nestjs/swagger';
import { Note } from '@prisma/client';

class PaginatedNoteResponse {
    @ApiProperty({ type: [CreateNoteDto] })
    data: Note[];

    @ApiProperty({ example: 50 })
    total: number;
}

@ApiTags('Note')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new note (Admin Role Required)' })
  @ApiResponse({ status: 201, description: 'Note created successfully.', type: CreateNoteDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createNoteDto: CreateNoteDto): Promise<Note> {
    return this.noteService.create(createNoteDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all notes with filtering, sorting, pagination (Admin Role Required)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filterByFullName', required: false, type: String })
  @ApiQuery({ name: 'filterByPhone', required: false, type: String })
  @ApiQuery({ name: 'filterByDateFrom', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'filterByDateTo', required: false, type: String, format: 'date-time' })
  @ApiResponse({ status: 200, description: 'List of notes retrieved.', type: PaginatedNoteResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() queryDto: QueryNoteDto): Promise<{ data: Note[], total: number }> {
    return this.noteService.findAll(queryDto);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a specific note by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Note details retrieved.', type: CreateNoteDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 400, description: 'Bad Request (Invalid UUID format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Note> {
    return this.noteService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a note by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Note updated successfully.', type: CreateNoteDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ): Promise<Note> {
    return this.noteService.update(id, updateNoteDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a note by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully.', type: CreateNoteDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<Note> {
    return this.noteService.remove(id);
  }
}
