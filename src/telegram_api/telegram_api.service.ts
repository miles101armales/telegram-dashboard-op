import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes } from 'telegraf';
import { Command } from './classes/command.class';
import { Scene } from './classes/scene.class';
import { MyContext } from './interfaces/context.interface';
import { StartCommand } from './commands/start.command';
import { LeaderboardCommand } from './commands/leaderboard.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { TelegramApi } from './entities/telegram_api.entity';
import { AuthCommand } from './commands/authorization.command';
import { MySalesCommand } from './commands/my-sales.command';
import { SalesPlanService } from 'src/sales_plan/sales_plan.service';

@Injectable()
export class TelegramApiService {
  public readonly client: Telegraf<MyContext>;
  private commands: Command[] = [];
  private scenes: Scene[] = [];
  private scenesNames: Scenes.WizardScene<MyContext>[] = [];
  public updatedTime: string;

  private readonly logger = new Logger(TelegramApiService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(TelegramApi)
    private readonly telegramRepository: Repository<TelegramApi>,
  ) {
    this.client = new Telegraf<MyContext>(
      this.configService.get('TELEGRAM_API_KEY'),
    );
  }
  async onApplicationBootstrap() {
    try {
      this.commands = [
        new StartCommand(this.client, this.telegramRepository),
        new LeaderboardCommand(
          this.client,
          this.managersRepository,
          this.telegramRepository,
          this.updatedTime,
        ),
        new AuthCommand(
          this.client,
          this.managersRepository,
          this.telegramRepository,
        ),
        new MySalesCommand(
          this.client,
          this.managersRepository,
          this.telegramRepository,
        ),
      ];
      for (const command of this.commands) {
        command.handle();
      }

      this.scenes = [
        // new Scenes(this.client)
      ];
      for (const scene of this.scenes) {
        scene.handle();
        this.scenesNames.push(scene.scene);
      }
      const stage = new Scenes.Stage(this.scenesNames);
      this.client.use(stage.middleware());

      this.client.launch();
      this.logger.log('Telegram Bot initialized');
      const clients = await this.telegramRepository.find();
      for (const _client of clients) {
	if (_client.manager && _client.authorization === false) {
           this.client.telegram.sendMessage(
             _client.chat_id,
             'Вы зарегестрированы. Нажмите кнопку ниже или введите комманду /auth',
           );
         }
      //   // this.client.telegram.sendMessage(_client.chat_id, 'Обновлена база данных по вашим закрытиям!\n\n/start')
	 }
    } catch (error) {}
  }

  async sendUpdate(managerName: string, profit: string) {
    const clients = await this.telegramRepository.find();
    for (const _client of clients) {
    this.client.telegram.sendMessage(
      _client.chat_id,
      `${managerName} закрыл(а) клиента на сумму ${profit}`,
    );
    }
  }
}
