import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';
import { Command } from '../classes/command.class';
import { TelegramApi } from '../entities/telegram_api.entity';
import { MyContext } from '../interfaces/context.interface';

export class CongratulationCommand extends Command {
  private readonly logger = new Logger(CongratulationCommand.name);

  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
  ) {
    super(client);
  }

  private async getManagerName(message: { text: string }): Promise<string | null> {
    const match = message?.text?.match(/🎉([А-Яа-яЁё\s-]+)(?=\s+закрыл)/);
    return match?.[1]?.trim() || null;
  }

  private async sendCongratulation(ctx, managerName: string): Promise<void> {
    try {
      const client = await this.telegramApiRepository.findOne({
        where: { manager: managerName },
      });

      if (!client) {
        throw new Error(`Менеджер не найден: ${managerName}`);
      }

      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.telegram.sendMessage(
        client.chat_id,
        `🎉 @${ctx.from.username} поздравляет вас с успешным закрытием сделки! 🎊`,
      );
      
      this.logger.log(`Поздравление успешно отправлено ${managerName}`);
      await ctx.reply('✅ Поздравление отправлено');
    } catch (error) {
      this.logger.error(`Ошибка отправки поздравления: ${error.message}`);
      await ctx.reply('❌ Не удалось отправить поздравление');
    }
  }

  async handle(): Promise<void> {
    this.client.action('cb_congratulation', async (ctx) => {
      try {
        const message = ctx.update.callback_query.message as unknown as { text: string };
        const managerName = await this.getManagerName(message);
        
        if (!managerName) {
          throw new Error(`Не удалось определить менеджера из сообщения: ${message?.text}`);
        }

        this.logger.log(`${ctx.from.username} отправляет поздравление → ${managerName}`);
        await this.sendCongratulation(ctx, managerName);
      } catch (error) {
        this.logger.error(error.message);
        await ctx.reply('❌ Произошла ошибка при обработке поздравления');
      }
    });
  }
}
