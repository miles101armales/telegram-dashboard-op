import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { SalesPlanService } from 'src/sales_plan/sales_plan.service';
import { Logger } from '@nestjs/common';

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
    private updatedTime: string,
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

    return ctx.replyWithHTML(leaderboardString);
  }

  formatLeaderboard(
    leaderboard: {
      manager: string;
      sales: number;
      plan: number;
      avgPayedPrice: number;
    }[],
  ): string {
    const now = new Date();
    this.nowDateGc = now.toISOString().split('T')[0];
    const percentage_plan = (this.fact / 21000000) * 100;
    const header = '⚡<b><u>Таблица лидеров</u></b>⚡\n\n'; // Заголовок
    const actual = `Актуально на ${this.nowDateGc}`;
    const planfact = `План/факт: 21000000 / ${this.fact.toString()} (${percentage_plan.toFixed(1)}%)\n\n`; // Информация о плане/факте

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

        return `${placeEmoji} <b>${manager}</b> | ${entry.sales.toLocaleString()} ₽`;
      })
      .join('\n');

    return `${header}${planfact}${leaders}`;
  }
}
