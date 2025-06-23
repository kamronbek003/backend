import { ApiProperty } from '@nestjs/swagger';

export interface CountsResponse {
    studentCount: number;
    groupCount: number;
    teacherCount: number;
}

export class CountsResponseDto implements CountsResponse {
    @ApiProperty({ example: 150, description: 'Total number of registered students' })
    studentCount: number;

    @ApiProperty({ example: 15, description: 'Total number of active groups' })
    groupCount: number;

    @ApiProperty({ example: 10, description: 'Total number of registered teachers' })
    teacherCount: number;
}
