import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf, Scenes, Markup, session, Context as TelegrafBaseContext } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { Student, Attendance, Payment, Group, DailyFeedback, AttendanceStatus, Status, PaymentType } from '@prisma/client';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PaymentWithDetails, PaymentCreatedEvent } from '../payment/payment.service';
import { DailyFeedbackWithDetails, DailyFeedbackCreatedEvent } from '../daily-feedback/daily-feedback.service';
import { AttendanceWithDetails, AttendanceCreatedEvent } from '../attendance/attendance.service';

function escapeHTML(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDDMMYYYY(dateInput: Date | string | null): string {
  if (!dateInput) return 'Noma\'lum sana';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Noto\'g\'ri sana formati';
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return 'Sana xatoligi';
  }
}

interface MyWizardState {
  transientPhoneNumber?: string;
}

interface MyWizardSceneSession extends Scenes.WizardSessionData {
  state: MyWizardState;
}

interface MySession extends Scenes.WizardSession<MyWizardSceneSession> {
  loggedInParentPhone?: string;
  loggedInStudentId?: string;
  loggedInStudentName?: string | null; // Allow null
  loggedInAvailableStudents?: { id: string; firstName: string; lastName: string }[];
  loggedInStudentGroups?: { id: string; name: string | null; groupId: string }[];
}

interface MyContext extends TelegrafBaseContext {
  session: MySession;
  scene: Scenes.SceneContextScene<MyContext, MyWizardSceneSession>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}

// Scene ID
const PARENT_LOGIN_SCENE_ID = 'PARENT_LOGIN_SCENE';

@Injectable()
export class ParentBotService implements OnModuleInit {
  private bot: Telegraf<MyContext>;
  private readonly logger = new Logger(ParentBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const botToken = process.env.BOT_PARENTS_TOKEN || 'YOUR_DEFAULT_TOKEN_HERE';
    if (botToken === 'YOUR_DEFAULT_TOKEN_HERE') {
      this.logger.warn("DIQQAT: BOT_PARENTS_TOKEN ni .env faylida o'rnating yoki to'g'ridan-to'g'ri token kiriting!");
    }
    this.bot = new Telegraf<MyContext>(botToken);

    this.bot.use(session({
      defaultSession: (): MySession => ({} as MySession),
    }));

    const stage = this.setupScenes();
    this.bot.use(stage.middleware());

    this.setupCommandsAndHandlers();
  }

  private async saveParentChatId(ctx: MyContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const parentPhone = ctx.session.loggedInParentPhone;
  const studentId = ctx.session.loggedInStudentId;
  const studentName = ctx.session.loggedInStudentName;

  if (chatId && parentPhone) {
    try {
      await this.prisma.parentTelegramChat.upsert({
        where: { telegramChatId: String(chatId) },
        update: {
          parentPhone,
          studentId,
          studentName,
          lastLoginAt: new Date(),
        },
        create: {
          telegramChatId: String(chatId),
          parentPhone,
          studentId,
          studentName,
          lastLoginAt: new Date(),
        },
      });
      this.logger.log(`Ota-ona chat ID saqlandi/yangilandi: Tel: ${parentPhone}, ChatID: ${chatId}, StudentID: ${studentId}`);
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('telegramChatId')) {
        this.logger.warn(`Bu telegramChatId (${chatId}) allaqachon boshqa telefon raqamiga bog'langan. Eski yozuv yangilanmoqda...`);
        const existingChat = await this.prisma.parentTelegramChat.findUnique({ where: { telegramChatId: String(chatId) } });
        if (existingChat && existingChat.parentPhone !== parentPhone) {
          await ctx.replyWithHTML(
            `⚠️ Ushbu Telegram akkaunti (${chatId}) avval <code>${existingChat.parentPhone}</code> raqamiga bog'langan edi. Hozir u <code>${parentPhone}</code> raqamiga yangilandi.`
          );
          await this.prisma.parentTelegramChat.delete({ where: { telegramChatId: String(chatId) } });
          await this.prisma.parentTelegramChat.create({
            data: {
              telegramChatId: String(chatId),
              parentPhone,
              studentId,
              studentName,
              lastLoginAt: new Date(),
            },
          });
        }
      } else {
        this.logger.error(`Ota-ona chat ID sini saqlashda xatolik (Tel: ${parentPhone}):`, error.message);
      }
    }
  } else {
    this.logger.warn(`Chat ID yoki Parent Phone topilmadi, saveParentChatId o'tkazib yuborildi. ChatID: ${chatId}, ParentPhone: ${parentPhone}`);
  }
}

  private async fetchAndStoreStudentGroups(ctx: MyContext, studentId: string | undefined): Promise<void> {
    if (!studentId) {
      ctx.session.loggedInStudentGroups = [];
      return;
    }
    try {
      const studentWithGroups = await this.prisma.student.findUnique({
        where: { id: studentId },
        include: { groups: { select: { id: true, name: true, groupId: true }, orderBy: { name: 'asc' } } },
      });
      ctx.session.loggedInStudentGroups = studentWithGroups ? studentWithGroups.groups : [];
    } catch (error) {
      this.logger.error(`O'quvchi guruhlarini olishda xatolik (ID: ${studentId}):`, error);
      ctx.session.loggedInStudentGroups = [];
    }
  }

  private setupScenes(): Scenes.Stage<MyContext> {
    const parentLoginScene = new Scenes.WizardScene<MyContext>(
      PARENT_LOGIN_SCENE_ID,
      async (ctx) => {
        await this.clearLoginSession(ctx);
        await ctx.replyWithHTML(
          "👋 Assalomu alaykum!\n\nFarzandingiz (yoki o'zingiz) haqidagi ma'lumotlarni ko'rish uchun, iltimos, tizimda ro'yxatdan o'tgan telefon raqamingizni <b>+998XXXXXXXXX</b> formatida yuboring.\n\nMasalan: <code>+998901234567</code>"
        );
        return ctx.wizard.next();
      },
      async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.replyWithHTML("⚠️ Iltimos, telefon raqamingizni matn shaklida yuboring.");
          return ctx.wizard.selectStep(ctx.wizard.cursor);
        }
        const phoneNumber = ctx.message.text;
        const phoneRegex = /^\+998\d{9}$/;

        if (!phoneRegex.test(phoneNumber)) {
          await ctx.replyWithHTML(
            "⚠️ Telefon raqami noto'g'ri formatda kiritildi.\nIltimos, <b>+998XXXXXXXXX</b> formatida qayta kiriting (masalan, <code>+998901234567</code>)."
          );
          return ctx.wizard.selectStep(ctx.wizard.cursor);
        }
        try {
          ctx.session.loggedInParentPhone = phoneNumber;

          const students = await this.prisma.student.findMany({
            where: { parentPhone: phoneNumber },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { firstName: 'asc' },
          });

          if (students.length === 0) {
            await ctx.replyWithHTML(
              `😔 Afsuski, <b>${escapeHTML(phoneNumber)}</b> raqamiga bog'langan o'quvchi topilmadi.\n\nRaqamni to'g'ri kiritganingizga ishonch hosil qiling yoki o'quv markazi ma'muriyatiga murojaat qiling.`
            );
            return ctx.scene.leave();
          }

          ctx.session.loggedInAvailableStudents = students;
          await this.saveParentChatId(ctx);

          if (students.length === 1) {
            ctx.session.loggedInStudentId = students[0].id;
            ctx.session.loggedInStudentName = `${students[0].firstName} ${students[0].lastName}`;
            await this.fetchAndStoreStudentGroups(ctx, students[0].id);
            await this.saveParentChatId(ctx);
            await ctx.replyWithHTML(`✅ <b>${escapeHTML(ctx.session.loggedInStudentName)}</b> uchun tizimga muvaffaqiyatli kirdingiz!`);
            await this.showMainMenu(ctx);
            return ctx.scene.leave();
          } else {
            const buttons = students.map((student) =>
              Markup.button.callback(
                `🎓 ${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}`,
                `select_student_${student.id}`
              )
            );
            await ctx.replyWithHTML(
              "📞 Sizning raqamingizga bir nechta o'quvchi bog'langan.\nIltimos, qaysi o'quvchining ma'lumotlarini ko'rmoqchi ekanligingizni tanlang:",
              Markup.inlineKeyboard(buttons, { columns: 1 })
            );
            return;
          }
        } catch (error) {
          this.logger.error(`Telefon raqamini tekshirishda xatolik (${escapeHTML(phoneNumber)}):`, error);
          await ctx.replyWithHTML("😔 Kechirasiz, tizimda texnik xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.");
          return ctx.scene.leave();
        }
      }
    );

    parentLoginScene.command('cancel', async (ctx) => {
      await ctx.reply("❌ Jarayon bekor qilindi.");
      await this.clearLoginSession(ctx);
      return ctx.scene.leave();
    });

    parentLoginScene.hears(/^(bekor|отмена)$/i, async (ctx) => {
      await ctx.reply("❌ Jarayon bekor qilindi.");
      await this.clearLoginSession(ctx);
      return ctx.scene.leave();
    });

    return new Scenes.Stage<MyContext>([parentLoginScene], { ttl: 10 * 60 * 1000 });
  }

  private async showMainMenu(ctx: MyContext, message?: string): Promise<void> {
    if (!ctx.session.loggedInStudentId) {
      await ctx.replyWithHTML("❗️ Avval tizimga kirishingiz kerak. /start buyrug'ini bosing.");
      if (ctx.session.__scenes?.current !== PARENT_LOGIN_SCENE_ID) {
        await ctx.scene.enter(PARENT_LOGIN_SCENE_ID);
      }
      return;
    }
    const studentName = escapeHTML(ctx.session.loggedInStudentName || "Tanlangan o'quvchi");
    const menuMessage = message || `👋 Assalomu alaykum, <b>${studentName}</b>!\n\nAsosiy menyu. Quyidagilardan birini tanlang:`;
    const buttons = [
      ["👤 Mening ma'lumotlarim"],
      ["📊 Davomatlarim", "⭐ Ballarim"],
      ["📚 Guruhlarim", "💳 To'lovlarim"],
    ];
    if (ctx.session.loggedInAvailableStudents && ctx.session.loggedInAvailableStudents.length > 1) {
      buttons.push(["🔄 Boshqa o'quvchini tanlash"]);
    }
    await ctx.replyWithHTML(menuMessage, Markup.keyboard(buttons).resize());
  }

  private setupCommandsAndHandlers(): void {
    this.bot.start(async (ctx: MyContext) => {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.replyWithHTML("🚫 Chat ID topilmadi. Iltimos, qayta urinib ko'ring.");
    return;
  }

  try {
    const parentChat = await this.prisma.parentTelegramChat.findUnique({
      where: { telegramChatId: String(chatId) },
    });

    if (parentChat && parentChat.parentPhone && parentChat.studentId) {
      const student = await this.prisma.student.findFirst({
        where: { id: parentChat.studentId, parentPhone: parentChat.parentPhone },
      });

      if (!student) {
        this.logger.warn(`Sessiya topildi, lekin o'quvchi yoki ota-ona ma'lumotlari noto'g'ri (ChatID: ${chatId}). Sessiya o'chirilmoqda.`);
        await this.prisma.parentTelegramChat.deleteMany({ where: { telegramChatId: String(chatId) } });
        await this.clearLoginSession(ctx);
        await ctx.replyWithHTML("⚠️ Sessiya ma'lumotlari eskirgan. Iltimos, qayta kiring.");
        await ctx.scene.enter(PARENT_LOGIN_SCENE_ID);
        return;
      }

      ctx.session.loggedInParentPhone = parentChat.parentPhone;
      ctx.session.loggedInStudentId = parentChat.studentId;
      ctx.session.loggedInStudentName = parentChat.studentName ?? undefined; 

      const students = await this.prisma.student.findMany({
        where: { parentPhone: parentChat.parentPhone },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      });
      ctx.session.loggedInAvailableStudents = students;

      await this.fetchAndStoreStudentGroups(ctx, parentChat.studentId);

      await this.showMainMenu(ctx, `👋 Xush kelibsiz, <b>${escapeHTML(parentChat.studentName || '')}</b>! Siz allaqachon tizimdasiz.`);
      return;
    }
  } catch (error) {
    this.logger.error(`Sessiyani tiklashda xatolik (ChatID: ${chatId}):`, error);
    await ctx.replyWithHTML("🚫 Sessiyani tiklashda xatolik yuz berdi. Iltimos, qayta kirishga urining.");
  }

  await this.clearLoginSession(ctx);
  await ctx.scene.enter(PARENT_LOGIN_SCENE_ID);
});

    this.bot.command('menu', async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId) {
        await this.redirectToLogin(ctx);
        return;
      }
      await this.showMainMenu(ctx);
    });

    this.bot.action(/select_student_(.+)/, async (ctx: MyContext & { match: RegExpExecArray }) => {
      if (!ctx.session.loggedInAvailableStudents || ctx.session.loggedInAvailableStudents.length === 0) {
        await ctx.answerCbQuery("⚠️ Sessiya ma'lumotlari topilmadi yoki o'quvchilar ro'yxati bo'sh. /start ni qayta bosing.", { show_alert: true });
        return this.redirectToLogin(ctx);
      }
      const studentId = ctx.match[1];
      const student = ctx.session.loggedInAvailableStudents.find((s) => s.id === studentId);

      if (student) {
        ctx.session.loggedInStudentId = student.id;
        ctx.session.loggedInStudentName = `${student.firstName} ${student.lastName}`;
        await this.saveParentChatId(ctx);
        await this.fetchAndStoreStudentGroups(ctx, student.id);

        await ctx.answerCbQuery(`✅ ${escapeHTML(student.firstName)} tanlandi`);
        try {
          await ctx.editMessageReplyMarkup(undefined);
        } catch (e) {
          this.logger.warn("Inline tugmalarni o'chirib bo'lmadi.");
        }
        await ctx.replyWithHTML(`Tanlangan o'quvchi: 🎓 <b>${escapeHTML(ctx.session.loggedInStudentName)}</b>`);
        await this.showMainMenu(ctx);

        if (ctx.session.__scenes?.current === PARENT_LOGIN_SCENE_ID) {
          await ctx.scene.leave();
        }
      } else {
        await ctx.answerCbQuery("⚠️ Tanlangan o'quvchi topilmadi!", { show_alert: true });
        await this.redirectToLogin(ctx, "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    });

    this.bot.hears("👤 Mening ma'lumotlarim", async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId) {
        await this.redirectToLogin(ctx);
        return;
      }
      try {
        const student = await this.prisma.student.findUnique({ where: { id: ctx.session.loggedInStudentId } });
        if (!student) {
          await ctx.replyWithHTML("🚫 Kechirasiz, o'quvchi ma'lumotlari topilmadi.");
          await this.redirectToLogin(ctx);
          return;
        }
        let info = `🎓 <b>O'quvchi: ${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}</b>\n\n`;
        info += `🆔 Student ID: <code>${escapeHTML(student.studentId)}</code>\n`;
        info += `📞 Shaxsiy tel.: ${escapeHTML(student.phone)}\n`;
        info += `👨‍👩‍👧 Ota-ona tel.: ${escapeHTML(student.parentPhone)}\n`;
        info += `🏠 Manzil: ${escapeHTML(student.address)}\n`;
        info += `🎂 Tug'ilgan sana: ${new Date(student.dateBirth).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}\n`;
        info += `⭐ Umumiy ball: <b>${student.ball}</b>\n`;
        info += `ℹ️ Holati: ${this.formatStudentStatus(student.status)}\n`;
        await ctx.replyWithHTML(info);
      } catch (e) {
        this.logger.error("Mening ma'lumotlarim xatoligi:", e);
        await ctx.replyWithHTML("🚫 Ma'lumotlarni olishda texnik xatolik yuz berdi.");
      }
    });

    this.bot.hears("📊 Davomatlarim", async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
        await this.redirectToLogin(ctx);
        return;
      }
      const studentGroups = ctx.session.loggedInStudentGroups;
      if (studentGroups && studentGroups.length > 1) {
        const buttons = studentGroups.map((group) =>
          Markup.button.callback(escapeHTML(group.name || group.groupId), `view_attendance_group_${group.id}`)
        );
        buttons.push(Markup.button.callback("🔄 Barcha guruhlar bo'yicha", `view_attendance_group_ALL`));
        await ctx.replyWithHTML(
          `📊 <b>${escapeHTML(ctx.session.loggedInStudentName)}ning</b> davomatlarini qaysi guruh uchun ko'rmoqchisiz?`,
          Markup.inlineKeyboard(buttons, { columns: 1 })
        );
      } else if (studentGroups && studentGroups.length === 1) {
        await this.sendAttendances(ctx, studentGroups[0].id);
      } else {
        await this.sendAttendances(ctx, "ALL");
      }
    });

    this.bot.action(/view_attendance_group_(.+)/, async (ctx: MyContext & { match: RegExpExecArray }) => {
      if (!ctx.session.loggedInStudentId) {
        await ctx.answerCbQuery("❗️ Sessiya muddati tugagan. /start ni bosing.", { show_alert: true });
        try {
          await ctx.deleteMessage();
        } catch (e) {
        }
        await this.redirectToLogin(ctx);
        return;
      }
      const groupId = ctx.match[1];
      await ctx.answerCbQuery(`🔎 Davomatlar yuklanmoqda...`);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch (e) {
      }
      await this.sendAttendances(ctx, groupId);
    });

    this.bot.hears("⭐ Ballarim", async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
        await this.redirectToLogin(ctx);
        return;
      }
      const studentGroups = ctx.session.loggedInStudentGroups;
      if (studentGroups && studentGroups.length > 1) {
        const buttons = studentGroups.map((group) =>
          Markup.button.callback(escapeHTML(group.name || group.groupId), `view_scores_group_${group.id}`)
        );
        buttons.push(Markup.button.callback("🔄 Barcha guruhlar (umumiy ball)", `view_scores_group_ALL`));
        await ctx.replyWithHTML(
          `⭐ <b>${escapeHTML(ctx.session.loggedInStudentName)}ning</b> ballarini qaysi guruh uchun (yoki umumiy) ko'rmoqchisiz?`,
          Markup.inlineKeyboard(buttons, { columns: 1 })
        );
      } else if (studentGroups && studentGroups.length === 1) {
        await this.sendScores(ctx, studentGroups[0].id);
      } else {
        await this.sendScores(ctx, "ALL");
      }
    });

    this.bot.action(/view_scores_group_(.+)/, async (ctx: MyContext & { match: RegExpExecArray }) => {
      if (!ctx.session.loggedInStudentId) {
        await ctx.answerCbQuery("❗️ Sessiya muddati tugagan. /start ni bosing.", { show_alert: true });
        try {
          await ctx.deleteMessage();
        } catch (e) {
          /* ignore */
        }
        await this.redirectToLogin(ctx);
        return;
      }
      const groupId = ctx.match[1];
      await ctx.answerCbQuery(`🔎 Ballar yuklanmoqda...`);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch (e) {
      }
      await this.sendScores(ctx, groupId);
    });

    this.bot.hears("📚 Guruhlarim", async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
        await this.redirectToLogin(ctx);
        return;
      }
      try {
        const detailedGroups = await this.prisma.group.findMany({
          where: { students: { some: { id: ctx.session.loggedInStudentId } } },
          include: { teacher: { select: { firstName: true, lastName: true } } },
          orderBy: { name: 'asc' },
        });
        if (detailedGroups.length === 0) {
          await ctx.replyWithHTML(
            `📚 <b>${escapeHTML(ctx.session.loggedInStudentName)}</b> hozirda birorta guruhga a'zo emas.`
          );
          return;
        }
        let message = `📚 <b>${escapeHTML(ctx.session.loggedInStudentName)}ning Guruhlari:</b>\n`;
        detailedGroups.forEach((group) => {
          message += `\n------------------------------\n`;
          message += `🎓 <b>Nomi:</b> ${escapeHTML(group.name || group.groupId)}\n`;
          if (group.teacher) {
            message += `   👨‍🏫 O'qituvchi: ${escapeHTML(group.teacher.firstName)} ${escapeHTML(group.teacher.lastName)}\n`;
          }
          message += `   🗓️ Dars jadvali: ${escapeHTML(group.darsJadvali || "Belgilanmagan")}\n`;
          message += `   ⏰ Dars vaqti: ${escapeHTML(group.darsVaqt || "Belgilanmagan")}\n`;
          message += `   💰 Kurs narxi: ${group.coursePrice?.toLocaleString('uz-UZ') || "Noma'lum"} so'm\n`;
          message += `   ℹ️ Holati: ${this.formatStudentStatus(group.status)}\n`;
        });
        message += `------------------------------\n`;
        await ctx.replyWithHTML(message);
      } catch (e) {
        this.logger.error("Guruhlar xatoligi:", e);
        await ctx.replyWithHTML("🚫 Guruhlar ma'lumotini olishda texnik xatolik.");
      }
    });

    this.bot.hears("💳 To'lovlarim", async (ctx: MyContext) => {
      if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
        await this.redirectToLogin(ctx);
        return;
      }
      try {
        const payments = await this.prisma.payment.findMany({
          where: { studentId: ctx.session.loggedInStudentId },
          orderBy: { date: 'desc' },
          take: 10,
        });
        if (payments.length === 0) {
          await ctx.replyWithHTML(
            `💳 <b>${escapeHTML(ctx.session.loggedInStudentName)}</b> uchun hozircha to'lovlar mavjud emas.`
          );
          return;
        }
        let message = `💳 <b>${escapeHTML(ctx.session.loggedInStudentName)}ning To'lovlari</b> (oxirgi ${payments.length}ta):\n\n`;
        payments.forEach((p) => {
          message += `📅 <b>Sana:</b> ${new Date(p.date).toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}\n`;
          message += `💰 Summa: <b>${p.summa.toLocaleString('uz-UZ')} so'm</b>\n`;
          message += `🛒 To'lov turi: ${this.formatPaymentType(p.paymentType)}\n`;
          message += `-----------\n`;
        });
        await ctx.replyWithHTML(message);
      } catch (e) {
        this.logger.error("To'lovlar xatoligi:", e);
        await ctx.replyWithHTML("🚫 To'lovlar ma'lumotini olishda texnik xatolik.");
      }
    });

    this.bot.hears("🔄 Boshqa o'quvchini tanlash", async (ctx: MyContext) => {
      if (!ctx.session.loggedInParentPhone || !ctx.session.loggedInAvailableStudents || ctx.session.loggedInAvailableStudents.length <= 1) {
        await ctx.replyWithHTML(
          "ℹ️ Faqat bitta o'quvchi mavjud yoki qayta tanlash uchun yetarli ma'lumot yo'q.\n/start buyrug'i orqali qayta urinib ko'ring."
        );
        return;
      }
      ctx.session.loggedInStudentId = undefined;
      ctx.session.loggedInStudentName = undefined;
      ctx.session.loggedInStudentGroups = undefined;
      const students = ctx.session.loggedInAvailableStudents;
      const buttons = students.map((student) =>
        Markup.button.callback(
          `🎓 ${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}`,
          `select_student_${student.id}`
        )
      );
      await ctx.replyWithHTML(
        "🔄 Iltimos, qaysi o'quvchining ma'lumotlarini ko'rmoqchi ekanligingizni qayta tanlang:",
        Markup.inlineKeyboard(buttons, { columns: 1 })
      );
    });

    this.bot.on('text', async (ctx: MyContext) => {
      if (ctx.session.loggedInStudentId && !ctx.session.__scenes?.current) {
        await ctx.replyWithHTML("🤔 Noma'lum buyruq. Iltimos, quyidagi menyu tugmalaridan birini tanlang 👇");
        await this.showMainMenu(ctx);
      } else if (!ctx.session.loggedInStudentId && !ctx.session.__scenes?.current) {
        await ctx.replyWithHTML("👋 Assalomu alaykum! Tizimga kirish uchun /start buyrug'ini bering.");
      }
    });
  }

  private async sendAttendances(ctx: MyContext, groupId: string): Promise<void> {
    if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
      this.logger.warn("sendAttendances chaqirildi, lekin loggedInStudentId yoki loggedInStudentName mavjud emas.");
      await this.redirectToLogin(ctx);
      return;
    }
    try {
      const whereClause: { studentId: string; groupId?: string } = { studentId: ctx.session.loggedInStudentId };
      let groupNameForTitle = "";
      if (groupId !== "ALL") {
        whereClause.groupId = groupId;
        if (ctx.session.loggedInStudentGroups) {
          const selectedGroup = ctx.session.loggedInStudentGroups.find((g) => g.id === groupId);
          groupNameForTitle = selectedGroup ? ` (${escapeHTML(selectedGroup.name || selectedGroup.groupId)})` : "";
        }
      }
      const attendances = await this.prisma.attendance.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: 15,
        include: { group: { select: { name: true, groupId: true } } },
      });
      if (attendances.length === 0) {
        await ctx.replyWithHTML(
          `📊 <b>${escapeHTML(ctx.session.loggedInStudentName)}</b> uchun${
            groupNameForTitle ? groupNameForTitle + " guruhida" : groupId === "ALL" ? " umuman" : ""
          } davomat qayd etilmagan.`
        );
        return;
      }
      let message = `📊 <b>${escapeHTML(ctx.session.loggedInStudentName)}ning Davomatlari${groupNameForTitle}</b> (oxirgi ${
        attendances.length
      }ta):\n\n`;
      attendances.forEach((att, index) => {
        message += `<b>${index + 1}.</b> 📅 <b>Sana:</b> ${new Date(att.date).toLocaleDateString('uz-UZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}\n`;
        if (groupId === "ALL" || !groupNameForTitle) {
          message += `   🏢 Guruh: ${escapeHTML(att.group.name || att.group.groupId)}\n`;
        }
        message += `   🚦 Holat: <b>${this.formatAttendanceStatus(att.status)}</b>\n`;
        if (att.isPaid !== null) {
          message += `   💸 To'langan: ${att.isPaid ? "✅ Ha" : "❌ Yo'q"}\n`;
        }
        message += `-----------\n`;
      });
      await ctx.replyWithHTML(message);
    } catch (e) {
      this.logger.error(`Davomatlar yuborishda xatolik (groupId: ${groupId}):`, e);
      await ctx.replyWithHTML("🚫 Davomat ma'lumotlarini olishda texnik xatolik yuz berdi.");
    }
  }

  private async sendScores(ctx: MyContext, groupId: string): Promise<void> {
    if (!ctx.session.loggedInStudentId || !ctx.session.loggedInStudentName) {
      this.logger.warn("sendScores chaqirildi, lekin loggedInStudentId yoki loggedInStudentName mavjud emas.");
      await this.redirectToLogin(ctx);
      return;
    }
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: ctx.session.loggedInStudentId },
        select: { ball: true },
      });
      let message = `⭐ <b>${escapeHTML(ctx.session.loggedInStudentName)}ning Ballari:</b>\n\n`;
      message += `🏆 Umumiy To'plangan Ball: <b>${student?.ball || 0}</b>\n`;
      const dailyFeedbackWhereClause: { studentId: string; groupId?: string } = { studentId: ctx.session.loggedInStudentId };
      let groupNameForTitle = "";
      if (groupId !== "ALL") {
        dailyFeedbackWhereClause.groupId = groupId;
        if (ctx.session.loggedInStudentGroups) {
          const selectedGroup = ctx.session.loggedInStudentGroups.find((g) => g.id === groupId);
          groupNameForTitle = selectedGroup ? ` (${escapeHTML(selectedGroup.name || selectedGroup.groupId)})` : "";
        }
        message += `\n📋 <b>Kundalik Baholar${groupNameForTitle} guruhida:</b>\n`;
      } else {
        message += `\n📋 <b>Barcha Guruhlar Bo'yicha Oxirgi Kundalik Baholar:</b>\n`;
      }
      const dailyFeedbacks = await this.prisma.dailyFeedback.findMany({
        where: dailyFeedbackWhereClause,
        orderBy: { feedbackDate: 'desc' },
        take: 10,
        include: { group: { select: { name: true, groupId: true } } },
      });
      if (dailyFeedbacks.length > 0) {
        dailyFeedbacks.forEach((fb) => {
          message += `------------------------------\n`;
          message += `📅 <b>Sana:</b> ${new Date(fb.feedbackDate).toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}\n`;
          if (groupId === "ALL" || !groupNameForTitle) {
            message += `🏢 Guruh: ${escapeHTML(fb.group.name || fb.group.groupId)}\n`;
          }
          message += `💯 Ball: <b>${fb.ball}</b>\n`;
          if (fb.feedback) {
            message += `💬 Fikr: <i>${escapeHTML(fb.feedback)}</i>\n`;
          }
        });
        message += `------------------------------\n`;
      } else {
        message += groupNameForTitle
          ? `${groupNameForTitle} guruhida kundalik baho va fikrlar hozircha mavjud emas.\n`
          : "📝 Kundalik baholar va fikrlar hozircha mavjud emas.\n";
      }
      await ctx.replyWithHTML(message);
    } catch (e) {
      this.logger.error(`Ballarni yuborishda xatolik (groupId: ${groupId}):`, e);
      await ctx.replyWithHTML("🚫 Ballarni olishda texnik xatolik yuz berdi.");
    }
  }

  private async clearLoginSession(ctx: MyContext): Promise<void> {
    ctx.session.loggedInParentPhone = undefined;
    ctx.session.loggedInAvailableStudents = undefined;
    ctx.session.loggedInStudentId = undefined;
    ctx.session.loggedInStudentName = undefined;
    ctx.session.loggedInStudentGroups = undefined;
    if (ctx.scene?.session?.state) {
      ctx.scene.session.state = {} as MyWizardState;
    }
  }

  private async redirectToLogin(ctx: MyContext, message?: string): Promise<void> {
    if (message) await ctx.replyWithHTML(escapeHTML(message));
    await this.clearLoginSession(ctx);
    await ctx.scene.enter(PARENT_LOGIN_SCENE_ID);
  }

  private formatAttendanceStatus(status: AttendanceStatus | null | undefined): string {
    if (!status) return "🏳️ Noma'lum";
    switch (status) {
      case AttendanceStatus.KELDI:
        return "✅ Keldi";
      case AttendanceStatus.KELMADI:
        return "❌ Kelmadi";
      case AttendanceStatus.KECHIKDI:
        return "🕒 Kechikdi";
      case AttendanceStatus.SABABLI:
        return "excused Sababli";
      default:
        return escapeHTML(status);
    }
  }

  private formatStudentStatus(status: Status | null | undefined): string {
    if (!status) return "🏳️ Noma'lum";
    switch (status) {
      case Status.FAOL:
        return "🟢 Faol";
      case Status.NOFAOL:
        return "🔴 Nofaol";
      case Status.TUGATGAN:
        return "🏁 Bitirgan";
      default:
        return escapeHTML(status);
    }
  }

  private formatPaymentType(type: PaymentType | null | undefined): string {
    if (!type) return "🏳️ Noma'lum";
    switch (type) {
      case PaymentType.NAQD:
        return "💵 Naqd pul";
      case PaymentType.KARTA:
        return "💳 Bank kartasi";
      case PaymentType.BANK:
        return "🏦 Bank o'tkazmasi";
      default:
        return escapeHTML(type);
    }
  }

  @OnEvent('attendance.created')
  async handleAttendanceCreatedEvent(event: AttendanceCreatedEvent): Promise<void> {
    this.logger.log(
      `Davomat hodisasi qabul qilindi: Talaba ${event.attendanceRecord.student?.firstName}, Ota-ona tel: ${event.studentParentPhone}`
    );
    if (!event.studentParentPhone) {
      this.logger.warn('AttendanceCreatedEvent da ota-ona telefoni yo\'q.');
      return;
    }

    try {
      const parentChat = await this.prisma.parentTelegramChat.findUnique({
        where: { parentPhone: event.studentParentPhone },
      });

      if (parentChat && parentChat.telegramChatId) {
        const attendance = event.attendanceRecord;
        const student = attendance.student;
        const group = attendance.group;

        if (!student || !group) {
          this.logger.error('Xabarnoma uchun davomat yozuvida o\'quvchi yoki guruh ma\'lumotlari yetarli emas.');
          return;
        }

        const studentName = `${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}`;
        const groupName = escapeHTML(group.name || group.groupId);
        const attendanceDate = formatDDMMYYYY(attendance.date);
        const attendanceStatus = this.formatAttendanceStatus(attendance.status);

        const message =
          `🔔 <b>Davomat Xabari</b> 🔔\n\n` +
          `👨‍🎓 O'quvchi: <b>${studentName}</b>\n` +      
          `👥 Guruh: <b>${groupName}</b>\n` +            
          `📆 Sana: <b>${attendanceDate}</b>\n` +        
          `📊 Holat: <b>${attendanceStatus}</b>\n\n` +   
          `<i>Hurmat bilan, ${escapeHTML("EDUNEX")}</i>`
          ;
        try {
          await this.bot.telegram.sendMessage(parentChat.telegramChatId, message, { parse_mode: 'HTML' });
          this.logger.log(`Davomat xabarnomasi ${parentChat.telegramChatId} (${studentName}, ${attendanceStatus}) ga yuborildi.`);
        } catch (botError: any) {
          this.logger.error(`Bot orqali xabar yuborishda xatolik (ChatID: ${parentChat.telegramChatId}):`, botError.message);
          if (botError.response && (botError.response.error_code === 403 || botError.response.error_code === 400)) {
            this.logger.warn(
              `Foydalanuvchi (ChatID: ${parentChat.telegramChatId}) botni bloklagan yoki chat mavjud emas. ParentTelegramChat yozuvini o'chirish mumkin.`
            );
          }
        }
      } else {
        this.logger.log(`Telegram chat ID topilmadi (Ota-ona tel: ${event.studentParentPhone}). Xabarnoma yuborilmadi.`);
      }
    } catch (error) {
      this.logger.error(`Davomat xabarnomasini yuborish jarayonida xatolik (Ota-ona tel: ${event.studentParentPhone}):`, error);
    }
  }

  @OnEvent('payment.created')
  async handlePaymentCreatedEvent(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(
      `To'lov hodisasi qabul qilindi: Talaba ${event.paymentRecord.student?.firstName}, Ota-ona tel: ${event.studentParentPhone}`
    );
    if (!event.studentParentPhone) {
      this.logger.warn('PaymentCreatedEvent da ota-ona telefoni yo\'q.');
      return;
    }

    try {
      const parentChat = await this.prisma.parentTelegramChat.findUnique({
        where: { parentPhone: event.studentParentPhone },
      });

      if (parentChat && parentChat.telegramChatId) {
        const payment = event.paymentRecord;
        const student = payment.student;

        if (!student) {
          this.logger.error('Xabarnoma uchun to\'lov yozuvida o\'quvchi ma\'lumotlari yetarli emas.');
          return;
        }

        const studentName = `${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}`;
        const paymentDate = formatDDMMYYYY(payment.date);
        const paymentAmount = payment.summa.toLocaleString('uz-UZ');
        const paymentType = this.formatPaymentType(payment.paymentType);
        const newBalance = student.balance?.toLocaleString('uz-UZ') || '0';
        const message =
          `💰 <b>To'lov Xabari</b> 💰\n\n` +
          `🎓 O'quvchi: <b>${studentName}</b>\n` +
          `   (ID: <code>${escapeHTML(student.studentId)}</code>)\n` +
          `📅 Sana: <b>${paymentDate}</b>\n` +
          `💳 Summa: <b>${paymentAmount} so'm</b>\n` +
          `🛒 To'lov turi: ${paymentType}\n` +
          `📊 Yangi balans: <b>${newBalance} so'm</b>\n\n` +
          `<i>Hurmat bilan, ${escapeHTML("EDUNEX")}</i>`;
        try {
          await this.bot.telegram.sendMessage(parentChat.telegramChatId, message, { parse_mode: 'HTML' });
          this.logger.log(`To'lov xabarnomasi ${parentChat.telegramChatId} (${studentName}, ${paymentAmount} so'm) ga yuborildi.`);
        } catch (botError: any) {
          this.logger.error(`Bot orqali to'lov xabarnomasini yuborishda xatolik (ChatID: ${parentChat.telegramChatId}):`, botError.message);
          if (botError.response && (botError.response.error_code === 403 || botError.response.error_code === 400)) {
            this.logger.warn(`Foydalanuvchi (ChatID: ${parentChat.telegramChatId}) botni bloklagan yoki chat mavjud emas.`);
          }
        }
      } else {
        this.logger.log(`Telegram chat ID topilmadi (Ota-ona tel: ${event.studentParentPhone}). To'lov xabarnomasi yuborilmadi.`);
      }
    } catch (error) {
      this.logger.error(`To'lov xabarnomasini yuborish jarayonida xatolik (Ota-ona tel: ${event.studentParentPhone}):`, error);
    }
  }
  @OnEvent('dailyfeedback.created')
  async handleDailyFeedbackCreatedEvent(event: DailyFeedbackCreatedEvent): Promise<void> {
    this.logger.log(
      `Kundalik fikr-mulohaza hodisasi qabul qilindi: O'quvchi ${event.feedbackRecord.student?.firstName}, Ota-ona tel: ${event.studentParentPhone}`
    );
    if (!event.studentParentPhone) {
      this.logger.warn('DailyFeedbackCreatedEvent da ota-ona telefoni yo\'q.');
      return;
    }

    try {
      const parentChat = await this.prisma.parentTelegramChat.findUnique({
        where: { parentPhone: event.studentParentPhone },
      });

      if (parentChat && parentChat.telegramChatId) {
        const feedback = event.feedbackRecord;
        const student = feedback.student;
        const group = feedback.group;

        if (!student || !group) {
          this.logger.error('Xabarnoma uchun fikr-mulohaza yozuvida o\'quvchi yoki guruh ma\'lumotlari yetarli emas.');
          return;
        }

        const studentName = `${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}`;
        const groupName = escapeHTML(group.name || group.groupId);
        const feedbackDate = formatDDMMYYYY(feedback.feedbackDate);

        let message = `📝 <b>Bugungi Baho</b> 📝\n\n`;
        message += `🎓 O'quvchi: <b>${studentName}</b>\n`;
        message += `🏢 Guruh: <b>${groupName}</b>\n`;
        message += `📅 Sana: <b>${feedbackDate}</b>\n`;
        message += `⭐ Ball: <b>${feedback.ball}</b>\n`;
        message += `💬 Fikr: <i>${escapeHTML(feedback.feedback)}</i>\n\n`;
        message += `<i>Hurmat bilan, ${escapeHTML("EDUNEX")}</i>`;

        try {
          await this.bot.telegram.sendMessage(parentChat.telegramChatId, message, { parse_mode: 'HTML' });
          this.logger.log(`Fikr-mulohaza xabarnomasi ${parentChat.telegramChatId} (${studentName}) ga yuborildi.`);
        } catch (botError: any) {
          this.logger.error(`Bot orqali fikr-mulohaza xabarnomasini yuborishda xatolik (ChatID: ${parentChat.telegramChatId}):`, botError.message);
          if (botError.response && (botError.response.error_code === 403 || botError.response.error_code === 400)) {
            this.logger.warn(`Foydalanuvchi (ChatID: ${parentChat.telegramChatId}) botni bloklagan yoki chat mavjud emas.`);
          }
        }
      } else {
        this.logger.log(`Telegram chat ID topilmadi (Ota-ona tel: ${event.studentParentPhone}). Fikr-mulohaza xabarnomasi yuborilmadi.`);
      }
    } catch (error) {
      this.logger.error(`Fikr-mulohaza xabarnomasini yuborish jarayonida xatolik (Ota-ona tel: ${event.studentParentPhone}):`, error);
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: "🚀 Botni ishga tushirish / Tizimga kirish" },
        { command: 'menu', description: "📋 Asosiy menyu" },
      ]);

      this.bot.launch().then(() => {
        this.logger.log(`✅ Ota-onalar uchun Telegram bot (xabarnomalar bilan) muvaffaqiyatli ishga tushirildi!`);
      }).catch((err) => {
        this.logger.error('❗️ [Launch Error] Botni ishga tushirishda xatolik:', err.message, err.stack);
      });
    } catch (error) {
      this.logger.error('❗️ Botni sozlash yoki ishga tushirishda xatolik:', error);
    }

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  public getBotInstance(): Telegraf<MyContext> {
    return this.bot;
  }
}