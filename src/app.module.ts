import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { PrismaModule } from './prisma/prisma.module';
import { GroupModule } from './group/group.module';
import { PaymentModule } from './payment/payment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NoteModule } from './note/note.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './statistics/statistics.module';
import { PaymentHistoryModule } from './payment-history/payment-history.module';
import { ConfigModule } from '@nestjs/config';
import { AssignmentModule } from './assignment/assignment.module';
import { SubmissionModule } from './submission/submission.module';
import { CoursesModule } from './course/course.module';
import { ApplicationModule } from './application/application.module';
import { ApplyBotModule } from './apply-bot/apply-bot.module';
import { ParentBotModule } from './parent-bot/parent-bot.module';
import { DailyFeedbackModule } from './daily-feedback/daily-feedback.module';
import { SalaryModule } from './salary/salary.module';

@Module({
  imports: [ EventEmitterModule.forRoot(),TeacherModule, StudentModule, PrismaModule, GroupModule, PaymentModule, AttendanceModule, NoteModule, AuthModule, StatsModule, PaymentHistoryModule, CoursesModule,
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env', 
    }),
    AssignmentModule,
    SubmissionModule,
    CoursesModule,
    ApplicationModule,
    ApplyBotModule,
    ParentBotModule,
    DailyFeedbackModule,
    SalaryModule,
   ],
  controllers: [],
  providers: [],
})
export class AppModule {}
