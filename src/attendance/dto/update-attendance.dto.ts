import { PartialType } from '@nestjs/swagger';
import { CreateAttendanceDto } from './create-attendance.dto';
import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {
  @ApiPropertyOptional({ description: 'UUID of the group', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: 'UUID of the student', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Attendance date (ISO 8601 format)', example: '2024-04-25T09:05:00.000Z' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Attendance status', enum: AttendanceStatus, example: AttendanceStatus.KECHIKDI })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;
}