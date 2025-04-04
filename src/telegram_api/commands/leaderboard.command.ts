import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { SalesPlanService } from 'src/sales_plan/sales_plan.service';
import { Logger } from '@nestjs/common';
import { GetcourseApi } from 'src/getcourse_api/entities/getcourse_api.entity';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { managerFullNameMap } from './constants';

export class LeaderboardCommand extends Command {
  private nowDateGc: string;
  private readonly logger = new Logger(LeaderboardCommand.name);
  leaderboard: {
    manager: string;
    sales: number;
    plan: number;
    avgPayedPrice: number;
  }[];
  fact: number;
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramApiRepository: Repository<TelegramApi>,
    @InjectRepository(GetcourseApi)
    private readonly exportsRepository: Repository<GetcourseApi>,
  ) {
    super(client);
  }

  async handle(): Promise<void> {
    this.client.action('leaderboard', async (ctx) => {
      const authStatus = (await this.telegramApiRepository.findOne({
        where: { chat_id: ctx.chat.id.toString() },
      }))
        ? await this.telegramApiRepository.findOne({
            where: { chat_id: ctx.chat.id.toString() },
          })
        : undefined;
      if (authStatus.authorization) {
        this.handled(ctx);
      } else {
        ctx.reply('Авторизация не пройдена, /auth');
      }
    });

    this.client.command('leaderboard', async (ctx) => {
      const authStatus = (await this.telegramApiRepository.findOne({
        where: { chat_id: ctx.chat.id.toString() },
      }))
        ? await this.telegramApiRepository.findOne({
            where: { chat_id: ctx.chat.id.toString() },
          })
        : undefined;
      if (authStatus.authorization) {
        this.handled(ctx);
      } else {
        ctx.reply('Авторизация не пройдена, /auth');
      }
    });

    this.client.hears('🏆Таблица лидеров🏆', async (ctx) => {
      const authStatus = (await this.telegramApiRepository.findOne({
        where: { chat_id: ctx.chat.id.toString() },
      }))
        ? await this.telegramApiRepository.findOne({
            where: { chat_id: ctx.chat.id.toString() },
          })
        : undefined;
      if (authStatus.authorization) {
        this.handled(ctx);
      } else {
        ctx.reply('Авторизация не пройдена, /auth');
      }
    });
  }

  async handled(ctx: MyContext) {
    this.logger.log(`${ctx.from.username} запросил таблицу лидеров`);
    this.leaderboard = [];
    this.fact = 0;
    const managers = await this.managersRepository.find();

    for (const manager of managers) {
      if (manager.monthly_sales !== 0) {
        this.leaderboard.push({
          manager: manager.name,
          sales: manager.monthly_sales,
          plan: (manager.monthly_sales / 1500000) * 100,
          avgPayedPrice: manager.avgPayedPrice,
        });
        this.fact += manager.monthly_sales;
      }
    }
    // Сортировка массива по переменной sales в порядке убывания
    this.leaderboard.sort((a, b) => b.sales - a.sales);

    // Форматирование массива в красивую строку
    const leaderboardString = this.formatLeaderboard(this.leaderboard);

    return ctx.replyWithHTML(await leaderboardString);
  }

  async formatLeaderboard(
    leaderboard: {
      manager: string;
      sales: number;
      plan: number;
      avgPayedPrice: number;
    }[],
  ): Promise<string> {
    const now = new Date();
    // Получаем последнюю запись со статусом 'exported'
    const lastExportedRecord = await this.exportsRepository.findOne({
      where: { status: 'exported' },
      order: { updatedAt: 'DESC' },
    });
    const timeZoneOffset = 5 * 60; // Разница в минутах между UTC и вашей временной зоной (+5 часов)

    // Используем текущую дату, если нет записей
    const updatedAtDate = lastExportedRecord 
      ? new Date(lastExportedRecord.updatedAt)
      : new Date();

    // Применяем смещение
    updatedAtDate.setMinutes(updatedAtDate.getMinutes() + timeZoneOffset);
    const formattedDate = format(updatedAtDate, 'd MMMM yyyy г., HH:mm:ss', {
      locale: ru,
    });
    const percentage_plan = (this.fact / 19500000) * 100;
    //формируем сообщение
    const header = '⚡<b><u>Таблица лидеров</u></b>⚡\n\n'; // Заголовок
    const actual = `Актуально на ${formattedDate}\n\n`;
    const planfact = `План/факт: <b>19500000 / ${this.fact.toString()}</b> (${percentage_plan.toFixed(1)}%)\n\n`; // Информация о плане/факте

    const leaders = leaderboard
      .map((entry, index) => {
        let placeEmoji = '🏆';
        let manager = '';
        if (index === 1) placeEmoji = '🥈';
        else if (index === 2) placeEmoji = '🥉';
        else if (index >= 3) placeEmoji = `${index + 1}.`;

        if (entry.manager == 'Менеджер Алина Хамитова') {
          manager = 'Алина Хамитова';
        } else if (entry.manager == 'Анастасия Иванова / Куратор') {
          manager = 'Анастасия Иванова';
        } else {
          manager = entry.manager;
        }
        manager = managerFullNameMap[entry.manager] ? managerFullNameMap[entry.manager] : entry.manager;

        return `${placeEmoji} <b>${manager}</b> | ${entry.sales.toLocaleString()} ₽`;
      })
      .join('\n');

    return `${header}${actual}${planfact}${leaders}`;
  }
}
function utcToZonedTime(updatedAt: Date, timeZone: string) {
  throw new Error('Function not implemented.');
}
