import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Attendance, Student, Group, AttendanceStatus } from '@prisma/client';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

function formatDDMMYYYY(dateInput: Date | string | null): string {
  if (!dateInput) return "Noma'lum sana";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Noto'g'ri sana formati";
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return 'Sana parse qilishda xatolik';
  }
}

export interface AttendanceWithDetails extends Attendance {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    parentPhone?: string | null;
  } | null;
  group: {
    id: string;
    groupId: string;
    name?: string | null;
    teacher?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}

export class AttendanceCreatedEvent {
  constructor(
    public readonly attendanceRecord: AttendanceWithDetails,
    public readonly studentParentPhone: string | null | undefined,
  ) {}
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto): Promise<AttendanceWithDetails> {
    const { studentId, groupId, date, status } = createAttendanceDto;

    let attendanceDate: Date;
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) throw new Error('Yaroqsiz sana qiymati');
      attendanceDate = new Date(Date.UTC(
        parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()
      ));
    } catch (e: any) {
      this.logger.warn(`Noto'g'ri sana formati qabul qilindi: ${date}`, e.message);
      throw new BadRequestException("Sana qiymati noto'g'ri formatda yoki yaroqsiz.");
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: studentId },
          select: { id: true, firstName: true, lastName: true, studentId: true, parentPhone: true },
        });
        if (!student) throw new BadRequestException(`"${studentId}" ID li o'quvchi topilmadi.`);

        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: {
            id: true, name: true, groupId: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        if (!group) throw new BadRequestException(`"${groupId}" ID li guruh topilmadi.`);

        const existingAttendance = await tx.attendance.findFirst({
          where: { studentId, groupId, date: attendanceDate }, select: { id: true },
        });
        if (existingAttendance) {
          throw new BadRequestException(
            `O'quvchi (${student.firstName} ${student.lastName}) uchun "${group.name || group.groupId}" guruhida ${formatDDMMYYYY(attendanceDate)} sanasida davomat allaqachon kiritilgan.`
          );
        }

        const createdAttendance = await tx.attendance.create({
          data: {
            status,
            date: attendanceDate,
            student: { connect: { id: studentId } },
            group: { connect: { id: groupId } },
          },
          include: {
            student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true } },
            group: { select: { id: true, groupId: true, name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
          },
        });

        return { createdAttendance };
      });

      const attendanceDetails = result.createdAttendance as AttendanceWithDetails;

      this.logger.log(`Davomat yozuvi yaratildi: O'quvchi ${attendanceDetails.student?.firstName}, Guruh ${attendanceDetails.group?.name}, Status: ${status}`);

      if (attendanceDetails.student?.parentPhone) {
        this.eventEmitter.emit(
          'attendance.created',
          new AttendanceCreatedEvent(
            attendanceDetails,
            attendanceDetails.student.parentPhone
          )
        );
        this.logger.log(`'attendance.created' hodisasi chiqarildi: O'quvchi ${attendanceDetails.student.firstName}`);
      } else {
        this.logger.warn(`Ota-ona telefoni topilmadi, 'attendance.created' hodisasi chiqarilmadi: O'quvchi ${attendanceDetails.student?.firstName}`);
      }
      return attendanceDetails;
    } catch (error: any) {
      this.logger.error("Davomat yozuvini yaratishda xatolik:", error.message, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException("Bu o'quvchi uchun ushbu sanada davomat allaqachon mavjud (P2002).");
      }
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Ichki xatolik tufayli davomat yozuvini yaratib bo'lmadi.");
    }
  }

  async findAll(queryDto: QueryAttendanceDto): Promise<{ data: AttendanceWithDetails[]; total: number }> {
    const {
      page = 1, limit = 100, sortBy = 'date', sortOrder = 'desc',
      filterByGroupId, filterByTeacherId, filterByStudentBusinessId,
      filterByStudentId, filterByStatus, filterByDate,
    } = queryDto;
    const skip = (page - 1) * limit;
    const where: Prisma.AttendanceWhereInput = {};

    if (filterByGroupId) where.groupId = filterByGroupId;
    if (filterByStatus) where.status = filterByStatus;
    if (filterByDate) {
      try {
        const parsedDate = new Date(filterByDate);
        if (isNaN(parsedDate.getTime())) this.logger.warn("Sana qiymati noto'g'ri (filterByDate):", filterByDate);
        else {
          const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0));
          const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1, 0, 0, 0, -1));
          where.date = { gte: startOfDay, lte: endOfDay };
        }
      } catch (e: any) {
        this.logger.warn("filterByDate uchun noto'g'ri format:", filterByDate, e.message);
      }
    }
    const studentWhere: Prisma.StudentWhereInput = {};
    if (filterByStudentBusinessId) studentWhere.studentId = { contains: filterByStudentBusinessId, mode: 'insensitive' };
    if (filterByStudentId) studentWhere.id = filterByStudentId;
    if (Object.keys(studentWhere).length > 0) where.student = studentWhere;
    const groupWhere: Prisma.GroupWhereInput = {};
    if (filterByTeacherId) groupWhere.teacherId = filterByTeacherId;
    if (Object.keys(groupWhere).length > 0) where.group = { ...(where.group as Prisma.GroupWhereInput), ...groupWhere };
    const allowedSortByFields = ['createdAt', 'updatedAt', 'date', 'status'];
    const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'date';
    const orderBy: Prisma.AttendanceOrderByWithRelationInput = { [safeSortBy]: sortOrder };

    try {
      const [attendances, total] = await this.prisma.$transaction([
        this.prisma.attendance.findMany({
          where, skip, take: limit, orderBy,
          include: {
            student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true } },
            group: { select: { id: true, groupId: true, name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
          },
        }),
        this.prisma.attendance.count({ where }),
      ]);
      return { data: attendances as AttendanceWithDetails[], total };
    } catch (error: any) {
      this.logger.error("Davomatlarni olishda xatolik:", error.message, error.stack);
      throw new InternalServerErrorException("Davomatlarni olib bo'lmadi.");
    }
  }

  async findOne(id: string): Promise<AttendanceWithDetails> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true } },
        group: { select: { id: true, groupId: true, name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!attendance) throw new NotFoundException(`"${id}" ID li davomat yozuvi topilmadi`);
    return attendance as AttendanceWithDetails;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto): Promise<AttendanceWithDetails> {
    const { status: newStatus, date: newDateStringFromDto } = updateAttendanceDto;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existingAttendance = await tx.attendance.findUnique({
          where: { id },
          include: {
            student: { select: { id: true, parentPhone: true, firstName: true, lastName: true, studentId: true } },
            group: { select: { id: true, name: true, groupId: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
          },
        });

        if (!existingAttendance) {
          throw new NotFoundException(`"${id}" ID li davomat yozuvi topilmadi.`);
        }

        const student = existingAttendance.student;
        const group = existingAttendance.group;

        if (!student || !group) {
          throw new InternalServerErrorException("Davomat yozuvi o'quvchi yoki guruhga to'liq ulanmagan.");
        }

        const updateData: Prisma.AttendanceUpdateInput = {};

        if (newStatus !== undefined && newStatus !== existingAttendance.status) {
          updateData.status = newStatus;
        }

        if (newDateStringFromDto) {
          let newDate: Date;
          try {
            const parsedDate = new Date(newDateStringFromDto);
            if (isNaN(parsedDate.getTime())) throw new Error('Yaroqsiz sana qiymati');
            newDate = new Date(Date.UTC(
              parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()
            ));
            updateData.date = newDate;

            const existingAttendance = await tx.attendance.findFirst({
              where: { studentId: student.id, groupId: group.id, date: newDate, NOT: { id } },
              select: { id: true },
            });
            if (existingAttendance) {
              throw new BadRequestException(
                `O'quvchi (${student.firstName} ${student.lastName}) uchun "${group.name || group.groupId}" guruhida ${formatDDMMYYYY(newDate)} sanasida davomat allaqachon kiritilgan.`
              );
            }
          } catch (e: any) {
            this.logger.warn(`Noto'g'ri sana formati qabul qilindi: ${newDateStringFromDto}`, e.message);
            throw new BadRequestException("Sana qiymati noto'g'ri formatda yoki yaroqsiz.");
          }
        }

        if (Object.keys(updateData).length === 0) {
          this.logger.log(`Davomat ID "${id}" uchun haqiqiy o'zgarishlar yo'q.`);
          return existingAttendance as AttendanceWithDetails;
        }

        const updatedAttendanceDb = await tx.attendance.update({
          where: { id },
          data: updateData,
          include: {
            student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true } },
            group: { select: { id: true, groupId: true, name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
          },
        });
        this.logger.log(`Davomat (ID: ${id}) yangilandi.`);
        return updatedAttendanceDb;
      });

      return result as AttendanceWithDetails;
    } catch (error: any) {
      this.logger.error(`Davomat yozuvini (ID: ${id}) yangilashda xatolik:`, error.message, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException("Bu o'quvchi uchun ushbu sanada davomat allaqachon mavjud.");
      }
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Ichki xatolik tufayli davomat yozuvini yangilab bo'lmadi.");
    }
  }

  async remove(id: string): Promise<AttendanceWithDetails> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const attendanceToDelete = await tx.attendance.findUnique({
          where: { id },
          include: {
            student: { select: { id: true, parentPhone: true, firstName: true, lastName: true, studentId: true } },
            group: {
              select: {
                id: true, name: true, groupId: true,
                teacher: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        });

        if (!attendanceToDelete) {
          throw new NotFoundException(`"${id}" ID li davomat yozuvi topilmadi.`);
        }
        if (!attendanceToDelete.student || !attendanceToDelete.group) {
          this.logger.error(`O'chiriladigan davomat (ID: ${id}) o'quvchi yoki guruhga to'liq ulanmagan.`);
          throw new InternalServerErrorException("O'chiriladigan davomat o'quvchi yoki guruhga ulanmaganligi sababli operatsiyalarni bajarib bo'lmadi.");
        }

        await tx.attendance.delete({ where: { id } });
        this.logger.log(`Davomat yozuvi (ID: ${id}) muvaffaqiyatli o'chirildi.`);
        return attendanceToDelete;
      });

      return result as AttendanceWithDetails;
    } catch (error: any) {
      this.logger.error("Davomatni o'chirishda xatolik:", error.message, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`"${id}" ID li davomat yozuvini o'chirish uchun topilmadi.`);
      }
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException("Davomatni o'chirishda ichki xatolik yuz berdi.");
    }
  }
}