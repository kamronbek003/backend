import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcrypt';
import { Admin, Prisma, Student } from '@prisma/client'; 
import { CreateAdminDto } from './dto/create-admin.dto';
import { last } from 'rxjs';
import { LoginTeacherDto } from './dto/login.teacher.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(adminLoginDto: AdminLoginDto): Promise<{ accessToken: string }> {
    const { phone, password } = adminLoginDto;

    const admin: Admin | null = await this.prisma.admin.findUnique({
      where: { phone },
    });

    if (!admin) {
      throw new NotFoundException(
        `Telefon raqam yoki parol noto'g'ri`,
      );
    }

    const isPasswordMatching = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException(`Telefon raqam yoki parol noto'g'ri`);
    }
    

    const payload = {
      sub: admin.id, 
      phone: admin.phone,
      role: admin.status,
      name: admin.firstName,
      lastname: admin.lastName,
      image: admin.image
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async create(createAdminDto: CreateAdminDto): Promise<any> {
    const { firstName, lastName, phone, password, image } = createAdminDto;

    const existingAdmin = await this.prisma.admin.findUnique({
      where: { phone },
    });

    if (existingAdmin) {
      throw new ConflictException(
        `'${phone}' Bu telefon raqam orqali allaqachon ro'yxatdan o'tilgan`,
      );
    }

    const saltOrRounds = 10; 
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, saltOrRounds);
    } catch (error) {
        throw new InternalServerErrorException("Parolni hash qilishda xatolik yuz berdi.");
    }

    try {
      const newAdmin = await this.prisma.admin.create({
        data: {
          firstName,
          lastName,
          phone,
          password: hashedPassword,
          image,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          
          createdAt: true,
          updatedAt: true,
        },
      });
      return newAdmin;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             throw new ConflictException(
                 `'${phone}' telefon raqami orqali allaqachon ro'yxatdan o'tilgan`,
             );
        }
        throw new InternalServerErrorException("Adminni yaratishda kutilmagan xatolik yuz berdi.");
    }
  }

   async loginTeacher(loginTeacherDto: LoginTeacherDto): Promise<{ accessToken: string }> { 
      const { phone, password } = loginTeacherDto;
  
      const teacher = await this.prisma.teacher.findUnique({
        where: { phone },
      });
  
      if (!teacher) {
        throw new ConflictException(
          `Telefon raqam yoki parol noto'g'ri`,
        );
      }
  
      const isPasswordMatching = await bcrypt.compare(password, teacher.password);
  
      if (!isPasswordMatching) {
        throw new ConflictException(`Telefon raqam yoki parol noto'g'ri`);
      }
  
      const payload = {
        sub: teacher.id,
        role: "teacher", 
        phone: teacher.phone 
      };
      const accessToken = await this.jwtService.signAsync(payload);
  
      return { accessToken };
    }

}