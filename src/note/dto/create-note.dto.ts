import { IsString, IsNotEmpty, IsOptional, IsDateString, isNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ description: 'Full name of the person noted', example: 'Kamron Ibrohimov' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number associated with the note', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Date when the call or interaction happened (ISO 8601 format)', example: '2024-04-24T14:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  callDate: string;
  
  @ApiProperty({description: 'Time when the call interaxtion happened', example: '12:00'})
  @IsOptional()
  time: string

  @ApiPropertyOptional({ description: 'Additional details or notes (optional)', example: 'Interested in the evening course.' })
  @IsString()
  @IsOptional()
  about?: string;
}