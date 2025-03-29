import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { In, Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { Logger } from '@nestjs/common';
import { Sales } from 'src/sales_plan/entities/sales.entity';
import { monthNames } from './constants';

export class MySalesCommand extends Command {
  private readonly logger = new Logger(MySalesCommand.name);
  public monthName: string;
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
  ) {
    super(client);
  }

  async handle(): Promise<void> {
    const month = new Date(); // Создаем объект Date для текущей даты
    const month_formatted = month.toISOString().split('T')[0]; // Получаем дату в формате 'YYYY-MM-DD'

    // Получаем номер месяца из даты
    const monthNumber = new Date(month_formatted).getMonth();

    // Получаем название месяца из массива monthNames
    this.monthName = monthNames[monthNumber];
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

    let percentageGoal;

    const perosnalMonthlyGoal = statistics.personal_monthly_goal
      ? Number(statistics.personal_monthly_goal)
      : 'Значение не указано';
    if (perosnalMonthlyGoal !== 'Значение не указано') {
      percentageGoal = (statistics.monthly_sales / perosnalMonthlyGoal) * 100;
    } else {
      percentageGoal = null;
    }

    if (statistics) {
      return ctx.replyWithHTML(
        `<b>Твоя статистика за ${this.monthName}</b>\n\n` +
          `Личный лан / Факт: <b>${perosnalMonthlyGoal} / ${statistics.monthly_sales}</b> (${percentageGoal ? percentageGoal.toFixed(2) : 0}%)\n` +
          `Средний чек: <b>${statistics.avgPayedPrice}</b>\n` +
          `Зарплата (без аванса): <b>${statistics.salary}</b>\n` +
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
      where: { chat_id: ctx.chat.id.toString() },
    });

    if (!client) {
      return ctx.replyWithHTML('Не удалось найти данные пользователя.');
    }

    const manager = await this.managersRepository.findOne({
      where: { name: client.manager },
    });

    if (!manager || !manager.team) {
      return ctx.replyWithHTML('Не удалось найти данные команды.');
    }

    // Находим всех менеджеров в той же команде
    const teamManagers = await this.managersRepository.find({
      where: { team: manager.team },
    });

    if (!teamManagers.length) {
      return ctx.replyWithHTML('Нет данных о менеджерах в этой команде.');
    }

    const managerNames = teamManagers.map((m) => m.name);

    // Находим все продажи, совершенные менеджерами этой команды
    const sales = await this.salesRepository.find({
      where: { managerName: In(managerNames) },
    });

    if (!sales.length) {
      return ctx.replyWithHTML('Нет данных о продажах.');
    }

    // Расчет метрик по команде
    const totalSalesVolume = sales.reduce(
      (sum, sale) => sum + parseFloat(sale.profit || '0'),
      0,
    );
    const quantityOfSales = sales.length;
    const avgCheck = totalSalesVolume / quantityOfSales;

    const monthlyGoal = teamManagers.reduce(
      (sum, m) => sum + parseFloat(m.personal_monthly_goal || '0'),
      0,
    );
    const performance = monthlyGoal
      ? (totalSalesVolume / monthlyGoal) * 100
      : null;

    const teamName = manager.team;
    const monthName = 'Август'; // Предположим, что это фиксированный месяц для примера

    let replyMessage = `Статистика по твоей команде <b>${teamName} за ${this.monthName}</b>\n\n`;
    replyMessage += `Объём продаж: ${totalSalesVolume.toFixed(2)}\n`;
    replyMessage += `Количество продаж: ${quantityOfSales}\n`;
    replyMessage += `Средний чек: ${avgCheck.toFixed(2)}\n`;

    if (performance) {
      replyMessage += `Выполнение плана: ${performance.toFixed(2)}%\n`;
    } else {
      replyMessage += `Выполнение плана: недоступно (отсутствует цель по продажам).\n`;
    }

    if (client.role === 'admin') {
      // Дополнительные метрики для админа
      replyMessage += `Конверсионные показатели менеджеров: рассчитывается...\n`;
      replyMessage += `Целевые показатели и KPI: недоступны (недостаточно данных).\n`;
    }

    if (client.role === 'ROP') {
      // Дополнительные метрики для ROP
      replyMessage += `Динамика продаж: рассчитывается...\n`;
      replyMessage += `Эффективность отдела: рассчитывается...\n`;
    }

    return ctx.reply(replyMessage, { parse_mode: 'HTML' });
  }
}
