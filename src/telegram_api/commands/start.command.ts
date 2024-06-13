import { Telegraf } from 'telegraf';
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
          chat_id: ctx.chat.id,
        },
      });
      const user = {
        chat_id: ctx.chat.id,
        name: ctx.from.first_name + ' ' + ctx.from.last_name,
        username: ctx.from.username,
      };
      if (existingUser) {
        this.telegramRepository.update({ chat_id: existingUser.chat_id }, user);
      } else {
        this.telegramRepository.save(user);
      }
      this.session(ctx);
      // }
    });
  }

  session(ctx: MyContext): void {
    ctx.reply('Выберите команду:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Leaderboard🥇', callback_data: 'leaderboard' }],
        ],
      },
    });
  }
}
