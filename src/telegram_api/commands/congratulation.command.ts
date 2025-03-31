import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';
import { Command } from '../classes/command.class';
import { TelegramApi } from '../entities/telegram_api.entity';
import { MyContext } from '../interfaces/context.interface';
import { TelegramApiService } from '../telegram_api.service';
import { ConfigService } from '@nestjs/config';
import { managerMap } from './constants';

export class CongratulationCommand extends Command {
  private readonly logger = new Logger(CongratulationCommand.name);

  constructor(
    public client: Telegraf<MyContext>,
    private readonly configService: ConfigService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
  ) {
    super(client);
  }

  private async getManagerName(message: {
    text: string;
  }): Promise<string | null> {
    const checkformanager = message?.text?.split(
      /[\uD800-\uDBFF][\uDC00-\uDFFF]|\s/,
    )[1];
    return managerMap[checkformanager] || null;
  }

  private async sendCongratulation(ctx, managerName: string): Promise<void> {
    const managers = await this.managersRepository.find();
    for (const manager of managers) {
      if (manager.name === managerName) {
        const client = await this.telegramApiRepository.findOne({
          where: { manager: manager.name },
        });
        if (client) {
          this.logger.log(`Поздравление отправлено ${manager.name}`);
          ctx.editMessageReplyMarkup({ inline_keyboard: [] });
          await ctx.reply('Поздравление отправлено');
          await ctx.telegram.sendMessage(
            client.chat_id,
            `${ctx.from.username} поздравляет вас с закрытием!`,
          );
        } else {
          await ctx.telegram.sendMessage(
            1810423951,
            'Ошибка отправки поздравления',
          );
        }
        return;
      }
    }
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    this.logger.log(`Клиент не найден: ${managerName}`);
  }

  async handle(): Promise<void> {
    this.client.action('cb_congratulation', async (ctx) => {
      const message = ctx.update.callback_query.message as unknown as {
        text: string;
      };
      const managerName = await this.getManagerName(message);
      if (managerName) {
        this.logger.log(
          `${ctx.from.username} запуск колбэка поздравления ${managerName}`,
        );
        await this.sendCongratulation(ctx, managerName);
      } else {
        this.logger.log(
          `Имя менеджера не найдено в сообщении: ${message?.text}`,
        );
      }
    });
  }
}
