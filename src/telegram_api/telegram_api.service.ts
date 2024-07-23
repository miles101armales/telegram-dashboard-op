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
        //   '<b>С началом нового месяца!</b>\n\nЖелаю вам удачи в исполнении грядущих планов. Со своей стороны сделаю для вас таблицу на телевизоре, комплектующие уже в пути, а веб-версия почти собрана.\n\n<b>Обновления:</b>\n' +
        //     '1. Теперь вы можете <b><u>поздравлять</u></b> своих коллег с закрытием. Просто нажмите кнопку "Поздравить".\n' +
        //     '2. Исправлен баг с долгим обновлением таблицы после закрытия. На данный момент задержка после проведения оплаты должная составлять от 15 до 25 минут.\n\n' +
        //     'Удачи вам в голодных играх. И пусть этот месяц нахаслит вам неприлично много денег!\n\n/start',
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
