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
  public monthName: string;
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
    const month = new Date(); // Создаем объект Date для текущей даты
    const month_formatted = month.toISOString().split('T')[0]; // Получаем дату в формате 'YYYY-MM-DD'

    // Массив с названиями месяцев
    const monthNames = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];

    // Получаем номер месяца из даты
    const monthNumber = new Date(month_formatted).getMonth();

    // Получаем название месяца из массива monthNames
    this.monthName = monthNames[monthNumber];
    this.client.hears('⚡Мои закрытия' || 'Мои закрытия', async (ctx) => {
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
      return this.my_command_handled(ctx);
    });

    this.client.hears('⚡Статистика', async (ctx) => {
      return this.my_command_handled(ctx);
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

    if (statistics) {
      return ctx.replyWithHTML(
        `<b>Твоя статистика за ${this.monthName}</b>\n\n` +
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
    const client = await this.telegramApiRepository.findOne({
      where: { chat_id: ctx.chat.id },
    });
    const manager = await this.managersRepository.findOne({
      where: { name: client.manager },
    });

    if (manager) {
      if (client.role === 'manager') {
        return ctx.replyWithHTML(
          `Статистика по команде\n\n` +
            `<code>${manager.team}</code>\n\n` +
            `Выполнение плана за ${this.monthName}: вычисляется`,
        );
      }
      if (client.role === 'admin') {
        return ctx.replyWithHTML(
          `Статистика по твоей команде <b>${manager.team} за ${this.monthName}</b>\n\n` +
            `Объём продаж: -\n` +
            `Динамика продаж: -\n` +
            `Конверсионные показатели менеджеров: -\n` +
            `Средний чек менеджеров -\n` +
            `Целевые показатели и KPI: -\n\n` +
            `Получение данных в разработке, при корректировке показателей обращайтесь @milesarmales`,
        );
      }
      if (client.role === 'ROP') {
        return ctx.replyWithHTML(
          `Статистика по твоей команде <b>${manager.team} за ${this.monthName}</b>\n\n` +
            `Объём продаж: -\n` +
            `Динамика продаж: -\n` +
            `Конверсионные показатели отдела: -\n` +
            `Средний чек отдела: -\n` +
            `Воронка продаж отдела: -\n` +
            `Продуктовые метрики: -\n` +
            `Эффективность отдела: -\n` +
            `Целевые показатели и KPI: -\n\n` +
            `Получение данных в разработке, при корректировке показателей обращайтесь @milesarmales`,
        );
      }
    }
  }
}
