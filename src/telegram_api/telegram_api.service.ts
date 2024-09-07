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
import { GetcourseApi } from 'src/getcourse_api/entities/getcourse_api.entity';
import { Sales } from 'src/sales_plan/entities/sales.entity';
import { BlankScene } from './scenes/blank.scene';

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
    @InjectRepository(GetcourseApi)
    private readonly exportsRepository: Repository<GetcourseApi>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
  ) {
    this.client = new Telegraf<MyContext>(
      this.configService.get('TELEGRAM_API_KEY'),
    );
  }
  async onApplicationBootstrap() {
    try {
      this.commands = [
        new StartCommand(
          this.client,
          this.telegramRepository,
          this.managersRepository,
        ),
        new LeaderboardCommand(
          this.client,
          this.managersRepository,
          this.telegramRepository,
          this.exportsRepository,
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
          this.salesRepository,
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

      this.scenes = [
        new AppealCommand(this.client),
        new BlankScene(this.client),
      ];
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
      this.client.hears('Запросить анкету', (ctx) => {
        ctx.scene.enter('blank');
      });

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
//         this.client.telegram.sendMessage(
//           _client.chat_id,
//           `
// <b>Уважаемая команда отдела продаж!</b>🌟

// Хочу поблагодарить каждого из вас за <b>упорный труд и вклад в работу нашей компании</b> в прошедшем месяце. Благодаря вашим усилиям, мы достигли значимых результатов и успешно преодолели многие вызовы. 💪 Хотя нам не удалось полностью закрыть план на этот месяц, вы вложили много труда и старания  в свою работу, и это достойно уважения. 🙌

// Мы вместе сделали большой шаг вперед, и это только начало! 🏆 Важно помнить, что <b>любой опыт, даже если он не приводит к немедленному успеху, — это шаг к нашим будущим победам</b>. Учитесь на своих ошибках, ищите новые подходы, стремитесь к новым вершинам. Вы — команда, которая умеет добиваться своего, и я верю, что следующий месяц станет для нас еще более успешным! 🎯

// Давайте сосредоточимся на укреплении наших позиций, усилении командного духа и, конечно, на достижении наших целей. Впереди новый месяц, и я уверен, что вместе мы сможем добиться всех поставленных задач! 🔝

// Спасибо вам за вашу работу и энтузиазм. Пусть новый месяц принесет нам всем успех и удовлетворение от достигнутых целей! ✨

// <b>Анализ продаж за август:</b>

// Продукты с наибольшей прибылью:

// 	1.	Миллион на дропах - Доступ к чату (продление на 240 дней) — <b>5,389,452₽</b>
// 	2.	Годовая программа “Деньги под ключ” (старт 19 августа) (в рассрочку) — <b>3,154,330.5₽</b>
// 	3.	Миллион на дропах с поддержкой (старт 16 сентября) (в рассрочку) — <b>2,422,112₽</b>

// Дни с наибольшей прибылью:

// 	1.	22 августа — <b>1,728,156 ₽</b>
// 	2.	29 августа — <b>1,581,611 ₽</b>
// 	3.	20 августа — <b>1,477,268 ₽</b>
//           `,
//           {
//             parse_mode: 'HTML',
//             reply_markup: {
//               inline_keyboard: [
//                 [{ text: '👍', callback_data: 'like_analize' }],
//               ],
//             },
//           },
//         );
      }

      this.client.action('like_analize', (ctx) => {
        ctx.telegram.sendMessage(
          1810423951,
          `@${ctx.from.username} оценил анализ`,
        );
        ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      });
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
