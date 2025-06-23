import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto, SortOrder } from './dto/query-course.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { name: createCourseDto.name },
    });

    if (existingCourse) {
      throw new ConflictException(`'${createCourseDto.name}' nomli kurs allaqachon mavjud.`);
    }

    try {
      return await this.prisma.course.create({
        data: createCourseDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Kurs nomi yoki boshqa unikal maydon takrorlanmoqda.`);
        }
      }
      throw error; 
    }
  }

  async findAll(queryDto: QueryCourseDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = SortOrder.DESC, searchName, searchDescription } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (searchName) {
      where.name = {
        contains: searchName,
        mode: 'insensitive', 
      };
    }

    if (searchDescription) {
      where.description = {
        contains: searchDescription,
        mode: 'insensitive',
      };
    }

    const courses = await this.prisma.course.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const totalCourses = await this.prisma.course.count({ where });

    return {
      data: courses,
      meta: {
        total: totalCourses,
        page,
        limit,
        lastPage: Math.ceil(totalCourses / limit),
      },
    };
  }

  async findOne(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { applications: true }, 
    });

    if (!course) {
      throw new NotFoundException(`${id} ID'li kurs topilmadi.`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto) {
    const courseExists = await this.prisma.course.findUnique({ where: { id } });
    if (!courseExists) {
      throw new NotFoundException(`${id} ID'li kurs topilmadi.`);
    }

    if (updateCourseDto.name && updateCourseDto.name !== courseExists.name) {
      const existingCourseWithNewName = await this.prisma.course.findUnique({
        where: { name: updateCourseDto.name },
      });
      if (existingCourseWithNewName && existingCourseWithNewName.id !== id) {
        throw new ConflictException(`'${updateCourseDto.name}' nomli kurs allaqachon mavjud.`);
      }
    }

    try {
      return await this.prisma.course.update({
        where: { id },
        data: updateCourseDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(`Kurs nomi yoki boshqa unikal maydon takrorlanmoqda.`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`${id} ID'li kurs topilmadi.`);
    }

    try {
      return await this.prisma.$transaction(async (prismaTx) => {
        await prismaTx.application.deleteMany({
          where: { courseId: id },
        });

        const deletedCourse = await prismaTx.course.delete({
          where: { id },
        });
        return deletedCourse;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        console.error("O'chirish jarayonida foreign key xatoligi (P2003):", error);
        throw new ConflictException(
          `Kursni o'chirish imkoni bo'lmadi, chunki unga bog'liq boshqa yozuvlar mavjud (arizalardan tashqari). Detallar uchun loglarni tekshiring.`,
        );
      }
      console.error("Kursni o'chirishda kutilmagan xatolik:", error);
      throw error;
    }
  }
}
