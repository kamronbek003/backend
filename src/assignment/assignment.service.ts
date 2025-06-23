import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto,
} from './dto/assignment.dto';
import { Prisma, Assignment } from '@prisma/client';

interface AssignmentResponseDtoInternal {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  fileUrl?: string | null;
  groupId: string;
  group?: {
    id: string;
    name?: string | null;
    groupId: string;
  } | null;
  teacherId: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  submissionCount?: number;
}

interface PaginatedAssignmentResponseDtoInternal {
  data: AssignmentResponseDtoInternal[];
  total: number;
  limit: number;
  currentPage: number;
  totalPages: number;
}

type AssignmentPayloadWithIncludes = Prisma.AssignmentGetPayload<{
  include: {
    group: {
      select: {
        id: true;
        name: true;
        groupId: true;
      };
    };
    teacher: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
    _count: {
      select: {
        submissions: true;
      };
    };
  };
}>;

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createAssignmentDto: CreateAssignmentDto,
    teacherIdInput: string,
  ): Promise<AssignmentResponseDtoInternal> {
    const { groupId, ...restData } = createAssignmentDto;

    const groupExists = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!groupExists) {
      this.logger.warn(
        `Topshiriq yaratishda xatolik: ${groupId} ID li guruh topilmadi.`,
      );
      throw new NotFoundException(`${groupId} ID ga ega guruh topilmadi!`);
    }

    const teacherExists = await this.prisma.teacher.findUnique({
      where: { id: teacherIdInput },
      select: { id: true },
    });
    if (!teacherExists) {
      this.logger.warn(
        `Topshiriq yaratishda xatolik: ${teacherIdInput} ID li o'qituvchi topilmadi.`,
      );
      throw new NotFoundException(
        `${teacherIdInput} ID ga ega o'qituvchi topilmadi!`,
      );
    }

    try {
      const newAssignment = await this.prisma.assignment.create({
        data: {
          ...restData,
          group: { connect: { id: groupId } },
          teacher: { connect: { id: teacherIdInput } },
        },
        include: {
          group: { select: { id: true, name: true, groupId: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
      });
      this.logger.log(
        `Topshiriq (ID: ${newAssignment.id}) muvaffaqiyatli yaratildi o'qituvchi (ID: ${teacherIdInput}) tomonidan.`,
      );
      return this.mapToResponseDto(newAssignment);
    } catch (error) {
      this.logger.error(
        `Topshiriq yaratishda kutilmagan xatolik: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Topshiriqni yaratishda ichki xatolik yuz berdi.',
      );
    }
  }

  async findAll(
    queryDto: AssignmentQueryDto,
  ): Promise<PaginatedAssignmentResponseDtoInternal> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filter,
      groupId,
      teacherId,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.AssignmentWhereInput = {};

    if (groupId) {
      where.groupId = groupId;
    }
    if (teacherId) {
      where.teacherId = teacherId;
    }
    if (filter && filter.title) {
      where.title = { contains: String(filter.title), mode: 'insensitive' };
    }

    const orderBy: Prisma.AssignmentOrderByWithRelationInput = {};
    const allowedSortFields = ['title', 'dueDate', 'createdAt', 'updatedAt'];
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy['createdAt'] = 'desc';
    }

    try {
      const [assignments, total] = await this.prisma.$transaction([
        this.prisma.assignment.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            group: { select: { id: true, name: true, groupId: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { submissions: true } },
          },
        }),
        this.prisma.assignment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      this.logger.log(
        `Jami ${total} topshiriq topildi, ${page}-sahifa ko'rsatilmoqda.`,
      );

      return {
        data: assignments.map((assignment) =>
          this.mapToResponseDto(assignment),
        ),
        total,
        limit,
        currentPage: page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Topshiriqlarni olishda xatolik: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Topshiriqlarni olishda ichki xatolik yuz berdi.',
      );
    }
  }

  async findOne(id: string): Promise<AssignmentResponseDtoInternal | null> {
    try {
      const assignment = await this.prisma.assignment.findUnique({
        where: { id },
        include: {
          group: { select: { id: true, name: true, groupId: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
      });
      return assignment ? this.mapToResponseDto(assignment) : null;
    } catch (error) {
      this.logger.error(
        `${id} IDli topshiriqni topishda xatolik: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findOneOrFail(id: string): Promise<AssignmentResponseDtoInternal> {
    const assignment = await this.findOne(id);
    if (!assignment) {
      this.logger.warn(`${id} IDli topshiriq topilmadi.`);
      throw new NotFoundException(`${id} IDga ega topshiriq topilmadi!`);
    }
    return assignment;
  }

  async update(
    id: string,
    updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDtoInternal> {
    await this.findOneOrFail(id);

    if (updateAssignmentDto.groupId) {
      const groupExists = await this.prisma.group.findUnique({
        where: { id: updateAssignmentDto.groupId },
        select: { id: true },
      });
      if (!groupExists) {
        this.logger.warn(
          `Topshiriqni yangilashda xatolik: ${updateAssignmentDto.groupId} ID li guruh topilmadi.`,
        );
        throw new NotFoundException(
          `${updateAssignmentDto.groupId} ID ga ega guruh topilmadi!`,
        );
      }
    }

    try {
      const updatedAssignment = await this.prisma.assignment.update({
        where: { id },
        data: updateAssignmentDto,
        include: {
          group: { select: { id: true, name: true, groupId: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
      });
      this.logger.log(`Topshiriq (ID: ${id}) muvaffaqiyatli yangilandi.`);
      return this.mapToResponseDto(updatedAssignment);
    } catch (error) {
      this.logger.error(
        `Topshiriqni (ID: ${id}) yangilashda xatolik: ${error.message}`,
        error.stack,
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `${id} IDli topshiriqni yangilash uchun topilmadi.`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Topshiriqni yangilashda ichki xatolik yuz berdi.',
      );
    }
  }

  async remove(id: string): Promise<AssignmentResponseDtoInternal> {
    const assignmentToDelete = await this.findOneOrFail(id);

    try {
      await this.prisma.assignment.delete({
        where: { id },
      });
      this.logger.log(`Topshiriq (ID: ${id}) muvaffaqiyatli o'chirildi.`);
      return assignmentToDelete;
    } catch (error) {
      this.logger.error(
        `Topshiriqni (ID: ${id}) o'chirishda xatolik: ${error.message}`,
        error.stack,
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `${id} IDli topshiriqni o'chirish uchun topilmadi.`,
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Topshiriqni (ID: ${id}) o'chirib bo'lmadi, chunki unga bog'liq yozuvlar (masalan, yuborilgan ishlar) mavjud.`,
          );
        }
      }
      throw new InternalServerErrorException(
        "Topshiriqni o'chirishda ichki xatolik yuz berdi.",
      );
    }
  }

  private mapToResponseDto(
    assignment: AssignmentPayloadWithIncludes,
  ): AssignmentResponseDtoInternal {
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      fileUrl: assignment.fileUrl,
      groupId: assignment.groupId,
      group: assignment.group
        ? {
            id: assignment.group.id,
            name: assignment.group.name,
            groupId: assignment.group.groupId,
          }
        : null,
      teacherId: assignment.teacherId,
      teacher: assignment.teacher
        ? {
            id: assignment.teacher.id,
            firstName: assignment.teacher.firstName,
            lastName: assignment.teacher.lastName,
          }
        : null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      submissionCount: assignment._count?.submissions ?? 0,
    };
  }
}
