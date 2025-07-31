import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  Payment,
  Admin,
  Student,
  HistoryActionType,
  PaymentType,
} from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

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

type AdminInfo = Pick<Admin, 'id' | 'firstName' | 'lastName'> | null;

export interface PaymentWithDetails extends Payment {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    balance: number;
    parentPhone?: string | null;
    groups?: {
      id: string;
      groupId: string;
      name?: string | null;
    }[];
  } | null;
  group: {
    id: string;
    groupId: string;
    name?: string | null;
  } | null;
  createdByAdmin?: AdminInfo;
  updatedByAdmin?: AdminInfo;
}

export class PaymentCreatedEvent {
  constructor(
    public readonly paymentRecord: PaymentWithDetails,
    public readonly studentParentPhone: string | null | undefined,
  ) {}
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async _calculateStudentBalance(
    studentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const prismaClient = tx || this.prisma;
    const result = await prismaClient.payment.aggregate({
      where: { studentId },
      _sum: { summa: true },
    });
    return result._sum.summa || 0;
  }

  async create(
    createPaymentDto: CreatePaymentDto,
    adminId: string,
  ): Promise<PaymentWithDetails> {
    const {
      studentId,
      groupId,
      date,
      summa,
      paymentType,
      whichMonth,
      whichYear,
    } = createPaymentDto;

    const parsedDate = parseDDMMYYYY(date);
    if (!parsedDate) {
      throw new BadRequestException(
        'Sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        parentPhone: true,
        firstName: true,
        lastName: true,
        studentId: true,
      },
    });
    if (!student) {
      throw new BadRequestException(`"${studentId}" ID li o'quvchi topilmadi.`);
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, groupId: true, name: true },
    });
    if (!group) {
      throw new BadRequestException(`"${groupId}" ID li guruh topilmadi.`);
    }

    const adminExists = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (!adminExists) {
      throw new BadRequestException(`"${adminId}" ID li admin topilmadi.`);
    }

    try {
      const createdPaymentRecord = await this.prisma.$transaction(
        async (tx) => {
          const paymentData: Prisma.PaymentCreateInput = {
            summa,
            paymentType,
            date: parsedDate,
            whichMonth,
            whichYear,
            student: { connect: { id: studentId } },
            group: { connect: { id: groupId } },
            createdByAdmin: { connect: { id: adminId } },
            updatedByAdmin: { connect: { id: adminId } },
          };
          const newPayment = await tx.payment.create({ data: paymentData });

          const newBalance = await this._calculateStudentBalance(studentId, tx);

          await tx.paymentHistory.create({
            data: {
              paymentId: newPayment.id,
              adminId: adminId,
              action: HistoryActionType.YARATISH,
              details: {
                created: createPaymentDto,
                balanceChange: `+${summa}`,
                newBalance: newBalance,
              } as unknown as Prisma.JsonObject,
            },
          });

          return newPayment;
        },
      );

      const result = await this.findOne(createdPaymentRecord.id); // Line ~175

      if (result.student?.parentPhone) {
        this.eventEmitter.emit(
          'payment.created',
          new PaymentCreatedEvent(result, result.student.parentPhone),
        );
      }

      this.logger.log(
        `To'lov yaratildi (ID: ${result.id}) va Admin (ID: ${adminId}) tomonidan tarixga yozildi.`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        "To'lov yaratishda xatolik:",
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Ichki xatolik tufayli to'lov yaratib bo'lmadi.",
      );
    }
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    adminId: string,
  ): Promise<PaymentWithDetails> {
    const {
      studentId: newStudentUUID,
      groupId: newGroupId,
      date,
      summa: newSumma,
      paymentType: newPaymentType,
      whichMonth,
      whichYear,
    } = updatePaymentDto;

    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      include: { group: { select: { id: true, groupId: true, name: true } } },
    });

    if (!existingPayment) {
      throw new NotFoundException(`"${id}" ID li to'lov topilmadi.`);
    }
    const oldSumma = existingPayment.summa;
    const oldStudentUUID = existingPayment.studentId;
    const oldGroupId = existingPayment.groupId;

    const adminExists = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (!adminExists) {
      throw new BadRequestException(`"${adminId}" ID li admin topilmadi.`);
    }

    const updateData: Prisma.PaymentUpdateInput = {
      whichMonth,
      whichYear,
      updatedByAdmin: { connect: { id: adminId } },
    };

    if (date) {
      const parsedDate = parseDDMMYYYY(date);
      if (!parsedDate) {
        throw new BadRequestException(
          'Sana formati yoki qiymati noto‘g‘ri. DD-MM-YYYY formatidan foydalaning.',
        );
      }
      updateData.date = parsedDate;
    }

    if (newSumma !== undefined) updateData.summa = newSumma;

    if (newPaymentType !== undefined) updateData.paymentType = newPaymentType;

    if (newStudentUUID && newStudentUUID !== oldStudentUUID) {
      const newStudentExists = await this.prisma.student.findUnique({
        where: { id: newStudentUUID },
      });
      if (!newStudentExists) {
        throw new BadRequestException(
          `"${newStudentUUID}" ID li yangi o'quvchi topilmadi.`,
        );
      }
      updateData.student = { connect: { id: newStudentUUID } };
    }

    if (newGroupId && newGroupId !== oldGroupId) {
      const newGroupExists = await this.prisma.group.findUnique({
        where: { id: newGroupId },
        select: { id: true, groupId: true, name: true },
      });
      if (!newGroupExists) {
        throw new BadRequestException(`"${newGroupId}" ID li guruh topilmadi.`);
      }
      updateData.group = { connect: { id: newGroupId } };
    }

    const hasMeaningfulChanges =
      Object.keys(updateData).length > 2 ||
      (newPaymentType !== undefined &&
        newPaymentType !== existingPayment.paymentType) ||
      !!date ||
      (newSumma !== undefined && newSumma !== oldSumma) ||
      (newStudentUUID && newStudentUUID !== oldStudentUUID) ||
      (newGroupId && newGroupId !== oldGroupId);

    if (!hasMeaningfulChanges) {
      return this.findOne(id); // Line ~290
    }

    try {
      const updatedPayment = await this.prisma.$transaction(async (tx) => {
        const currentPayment = await tx.payment.update({
          where: { id },
          data: updateData,
        });

        let balanceChangeDescription = '';
        let oldStudentFinalBalance: number | undefined;
        let newStudentFinalBalance: number | undefined;

        if (newStudentUUID && newStudentUUID !== oldStudentUUID) {
          oldStudentFinalBalance = await this._calculateStudentBalance(
            oldStudentUUID,
            tx,
          );
          newStudentFinalBalance = await this._calculateStudentBalance(
            newStudentUUID,
            tx,
          );
          balanceChangeDescription = `To'lov boshqa o'quvchiga o'tkazildi. Eski o'quvchi (ID: ${oldStudentUUID}) yangi balansi: ${oldStudentFinalBalance}. Yangi o'quvchi (ID: ${newStudentUUID}) yangi balansi: ${newStudentFinalBalance}.`;
        } else {
          oldStudentFinalBalance = await this._calculateStudentBalance(
            oldStudentUUID,
            tx,
          );
          balanceChangeDescription = `O'quvchi (ID: ${oldStudentUUID}) balansi yangilandi. Yangi balans: ${oldStudentFinalBalance}.`;
        }

        await tx.paymentHistory.create({
          data: {
            paymentId: currentPayment.id,
            adminId: adminId,
            action: HistoryActionType.YANGILASH,
            details: {
              old: {
                summa: existingPayment.summa,
                date: existingPayment.date.toISOString(),
                paymentType: existingPayment.paymentType,
                studentId: existingPayment.studentId,
                groupId: existingPayment.groupId,
              },
              new: updatePaymentDto,
              balanceChanges: balanceChangeDescription,
              studentFinalBalance: oldStudentFinalBalance,
              ...(newStudentFinalBalance !== undefined && {
                newStudentFinalBalance: newStudentFinalBalance,
              }),
            } as unknown as Prisma.JsonObject,
          },
        });

        return currentPayment;
      });

      this.logger.log(`To'lov yangilandi (ID: ${updatedPayment.id})`);
      return this.findOne(updatedPayment.id); // Line ~349
    } catch (error: any) {
      this.logger.error(
        "To'lovni yangilashda xatolik:",
        error.message,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `"${id}" ID li to'lovni yangilash uchun topilmadi.`,
        );
      }
      throw new InternalServerErrorException(
        "Ichki xatolik tufayli to'lovni yangilab bo'lmadi.",
      );
    }
  }

  async remove(id: string, adminId: string): Promise<Payment> {
    const paymentToDelete = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            parentPhone: true,
          },
        },
      },
    });
    if (!paymentToDelete) {
      throw new NotFoundException(`"${id}" ID li to'lov topilmadi.`);
    }
    if (!paymentToDelete.student) {
      throw new InternalServerErrorException(
        "O'chiriladigan to'lov o'quvchiga ulanmagan.",
      );
    }
    const studentIdForBalance = paymentToDelete.studentId;
    const summaToRevert = paymentToDelete.summa;

    const adminExists = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!adminExists) {
      throw new BadRequestException(`Admin (ID: "${adminId}") topilmadi.`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentHistory.create({
          data: {
            paymentId: paymentToDelete.id,
            adminId: adminId,
            action: HistoryActionType.OCHIRISH,
            details: {
              deleted: {
                id: paymentToDelete.id,
                studentUUID: paymentToDelete.studentId,
                studentBusinessId: paymentToDelete.student?.studentId,
                studentFullName: `${paymentToDelete.student?.firstName} ${paymentToDelete.student?.lastName}`,
                summa: paymentToDelete.summa,
                date: paymentToDelete.date.toISOString(),
                paymentType: paymentToDelete.paymentType,
                createdAt: paymentToDelete.createdAt.toISOString(),
                balanceChange: `-${summaToRevert}`,
              },
            } as unknown as Prisma.JsonObject,
          },
        });
        await tx.payment.delete({ where: { id } });

        const newBalance = await this._calculateStudentBalance(
          studentIdForBalance,
          tx,
        );
        this.logger.log(
          `To'lov o'chirildi. O'quvchi (ID: ${studentIdForBalance}) balansi qayta hisoblandi. Yangi balans: ${newBalance}`,
        );
      });
      this.logger.log(`To'lov (ID: ${id}) o'chirildi va balans yangilandi.`);
      const { student, ...deletedPaymentData } = paymentToDelete;
      return deletedPaymentData as Payment;
    } catch (error: any) {
      this.logger.error(
        "To'lovni o'chirishda xatolik:",
        error.message,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`To'lov (ID: "${id}") topilmadi.`);
      }
      throw new InternalServerErrorException(
        "To'lovni o'chirishda ichki xatolik.",
      );
    }
  }

  // payments.service.ts

  async findAll(
    queryDto: QueryPaymentDto,
  ): Promise<{ data: PaymentWithDetails[]; total: number }> {
    // 1-TUZATISH: filterByYear va filterByMonth queryDto'dan olinmoqda
    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
      filterByName,
      filterByStudentBusinessId,
      filterByStudentId,
      filterByGroupBusinessId,
      filterByPaymentType,
      filterByDateFrom,
      filterByDateTo,
      filterByMinSumma,
      filterByMaxSumma,
      filterByYear, // <<< QO'SHILDI
      filterByMonth, // <<< QO'SHILDI
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: Prisma.PaymentWhereInput = {};

    if (filterByStudentId) where.studentId = filterByStudentId;
    if (filterByPaymentType) where.paymentType = filterByPaymentType;
    if (filterByGroupBusinessId) {
      where.group = {
        groupId: { contains: filterByGroupBusinessId, mode: 'insensitive' },
      };
    }

    if (!filterByStudentId) {
      const studentWhere: Prisma.StudentWhereInput = {};
      if (filterByStudentBusinessId) {
        studentWhere.studentId = {
          contains: filterByStudentBusinessId,
          mode: 'insensitive',
        };
      }
      if (filterByGroupBusinessId) {
        studentWhere.groups = {
          some: {
            groupId: { contains: filterByGroupBusinessId, mode: 'insensitive' },
          },
        };
      }
      if (filterByName) {
        studentWhere.OR = [
          { firstName: { contains: filterByName, mode: 'insensitive' } },
          { lastName: { contains: filterByName, mode: 'insensitive' } },
        ];
      }
      if (Object.keys(studentWhere).length > 0) {
        where.student = studentWhere;
      }
    }

    if (queryDto.groupId_in && queryDto.groupId_in.length > 0) {
      where.group = {
        id: {
          in: queryDto.groupId_in,
        },
      };
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filterByDateFrom) {
      const parsedFrom =
        parseDDMMYYYY(filterByDateFrom) || new Date(filterByDateFrom);
      if (!isNaN(parsedFrom.getTime())) dateFilter.gte = parsedFrom;
    }
    if (filterByDateTo) {
      let parsedTo = parseDDMMYYYY(filterByDateTo) || new Date(filterByDateTo);
      if (!isNaN(parsedTo.getTime())) {
        parsedTo = new Date(
          Date.UTC(
            parsedTo.getUTCFullYear(),
            parsedTo.getUTCMonth(),
            parsedTo.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        );
        dateFilter.lte = parsedTo;
      }
    }
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const summaFilter: Prisma.FloatFilter = {};
    if (filterByMinSumma !== undefined) summaFilter.gte = filterByMinSumma;
    if (filterByMaxSumma !== undefined) summaFilter.lte = filterByMaxSumma;
    if (Object.keys(summaFilter).length > 0) where.summa = summaFilter;

    // 2-TUZATISH: Yil va oy bo'yicha filtr shartlari `where` obyektiga qo'shilmoqda
    if (filterByYear) {
      where.whichYear = filterByYear; // `whichYear` - bu sizning Prisma schemangizdagi ustun nomi
    }
    if (filterByMonth) {
      where.whichMonth = filterByMonth; // `whichMonth` - bu sizning Prisma schemangizdagi ustun nomi
    }

    const allowedSortByFields = [
      'createdAt',
      'updatedAt',
      'date',
      'summa',
      'paymentType',
    ];
    const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'date';
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {
      [safeSortBy]: sortOrder,
    };

    try {
      const [payments, total] = await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                parentPhone: true,
                groups: { select: { id: true, groupId: true, name: true } },
              },
            },
            group: {
              select: { id: true, groupId: true, name: true },
            },
            createdByAdmin: {
              select: { id: true, firstName: true, lastName: true },
            },
            updatedByAdmin: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        this.prisma.payment.count({ where }),
      ]);

      const studentIds = [
        ...new Set(payments.map((p) => p.studentId).filter(Boolean)),
      ] as string[];
      if (studentIds.length === 0) {
        return { data: [], total };
      }

      const studentBalances = await this.prisma.payment.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds } },
        _sum: { summa: true },
      });

      const balanceMap = new Map<string, number>();
      studentBalances.forEach((b) => {
        balanceMap.set(b.studentId, b._sum.summa || 0);
      });

      const paymentsWithBalance = payments.map((payment) => {
        if (payment.student) {
          (payment.student as any).balance =
            balanceMap.get(payment.studentId) || 0;
        }
        return payment;
      });

      return { data: paymentsWithBalance as PaymentWithDetails[], total };
    } catch (error: any) {
      this.logger.error(
        "To'lovlarni qidirishda xatolik:",
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Ichki xatolik tufayli to'lovlarni olib bo'lmadi.",
      );
    }
  }

  async findOne(id: string): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            parentPhone: true,
            groups: { select: { id: true, groupId: true, name: true } },
          },
        },
        group: {
          select: { id: true, groupId: true, name: true },
        },
        createdByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
        updatedByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`"${id}" ID li to'lov topilmadi`);
    }

    if (payment.student) {
      const balance = await this._calculateStudentBalance(payment.studentId);
      (payment.student as any).balance = balance;
    }

    return payment as PaymentWithDetails;
  }
}
