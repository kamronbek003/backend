import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubmissionStatus, Teacher, Status } from '@prisma/client';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import * as bcrypt from 'bcrypt';

function parseDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null;
  const parts = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!parts) return null;

  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1;
  const year = parseInt(parts[3], 10);

  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
  ) {
    return date;
  }

  return null;
}

export type TeacherWithDetails = Omit<Teacher, 'password'> & {
    estimatedSalary: number;
};

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async _calculateEstimatedSalary(teacherId: string): Promise<number> {
    const teacherWithGroups = await this.prisma.teacher.findUnique({
        where: { id: teacherId },
        select: {
            percent: true,
            groups: {
                where: { status: Status.FAOL },
                select: {
                    coursePrice: true,
                    _count: {
                        select: { students: { where: { status: Status.FAOL } } }
                    }
                }
            }
        }
    });

    if (!teacherWithGroups) return 0;

    const totalRevenue = teacherWithGroups.groups.reduce((sum, group) => {
        const groupRevenue = (group.coursePrice || 0) * group._count.students;
        return sum + groupRevenue;
    }, 0);

    const estimatedSalary = totalRevenue * ((teacherWithGroups.percent || 0) / 100);
    return estimatedSalary;
  }

  async create(createTeacherDto: CreateTeacherDto): Promise<TeacherWithDetails> {
    const parsedDateBirth = parseDDMMYYYY(createTeacherDto.dateBirth);
    if (!parsedDateBirth) {
        throw new BadRequestException('O‘qituvchi tug‘ilgan sanasi DD-MM-YYYY formatida bo‘lishi kerak.');
    }

    const parsedStartedAt = createTeacherDto.startedAt ? parseDDMMYYYY(createTeacherDto.startedAt) : new Date();
    if (!parsedStartedAt) {
        throw new BadRequestException('Ish boshlash sanasi DD-MM-YYYY formatida bo‘lishi kerak.');
    }

    try {
      const hashedPassword = bcrypt.hashSync(createTeacherDto.password, 10); 

      const teacherData: Prisma.TeacherCreateInput = {
        firstName: createTeacherDto.firstName,
        lastName: createTeacherDto.lastName,
        phone: createTeacherDto.phone,
        password: hashedPassword,
        address: createTeacherDto.address,
        dateBirth: parsedDateBirth,
        experience: createTeacherDto.experience,
        startedAt: parsedStartedAt,
        image: createTeacherDto.image,
        subject: createTeacherDto.subject,
        percent: createTeacherDto.percent,
        status: createTeacherDto.status
      };

      const createdTeacher = await this.prisma.teacher.create({
        data: teacherData,
      });
      return this.findOne(createdTeacher.id);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new BadRequestException(`Bunday telefon raqamga ega o‘qituvchi allaqachon mavjud.`);
            }
        }
        console.error("O‘qituvchi yaratishda xato:", error);
        throw new InternalServerErrorException('Nimadir xato ketdi! Iltimos, birozdan keyin qayta urinib ko‘ring.');
    }
  }

  async findAll(queryDto: QueryTeacherDto): Promise<{ data: TeacherWithDetails[], total: number }> {
    const {
        page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc',
        filterByName, filterBySubject, filterByPhone
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.TeacherWhereInput = {};
    if (filterByName) {
      where.OR = [
        { firstName: { contains: filterByName, mode: 'insensitive' } },
        { lastName: { contains: filterByName, mode: 'insensitive' } },
      ];
    }
    if (filterBySubject) {
      where.subject = { contains: filterBySubject, mode: 'insensitive' };
    }
    if (filterByPhone) {
      where.phone = { contains: filterByPhone };
    }

    const orderBy: Prisma.TeacherOrderByWithRelationInput = { [sortBy]: sortOrder };

    try {
        const [teachers, total] = await this.prisma.$transaction([
            this.prisma.teacher.findMany({
                where, skip, take: limit, orderBy,
                 include: {
                    groups: {
                        where: { status: Status.FAOL },
                        select: {
                            coursePrice: true,
                            _count: {
                                select: { students: { where: { status: Status.FAOL } } }
                            }
                        }
                    }
                }
            }),
            this.prisma.teacher.count({ where }),
        ]);

        const data = teachers.map(teacher => {
            const { password, groups, ...rest } = teacher;

            const totalRevenue = groups.reduce((sum, group) => {
                const groupRevenue = (group.coursePrice || 0) * group._count.students;
                return sum + groupRevenue;
            }, 0);
            
            const estimatedSalary = totalRevenue * ((teacher.percent || 0) / 100);

            return { ...rest, estimatedSalary };
        });


        return { data, total };
    } catch (error) {
        console.error("O‘qituvchilarni olishda xato:", error);
        throw new InternalServerErrorException('Nimadir xato ketdi! Iltimos, birozdan keyin qayta urinib ko‘ring.');
    }
  }

  async findOne(id: string): Promise<TeacherWithDetails> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException(`"${id}" ID ga ega o‘qituvchi topilmadi.`);
    }

    const estimatedSalary = await this._calculateEstimatedSalary(id);
    const { password, ...result } = teacher;

    return { ...result, estimatedSalary };
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<TeacherWithDetails> {
    await this.findOne(id);
    const { password, ...restDto } = updateTeacherDto;
    const updateData: Prisma.TeacherUpdateInput = { ...restDto };

    if (updateTeacherDto.dateBirth) {
        const parsedDateBirth = parseDDMMYYYY(updateTeacherDto.dateBirth);
        if (!parsedDateBirth) {
            throw new BadRequestException('Tug‘ilgan sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
        }
        updateData.dateBirth = parsedDateBirth;
    }

    if (updateTeacherDto.startedAt) {
        const parsedStartedAt = parseDDMMYYYY(updateTeacherDto.startedAt);
        if (!parsedStartedAt) {
            throw new BadRequestException('Ish boshlash sanasi formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
        }
        updateData.startedAt = parsedStartedAt;
    }

    if (password) {
         updateData.password = await bcrypt.hash(password, 10); 
    }

    if (Object.keys(updateData).length === 0) {
        return this.findOne(id);
    }

    try {
      const updatedTeacher = await this.prisma.teacher.update({
        where: { id },
        data: updateData,
      });
      return this.findOne(updatedTeacher.id);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             throw new BadRequestException(`Yangilash amalga oshmadi: Bunday telefon raqamli o‘qituvchi allaqachon mavjud.`);
        }
        console.error("O‘qituvchi yangilashda xato:", error);
        throw new InternalServerErrorException('Ichki xato tufayli o‘qituvchi ma’lumotlari yangilanmadi.');
    }
  }

  async remove(id: string): Promise<TeacherWithDetails> {
    const teacher = await this.findOne(id);

    try {
      await this.prisma.teacher.delete({
        where: { id },
      });
      return teacher;
    } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
             const fieldName = error.meta?.field_name as string ?? 'bog‘langan yozuvlar';
             throw new BadRequestException(`Mavjud ${fieldName} tufayli o‘qituvchini o‘chirib bo‘lmadi. Iltimos, avval bog‘langan yozuvlarni o‘chiring.`);
         }
        console.error("O‘qituvchi o‘chirishda xato:", error);
        throw new InternalServerErrorException('Ichki xato tufayli o‘qituvchini o‘chirib bo‘lmadi.');
    }
  }

  async countPendingSubmissionsForTeacher(teacherId: string): Promise<number> {
    try {
        const count = await this.prisma.submission.count({
            where: {
                status: SubmissionStatus.YUBORILDI,
                assignment: {
                    teacherId: teacherId,
                },
            },
        });
        return count;
    } catch (error) {
        console.error("Kutilayotgan topshiriqlarni hisoblashda xato:", error);
        throw new InternalServerErrorException('Kutilayotgan topshiriqlarni hisoblab bo‘lmadi.');
    }
}

  async findPendingSubmissionsForTeacher(teacherId: string, page: number, limit: number): Promise<{ data: any[], total: number }> {
    const skip = (page - 1) * limit;
    const where: Prisma.SubmissionWhereInput = {
        status: SubmissionStatus.YUBORILDI,
        assignment: {
            teacherId: teacherId,
        },
    };

    try {
        const [submissions, total] = await this.prisma.$transaction([
            this.prisma.submission.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    submittedAt: 'desc',
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    assignment: {
                        select: {
                            id: true,
                            title: true,
                            group: {
                                select: {
                                    id: true,
                                    name: true,
                                    groupId: true,
                                }
                            }
                        },
                    },
                },
            }),
            this.prisma.submission.count({ where }),
        ]);
        return { data: submissions, total };
    } catch (error) {
        console.error("Kutilayotgan topshiriqlarni olishda xato:", error);
        throw new InternalServerErrorException('Kutilayotgan topshiriqlarni olishda xato yuz berdi.');
    }
}
}