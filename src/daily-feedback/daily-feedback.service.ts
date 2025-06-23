import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, DailyFeedback, Student } from '@prisma/client';
import { CreateDailyFeedbackDto } from './dto/create-daily-feedback.dto';
import { UpdateDailyFeedbackDto } from './dto/update-daily-feedback.dto';
import { QueryDailyFeedbackDto } from './dto/query-daily-feedback.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

function formatDDMMYYYY(dateInput: Date | string | null): string {
  if (!dateInput) return 'Noma\'lum sana';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Noto\'g\'ri sana formati';
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return 'Sana parse qilishda xatolik';
  }
}

export interface DailyFeedbackWithDetails extends DailyFeedback {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    parentPhone?: string | null;
    ball: number; 
  } | null;
  group: {
    id: string;
    groupId: string; 
    name?: string | null;
  } | null;
}

export class DailyFeedbackCreatedEvent {
  constructor(
    public readonly feedbackRecord: DailyFeedbackWithDetails, 
    public readonly studentParentPhone: string | null | undefined,
  ) {}
}

@Injectable()
export class DailyFeedbackService {
  private readonly logger = new Logger(DailyFeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createDailyFeedbackDto: CreateDailyFeedbackDto): Promise<DailyFeedbackWithDetails> {
    const { studentId, groupId, ball: feedbackBall, feedback, feedbackDate: feedbackDateString } = createDailyFeedbackDto;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, studentId: true, parentPhone: true, ball: true }, 
    });
    if (!student) {
      throw new BadRequestException(`"${studentId}" ID li o'quvchi topilmadi.`);
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, groupId: true },
    });
    if (!group) {
      throw new BadRequestException(`"${groupId}" ID li guruh topilmadi.`);
    }

    let parsedFeedbackDate: Date;
    if (feedbackDateString) {
        try {
            const parsed = new Date(feedbackDateString);
            if (isNaN(parsed.getTime())) throw new Error('Yaroqsiz sana');
            parsedFeedbackDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
        } catch (e) {
            this.logger.warn(`Fikr-mulohaza uchun noto'g'ri sana formati: ${feedbackDateString}`);
            throw new BadRequestException("Fikr-mulohaza sanasi yaroqsiz formatda.");
        }
    } else {
        const now = new Date();
        parsedFeedbackDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const createdFeedback = await tx.dailyFeedback.create({
          data: {
            student: { connect: { id: studentId } },
            group: { connect: { id: groupId } },
            ball: feedbackBall,
            feedback,
            feedbackDate: parsedFeedbackDate,
          },
        });

        const currentStudentBall = student.ball ?? 0;
        const newStudentTotalBall = currentStudentBall + feedbackBall;
        await tx.student.update({
          where: { id: studentId },
          data: { ball: newStudentTotalBall },
        });
        this.logger.log(`O'quvchi (ID: ${studentId}) umumiy bali ${feedbackBall} ga oshirildi. Yangi umumiy bal: ${newStudentTotalBall}`);

        return tx.dailyFeedback.findUniqueOrThrow({
            where: {id: createdFeedback.id},
            include: {
                student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true, ball: true } },
                group: { select: { id: true, groupId: true, name: true } },
            }
        });
      });

      const feedbackDetails = result as DailyFeedbackWithDetails;
      this.logger.log(`Yangi fikr-mulohaza yaratildi: O'quvchi ${student.firstName}, Guruh ${group.name}, Ball: ${feedbackBall}`);

      if (feedbackDetails.student?.parentPhone) {
        this.eventEmitter.emit(
          'dailyfeedback.created',
          new DailyFeedbackCreatedEvent(feedbackDetails, feedbackDetails.student.parentPhone),
        );
        this.logger.log(`'dailyfeedback.created' hodisasi chiqarildi: O'quvchi ${student.firstName}`);
      } else {
        this.logger.warn(`Ota-ona telefoni topilmadi, 'dailyfeedback.created' hodisasi chiqarilmadi: O'quvchi ${student.firstName}`);
      }

      return feedbackDetails;
    } catch (error: any) {
      this.logger.error("Fikr-mulohaza yaratishda xatolik:", error.message, error.stack);
      throw new InternalServerErrorException("Ichki xatolik tufayli fikr-mulohaza yaratib bo'lmadi.");
    }
  }

  async findAll(queryDto: QueryDailyFeedbackDto): Promise<{ data: DailyFeedbackWithDetails[]; total: number }> {
    const { page = 1, limit = 10, studentId, groupId, date, sortBy = 'feedbackDate', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;
    const where: Prisma.DailyFeedbackWhereInput = {};
    if (studentId) where.studentId = studentId;
    if (groupId) where.groupId = groupId;
    if (date) {
        try {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) throw new Error('Yaroqsiz sana');
            const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
            const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1, 0, 0, 0, -1));
            where.feedbackDate = { gte: startOfDay, lte: endOfDay };
        } catch (e) { this.logger.warn(`findAll uchun noto'g'ri sana formati: ${date}`); }
    }
    const orderBy: Prisma.DailyFeedbackOrderByWithRelationInput = { [sortBy]: sortOrder };

    try {
      const [feedbacks, total] = await this.prisma.$transaction([
        this.prisma.dailyFeedback.findMany({
          where, skip, take: limit, orderBy,
          include: {
            student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true, ball: true } },
            group: { select: { id: true, groupId: true, name: true } },
          },
        }),
        this.prisma.dailyFeedback.count({ where }),
      ]);
      return { data: feedbacks as DailyFeedbackWithDetails[], total };
    } catch (error: any) {
      this.logger.error("Fikr-mulohazalarni olishda xatolik:", error.message, error.stack);
      throw new InternalServerErrorException("Ichki xatolik tufayli fikr-mulohazalarni olib bo'lmadi.");
    }
  }

  async findOne(id: string): Promise<DailyFeedbackWithDetails> {
    const feedback = await this.prisma.dailyFeedback.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true, ball: true } },
        group: { select: { id: true, groupId: true, name: true } },
      },
    });
    if (!feedback) {
      throw new NotFoundException(`"${id}" ID li fikr-mulohaza topilmadi.`);
    }
    return feedback as DailyFeedbackWithDetails;
  }

  async update(id: string, updateDailyFeedbackDto: UpdateDailyFeedbackDto): Promise<DailyFeedbackWithDetails> {
    const { ball: newFeedbackBall, feedback: newFeedbackText, feedbackDate: feedbackDateString } = updateDailyFeedbackDto;

    const existingFeedback = await this.prisma.dailyFeedback.findUnique({
      where: {id},
      include: { student: { select: { id: true, ball: true, parentPhone: true, firstName: true, lastName: true, studentId: true } } } // student.ball ni olamiz
    });
    if (!existingFeedback) {
        throw new NotFoundException(`"${id}" ID li fikr-mulohaza topilmadi.`);
    }
    if (!existingFeedback.student) {
        this.logger.error(`Fikr-mulohaza (ID: ${id}) o'quvchiga ulanmagan. Balansni yangilab bo'lmaydi.`);
        throw new InternalServerErrorException("Fikr-mulohaza o'quvchiga ulanmagan.");
    }

    const oldFeedbackBall = existingFeedback.ball;
    const studentId = existingFeedback.studentId;
    const currentStudentTotalBall = existingFeedback.student.ball ?? 0;

    const updateData: Prisma.DailyFeedbackUpdateInput = {};
    if (newFeedbackBall !== undefined) updateData.ball = newFeedbackBall;
    if (newFeedbackText !== undefined) updateData.feedback = newFeedbackText;
    if (feedbackDateString) {
        try {
            const parsed = new Date(feedbackDateString);
            if (isNaN(parsed.getTime())) throw new Error('Yaroqsiz sana');
            updateData.feedbackDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
        } catch (e) {
            this.logger.warn(`Fikr-mulohaza yangilash uchun noto'g'ri sana formati: ${feedbackDateString}`);
            throw new BadRequestException("Fikr-mulohaza sanasi yaroqsiz formatda.");
        }
    }
    
    if (Object.keys(updateData).length === 0) {
        this.logger.log(`Fikr-mulohaza (ID: ${id}) uchun o'zgarishlar yo'q.`);
        return this.findOne(id);
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedFeedback = await tx.dailyFeedback.update({
          where: { id },
          data: updateData,
        });

        if (newFeedbackBall !== undefined && newFeedbackBall !== oldFeedbackBall) {
          const ballDifference = newFeedbackBall - oldFeedbackBall;
          const newStudentTotalBall = currentStudentTotalBall + ballDifference;
          await tx.student.update({
            where: { id: studentId },
            data: { ball: newStudentTotalBall },
          });
          this.logger.log(`O'quvchi (ID: ${studentId}) umumiy bali ${ballDifference > 0 ? '+' : ''}${ballDifference} ga o'zgartirildi. Yangi umumiy bal: ${newStudentTotalBall}`);
        }

        return tx.dailyFeedback.findUniqueOrThrow({
            where: {id: updatedFeedback.id},
            include: {
                student: { select: { id: true, studentId: true, firstName: true, lastName: true, parentPhone: true, ball: true } },
                group: { select: { id: true, groupId: true, name: true } },
            }
        });
      });

      const feedbackDetails = result as DailyFeedbackWithDetails;
      this.logger.log(`Fikr-mulohaza (ID: ${id}) muvaffaqiyatli yangilandi.`);
      return feedbackDetails;
    } catch (error: any) {
      this.logger.error(`Fikr-mulohazani (ID: ${id}) yangilashda xatolik:`, error.message, error.stack);
      throw new InternalServerErrorException("Ichki xatolik tufayli fikr-mulohazani yangilab bo'lmadi.");
    }
  }

  async remove(id: string): Promise<DailyFeedback> {
    const feedbackToDelete = await this.prisma.dailyFeedback.findUnique({
      where: {id},
      include: { student: { select: { id: true, ball: true } } }
    });
    if (!feedbackToDelete) {
        throw new NotFoundException(`"${id}" ID li fikr-mulohaza topilmadi.`);
    }
    if (!feedbackToDelete.student) {
        this.logger.error(`O'chiriladigan fikr-mulohaza (ID: ${id}) o'quvchiga ulanmagan. Balansni o'zgartirib bo'lmaydi.`);
        return this.prisma.dailyFeedback.delete({ where: { id } });
    }

    const feedbackBallToRemove = feedbackToDelete.ball;
    const studentId = feedbackToDelete.studentId;
    const currentStudentTotalBall = feedbackToDelete.student.ball ?? 0;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const newStudentTotalBall = currentStudentTotalBall - feedbackBallToRemove;
        await tx.student.update({
          where: { id: studentId },
          data: { ball: newStudentTotalBall },
        });
        this.logger.log(`O'quvchi (ID: ${studentId}) umumiy bali ${feedbackBallToRemove} ga kamaytirildi (fikr-mulohaza o'chirilishi). Yangi umumiy bal: ${newStudentTotalBall}`);

        return tx.dailyFeedback.delete({
          where: { id },
        });
      });

      this.logger.log(`Fikr-mulohaza (ID: ${id}) muvaffaqiyatli o'chirildi va o'quvchi bali yangilandi.`);
      return result;
    } catch (error: any) {
      this.logger.error(`Fikr-mulohazani (ID: ${id}) o'chirishda xatolik:`, error.message, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`"${id}" ID li fikr-mulohaza o'chirish uchun topilmadi.`);
      }
      throw new InternalServerErrorException("Ichki xatolik tufayli fikr-mulohazani o'chirib bo'lmadi.");
    }
  }
}