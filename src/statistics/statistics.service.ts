import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Status, teacherStatus as TeacherStatusEnum } from '@prisma/client';
import { subDays, subMonths, getYear, getMonth, format } from 'date-fns'; 
import { uz } from 'date-fns/locale'; 

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  private readonly monthOrderMap: { [key: string]: number } = {
    "Yanvar": 0, "Fevral": 1, "Mart": 2, "Aprel": 3, "May": 4, "Iyun": 5,
    "Iyul": 6, "Avgust": 7, "Sentyabr": 8, "Oktyabr": 9, "Noyabr": 10, "Dekabr": 11,
  };
  private readonly monthNamesUz = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
  ];

  constructor(private readonly prisma: PrismaService) {}

  async getCounts() {
    this.logger.log('Statistik hisob-kitoblarni olish (getCounts)...');
    try {
      const currentStudentCount = await this.prisma.student.count({
        where: { status: Status.FAOL },
      });
      const currentGroupCount = await this.prisma.group.count({
        where: { status: Status.FAOL },
      });
      const currentTeacherCount = await this.prisma.teacher.count({
      });

      const latestStatsRecord = await this.prisma.monthlyStatistics.findFirst({
        orderBy: [
          { whichYear: 'desc' },
        ],
      });
      
      const fallbackMultiplier = 0.98;

      const previousStudentCount = latestStatsRecord
        ? latestStatsRecord.monthlyStudents
        : Math.round(currentStudentCount * fallbackMultiplier);

      const previousGroupCount = latestStatsRecord
        ? latestStatsRecord.monthlyGroups
        : Math.round(currentGroupCount * fallbackMultiplier);
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      const previousTeacherCount = await this.prisma.teacher.count({ 
        where: { createdAt: { lte: thirtyDaysAgo } },
      });

      return {
        studentCount: { current: currentStudentCount, previous: previousStudentCount },
        groupCount: { current: currentGroupCount, previous: previousGroupCount },
        teacherCount: { current: currentTeacherCount, previous: previousTeacherCount }, 
      };
    } catch (error) {
      this.logger.error(`getCounts xatoligi: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentsSum(dateFromString?: string) {
    this.logger.log(`To'lovlar summasini olish (getPaymentsSum). dateFrom: ${dateFromString}`);
    const now = new Date();
    let currentPeriodStartDate: Date;

    if (dateFromString) {
      currentPeriodStartDate = new Date(dateFromString);
      if (isNaN(currentPeriodStartDate.getTime())) {
        this.logger.warn('getPaymentsSum: `dateFrom` yaroqsiz sana, 30 kun oldingi sanaga o\'zgartirildi.');
        currentPeriodStartDate = subDays(now, 30);
      }
    } else {
      currentPeriodStartDate = subDays(now, 30);
    }
    
    const currentPeriodEndDate = now;
    const durationMs = currentPeriodEndDate.getTime() - currentPeriodStartDate.getTime();
    const durationDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));

    const previousPeriodEndDate = subDays(currentPeriodStartDate, 1);
    const previousPeriodStartDate = subDays(previousPeriodEndDate, durationDays -1 );


    try {
      const currentSumResult = await this.prisma.payment.aggregate({
        _sum: { summa: true }, 
        where: {
          date: { 
            gte: currentPeriodStartDate,
            lte: currentPeriodEndDate,
          },
        },
      });

      const previousSumResult = await this.prisma.payment.aggregate({
        _sum: { summa: true },
        where: {
          date: {
            gte: previousPeriodStartDate,
            lte: previousPeriodEndDate,
          },
        },
      });

      return {
        totalSum: {
          current: currentSumResult._sum.summa || 0,
          previous: previousSumResult._sum.summa || 0,
        },
      };
    } catch (error) {
      this.logger.error(`getPaymentsSum xatoligi: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStudentTrend() {
    this.logger.log('Talabalar soni dinamikasini olish (getStudentTrend)...');
    try {
      const allStats = await this.prisma.monthlyStatistics.findMany({
      });

      if (allStats.length === 0) {
        this.logger.warn('getStudentTrend: MonthlyStatistics jadvalida ma\'lumot topilmadi. O\'tgan oy uchun joriy ma\'lumotlar yozishga harakat qilinadi...');

        const currentActiveStudents = await this.prisma.student.count({
          where: { status: Status.FAOL }, 
        });

        const now = new Date();
        const previousMonthDate = subMonths(now, 1);
        const previousYearString = getYear(previousMonthDate).toString();
        const previousMonthIndex = getMonth(previousMonthDate); // 0-11
        const previousMonthName = this.monthNamesUz[previousMonthIndex];

        if (currentActiveStudents > 0) {
          this.logger.log(`Joriy FAOL talabalar soni: ${currentActiveStudents}. O'tgan oy (${previousMonthName} ${previousYearString}) uchun yoziladi.`);
          try {
            const newStatEntry = await this.prisma.monthlyStatistics.create({
              data: {
                whichYear: previousYearString,
                whichMonth: previousMonthName,
                monthlyStudents: currentActiveStudents,
                monthlyPayment: 0,
                monthlyGroups: 0,  
              },
            });
            this.logger.log(`Yangi statistika yozuvi ${previousYearString}-${previousMonthName} uchun ${currentActiveStudents} talaba bilan muvaffaqiyatli yaratildi.`);
            return { data: [{ month: previousMonthName, count: currentActiveStudents }] };
          } catch (createError) {
            this.logger.error(`MonthlyStatistics jadvaliga yozishda xatolik: ${createError.message}`, createError.stack);
            return { data: [] };
          }
        } else {
          this.logger.warn('getStudentTrend: Joriy FAOL talabalar mavjud emas. MonthlyStatistics jadvaliga yozilmadi.');
          return { data: [] };
        }
      }
      
      const sortedTrendData = allStats
        .map(stat => ({
          year: parseInt(stat.whichYear),
          monthIndex: this.monthOrderMap[stat.whichMonth],
          monthName: stat.whichMonth,
          count: stat.monthlyStudents,
        }))
        .filter(stat => typeof stat.monthIndex === 'number') 
        .sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year; 
          }
          return a.monthIndex - b.monthIndex; 
        })
        .slice(-6) 
        .map(d => ({ month: d.monthName, count: d.count })); 
      return { data: sortedTrendData };

    } catch (error) {
      this.logger.error(`getStudentTrend metodida kutilmagan xatolik: ${error.message}`, error.stack);
      throw error; 
    }
  }
}