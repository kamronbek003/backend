import { PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from './create-teacher.dto';
import { IsOptional, IsUUID, IsString, Matches, IsNumber, Min, MinLength, IsPhoneNumber } from 'class-validator'; 
import { ApiPropertyOptional } from '@nestjs/swagger';


export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {

    @ApiPropertyOptional({
        description: 'Teacher first name', example: 'Kamron'
    })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({
        description: 'Teacher last name', example: 'Ibrohimov'
    })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({
        description: 'Teacher phone number', example: '+998945895766'
    })
    @IsString()
    @IsOptional()
    @IsPhoneNumber('UZ')
    phone?: string;

    @ApiPropertyOptional({
        description: 'Teacher password (min 6 characters)', example: 'newStrongPassword456'
    })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    @IsOptional()
    password?: string;

    @ApiPropertyOptional({
        description: 'Teacher address', example: '456 Navoi St.'
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({
        description: 'Teacher date of birth in DD-MM-YYYY format',
        example: '15-05-1990',
    })
    @IsString()
    @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, {
        message: 'dateBirth must be in DD-MM-YYYY format'
    })
    @IsOptional()
    dateBirth?: string;

    @ApiPropertyOptional({
        description: 'Teacher image URL',
        example: 'https://example.com/images/teacher_updated.jpg',
    })
    @IsString()
    @IsOptional()
    image?: string;

    @ApiPropertyOptional({
        description: 'Teacher experience in years', example: 6.0
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    experience?: number;

    @ApiPropertyOptional({
        description: 'Date when the teacher started working in DD-MM-YYYY format', 
        example: '11-02-2021',
    })
    @IsString() 
    @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, { 
        message: 'startedAt must be in DD-MM-YYYY format'
    })
    @IsOptional() 
    startedAt?: string;

    @ApiPropertyOptional({
        description: 'Subject the teacher teaches',
        example: 'Physics',
    })
    @IsString()
    @IsOptional()
    subject?: string;
}