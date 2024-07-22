import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';
import { Command } from '../classes/command.class';
import { TelegramApi } from '../entities/telegram_api.entity';
import { MyContext } from '../interfaces/context.interface';
import { MySalesCommand } from './my-sales.command';
import { TelegramApiService } from '../telegram_api.service';
import { ConfigService } from '@nestjs/config';

export class CongratulationCommand extends Command {
  private readonly logger = new Logger(MySalesCommand.name);
  private telegramApiService: TelegramApiService;
  constructor(
    public client: Telegraf<MyContext>,
    private readonly configService: ConfigService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
  ) {
    super(client);
    this.telegramApiService = new TelegramApiService(
      this.configService,
      this.managersRepository,
      this.telegramApiRepository,
    );
  }

  async handle(): Promise<void> {
    this.client.action('cb_congratulation', async (ctx) => {
      console.log(ctx.from);
      const message = ctx.update.callback_query.message as unknown as {
        text: string;
      };
      if (message && message.text) {
        console.log(message.text);
      } else {
        console.log('Текст сообщения не найден');
      }
      const managerName = this.telegramApiService.managerName;
      this.logger.log(
        ctx.from.username + ` запуск колбэка поздравления ` + managerName,
      );
      const managers = await this.managersRepository.find();
      //   for (const manager of managers) {
      //     if (manager.name.includes(managerName)) {
      //       const client = await this.telegramApiRepository.findOne({
      //         where: { name: manager.name },
      //       });
      //       if (client) {
      //         this.logger.log('Поздравление отправлено');
      //         ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      //         ctx.reply('Поздравление отправлено');
      //         return ctx.telegram.sendMessage(
      //           client.chat_id,
      //           `${ctx.from.username} поздравляет вас с закрытием!`,
      //         );
      //       } else {
      //         return ctx.telegram.sendMessage(
      //           1810423951,
      //           `Ошибка отправки поздравления`,
      //         );
      //       }
      //     } else {
      //       ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      //       this.logger.log('Клиент не найден');
      //     }
      //   }
    });
  }
}
