import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import {
  CreateSubmissionDto,
  GradeSubmissionDto,
  SubmissionQueryDto,
  SubmissionResponseDto,
  PaginatedSubmissionResponseDto,
} from './dto/submission.dto'; 
import { Prisma, Submission, SubmissionStatus } from '@prisma/client';

@Injectable()
export class SubmissionService {
  constructor(private prisma: PrismaService) {}

  private mapToResponseDtoWithRelations(
    submission: Submission & { 
      student?: { id: string, firstName: string, lastName: string }, 
      assignment?: { id: string, title: string, groupId: string, teacherId: string } 
    }
  ): SubmissionResponseDto {
      const response: SubmissionResponseDto = {
        id: submission.id,
        content: submission.content || undefined,
        fileUrl: submission.fileUrl || undefined,
        submittedAt: submission.submittedAt,
        grade: submission.grade === null ? undefined : submission.grade, 
        feedback: submission.feedback || undefined,
        status: submission.status,
        studentId: submission.studentId,
        assignmentId: submission.assignmentId,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      };

      if (submission.student) {
        response.student = { 
          id: submission.student.id,
          firstName: submission.student.firstName,
          lastName: submission.student.lastName,
        };
      }

      if (submission.assignment) {
        response.assignment = {
          id: submission.assignment.id,
          title: submission.assignment.title,
          groupId: submission.assignment.groupId,
          teacherId: submission.assignment.teacherId,
        };
      }
      return response;
  }

  private mapToResponseDto(submission: Submission): SubmissionResponseDto {
    return {
        id: submission.id,
        content: submission.content || undefined,
        fileUrl: submission.fileUrl || undefined,
        submittedAt: submission.submittedAt,
        grade: submission.grade === null ? undefined : submission.grade,
        feedback: submission.feedback || undefined,
        status: submission.status,
        studentId: submission.studentId,
        assignmentId: submission.assignmentId,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
    };
  }


  async create(
    assignmentId: string,
    studentId: string,
    createSubmissionDto: CreateSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    if (!createSubmissionDto.content && !createSubmissionDto.fileUrl) {
      throw new BadRequestException('Javob yuborish uchun matn (content) yoki fayl (fileUrl) taqdim etilishi shart.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { groupId: true } 
    });
    if (!assignment) {
      throw new NotFoundException(`IDsi ${assignmentId} bo'lgan vazifa topilmadi.`);
    }

    const student = await this.prisma.student.findUnique({ 
        where: { id: studentId },
    });
    if (!student) {
        throw new NotFoundException(`IDsi ${studentId} bo'lgan talaba topilmadi.`);
    }

    const existingSubmission = await this.prisma.submission.findUnique({
      where: {
        studentId_assignmentId: { 
          studentId: studentId,
          assignmentId: assignmentId,
        },
      },
    });
    if (existingSubmission) {
      throw new ConflictException(`Bu vazifaga ushbu talaba tomonidan javob allaqachon yuborilgan.`);
    }

    const newSubmission = await this.prisma.submission.create({
      data: {
        content: createSubmissionDto.content,
        fileUrl: createSubmissionDto.fileUrl,
        status: SubmissionStatus.YUBORILDI,
        student: { connect: { id: studentId } },
        assignment: { connect: { id: assignmentId } },
      },
      include: { 
          student: { select: { id: true, firstName: true, lastName: true } },
          assignment: { select: { id: true, title: true, groupId: true, teacherId: true } }
      }
    });

    return this.mapToResponseDtoWithRelations(newSubmission);
  }

  async findAll(queryDto: SubmissionQueryDto, callerTeacherId?: string, callerStudentId?: string): Promise<PaginatedSubmissionResponseDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'submittedAt',
      sortOrder = 'desc',   
      assignmentId, 
      studentId,    
      status,       
      groupId,      
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {};

    if (assignmentId) {
      where.assignmentId = assignmentId;
    }
    if (status) {
      where.status = status;
    }

    if (callerStudentId) {
        where.studentId = callerStudentId;
    } else if (studentId) { 
        where.studentId = studentId;
    }

    if (callerTeacherId) {
        where.assignment = { 
            teacherId: callerTeacherId,
        };
        if (groupId) { 
            where.assignment.groupId = groupId;
        }
    } else if (groupId) { 
         where.assignment = {
            groupId: groupId,
        };
    }

    const allowedSortFields = ['submittedAt', 'grade', 'status', 'createdAt', 'updatedAt'];
    const orderBy: Prisma.SubmissionOrderByWithRelationInput = 
        allowedSortFields.includes(sortBy) ? { [sortBy]: sortOrder } : { submittedAt: 'desc' };

    const [submissions, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { 
          student: { select: { id: true, firstName: true, lastName: true } }, 
          assignment: { select: { id: true, title: true, groupId: true, teacherId: true } } 
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: submissions.map(sub => this.mapToResponseDtoWithRelations(sub)), 
      total,
      limit,
      currentPage: page,
      totalPages,
    };
  }

  async findOneById(id: string): Promise<SubmissionResponseDto | null> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true, groupId: true, teacherId: true } }
      },
    });
    return submission ? this.mapToResponseDtoWithRelations(submission) : null;
  }
  
  async findOneOrFailById(id: string): Promise<SubmissionResponseDto> {
    const submissionDto = await this.findOneById(id);
    if (!submissionDto) {
      throw new NotFoundException(`IDsi ${id} bo'lgan javob topilmadi.`);
    }
    return submissionDto;
  }

  async grade(submissionId: string, gradeSubmissionDto: GradeSubmissionDto, teacherId: string): Promise<SubmissionResponseDto> {
    const submission = await this.prisma.submission.findUnique({
        where: {id: submissionId},
        select: { 
            status: true, 
            assignment: { select: { teacherId: true }}
        }
    });

    if (!submission) {
        throw new NotFoundException(`IDsi ${submissionId} bo'lgan javob topilmadi.`);
    }
    
    if (submission.assignment.teacherId !== teacherId) {
        throw new ForbiddenException("Siz bu javobni baholash huquqiga ega emassiz, chunki u sizning vazifangizga tegishli emas.");
    }

    const dataToUpdate: Prisma.SubmissionUpdateInput = { 
        grade: gradeSubmissionDto.grade,
        feedback: gradeSubmissionDto.feedback,
        status: gradeSubmissionDto.status,
     };

    if (gradeSubmissionDto.grade !== undefined && gradeSubmissionDto.status === undefined) {
      dataToUpdate.status = SubmissionStatus.BAHOLANDI;
    }

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: dataToUpdate,
      include: { 
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true, groupId: true, teacherId: true } }
      }
    });

    return this.mapToResponseDtoWithRelations(updatedSubmission);
  }

  async remove(id: string): Promise<SubmissionResponseDto> { 
    await this.findOneOrFailById(id); 
    
    const deletedSubmission = await this.prisma.submission.delete({
      where: { id },
    });
    return this.mapToResponseDto(deletedSubmission); 
  }

  async validateStudentCanAccessSubmission(studentId: string, submissionId: string): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        select: { studentId: true }
    });
    if (!submission) {
        throw new NotFoundException(`IDsi ${submissionId} bo'lgan javob topilmadi.`);
    }
    if (submission.studentId !== studentId) {
        throw new ForbiddenException("Siz ushbu javobni ko'rish/o'zgartirish huquqiga ega emassiz.");
    }
  }

  async validateTeacherCanAccessSubmission(teacherId: string, submissionId: string): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        select: { assignment: { select: { teacherId: true } } } 
    });
    if (!submission) {
        throw new NotFoundException(`IDsi ${submissionId} bo'lgan javob topilmadi.`);
    }
    if (!submission.assignment || submission.assignment.teacherId !== teacherId) {
        throw new ForbiddenException("Siz ushbu javobga kirish/uni baholash huquqiga ega emassiz.");
    }
  }

  async validateTeacherCanAccessAssignment(teacherId: string, assignmentId: string): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { teacherId: true } 
    });
    if (!assignment) {
        throw new NotFoundException(`IDsi ${assignmentId} bo'lgan vazifa topilmadi.`);
    }
    if (assignment.teacherId !== teacherId) {
        throw new ForbiddenException("Siz ushbu vazifaga kirish huquqiga ega emassiz.");
    }
  }
}
