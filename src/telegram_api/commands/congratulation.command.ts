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
  public manager_name: string;
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
      const message = ctx.update.callback_query.message as unknown as {
        text: string;
      };
      if (message && message.text) {
        this.manager_name = message.text.split(
          /[\uD800-\uDBFF][\uDC00-\uDFFF]|\s/,
        )[1];
      } else {
        console.log('Текст сообщения не найден');
      }

      console.log(this.manager_name);

      this.logger.log(
        ctx.from.username + ` запуск колбэка поздравления ` + this.manager_name,
      );
      const managers = await this.managersRepository.find();
      for (const manager of managers) {
        if (manager.name.includes(this.manager_name)) {
          const client = await this.telegramApiRepository.findOne({
            where: { name: manager.name },
          });
          if (client) {
            this.logger.log('Поздравление отправлено');
            // ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            ctx.reply('Поздравление отправлено');
            return ctx.telegram.sendMessage(
              client.chat_id,
              `${ctx.from.username} поздравляет вас с закрытием!`,
            );
          } else {
            return ctx.telegram.sendMessage(
              1810423951,
              `Ошибка отправки поздравления`,
            );
          }
        } else {
          // ctx.editMessageReplyMarkup({ inline_keyboard: [] });
          this.logger.log('Клиент не найден');
        }
      }
    });
  }
}
