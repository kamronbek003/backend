import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Group, Status } from '@prisma/client';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    if (createGroupDto.teacherId) {
      const teacherExists = await this.prisma.teacher.findUnique({
        where: { id: createGroupDto.teacherId },
        select: { id: true } 
      });
      if (!teacherExists) {
        throw new BadRequestException(`Teacher with ID "${createGroupDto.teacherId}" not found.`);
      }
    }

    try {
      const groupData: Prisma.GroupCreateInput = {
        groupId: createGroupDto.groupId, 
        status: createGroupDto.status ?? Status.FAOL, 
        darsJadvali: createGroupDto.darsJadvali,
        darsVaqt: createGroupDto.darsVaqt,
        coursePrice: createGroupDto.coursePrice,
        ...(createGroupDto.teacherId && {
          teacher: { connect: { id: createGroupDto.teacherId } }
        }),
      };

      const createdGroup = await this.prisma.group.create({
        data: groupData,
        include: { teacher: true } 
      });
      return createdGroup;

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] | string | undefined;
          let field = Array.isArray(target) ? target.join(', ') : target ?? 'identifier';
          if (typeof field === 'string' && field.includes('groupId')) {
            field = 'Group ID'; 
          }
          throw new BadRequestException(`${field} already exists.`);
        }
      }
      console.error("Error creating group:", error);
      throw new InternalServerErrorException('Could not create group due to an internal error.');
    }
  }

  async findAll(queryDto: QueryGroupDto): Promise<{ data: Group[], total: number }> {
    const {
      page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc',
      filterByGroupId, filterByStatus, filterByTeacherId, filterByNoTeacher
    } = queryDto;

    const skip = (page - 1) * limit; 

    const where: Prisma.GroupWhereInput = {};
    if (filterByGroupId) {
      where.groupId = { contains: filterByGroupId, mode: 'insensitive' }; 
    }
    if (filterByStatus) {
      where.status = filterByStatus; 
    }
    if (filterByTeacherId) {
      where.teacherId = filterByTeacherId;
    }
    if (filterByNoTeacher === true) {
        where.teacherId = null; 
    } else if (filterByNoTeacher === false) {
         where.teacherId = { not: null };
    }


    const allowedSortByFields = ['createdAt', 'updatedAt', 'groupId', 'coursePrice', 'status'];
    const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.GroupOrderByWithRelationInput = { [safeSortBy]: sortOrder };

    try {
      const [groups, total] = await this.prisma.$transaction([
        this.prisma.group.findMany({
          where, skip, take: limit, orderBy,
          include: { 
            teacher: { 
                select: { id: true, firstName: true, lastName: true } 
            },
            _count: {
                select: { students: true }
            }
          }
        }),
        this.prisma.group.count({ where }),
      ]);
      return { data: groups, total };
    } catch (error) {
      console.error("Error finding groups:", error);
      throw new InternalServerErrorException('Could not retrieve groups due to an internal error.');
    }
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { id }, 
      include: { 
        teacher: true, 
        students: { 
            select: { id: true, studentId: true, firstName: true, lastName: true },
            take: 10
        },
        _count: { 
            select: { students: true, attendances: true }
        }
      }
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const existingGroup = await this.prisma.group.findUnique({ where: { id } });
    if (!existingGroup) {
        throw new NotFoundException(`Group with ID "${id}" not found.`);
    }

    const updateData: Prisma.GroupUpdateInput = {};

    if (updateGroupDto.status !== undefined) updateData.status = updateGroupDto.status;
    if (updateGroupDto.darsJadvali !== undefined) updateData.darsJadvali = updateGroupDto.darsJadvali;
    if (updateGroupDto.darsVaqt !== undefined) updateData.darsVaqt = updateGroupDto.darsVaqt;
    if (updateGroupDto.coursePrice !== undefined) updateData.coursePrice = updateGroupDto.coursePrice;

    if (updateGroupDto.teacherId !== undefined) {
      if (updateGroupDto.teacherId === null) {
        updateData.teacher = { disconnect: true };
      } else {
        const teacherExists = await this.prisma.teacher.findUnique({
          where: { id: updateGroupDto.teacherId },
          select: { id: true }
        });
        if (!teacherExists) {
          throw new BadRequestException(`Teacher with ID "${updateGroupDto.teacherId}" not found.`);
        }
        updateData.teacher = { connect: { id: updateGroupDto.teacherId } };
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    try {
      const updatedGroup = await this.prisma.group.update({
        where: { id }, 
        data: updateData, 
        include: { teacher: true, _count: { select: { students: true } } } 
      });
      return updatedGroup;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
           const target = error.meta?.target as string[] | string | undefined;
           let field = Array.isArray(target) ? target.join(', ') : target ?? 'identifier';
           if (typeof field === 'string' && field.includes('groupId')) {
              field = 'Group ID';
           }
           throw new BadRequestException(`Update failed: ${field} already exists.`);
        }
        if (error.code === 'P2025') {
           throw new NotFoundException(`Group with ID "${id}" not found for update.`);
        }
      }
      console.error("Error updating group:", error);
      throw new InternalServerErrorException('Could not update group due to an internal error.');
    }
  }

  async remove(id: string): Promise<Group> {
    const group = await this.findOne(id); 

    try {
      await this.prisma.group.delete({
        where: { id }, 
      });
      return group;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const fieldName = error.meta?.field_name as string ?? 'related records (e.g., students)';
          throw new BadRequestException(`Cannot delete group because it has existing ${fieldName}. Please reassign or remove them first.`);
        }
      }
      console.error("Error removing group:", error);
      throw new InternalServerErrorException('Could not remove group due to an internal error.');
    }
  }
}
