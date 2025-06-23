import { Module } from '@nestjs/common';
import { StatsService } from './statistics.service';
import { StatsController } from './statistics.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
