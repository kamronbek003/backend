import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { QueryApplicationDto, SortOrder } from './dto/query-application.dto';
import {
  Application as PrismaApplication,
  Prisma,
  ApplicationStatus,
  Course,
} from '@prisma/client';

export type ApplicationResponse = Omit<PrismaApplication, 'course'> & {
  course?: { id: number; name: string };
};

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationResponse> {
    const { telegramId, courseId, ...restData } = createApplicationDto;

    const courseExists = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!courseExists) {
      throw new NotFoundException(`${courseId} ID'li kurs topilmadi.`);
    }

    const existingApplication = await this.prisma.application.findFirst({
      where: { telegramId: telegramId },
    });

    try {
      const newApplication = await this.prisma.application.create({
        data: {
          ...restData,
          telegramId: telegramId,
          course: { connect: { id: courseId } },
          status: createApplicationDto.status || ApplicationStatus.KUTILYABDI,
        },
      });

      return {
        ...newApplication,
        course: { id: courseExists.id, name: courseExists.name },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ariza yaratishda unikal maydon takrorlandi.`,
        );
      }
      console.error('Ariza yaratishda xatolik:', error);
      throw error;
    }
  }

  async findAll(queryDto: QueryApplicationDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      filterByCourseId,
      filterByTelegramId,
      filterByStatus,
      searchFirstName,
      searchLastName,
      searchPhoneNumber,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.ApplicationWhereInput = {};

    if (filterByCourseId) where.courseId = filterByCourseId;
    if (filterByTelegramId) {
      where.telegramId = filterByTelegramId;
    }
    if (filterByStatus) where.status = filterByStatus as ApplicationStatus;
    if (searchFirstName)
      where.firstName = { contains: searchFirstName, mode: 'insensitive' };
    if (searchLastName)
      where.lastName = { contains: searchLastName, mode: 'insensitive' };
    if (searchPhoneNumber)
      where.phoneNumber = { contains: searchPhoneNumber, mode: 'insensitive' };

    const applications = await this.prisma.application.findMany({
      skip,
      take: limit,
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() as Prisma.SortOrder },
      include: { course: { select: { id: true, name: true } } },
    });

    const totalApplications = await this.prisma.application.count({ where });

    return {
      data: applications.map((app) => ({
        ...app,
        course: app.course,
      })),
      meta: {
        total: totalApplications,
        page,
        limit,
        lastPage: Math.ceil(totalApplications / limit),
      },
    };
  }

  async findOne(id: number): Promise<ApplicationResponse | null> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { course: { select: { id: true, name: true } } },
    });

    if (!application) {
      throw new NotFoundException(`${id} ID'li ariza topilmadi.`);
    }
    return {
      ...application,
      course: application.course,
    };
  }

  async update(
    id: number,
    updateApplicationDto: UpdateApplicationDto,
  ): Promise<ApplicationResponse> {
    const applicationExists = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!applicationExists) {
      throw new NotFoundException(`${id} ID'li ariza topilmadi.`);
    }

    const { telegramId, courseId, ...restData } = updateApplicationDto;

    if (telegramId && telegramId !== applicationExists.telegramId) {
      const existingAppWithNewTgId = await this.prisma.application.findFirst({
        where: { telegramId: telegramId }, // Endi string
      });
    }

    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course)
        throw new NotFoundException(`${courseId} ID'li kurs topilmadi.`);
    }

    try {
      const updatedApplication = await this.prisma.application.update({
        where: { id },
        data: {
          ...restData,
          ...(telegramId !== undefined && { telegramId: telegramId }),
          ...(courseId && { course: { connect: { id: courseId } } }),
          ...(updateApplicationDto.status && {
            status: updateApplicationDto.status as ApplicationStatus,
          }),
        },
        include: { course: { select: { id: true, name: true } } },
      });
      return {
        ...updatedApplication,
        course: updatedApplication.course,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ariza yangilashda unikal maydon takrorlandi.`,
        );
      }
      console.error('Ariza yangilashda xatolik:', error);
      throw error;
    }
  }

  async remove(id: number): Promise<ApplicationResponse> {
    const applicationToDelete = await this.prisma.application.findUnique({
      where: { id },
      include: { course: { select: { id: true, name: true } } },
    });

    if (!applicationToDelete) {
      throw new NotFoundException(`${id} ID'li ariza topilmadi.`);
    }

    await this.prisma.application.delete({ where: { id } });

    return {
      ...applicationToDelete,
      course: applicationToDelete.course,
    };
  }
}
