import { Module } from '@nestjs/common';
import { ParentBotService } from './parent-bot.service';

@Module({
  providers: [ParentBotService],
})
export class ParentBotModule {}
