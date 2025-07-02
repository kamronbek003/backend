import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { QueryMonitoringDto } from './dto/query-monitoring.dto';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('/teachers')
  async getTeachersSummary(@Query() query: QueryMonitoringDto) {
    return this.monitoringService.getTeachersSummary(query);
  }

  @Get('/teachers/:id')
  async getTeacherDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitoringService.getTeacherDetails(id);
  }
}