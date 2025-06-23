import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateNoteDto } from './create-note.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiPropertyOptional({ description: 'Full name of the person noted' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Phone number associated with the note' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Date when the call or interaction happened (ISO 8601 format)' })
  @IsDateString()
  @IsOptional()
  callDate?: string;

  @ApiPropertyOptional({description: 'Time when the call interaxtion happened', example: '12:00'})
  @IsOptional()
  time: string

  @ApiPropertyOptional({ description: 'Additional details or notes' })
  @IsString()
  @IsOptional()
  about?: string;
}