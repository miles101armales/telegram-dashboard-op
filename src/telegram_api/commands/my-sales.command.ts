import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { Logger } from '@nestjs/common';

export class MySalesCommand extends Command {
  private readonly logger = new Logger(MySalesCommand.name);
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
    this.client.hears('⚡Мои закрытия', async (ctx) => {
      const authStatus = (await this.telegramApiRepository.findOne({
        where: { chat_id: ctx.chat.id.toString() },
      }))
        ? await this.telegramApiRepository.findOne({
            where: { chat_id: ctx.chat.id.toString() },
          })
        : undefined;
      if (authStatus.authorization) {
        this.handled(ctx);
        this.client.action('personal_goal_edit', async (ctx) => {
          this.personalGoalEdit(ctx);
        });
      } else {
        ctx.reply('Авторизация не пройдена, /auth');
      }
    });
    this.client.hears('❤️‍🔥Моя команда', async (ctx) => {
      return ctx.replyWithHTML('В разработке');
    });
  }

  async handled(ctx: MyContext) {
    this.logger.log(`${ctx.from.username} запросил команду "Мои закрытия"`);
    const manager = await this.telegramApiRepository.findOne({
      where: { chat_id: ctx.chat.id.toString() },
    });
    const statistics = await this.managersRepository.findOne({
      where: { name: manager.manager },
    });
    const month = new Date();
    const month_formatted = month.toISOString().split('T')[0];
    if (statistics) {
      return ctx.replyWithHTML(
        `<b>Твоя статистика за ${month_formatted}</b>\n\n` +
          `План / Факт: <b>${statistics.personal_monthly_goal} / ${statistics.monthly_sales}</b>\n` +
          `Средний чек: <b>${statistics.avgPayedPrice}</b>\n` +
          `Холодная сделка: <b>${statistics.salary}</b>\n` +
          `Команда: <b>${statistics.team}</b>`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Изменить личный план',
                  callback_data: 'personal_goal_edit',
                },
              ],
            ],
          },
        },
      );
    } else {
      return ctx.reply('Данных нет');
    }
  }

  async personalGoalEdit(ctx) {
    ctx.reply('Введите ваш личный план');
    const manager = await this.telegramApiRepository.findOne({
      where: { chat_id: ctx.chat.id.toString() },
    });
    this.client.hears(/^\d{7}$/, async (ctx) => {
      const status = await this.managersRepository.update(
        { name: manager.manager },
        { personal_monthly_goal: ctx.msg.text },
      );
      if (status) {
        ctx.reply('Данные изменены\n\n/start');
        this.logger.log(
          `${ctx.from.username} изменил свой личный план на ${ctx.msg.text}`,
        );
      }
    });
  }

  async my_command_handled(ctx) {
    this.logger.log(`${ctx.from.username} запросил команду "Моя команда"`);
    const clients = await this.telegramApiRepository.find();
    for (const client of clients) {
      const command = await this.managersRepository.findOne({
        where: { name: client.manager },
      });
      if (client) {
        if (client.role === 'manager') {
          return ctx.replyWithHTML(`Чья комманда: <b>${command.team}</b>`);
        }
        if (client.role === 'admin') {
          return ctx.replyWithHTML();
        }
      }
    }
  }
}
