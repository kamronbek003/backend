import { PartialType } from '@nestjs/swagger';
import { CreateGroupDto } from './create-group.dto';
import { IsOptional, IsUUID, IsString, Matches, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {


    @ApiPropertyOptional({ description: 'Unique Group Business ID (Update not recommended)' })
    @IsString()
    @IsOptional()
    groupId?: string;

    @ApiPropertyOptional({ description: 'Group status', enum: Status })
    @IsEnum(Status)
    @IsOptional()
    status?: Status;

    @ApiPropertyOptional({ description: 'Lesson schedule description' })
    @IsString()
    @IsOptional()
    darsJadvali?: string;

    @ApiPropertyOptional({ description: 'Lesson time description' })
    @IsString()
    @IsOptional()
    darsVaqt?: string;

    @ApiPropertyOptional({ description: 'Course price per month' })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    coursePrice?: number;

    @ApiPropertyOptional({
        description: 'ID of the teacher assigned to this group (provide null to remove teacher)',
        example: 'uuid',
        nullable: true,
    })
    @IsUUID()
    @IsOptional()
    teacherId?: string ;

    @ApiPropertyOptional({ description: 'Group Name (optional)', example: '10:00' })
    @IsString()
    @IsOptional()
    name?: string;
}
