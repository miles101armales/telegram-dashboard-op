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
      this.leaderboard = [];
      this.fact = 0;
      const managers = await this.managersRepository.find();

      for (const manager of managers) {
        if (manager.monthly_sales !== 0) {
          this.leaderboard.push({
            manager: manager.name,
            sales: manager.monthly_sales,
            plan: (manager.monthly_sales / 1500000) * 100,
          });
          console.log((this.fact += manager.monthly_sales));
        }
      }
      // Сортировка массива по переменной sales в порядке убывания
      this.leaderboard.sort((a, b) => b.sales - a.sales);

      // Форматирование массива в красивую строку
      const leaderboardString = this.formatLeaderboard(this.leaderboard);

      ctx.reply(leaderboardString);

      // Возврат строки
      return leaderboardString;
    });
  }

  formatLeaderboard(
    leaderboard: { manager: string; sales: number; plan: number }[],
  ): string {
    const header = 'Таблица лидеров:\n\n'; // Заголовок
    const planfact = `План/факт: 25 000 000/${this.fact.toLocaleString()}\n\n`; // Заголовок
    const body = leaderboard
      .map(
        (entry, index) =>
          `${index + 1}. ${entry.manager} - ${entry.sales.toLocaleString()} RUB`,
      )
      .join('\n');
    return header + planfact + body;
  }
}
