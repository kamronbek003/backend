import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard'; 
import { RolesGuard } from '../guards/roles.guard'; 
import { Roles } from '../guards/role.decorator'; 
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiProperty } from '@nestjs/swagger';
import { Group, Status } from '@prisma/client'; 

class PaginatedGroupResponse {
    @ApiProperty({ type: [CreateGroupDto], description: 'List of group records' }) 
    data: Group[]; 

    @ApiProperty({ example: 25, description: 'Total number of groups matching the query criteria' })
    total: number;
}

@ApiTags('Group')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  // @Roles('admin') 
  @ApiOperation({ summary: 'Create a new group (Admin Role Required)' })
  @ApiResponse({ status: 201, description: 'Group created successfully.', type: CreateGroupDto})
  @ApiResponse({ status: 400, description: 'Bad Request (Validation error, duplicate groupId, teacher not found, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupService.create(createGroupDto);
  }

  @Get()
  // @Roles('admin', 'teacher') 
  @ApiOperation({ summary: 'Get all groups with filtering, sorting, and pagination (Admin Role Required)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (e.g., groupId, createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'filterByGroupId', required: false, type: String, description: 'Filter by exact Group Business ID' })
  @ApiQuery({ name: 'filterByStatus', required: false, enum: Status, description: 'Filter by group status' })
  @ApiQuery({ name: 'filterByTeacherId', required: false, type: String, format: 'uuid', description: 'Filter by assigned Teacher UUID' })
  @ApiQuery({ name: 'filterByNoTeacher', required: false, type: Boolean, description: 'Set to true to find groups without a teacher, false for groups with a teacher' })
  @ApiResponse({ status: 200, description: 'List of groups retrieved.', type: PaginatedGroupResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() queryDto: QueryGroupDto): Promise<{ data: Group[], total: number }> {
    return this.groupService.findAll(queryDto);
  }

  @Get(':id')
  // @Roles('admin', 'teacher') 
  @ApiOperation({ summary: 'Get a specific group by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the group', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Group details retrieved successfully.', type: CreateGroupDto })
  @ApiResponse({ status: 404, description: 'Not Found: Group with the specified UUID does not exist.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Group> {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  // @Roles('admin')
  @ApiOperation({ summary: 'Update a group by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the group to update', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Group updated successfully.', type: CreateGroupDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request (Validation error, teacher not found, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateGroupDto: UpdateGroupDto, 
  ): Promise<Group> {
    return this.groupService.update(id, updateGroupDto);
  }

  @Delete(':id')
  // @Roles('admin') 
  @HttpCode(HttpStatus.OK) 
  @ApiOperation({ summary: 'Delete a group by Primary Key (UUID) (Admin Role Required)' })
  @ApiParam({ name: 'id', type: String, description: 'The Primary Key (UUID) of the group to delete', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully. Returns the deleted group data.', type: CreateGroupDto })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., cannot delete due to existing students/attendances, invalid UUID).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<Group> {
    return this.groupService.remove(id);
  }
}
