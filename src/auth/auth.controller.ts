import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminAuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiResponse,
} from '@nestjs/swagger'; 
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginTeacherDto } from './dto/login.teacher.dto';

@ApiTags('Authentication') 
@Controller('auth') 
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('admin')
  @HttpCode(HttpStatus.OK) 
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Admin tizimga kirishi',
    description:
      "Admin telefon raqami va parolini tekshirib, muvaffaqiyatli bo'lsa JWT access token qaytaradi.",
  })
  @ApiBody({
    type: AdminLoginDto,
    description: "Adminning login ma'lumotlari (O'zbekiston formati).",
    examples: {
      valid: {
        summary: 'Valid ma\'lumotlar',
        value: { phone: '+998945895766', password: '123456' },
      },
      invalidPhone: {
        summary: 'Noto\'g\'ri telefon formati',
        value: { phone: '901234567', password: 'password123' },
      },
      shortPassword: {
        summary: 'Qisqa parol',
        value: { phone: '+998911234567', password: '123' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Muvaffaqiyatli tizimga kirildi. Access token qaytariladi.',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicGhvbmUiOiIrOTk4OTAxMjM0NTY3IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Parol noto‘g‘ri kiritildi.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Parol noto‘g‘ri' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Kiritilgan telefon raqamiga ega admin topilmadi.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: "'+998901234567' telefon raqamiga ega admin topilmadi",
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Kiritilgan maʼlumotlar yaroqsiz (validatsiya xatosi).',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: {
            type: 'string',
            example:
              "Telefon raqami '+998' bilan boshlanishi va 12 ta raqamdan iborat bo'lishi kerak (masalan: +998901234567)",
          },
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async login(
    @Body() adminLoginDto: AdminLoginDto,
  ): Promise<{ accessToken: string }> {
    return this.adminAuthService.login(adminLoginDto);
  }

  @Post('registerAdmin') 
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Yangi adminni ro\'yxatdan o\'tkazish' })
  @ApiBody({ type: CreateAdminDto })
  @ApiCreatedResponse({
    description: 'Admin muvaffaqiyatli ro\'yxatdan o\'tkazildi. Yaratilgan admin ma\'lumotlari (parolsiz) qaytariladi.',
    schema: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string', example: 'Kamron' },
            lastName: { type: 'string', example: 'Ibrohimov' },
            phone: { type: 'string', example: '+998945895766' },
            image: { type: 'string', format: 'url', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
        }
    }
  })
  @ApiConflictResponse({
    description: 'Bu telefon raqami allaqachon tizimda mavjud.',
    schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: HttpStatus.CONFLICT },
            message: { type: 'string', example: "'+998945895766' telefon raqami allaqachon ro'yxatdan o'tgan" },
            error: { type: 'string', example: 'Conflict' },
        }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Yuborilgan ma\'lumotlar noto\'g\'ri yoki yetarli emas (validatsiya xatosi).',
     schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string', example: "Parol kamida 6 belgidan iborat boʻlishi kerak" },
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async register(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<any> {
    return this.adminAuthService.create(createAdminDto);
  }



  @Post('teacher')
    @ApiOperation({ summary: 'Teacher login (O‘zbekiston formati)' })
    @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirildi.', type: LoginTeacherDto })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 404, description: 'Teacher topilmadi' })
    async loginTeacher(@Body() teacherLoginDto: LoginTeacherDto): Promise<{ accessToken: string }> {
      return this.adminAuthService.loginTeacher(teacherLoginDto);
    }
}