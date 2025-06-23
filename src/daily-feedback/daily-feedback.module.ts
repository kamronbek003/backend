import { Module } from '@nestjs/common';
import { DailyFeedbackService } from './daily-feedback.service';
import { DailyFeedbackController } from './daily-feedback.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [DailyFeedbackController],
  providers: [DailyFeedbackService],
  exports: [DailyFeedbackService] 
})
export class DailyFeedbackModule {}