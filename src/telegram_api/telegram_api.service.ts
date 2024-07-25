import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes, session } from 'telegraf';
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
import { CongratulationCommand } from './commands/congratulation.command';
import { AppealCommand } from './commands/appeal.command';

@Injectable()
export class TelegramApiService {
  public readonly client: Telegraf<MyContext>;
  private commands: Command[] = [];
  private scenes: Scene[] = [];
  private scenesNames: Scenes.WizardScene<MyContext>[] = [];
  public updatedTime: string;
  public managerName: string;

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
        new CongratulationCommand(
          this.client,
          this.configService,
          this.managersRepository,
          this.telegramRepository,
        ),
      ];
      for (const command of this.commands) {
        command.handle();
      }

      this.scenes = [new AppealCommand(this.client)];
      for (const scene of this.scenes) {
        scene.handle();
        this.scenesNames.push(scene.scene);
      }
      const stage = new Scenes.Stage(this.scenesNames);
      this.client.use(session());
      this.client.use(stage.middleware());
      this.client.hears('Написать обращение', (ctx) =>
        ctx.scene.enter('appeal'),
      );

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
        // this.client.telegram.sendMessage(
        //   _client.chat_id,
        //   '<b>Всем большой привет!</b>\n\n' +
        //   'Обновления:\n\n' +
        //   '<b>- Вы можете писать обращения, через кнопку ниже.</b> Если у вас сломалось оборудование/требуется замена или есть какое либо предложение - воспользуйтесь ею! Обработка произойдет оперативною.\n' +
        //   '<b>- Поздравления наконец-то работают корректно.</b> Сейчас произовдится фикс дублей имён таких как Екатерина и Диана. На них все еще может происходить сбой, но я работаю над этим и обещаю пофиксить в ближайшее время\n' +
        //   '\nТакже скорректировал обновление закрытий в реал-тайме. Для получения всех обновлений, пожалуйста обновите бота коммандой /start',
        //   { parse_mode: 'HTML' },
        // );
      }
    } catch (error) {}
  }

  async sendUpdate(managerName: string, profit: string) {
    this.managerName = managerName;
    const clients = await this.telegramRepository.find();
    for (const _client of clients) {
      this.client.telegram.sendMessage(
        _client.chat_id,
        `🎉<b>${managerName}</b> закрыл(а) клиента на сумму <b>${profit}</b>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Поздравить❤️', callback_data: 'cb_congratulation' }],
            ],
          },
          parse_mode: 'HTML',
        },
      );
    }
  }
}
