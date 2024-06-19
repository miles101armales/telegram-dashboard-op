import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';

export class AuthCommand extends Command {
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
  ) {
    super(client);
  }

  async handle(): Promise<void> {
    this.client.action('auth', async (ctx) => {
      return this.handled(ctx);
    });

    this.client.command('auth', async (ctx) => {
      return this.handled(ctx);
    });

    this.client.hears('👤Авторизация👤', async (ctx) => {
      return this.handled(ctx);
    });

    this.client.hears('🔼Сменить аккаунт🔼', async (ctx) => {
      return this.handled_out(ctx);
    });
  }

  async handled(ctx): Promise<void> {
    // ctx.reply('Для авторизации введите вашу почту GetCourse');
    // this.client.hears(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, async (ctx) => {
    //   const authMail = ctx.msg.text;
    //   const existingClient = await this.managersRepository.findOne({
    //     where: { auth_mail: authMail },
    //   });

    //   if (existingClient) {
    //     this.telegramApiRepository.update(
    //       { username: ctx.from.username },
    //       { manager: existingClient.name, authorization: true },
    //     );
    //   }

    //   if (!existingClient) {
    //     ctx.reply('Неверная почта. Вас нет в базе данных, введите другую');
    //   }
    // });
    const existingClient = await this.telegramApiRepository.findOne({
      where: { chat_id: ctx.chat.id },
    });

    console.log(existingClient.manager);
    if (existingClient.manager) {
      ctx.replyWithHTML(
        `Привет, <b>${existingClient.manager}</b>\n\nНажми /start для начала работы с ботом!`,
      );
      this.telegramApiRepository.update(
        { chat_id: ctx.chat.id },
        { authorization: true },
      );
    } else {
      ctx.reply('Авторизация еще не пройдена. Ожидайте...');
    }
  }

  async handled_out(ctx): Promise<void> {
    ctx.reply('Вы уверены, что хотите выйти?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Да', callback_data: 'logout' },
            { text: 'Нет', callback_data: 'log' },
          ],
        ],
      },
    });

    this.client.action('logout', async (ctx) => {
      this.telegramApiRepository.update(
        { chat_id: ctx.chat.id.toString() },
        { manager: null, authorization: false },
      );
      ctx.reply('')
    });
  }
}
