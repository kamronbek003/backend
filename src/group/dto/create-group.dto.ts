import {
    IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsNumber, Min, Matches, IsPositive
  } from 'class-validator';
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { Status } from '@prisma/client';
  
  export class CreateGroupDto {
    @ApiProperty({ description: 'Unique Group Business ID', example: 'G101' })
    @IsString()
    @IsNotEmpty()
    groupId: string; 
  
    @ApiPropertyOptional({
      description: 'Group status (optional, defaults to FAOL)',
      enum: Status,
      example: Status.FAOL,
    })
    @IsEnum(Status)
    @IsOptional()
    status?: Status = Status.FAOL;
  
    @ApiPropertyOptional({ description: 'Lesson schedule description (optional)', example: 'Mon/Wed/Fri 10:00-12:00' })
    @IsString()
    @IsOptional()
    darsJadvali?: string;
  
    @ApiPropertyOptional({ description: 'Lesson time description (optional)', example: '10:00' })
    @IsString()
    @IsOptional()
    darsVaqt?: string;
  
    @ApiPropertyOptional({ description: 'Course price per month (optional)', example: 650000.0 })
    @IsNumber()
    @IsPositive({ message: 'Course price must be a positive number' })
    @IsOptional()
    coursePrice?: number; 
  
    @ApiPropertyOptional({
      description: 'ID of the teacher assigned to this group (optional)',
      example: 'uuid', 
    })
    @IsUUID() 
    @IsOptional()
    teacherId?: string;
  }