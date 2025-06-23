import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { Prisma, Note } from '@prisma/client';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNoteDto } from './dto/query-note.dto';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    try {
      const noteData: Prisma.NoteCreateInput = {
        fullName: createNoteDto.fullName,
        phone: createNoteDto.phone,
        callDate: new Date(createNoteDto.callDate), 
        time: createNoteDto.time, 
        about: createNoteDto.about, 
      };

      const createdNote = await this.prisma.note.create({
        data: noteData,
      });
      return createdNote;

    } catch (error) {
      console.error("Error creating note:", error);
      throw new InternalServerErrorException('Eslatmani yaratishda xatolik yuz berdi.');
    }
  }

  async findAll(queryDto: QueryNoteDto): Promise<{ data: Note[], total: number }> {
    const {
      page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc',
      filterByFullName, filterByPhone, filterByDateFrom, filterByDateTo
    } = queryDto;

    const skip = (page - 1) * limit; 
    const where: Prisma.NoteWhereInput = {};

    if (filterByFullName) {
        where.fullName = { contains: filterByFullName, mode: 'insensitive' };
    }

    if (filterByPhone) {
        where.phone = { contains: filterByPhone };
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filterByDateFrom) {
        dateFilter.gte = new Date(filterByDateFrom);
    }
    if (filterByDateTo) {
        const endDate = new Date(filterByDateTo);
        endDate.setHours(23, 59, 59, 999); 
        dateFilter.lte = endDate; 
    }

    if (Object.keys(dateFilter).length > 0) {
        where.callDate = dateFilter;
    }

    const allowedSortByFields = ['createdAt', 'updatedAt', 'callDate', 'fullName', 'phone', 'time'];
    const safeSortBy = allowedSortByFields.includes(sortBy) ? sortBy : 'createdAt'; 

    const orderBy: Prisma.NoteOrderByWithRelationInput = { [safeSortBy]: sortOrder };

    try {
      const [notes, total] = await this.prisma.$transaction([
        this.prisma.note.findMany({
          where, skip, take: limit, orderBy,
        }),
        this.prisma.note.count({ where }),
      ]);
      return { data: notes, total };
    } catch (error) {
      console.error("Error finding notes:", error);
      throw new InternalServerErrorException('Eslatmalarni olishda xatolik yuz berdi.');
    }
  }

  async findOne(id: string): Promise<Note> {
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`"${id}" ID'li eslatma topilmadi`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto): Promise<Note> {
    await this.findOne(id); 
    const updateData: Prisma.NoteUpdateInput = {};

    if (updateNoteDto.fullName !== undefined) updateData.fullName = updateNoteDto.fullName;
    if (updateNoteDto.phone !== undefined) updateData.phone = updateNoteDto.phone;
    if (updateNoteDto.about !== undefined) updateData.about = updateNoteDto.about;
    if (updateNoteDto.callDate) {
        updateData.callDate = new Date(updateNoteDto.callDate); 
    }
    if (updateNoteDto.time !== undefined) { 
        updateData.time = updateNoteDto.time; 
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id); 
    }

    try {
      const updatedNote = await this.prisma.note.update({
        where: { id },
        data: updateData,
      });
      return updatedNote;
    } catch (error) {
       console.error("Error updating note:", error);
       if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
           throw new NotFoundException(`Yangilash uchun "${id}" ID'li eslatma topilmadi.`);
       }
       throw new InternalServerErrorException('Eslatmani yangilashda xatolik yuz berdi.');
    }
  }

  async remove(id: string): Promise<Note> {
    const note = await this.findOne(id); 
    try {
      await this.prisma.note.delete({
        where: { id },
      });
      return note;
    } catch (error) {
       console.error("Error removing note:", error);
       if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundException(`O'chirish uchun "${id}" ID'li eslatma topilmadi.`);
       }
       throw new InternalServerErrorException('Eslatmani o\'chirishda xatolik yuz berdi.');
    }
  }
}
