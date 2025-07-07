import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { Salary } from '@prisma/client';
import { Order, QuerySalaryDto } from './dto/query-salary.dto';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}


  async findAll(query: QuerySalaryDto) {
  const { 
    page = 1, 
    limit = 50, 
    sortBy = 'createdAt', 
    order = Order.DESC,
    search,
    teacherId,
    month,
    year
  } = query;
    
  const skip = (page - 1) * limit;

  const where: any = {};

  if (teacherId) {
    where.teacherId = teacherId;
  }

  if (search) {
    where.teacher = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  if (month) {
    where.paymentDate = {
      ...where.paymentDate,
      gte: new Date(new Date().getFullYear(), month - 1, 1),
      lte: new Date(new Date().getFullYear(), month - 1, 31, 23, 59, 59),
    };
  }

  if (year) {
    where.paymentDate = {
      ...where.paymentDate,
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  const [salaries, total] = await this.prisma.$transaction([
    this.prisma.salary.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        [sortBy]: order,
      },
      include: {
        teacher: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    this.prisma.salary.count({ where }),
  ]);

  return {
    data: salaries,
    meta: {
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    },
  };
}
  
  async create(createSalaryDto: CreateSalaryDto): Promise<Salary> {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: createSalaryDto.teacherId } });
    if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${createSalaryDto.teacherId} not found`);
    }

    if (createSalaryDto.issuedByAdminId) {
        const admin = await this.prisma.admin.findUnique({ where: { id: createSalaryDto.issuedByAdminId }});
        if (!admin) {
            throw new NotFoundException(`Admin with ID ${createSalaryDto.issuedByAdminId} not found`);
        }
    }

    return this.prisma.salary.create({ data: { ...createSalaryDto, paymentDate: new Date() } });
  }
  
  async findOne(id: string): Promise<Salary> {
    const salary = await this.prisma.salary.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!salary) {
      throw new NotFoundException(`Salary with ID ${id} not found`);
    }
    return salary;
  }

  async update(id: string, updateSalaryDto: UpdateSalaryDto): Promise<Salary> {
    await this.findOne(id);
    return this.prisma.salary.update({ where: { id }, data: updateSalaryDto });
  }

  async remove(id: string): Promise<Salary> {
    await this.findOne(id);
    return this.prisma.salary.delete({ where: { id } });
  }
}