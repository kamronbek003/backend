import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMonitoringDto } from './dto/query-monitoring.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeachersSummary(query: QueryMonitoringDto) {
    const { page = 1, limit = 15, name, subject } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TeacherWhereInput = {};
    if (name) {
      where.OR = [
        { firstName: { contains: name, mode: 'insensitive' } },
        { lastName: { contains: name, mode: 'insensitive' } },
      ];
    }
    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }
    
    // Avval filtirlangan o'qituvchilarni va ularning umumiy sonini olamiz
    const [teachers, totalTeachers] = await this.prisma.$transaction([
        this.prisma.teacher.findMany({ where, skip, take: limit }),
        this.prisma.teacher.count({ where }),
    ]);
    
    // Har bir o'qituvchi uchun statistikasini hisoblaymiz
    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const groups = await this.prisma.group.findMany({
          where: { teacherId: teacher.id },
          select: { students: { where: { status: 'FAOL' }, select: { id: true } } },
        });

        // Faol o'quvchilar soni
        const activeStudentsCount = groups.flatMap(group => group.students).length;
        
        // Jami o'quvchilar soni (barcha statusdagi)
        const totalStudentsCountResult = await this.prisma.student.count({
            where: {
                groups: {
                    some: {
                        teacherId: teacher.id,
                    },
                },
            },
        });

        return {
          ...teacher,
          totalStudents: totalStudentsCountResult,
          activeStudentsCount,
        };
      }),
    );
    
    return { data: teachersWithStats, total: totalTeachers };
  }


  // 2. Bitta o'qituvchining batafsil statistikasini olish
  async getTeacherDetails(teacherId: string) {
    // O'qituvchi mavjudligini tekshirish
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`O'qituvchi topilmadi (ID: ${teacherId})`);
    }

    // O'qituvchiga tegishli guruhlarni topamiz
    const groups = await this.prisma.group.findMany({
      where: { teacherId: teacherId },
      include: {
        students: true, // Guruhdagi barcha o'quvchilar ma'lumotini olamiz
      },
    });

    // Barcha o'quvchilarni bitta ro'yxatga yig'amiz (dublikatlarni olib tashlaymiz)
    const studentMap = new Map();
    groups.forEach(group => {
        group.students.forEach(student => {
            studentMap.set(student.id, student);
        });
    });
    const allStudents = Array.from(studentMap.values());

    // Statistikalarni hisoblaymiz
    let activeStudentCount = 0;
    let inactiveStudentCount = 0;
    const inactiveReasonsMap = new Map<string, { count: number; students: { id: string; firstName: string; lastName: string; phone: string; }[] }>(); // Nofaollik sabablarini va o'quvchilarni saqlash uchun

    allStudents.forEach(student => {
      if (student.status === 'FAOL') {
        activeStudentCount++;
      } else if (student.status === 'NOFAOL') {
        inactiveStudentCount++;
        const reason = student.whyStop || 'Sabab ko\'rsatilmagan';
        
        if (!inactiveReasonsMap.has(reason)) {
            inactiveReasonsMap.set(reason, { count: 0, students: [] });
        }
        const reasonEntry = inactiveReasonsMap.get(reason);
        if (reasonEntry) {
            reasonEntry.count++;
            reasonEntry.students.push({
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                phone: student.phone,
            });
        }
      }
    });

    return {
      teacher,
      stats: {
        totalStudents: allStudents.length,
        activeStudentCount,
        inactiveStudentCount,
        // Nofaollik sabablarini va o'quvchilarni chiroyli formatga o'tkazish
        inactiveReasons: Array.from(inactiveReasonsMap.entries()).map(([reason, data]) => ({
          reason,
          count: data.count,
          students: data.students, // Nofaol o'quvchilar ro'yxati
        })),
      },
      students: allStudents.map(student => { // Barcha o'quvchilar ro'yxatini ham qaytaramiz
          // Guruh nomini olish (agar mavjud bo'lsa)
          const studentGroups = groups.filter(group => group.students.some(s => s.id === student.id));
          const groupName = studentGroups.length > 0
              ? (studentGroups[0].name || studentGroups[0].groupId || 'Noma\'lum guruh')
              : 'Guruhsiz';

          return {
              id: student.id,
              studentId: student.studentId,
              firstName: student.firstName,
              lastName: student.lastName,
              phone: student.phone,
              status: student.status, // 'FAOL' yoki 'NOFAOL'
              whyStop: student.whyStop, // Nofaol bo'lsa sababi
              groupName: groupName, // O'quvchining guruh nomi
          };
      }),
    };
  }
}
