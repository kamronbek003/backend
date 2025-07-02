import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Status, Student, Group, Payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDebtorDto } from './dto/query-debtor.dto';

const monthStatusMap: { [key: string]: number } = { YANVAR: 1, FEVRAL: 2, MART: 3, APREL: 4, MAY: 5, IYUN: 6, IYUL: 7, AVGUST: 8, SENTABR: 9, OKTABR: 10, NOYABR: 11, DEKABR: 12 };

// DebtorStudent type'iga groupBreakdown qo'shildi
export type DebtorStudent = Student & {
  debtAmount: number;
  monthlyRateBeforeDiscount: number;
  monthlyExpectedPayment: number;
  monthlyDiscountAmount: number;
  totalPaid: number;
  monthsActive: number;
  debtorMonths: { 
    month: string; 
    year: number; 
    expectedPayment: string; 
    paidAmount: string; 
    debtAmount: string;
    groupBreakdown: { groupName: string; coursePrice: number; }[];
  }[];
  groupDetails: { id: string; name: string; coursePrice: number; }[];
};

function parseEnvDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  const parts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!parts) return null;
  return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
}

@Injectable()
export class DebtorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findDebtors(queryDto: QueryDebtorDto): Promise<{ data: DebtorStudent[], total: number }> {
    const { 
        page = 1,
        limit = 10,
        filterByName, 
        filterByStudentId, 
        filterByMonth, 
        filterByYear, 
        filterByGroupId,
        filterByTeacherId,
    } = queryDto;

    const skip = (page - 1) * limit;

    if ((filterByMonth && !filterByYear) || (!filterByMonth && filterByYear)) {
        throw new BadRequestException("Oy va yil bo'yicha filtrlash uchun ikkala qiymat ham kiritilishi shart.");
    }
    
    const whereConditions: Prisma.StudentWhereInput[] = [{ status: 'FAOL' }];
    if (filterByName) whereConditions.push({ OR: [{ firstName: { contains: filterByName, mode: 'insensitive' } }, { lastName: { contains: filterByName, mode: 'insensitive' } }] });
    if (filterByStudentId) whereConditions.push({ studentId: { contains: filterByStudentId, mode: 'insensitive' } });
    if (filterByGroupId) whereConditions.push({ groups: { some: { id: filterByGroupId } } });
    if (filterByTeacherId) whereConditions.push({ groups: { some: { teacherId: filterByTeacherId } } });

    const where: Prisma.StudentWhereInput = { AND: whereConditions };

    try {
        const [students, total] = await this.prisma.$transaction([
            this.prisma.student.findMany({ where, skip, take: Number(limit), include: { groups: true, payments: true } }),
            this.prisma.student.count({ where })
        ]);

        const processedDebtors: DebtorStudent[] = [];
        const systemStartDate = parseEnvDate(this.configService.get<string>('WHEN_STARTED'));

        for (const student of students) {
            const studentStartDate = student.whenCome || student.createdAt;
            if (!studentStartDate || !student.groups?.length) continue;

            let effectiveStartDate = studentStartDate;
            if (systemStartDate && studentStartDate < systemStartDate) {
                effectiveStartDate = systemStartDate;
            }
            
            if (filterByYear && filterByMonth) {
                const filterDate = new Date(filterByYear, filterByMonth - 1, 1);
                if (filterDate < effectiveStartDate && filterDate.getMonth() !== effectiveStartDate.getMonth()) continue;
            }
            
            const monthlyRateFromGroups = student.groups.reduce((sum, group) => sum + (group.coursePrice || 0), 0);
            if (monthlyRateFromGroups === 0) continue;
            
            const discountPercentage = student.discount || 0;
            const monthlyDiscountAmount = monthlyRateFromGroups * (discountPercentage / 100);
            const monthlyExpectedPayment = monthlyRateFromGroups - monthlyDiscountAmount;
            
            const paymentsByMonthYear = student.payments.reduce((acc, p) => {
                if (p.whichMonth && p.whichYear) acc[`${p.whichYear}-${monthStatusMap[p.whichMonth]}`] = (acc[`${p.whichYear}-${monthStatusMap[p.whichMonth]}`] || 0) + p.summa;
                return acc;
            }, {} as Record<string, number>);

            const monthsActive = this._calculateMonthsActive(effectiveStartDate);
            const monthYearList = this._getMonthYearList(effectiveStartDate, monthsActive);
            let totalDebt = 0;
            const debtorMonths: DebtorStudent['debtorMonths'] = [];

            if (filterByMonth && filterByYear) {
                const paidAmount = paymentsByMonthYear[`${filterByYear}-${filterByMonth}`] || 0;
                const debtForMonth = monthlyExpectedPayment - paidAmount;
                if (debtForMonth > 1) {
                    totalDebt = debtForMonth;
                    // FIX: Aniq oy bo'yicha filter qilinganda ham debtorMonths massivini to'ldirish
                    debtorMonths.push({
                        month: Object.keys(monthStatusMap).find(key => monthStatusMap[key] === filterByMonth) || '',
                        year: filterByYear,
                        expectedPayment: monthlyExpectedPayment.toFixed(2),
                        paidAmount: paidAmount.toFixed(2),
                        debtAmount: debtForMonth.toFixed(2),
                        groupBreakdown: student.groups.map(g => ({ groupName: g.name || g.groupId, coursePrice: g.coursePrice || 0 }))
                    });
                }
            } else {
                for (const { month, year, monthName } of monthYearList) {
                    const paidAmount = paymentsByMonthYear[`${year}-${month}`] || 0;
                    const debtForMonth = monthlyExpectedPayment - paidAmount;
                    if (debtForMonth > 1) {
                        totalDebt += debtForMonth;
                        // FIX: groupBreakdown ma'lumotini qo'shish
                        debtorMonths.push({
                            month: monthName,
                            year,
                            expectedPayment: monthlyExpectedPayment.toFixed(2),
                            paidAmount: paidAmount.toFixed(2),
                            debtAmount: debtForMonth.toFixed(2),
                            groupBreakdown: student.groups.map(g => ({ groupName: g.name || g.groupId, coursePrice: g.coursePrice || 0 }))
                        });
                    }
                }
            }

            if (totalDebt > 1) {
                processedDebtors.push({
                    ...student,
                    debtAmount: parseFloat(totalDebt.toFixed(2)),
                    monthlyRateBeforeDiscount: parseFloat(monthlyRateFromGroups.toFixed(2)),
                    monthlyExpectedPayment: parseFloat(monthlyExpectedPayment.toFixed(2)),
                    monthlyDiscountAmount: parseFloat(monthlyDiscountAmount.toFixed(2)),
                    totalPaid: student.payments.reduce((sum, p) => sum + p.summa, 0),
                    monthsActive,
                    debtorMonths,
                    groupDetails: student.groups.map(g => ({ id: g.id, name: g.name || g.groupId, coursePrice: g.coursePrice || 0 })),
                });
            }
        }
        
        return { 
            data: processedDebtors.sort((a, b) => b.debtAmount - a.debtAmount), 
            total 
        };

    } catch (error) {
        if (error instanceof BadRequestException) throw error;
        console.error("Qarzdorlarni topishda xato:", error);
        throw new InternalServerErrorException("Serverda qarzdorlarni aniqlashda xatolik yuz berdi.");
    }
  }
  
  async findOneDebtorDetails(studentId: string): Promise<DebtorStudent | null> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, include: { groups: true, payments: true } });
    if (!student) return null;
    
    if (student.status !== 'FAOL' || !student.groups?.length) {
        return { ...student, debtAmount: 0, debtorMonths: [], totalPaid: student.payments.reduce((sum, p) => sum + p.summa, 0), monthlyExpectedPayment: 0, monthlyRateBeforeDiscount: 0, monthlyDiscountAmount: 0, monthsActive: 0, groupDetails: student.groups.map(g => ({ id: g.id, name: g.name || g.groupId, coursePrice: g.coursePrice || 0 })) };
    }

    const systemStartDate = parseEnvDate(this.configService.get<string>('WHEN_STARTED'));
    const studentStartDate = student.whenCome || student.createdAt;
    let effectiveStartDate = studentStartDate;
    if (systemStartDate && studentStartDate < systemStartDate) effectiveStartDate = systemStartDate;
    
    const monthlyRate = student.groups.reduce((sum, g) => sum + (g.coursePrice || 0), 0);
    const expectedPayment = monthlyRate * (1 - (student.discount || 0) / 100);

    const paymentsByMonth = student.payments.reduce((acc, p) => {
        if (p.whichMonth && p.whichYear) acc[`${p.whichYear}-${monthStatusMap[p.whichMonth]}`] = (acc[`${p.whichYear}-${monthStatusMap[p.whichMonth]}`] || 0) + p.summa;
        return acc;
    }, {} as Record<string, number>);

    const monthsActive = this._calculateMonthsActive(effectiveStartDate);
    const monthYearList = this._getMonthYearList(effectiveStartDate, monthsActive);
    let totalDebt = 0;
    const debtorMonths: DebtorStudent['debtorMonths'] = []; 

    for (const { month, year, monthName } of monthYearList) {
        const paidAmount = paymentsByMonth[`${year}-${month}`] || 0;
        const debtForMonth = expectedPayment - paidAmount;
        if (debtForMonth > 1) {
            totalDebt += debtForMonth;
            // FIX: groupBreakdown ma'lumotini qo'shish
            debtorMonths.push({ month: monthName, year, expectedPayment: expectedPayment.toFixed(2), paidAmount: paidAmount.toFixed(2), debtAmount: debtForMonth.toFixed(2), groupBreakdown: student.groups.map(g => ({ groupName: g.name || g.groupId, coursePrice: g.coursePrice || 0 })) });
        }
    }

    return {
        ...student,
        debtAmount: parseFloat(totalDebt.toFixed(2)),
        monthlyRateBeforeDiscount: parseFloat(monthlyRate.toFixed(2)),
        monthlyExpectedPayment: parseFloat(expectedPayment.toFixed(2)),
        monthlyDiscountAmount: parseFloat((monthlyRate - expectedPayment).toFixed(2)),
        totalPaid: student.payments.reduce((sum, p) => sum + p.summa, 0),
        monthsActive,
        debtorMonths,
        groupDetails: student.groups.map(g => ({ id: g.id, name: g.name || g.groupId, coursePrice: g.coursePrice || 0 })),
    };
  }

  private _calculateMonthsActive(startDate: Date): number {
    const currentDate = new Date();
    if (isNaN(startDate.getTime())) return 0;
    let totalMonths = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
    if (currentDate.getDate() >= startDate.getDate()) totalMonths += 1;
    return totalMonths <= 0 ? 1 : totalMonths;
  }

  private _getMonthYearList(startDate: Date, totalMonths: number): { month: number; year: number; monthName: string }[] {
    if (isNaN(startDate.getTime())) return [];
    const months: { month: number; year: number; monthName: string }[] = [];
    const monthNames = Object.keys(monthStatusMap);
    for (let i = 0; i < totalMonths; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push({ month: date.getMonth() + 1, year: date.getFullYear(), monthName: monthNames[date.getMonth()] });
    }
    return months;
  }
}