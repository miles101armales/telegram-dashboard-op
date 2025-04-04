import { Scenes } from 'telegraf';
import { Telegraf } from 'telegraf';
import { Scene } from '../classes/scene.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';

export class NoticeCommand extends Scene {
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(TelegramApi)
    private readonly telegramRepository: Repository<TelegramApi>,
  ) {
    super(client);
  }

  handle() {
    this.scene = new Scenes.WizardScene(
      'notice',
      async (ctx) => {
        ctx.reply(
          'Отправьте ваше сообщение',
        );
        ctx.wizard.next();
      },
      async (ctx: MyContext) => {
        ctx.forwardMessage('1810423951', {
          message_thread_id: ctx.message.message_thread_id,
        });
        ctx.reply('Сообщение отправлено /start');
        ctx.scene.leave();
      },
    );
  }
}
