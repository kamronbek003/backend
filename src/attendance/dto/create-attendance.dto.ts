import { IsNotEmpty, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'UUID of the group', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ description: 'UUID of the student', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Attendance date (ISO 8601 format)', example: '2024-04-24T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Attendance status', enum: AttendanceStatus, example: AttendanceStatus.KELDI })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;
}