import { Markup, Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { Repository } from 'typeorm';

export class StartCommand extends Command {
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(TelegramApi)
    private readonly telegramRepository: Repository<TelegramApi>,
  ) {
    super(client);
  }
  handle(): void {
    this.client.start(async (ctx) => {
      const existingUser = await this.telegramRepository.findOne({
        where: {
          chat_id: ctx.chat.id.toString(),
        },
      });
      const user = {
        chat_id: ctx.chat.id.toString(),
        name:
          ctx.from.first_name +
          ' ' +
          (ctx.from.last_name ? ctx.from.last_name : ''),
        username: ctx.from.username,
      };
      if (existingUser) {
        await this.telegramRepository.update(
          { chat_id: existingUser.chat_id },
          user,
        );
      } else {
        await this.telegramRepository.save(user);
      }
      this.session(ctx);
      // }
    });
  }

  async session(ctx: MyContext): Promise<void> {
    const authStatus = await this.telegramRepository.findOne({
      where: { chat_id: ctx.chat?.id.toString() },
    });
    if (authStatus.authorization) {
      ctx.reply('Выберите команду:', {
        reply_markup: {
          keyboard: [
            [{ text: '🏆Таблица лидеров🏆' }],
            [{ text: 'Мои закрытия' }, { text: 'Моя команда' }],
          ],
          resize_keyboard: true,
        },
      });
    } else {
      ctx.reply(
        'Запрос на авторизацию отправлен. Вам придет уведомление о готовности.\n\nОжидайте🆔...',
        {
          reply_markup: {
            keyboard: [[{ text: '👤Авторизация👤' }]],
            resize_keyboard: true,
          },
        },
      );
      this.client.telegram.sendMessage(
        1810423951,
        `Пользователь @${ctx.from.username} отправил запрос на авторизацию`,
      );
    }
  }
}
