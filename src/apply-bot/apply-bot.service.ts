import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  Telegraf,
  Markup,
  Scenes,
  session,
  Context as TelegrafBaseContext,
  Input,
} from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { Course, ApplicationStatus } from '@prisma/client';
import { TelegramError } from 'telegraf';

function escapeHTML(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface ApplicationData {
  courseId?: number;
  courseName?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  phoneNumber?: string;
}

interface MyWizardSessionData extends Scenes.WizardSessionData {
  applicationData: ApplicationData;
}

interface MyContext extends TelegrafBaseContext {
  session: Scenes.WizardSession<MyWizardSessionData>;
  scene: Scenes.SceneContextScene<MyContext, MyWizardSessionData>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}

export const APPLY_SCENE_ID = 'APPLY_SCENE';

@Injectable()
export class ApplyBotService implements OnModuleInit {
  private bot: Telegraf<MyContext>;
  private readonly logger = new Logger(ApplyBotService.name);

  constructor(private readonly prisma: PrismaService) {
    const apply_bot_token = process.env.COURSE_BOT_TOKEN;
    if (!apply_bot_token) {
      throw new Error('.env faylida application bot tokeni topilmadi!');
    }
    this.bot = new Telegraf<MyContext>(apply_bot_token);

    this.bot.use(
      session({
        defaultSession: (): Scenes.WizardSession<MyWizardSessionData> => ({
          __scenes: { cursor: 0, applicationData: {} } as MyWizardSessionData,
        }),
      }),
    );

    const stage = this.setupScenes();
    this.bot.use(stage.middleware());
    this.setupCommands();
  }

  private setupScenes(): Scenes.Stage<MyContext> {
    const applyWizard = new Scenes.WizardScene<MyContext>(
      APPLY_SCENE_ID,
      async (ctx) => {
        const initialPayload = ctx.scene.state as {
          applicationData?: ApplicationData;
        };
        ctx.scene.session.applicationData =
          initialPayload?.applicationData ||
          ctx.scene.session.applicationData ||
          {};
        const appData = ctx.scene.session.applicationData;

        if (appData.courseId && appData.courseName) {
          await ctx.replyWithHTML(
            `✅ Siz <b>${escapeHTML(appData.courseName)}</b> kursiga ariza topshirishni boshladingiz.\n\n📝 Iltimos, ismingizni kiriting:`,
          );
          return ctx.wizard.next();
        }

        if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
          const callbackData = ctx.callbackQuery.data;
          if (callbackData.startsWith('select_course_scene_')) {
            const parts = callbackData.split('_');
            const courseId = parseInt(parts[3], 10);
            if (isNaN(courseId)) {
              await ctx.answerCbQuery("⚠️ Kurs ID'si noto'g'ri!", {
                show_alert: true,
              });
              return ctx.scene.reenter();
            }

            const selectedCourse = await this.prisma.course.findUnique({
              where: { id: courseId },
            });
            if (!selectedCourse) {
              await ctx.answerCbQuery('⚠️ Kurs topilmadi!', {
                show_alert: true,
              });
              return ctx.scene.reenter();
            }

            appData.courseId = selectedCourse.id;
            appData.courseName = selectedCourse.name;
            await ctx.answerCbQuery(
              `✅ "${escapeHTML(selectedCourse.name)}" tanlandi`,
            );

            try {
              await ctx.editMessageText(
                `Tanlangan kurs: <b>${escapeHTML(selectedCourse.name)}</b>`,
                { parse_mode: 'HTML' },
              );
            } catch (e) {
              this.logger.warn(`Could not edit message text: ${e.message}`);
              await ctx.replyWithHTML(
                `Tanlangan kurs: <b>${escapeHTML(selectedCourse.name)}</b>`,
              );
            }

            await ctx.replyWithHTML('📝 Iltimos, ismingizni kiriting:');
            return ctx.wizard.next();
          }
        }

        const courses = await this.prisma.course.findMany({
          orderBy: { name: 'asc' },
        });
        if (!courses || courses.length === 0) {
          await ctx.replyWithHTML(
            '😔 Afsuski, hozirda mavjud kurslar topilmadi.',
          );
          return ctx.scene.leave();
        }

        const courseButtons = courses.map((course) =>
          Markup.button.callback(
            escapeHTML(course.name),
            `select_course_scene_${course.id}_${escapeHTML(course.name)}`,
          ),
        );
        await ctx.replyWithHTML(
          'Quyidagi kurslardan birini tanlang:',
          Markup.inlineKeyboard(courseButtons, { columns: 1 }),
        );
        return;
      },
      async (ctx) => {
        // Step 1: First Name
        if (ctx.message && 'text' in ctx.message && ctx.message.text.trim()) {
          ctx.scene.session.applicationData.firstName = ctx.message.text.trim();
          await ctx.replyWithHTML('👤 Iltimos, familiyangizni kiriting:');
          return ctx.wizard.next();
        }
        await ctx.replyWithHTML(
          '⚠️ Iltimos, ismingizni matn shaklida kiriting.',
        );
        return;
      },
      async (ctx) => {
        // Step 2: Last Name
        if (ctx.message && 'text' in ctx.message && ctx.message.text.trim()) {
          ctx.scene.session.applicationData.lastName = ctx.message.text.trim();
          await ctx.replyWithHTML(
            '🔢 Iltimos, yoshingizni kiriting (faqat raqamda, masalan, <b>25</b>):',
          );
          return ctx.wizard.next();
        }
        await ctx.replyWithHTML(
          '⚠️ Iltimos, familiyangizni matn shaklida kiriting.',
        );
        return;
      },
      async (ctx) => {
        // Step 3: Age
        if (ctx.message && 'text' in ctx.message) {
          const age = parseInt(ctx.message.text.trim(), 10);
          if (isNaN(age) || age <= 3 || age > 100) {
            await ctx.replyWithHTML(
              "⚠️ Iltimos, yoshingizni to'g'ri raqamda kiriting (masalan, <b>25</b>). 3 yoshdan 100 yoshgacha bo'lishi kerak.",
            );
            return;
          }
          ctx.scene.session.applicationData.age = age;
          await ctx.replyWithHTML(
            '📞 Iltimos, telefon raqamingizni kiriting (masalan, <b>+998901234567</b>):',
          );
          return ctx.wizard.next();
        }
        await ctx.replyWithHTML(
          '⚠️ Iltimos, yoshingizni raqam shaklida kiriting.',
        );
        return;
      },
      async (ctx) => {
        // Step 4: Phone Number and Submission
        if (ctx.message && 'text' in ctx.message) {
          const phoneNumber = ctx.message.text.trim();
          if (!/^\+?\d{9,15}$/.test(phoneNumber)) {
            await ctx.replyWithHTML(
              "⚠️ Iltimos, telefon raqamingizni to'g'ri formatda kiriting (masalan, <b>+998901234567</b> yoki <b>998901234567</b>).",
            );
            return;
          }
          ctx.scene.session.applicationData.phoneNumber = phoneNumber;

          if (!ctx.from) {
            this.logger.error('ctx.from aniqlanmagan.');
            await ctx.replyWithHTML(
              "😔 Texnik muammo yuz berdi. Iltimos, qaytadan urinib ko'ring.",
            );
            return ctx.scene.leave();
          }

          const telegramId = ctx.from.id.toString();
          const appData = ctx.scene.session.applicationData;

          if (
            !appData ||
            !appData.courseId ||
            !appData.firstName ||
            !appData.lastName ||
            !appData.age ||
            appData.phoneNumber === undefined
          ) {
            await ctx.replyWithHTML(
              "🚫 Ma'lumotlar to'liq emas. Iltimos, boshidan boshlang.",
            );
            this.logger.error("To'liq bo'lmagan ma'lumotlar:", appData);
            return ctx.scene.leave();
          }

          try {
            const newApplication = await this.prisma.application.create({
              data: {
                courseId: appData.courseId,
                telegramId,
                firstName: appData.firstName,
                lastName: appData.lastName,
                age: appData.age,
                phoneNumber: appData.phoneNumber,
                status: ApplicationStatus.KUTILYABDI,
              },
            });
            this.logger.log(
              `Yangi ariza: ${newApplication.id}, user: ${telegramId}`,
            );

            const course = await this.prisma.course.findUnique({
              where: { id: appData.courseId },
            });
            const messageText = `
🎉 <b>Rahmat! Arizangiz muvaffaqiyatli qabul qilindi.</b>

🎓 <b>Kurs:</b> ${escapeHTML(course?.name || "Noma'lum kurs")}
📝 <b>Ism:</b> ${escapeHTML(appData.firstName)}
👤 <b>Familiya:</b> ${escapeHTML(appData.lastName)}
🔢 <b>Yosh:</b> ${appData.age}
📞 <b>Telefon:</b> ${escapeHTML(appData.phoneNumber)}

⏳ <i>Tez orada siz bilan bog'lanamiz.</i>`;
            await ctx.replyWithHTML(messageText);
          } catch (error) {
            this.logger.error(
              `Arizani saqlashda xatolik: ${error.message}`,
              error.stack,
            );
            await ctx.replyWithHTML(
              "😔 Arizani saqlashda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
            );
          }
          return ctx.scene.leave();
        }
        await ctx.replyWithHTML(
          "⚠️ Iltimos, telefon raqamingizni to'g'ri formatda kiriting.",
        );
        return;
      },
    );

    // Cancel command
    applyWizard.command('cancel', async (ctx) => {
      await ctx.replyWithHTML("❌ Ariza to'ldirish bekor qilindi.");
      ctx.scene.session.applicationData = {};
      return ctx.scene.leave();
    });

    // Cancel text
    applyWizard.hears(/^(bekor|отмена)$/i, async (ctx) => {
      await ctx.replyWithHTML("❌ Ariza to'ldirish bekor qilindi.");
      ctx.scene.session.applicationData = {};
      return ctx.scene.leave();
    });

    return new Scenes.Stage<MyContext>([applyWizard], { ttl: 10 * 60 * 1000 });
  }

  private setupCommands() {
    this.bot.command('start', async (ctx) => {
      await ctx.sendChatAction('typing');
      const userName = ctx.from?.first_name || 'Hurmatli foydalanuvchi';
      await ctx.replyWithHTML(
        `Assalomu alaykum, <b>${escapeHTML(userName)}</b>! 👋\n\nEDUNEXT telegram botiga xush kelibsiz!\nBu yerda siz kurslarimizga oson ariza topshirishingiz va ular haqida ma'lumot olishingiz mumkin.`,
        Markup.keyboard([
          ['✍️ Kursga Yozilish'],
          ['📚 Kurslarimiz', "📞 Bog'lanish"],
          ['ℹ️ Yordam'],
        ]).resize(),
      );
    });

    const handleApplyStart = async (ctx: MyContext) => {
      await ctx.sendChatAction('upload_photo');
      try {
        await ctx.replyWithPhoto(
          Input.fromLocalFile('src/apply-bot/images/application.png'),
          {
            caption: `<b>Bizda mavjud kurslar quyida berilgan</b>`,
            parse_mode: 'HTML',
          },
        );
      } catch (e) {
        this.logger.error('Failed to send images/application.png', e.stack);
      }

      const initialSceneState = { applicationData: {} };
      ctx.scene.enter(APPLY_SCENE_ID, initialSceneState);
    };

    this.bot.hears('✍️ Kursga Yozilish', handleApplyStart);
    this.bot.command('apply', handleApplyStart);

    this.bot.hears('📚 Kurslarimiz', async (ctx) =>
      this.handleCoursesCommand(ctx),
    );
    this.bot.hears("📞 Bog'lanish", async (ctx) =>
      this.handleContactUsCommand(ctx),
    );
    this.bot.hears('ℹ️ Yordam', async (ctx) => this.handleHelpCommand(ctx));

    this.bot.command('courses', async (ctx) => this.handleCoursesCommand(ctx));
    this.bot.command('contact_us', async (ctx) =>
      this.handleContactUsCommand(ctx),
    );
    this.bot.command('help', async (ctx) => this.handleHelpCommand(ctx));

    this.bot.action(/apply_direct_(\d+)_([\s\S]+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const courseId = parseInt(ctx.match[1], 10);
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        await ctx.replyWithHTML(
          "⚠️ Tanlangan kurs topilmadi. Iltimos, qaytadan urinib ko'ring.",
        );
        return;
      }
      const initialSceneState = {
        applicationData: { courseId, courseName: course.name },
      };
      await ctx.sendChatAction('upload_photo');
      try {
        await ctx.replyWithPhoto(
          Input.fromLocalFile('src/apply-bot/images/application.png'),
        );
      } catch (e) {
        this.logger.error(
          'Failed to send images/application.png for direct apply',
          e.stack,
        );
      }
      ctx.scene.enter(APPLY_SCENE_ID, initialSceneState);
    });

    this.bot.on('text', (ctx) => {
      if (!ctx.scene?.current) {
        ctx.replyWithHTML(
          "🚫 Noma'lum buyruq. Iltimos, asosiy menyudagi tugmalardan foydalaning.",
        );
      }
    });
  }

  private async handleCoursesCommand(ctx: MyContext) {
    await ctx.sendChatAction('typing');

    const courses = await this.prisma.course.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });

    if (courses.length === 0) {
      await ctx.replyWithHTML(
        "😔 Afsuski, hozirda mavjud kurslar yo'q. Tez orada yangi kurslar qo'shiladi! Bizni kuzatib boring.",
      );
      return;
    }

    let courseListMessage =
      "📚 <b><i>Quyida bizning markazimizda mavjud bo'lgan kurslar ro'yxati va ularning tavsifi keltirilgan:</i></b>\n\n";

    courseListMessage += '╭─────────────────────╮\n';
    courses.forEach((course, index) => {
      courseListMessage += `🎓 <b>${escapeHTML(course.name)}</b>\n`;
      if (course.description) {
        courseListMessage += `📝 <code><i>Tavsif:</i> ${escapeHTML(course.description)}</code>\n`;
      }
      if (index < courses.length - 1) {
        courseListMessage += '\n──────────────────────\n\n';
      } else {
        courseListMessage += '\n';
      }
    });
    courseListMessage += '╰─────────────────────╯\n';

    // Inline keyboard creation
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: '✍️ Ariza topshirish', callback_data: 'start_application' }],
      ],
    };

    try {
      await ctx.sendChatAction('upload_photo');
      await ctx.replyWithPhoto(
        Input.fromLocalFile('src/apply-bot/images/courses.png'),
        {
          caption: courseListMessage,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        },
      );
    } catch (e) {
      this.logger.error(
        'Failed to send images/courses.png with caption. Sending text message instead.',
        e.stack,
      );
      await ctx.replyWithHTML(courseListMessage, {
        reply_markup: inlineKeyboard,
      });
    }
  }

  private async handleContactUsCommand(ctx: MyContext) {
    await ctx.sendChatAction('typing');
    const contactMessage = `📞 <b>Biz bilan bog'lanish:</b>

🏢 <b>Manzil:</b> <a href="https://maps.google.com/maps?q=41.348577,69.167168&ll=41.348577,69.167168&z=16">Xaritada ko'rish</a>
☎️ <b>Telefon:</b> <a href="tel:+998945895766">+998 94 589 57 66</a>
🌐 <b>Vebsayt:</b> <a href="https://edunex.uz">edunex.uz</a>
📱 <b>Admin:</b> @ibrohimovkamron

<i>Agar savollaringiz bo'lsa, bemalol murojaat qiling!</i>`;

    try {
      await ctx.sendChatAction('upload_photo');
      await ctx.replyWithPhoto(
        Input.fromLocalFile('src/apply-bot/images/contact.png'),
        {
          caption: contactMessage,
          parse_mode: 'HTML',
        },
      );
    } catch (e) {
      this.logger.error(
        'Failed to send images/contact.png with caption. Sending text message instead.',
        e.stack,
      );
      await ctx.replyWithHTML(contactMessage);
    }
  }

  private async handleHelpCommand(ctx: MyContext) {
    await ctx.sendChatAction('upload_photo');

    const helpMessage = `
<b>ℹ️ Yordam: Foydalanish Qo'llanmasi</b>

🤖 <b>Bot nima uchun kerak?</b>
O‘quv markazimiz kurslariga tez va oson ariza topshirish uchun yaratilgan.

📋 <b>Asosiy buyruqlar:</b>
🔹 <code>/start</code> — Botni ishga tushurish  
🔹 ✍️ <b>Ariza topshirish</b> — Yangi ariza yuborish  
🔹 📚 <b>Kurslarimiz</b> — Kurslar ro‘yxati  
🔹 📞 <b>Bog‘lanish</b> — Aloqa ma’lumotlari  
🔹 ℹ️ <b>Yordam</b> — Ushbu xabarni ko‘rsatish

📝 <b>Ariza topshirish tartibi:</b>
Arizani to‘ldirishni istalgan vaqtda to‘xtatish uchun:
↩️ <code>/cancel</code> yoki <i>"bekor"</i> deb yozing.

✨ <i>O‘qishingizda omad tilaymiz!</i>
`;

    await ctx.replyWithPhoto(
      Input.fromLocalFile('src/apply-bot/images/help.png'),
      {
        caption: helpMessage,
        parse_mode: 'HTML',
      },
    );
  }

  async onModuleInit() {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: '🚀 Botni ishga tushirish' },
        { command: 'apply', description: '✍️ Yangi ariza topshirish' },
        { command: 'courses', description: '📚 Mavjud kurslarimiz' },
        { command: 'contact_us', description: "📞 Bog'lanish" },
        { command: 'help', description: 'ℹ️ Yordam' },
        { command: 'cancel', description: '❌ Jarayonni bekor qilish' },
      ]);

      this.bot
        .launch()
        .then(() => {
          this.logger.log(
            '✅ Telegram bot (HTML dizayn + Rasm) muvaffaqiyatli ishga tushirildi!',
          );
        })
        .catch((err) => {
          this.logger.error(
            '❗️ [Launch Error] Telegram botni ishga tushirishda xatolik:',
            err.message,
            err.stack,
          );
        });
    } catch (error) {
      if (error instanceof TelegramError) {
        this.logger.error(
          `❗️ Telegram API xatoligi: ${error.description} (kod: ${error.code})`,
          error.stack,
        );
      } else {
        this.logger.error(
          '❗️ Bot buyruqlarini sozlash yoki botni ishga tushirishda xatolik:',
          error.stack,
        );
      }
    }

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  getBotInstance(): Telegraf<MyContext> {
    return this.bot;
  }
}
