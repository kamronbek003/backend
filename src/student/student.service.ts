import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Student, Status, Group, Payment, Attendance } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';

function parseDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null;
  const parts = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!parts) return null;

  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1;
  const year = parseInt(parts[3], 10);

  const date = new Date(Date.UTC(year, month, day));

  if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
    return date;
  }
  return null;
}

export type StudentWithDetails = Omit<Student, 'ball'> & {
    ball: number;
    balance: number;
    groups?: Partial<Group>[];
    payments?: Partial<Payment>[];
    attendances?: (Partial<Attendance> & { group?: Partial<Group>})[];
}


@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  private async _calculateStudentBalance(studentId: string): Promise<number> {
    const paymentAggregation = await this.prisma.payment.aggregate({
        where: { studentId },
        _sum: { summa: true },
    });
    return paymentAggregation._sum.summa || 0;
  }

  async create(createStudentDto: CreateStudentDto): Promise<StudentWithDetails> {
  const parsedDateBirth = parseDDMMYYYY(createStudentDto.dateBirth);
  if (!parsedDateBirth) {
    throw new BadRequestException('Tug‘ilgan sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
  }

  let parsedWhenCome: Date | undefined | null;
  if (createStudentDto.whenCome) {
    parsedWhenCome = parseDDMMYYYY(createStudentDto.whenCome);
    if (!parsedWhenCome) {
      throw new BadRequestException('Qachon kelgan sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
    }
  }

  if (createStudentDto.groupIds && createStudentDto.groupIds.length > 0) {
    const groupsExist = await this.prisma.group.findMany({
      where: { id: { in: createStudentDto.groupIds } },
      select: { id: true },
    });
    if (groupsExist.length !== createStudentDto.groupIds.length) {
      const foundGroupIds = groupsExist.map(g => g.id);
      const notFoundGroupIds = createStudentDto.groupIds.filter(id => !foundGroupIds.includes(id));
      throw new BadRequestException(`Quyidagi ID(lar)ga ega guruh(lar) topilmadi: ${notFoundGroupIds.join(', ')}`);
    }
  }

  try {
    const studentData: Prisma.StudentCreateInput = {
      studentId: createStudentDto.studentId,
      firstName: createStudentDto.firstName,
      lastName: createStudentDto.lastName,
      phone: createStudentDto.phone,
      address: createStudentDto.address,
      dateBirth: parsedDateBirth,
      parentPhone: createStudentDto.parentPhone,
      discount: createStudentDto.discount,
      status: createStudentDto.status ?? Status.FAOL,
      ball: createStudentDto.ball ?? 0,
      hasFamilyMembers: createStudentDto.hasFamilyMembers,
      whichSchool: createStudentDto.whichSchool,
      howFind: createStudentDto.howFind,
      whenCome: parsedWhenCome,
      firstPaymentNote: createStudentDto.firstPaymentNote,
      ...(createStudentDto.groupIds && createStudentDto.groupIds.length > 0 && {
        groups: {
          connect: createStudentDto.groupIds.map(id => ({ id })),
        },
      }),
    };

    const createdStudent = await this.prisma.student.create({
      data: studentData,
    });
    return this.findOne(createdStudent.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | string | undefined;
        let field = Array.isArray(target) ? target.join(', ') : target ?? 'identifikator';
        if (typeof field === 'string') {
          if (field.includes('studentId')) field = 'Talaba ID';
          else if (field.includes('phone')) field = 'Telefon raqami';
        }
        throw new BadRequestException(`${field} allaqachon mavjud.`);
      }
    }
    console.error("Talaba yaratishda xato:", error);
    throw new InternalServerErrorException('Ichki xato tufayli talaba yaratib bo‘lmadi.');
  }
}

  async findAll(queryDto: QueryStudentDto): Promise<{ data: StudentWithDetails[], total: number }> {
    const {
      page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc',
      filterByName, filterByPhone, filterByGroupId, filterByStatus,
      filterByStudentId, filterByScore,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.StudentWhereInput = {};

    if (filterByName) {
      where.OR = [
        { firstName: { contains: filterByName, mode: 'insensitive' } },
        { lastName: { contains: filterByName, mode: 'insensitive' } },
      ];
    }
    if (filterByPhone) {
      where.phone = { contains: filterByPhone, mode: 'insensitive' };
    }
    if (filterByGroupId) {
      where.groups = { some: { id: filterByGroupId } };
    }
    if (filterByStatus) {
      where.status = filterByStatus;
    }
    if (filterByStudentId) {
      where.studentId = { contains: filterByStudentId, mode: 'insensitive' };
    }
    if (filterByScore !== undefined) { 
      where.ball = filterByScore;
    }

    const allowedSortByFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'studentId', 'discount', 'dateBirth', 'ball'];
    const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = (safeSortBy === 'ball' && sortOrder !== 'asc') ? 'desc' : sortOrder;

    const orderBy: Prisma.StudentOrderByWithRelationInput = { [safeSortBy]: finalSortOrder };

    try {
      const [students, total] = await this.prisma.$transaction([
        this.prisma.student.findMany({
          where, skip, take: limit, orderBy,
          include: { 
            groups: { select: { id: true, name: true, groupId: true, darsJadvali: true, darsVaqt: true, coursePrice: true } }, 
            payments: { select: { id: true, paymentType:true, createdAt: true, date: true, summa: true } }
          },
        }),
        this.prisma.student.count({ where }),
      ]);

      const studentIds = students.map(s => s.id);
      if(studentIds.length === 0) {
        return { data: [], total };
      }

      const balances = await this.prisma.payment.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds } },
        _sum: { summa: true }
      });

      const balanceMap = new Map<string, number>();
      balances.forEach(b => {
        balanceMap.set(b.studentId, b._sum.summa || 0);
      });

      const data = students.map(student => ({
        ...student,
        balance: balanceMap.get(student.id) || 0,
      }));

      return { data, total };
    } catch (error) {
      console.error("Talabalarni olishda xato:", error);
      throw new InternalServerErrorException('Ichki xato tufayli talabalarni olish mumkin bo‘lmadi.');
    }
  }

  async findOne(id: string): Promise<StudentWithDetails> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { 
        groups: { 
          select: {
            id: true, name: true, groupId: true, darsJadvali: true, darsVaqt: true, coursePrice: true,
            teacher: {select: {firstName: true, lastName: true, phone: true}} 
          } 
        },
        payments: { select: { id: true, summa: true, date: true, paymentType: true }, orderBy: {date: 'desc'} },
        attendances: { select: { id: true, date: true, status: true, group: {select: {groupId: true, name: true}} }, orderBy: {date: 'desc'} },
      },
    });

    if (!student) {
      throw new NotFoundException(`"${id}" ID ga ega talaba topilmadi.`);
    }
    
    const balance = await this._calculateStudentBalance(id);

    return { ...student, balance };
  }

  async update(id: string, updateStudentDto: UpdateStudentDto): Promise<StudentWithDetails> {
  const existingStudent = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
  if (!existingStudent) {
    throw new NotFoundException(`"${id}" ID ga ega talaba topilmadi.`);
  }

  const updateData: Prisma.StudentUpdateInput = {};
  const { groupIds, dateBirth, whenCome, firstPaymentNote, ...dtoData } = updateStudentDto;

  Object.assign(updateData, dtoData);

  if (dateBirth) {
    const parsedDateBirth = parseDDMMYYYY(dateBirth);
    if (!parsedDateBirth) {
      throw new BadRequestException('Tug‘ilgan sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
    }
    updateData.dateBirth = parsedDateBirth;
  }

  if (whenCome !== undefined) {
    if (whenCome) {
      const parsedWhenCome = parseDDMMYYYY(whenCome);
      if (!parsedWhenCome) {
        throw new BadRequestException('Qachon kelgan sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.');
      }
      updateData.whenCome = parsedWhenCome;
    } else {
      updateData.whenCome = null;
    }
  }

  if (firstPaymentNote !== undefined) {
    updateData.firstPaymentNote = firstPaymentNote || null;
  }

  if (groupIds !== undefined) {
    if (groupIds.length > 0) {
      const groupsExist = await this.prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true },
      });
      if (groupsExist.length !== groupIds.length) {
        const foundGroupIds = groupsExist.map(g => g.id);
        const notFoundGroupIds = groupIds.filter(gid => !foundGroupIds.includes(gid));
        throw new BadRequestException(`Guruh(lar) yangilanmadi. Quyidagi ID(lar)ga ega guruh(lar) topilmadi: ${notFoundGroupIds.join(', ')}`);
      }
      updateData.groups = { set: groupIds.map(gid => ({ id: gid })) };
    } else {
      updateData.groups = { set: [] };
    }
  }

  if (Object.keys(updateData).length === 0) {
    return this.findOne(id);
  }

  try {
    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: updateData,
    });
    return this.findOne(updatedStudent.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | string | undefined;
        let field = Array.isArray(target) ? target.join(', ') : target ?? 'identifikator';
        if (typeof field === 'string') {
          if (field.includes('studentId')) field = 'Talaba ID';
          else if (field.includes('phone')) field = 'Telefon raqami';
        }
        throw new BadRequestException(`Yangilash amalga oshmadi: ${field} allaqachon mavjud.`);
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Yangilash uchun "${id}" ID ga ega talaba topilmadi.`);
      }
    }
    console.error("Talaba yangilashda xato:", error);
    throw new InternalServerErrorException('Ichki xato tufayli talaba ma’lumotlari yangilanmadi.');
  }
}

  async remove(id: string): Promise<StudentWithDetails> {
    const student = await this.findOne(id);

    try {
      await this.prisma.student.delete({
        where: { id },
      });
      return student;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2014') { 
          const fieldName = (error.meta?.field_name as string)?.split('_')[0] ?? 'bog‘langan yozuvlar';
          throw new BadRequestException(`Mavjud ${fieldName} tufayli talabani o‘chirib bo‘lmadi. Iltimos, avval bog‘langan yozuvlarni o‘chirib tashlang yoki aloqalarni uzing.`);
        }
      }
      console.error("Talaba o‘chirishda xato:", error);
      throw new InternalServerErrorException('Ichki xato tufayli talabani o‘chirib bo‘lmadi.');
    }
  }

  async myPayments(studentId: string): Promise<Payment[]> {
    const studentExists = await this.prisma.student.findUnique({ where: { id: studentId }, select: {id: true}});
    if (!studentExists) {
        throw new NotFoundException(`"${studentId}" ID ga ega talaba topilmadi.`);
    }
    return this.prisma.payment.findMany({
      where: { studentId: studentId },
      orderBy: { date: 'desc' },
    });
  }

  async myAttendances(studentId: string): Promise<(Attendance & {group: {name: string | null; groupId: string;}})[]> {
    const studentExists = await this.prisma.student.findUnique({ where: { id: studentId }, select: {id: true}});
    if (!studentExists) {
        throw new NotFoundException(`"${studentId}" ID ga ega talaba topilmadi.`);
    }
    return this.prisma.attendance.findMany({
      where: { studentId: studentId },
      orderBy: { date: 'desc' },
      include: {
        group: {select: {name: true, groupId: true}} 
      }
    });
  }
}