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
      // const username = ctx.from.username;
      // const user = {
      //   name: ctx.from.first_name + ' ' + ctx.from.last_name,
      //   username,
      // };

      // await this.telegramRepository.save(user);

      // if (authorization.authorization === false) {
      //   ctx.replyWithHTML('<b>Авторизация</b>\n\nВведите вашу почту:');
      //   this.client.hears(
      //     /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com|mail\.ru)$/,
      //     (ctx) => {
      //       this.session(ctx);
      //     },
      //   );
      // } else {
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
