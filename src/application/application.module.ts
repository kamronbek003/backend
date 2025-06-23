import { Module } from '@nestjs/common';
import { ApplicationsService } from './application.service';
import { ApplicationsController } from './application.controller';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationModule {}
