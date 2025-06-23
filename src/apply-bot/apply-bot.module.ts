import { Module } from '@nestjs/common';
import { ApplyBotService } from './apply-bot.service';

@Module({
  providers: [ApplyBotService]
})
export class ApplyBotModule {}
