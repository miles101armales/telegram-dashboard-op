import { Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';

export class LeaderboardCommand extends Command {
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
  ) {
    super(client);
  }

  async handle(): Promise<void> {
    this.client.action('leaderboard', async (ctx) => {
      this.handled(ctx);
    });

    this.client.command('leaderboard', async (ctx) => {
      this.handled(ctx);
    });

    this.client.hears('🏆Таблица лидеров🏆', async (ctx) => {
      this.handled(ctx);
    });
  }

  async handled(ctx): Promise<void> {
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
        console.log((this.fact += manager.monthly_sales));
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
    const percentage_plan = (this.fact / 27360000) * 100;
    const header = 'Таблица лидеров:\n\n'; // Заголовок
    const planfact = `План/факт: 27360000 / ${this.fact.toString()} (${percentage_plan.toFixed(1)}%)\n\n`; // Заголовок
    const body = leaderboard
      .map(
        (entry, index) =>
          `${index + 1}. <b>${entry.manager}</b>\n${entry.sales.toString()} RUB | Средний чек: ${entry.avgPayedPrice}\n`,
      )
      .join('\n');
    return header + planfact + body;
  }
}
