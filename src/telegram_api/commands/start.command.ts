import { Markup, Telegraf } from 'telegraf';
import { Command } from '../classes/command.class';
import { MyContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramApi } from '../entities/telegram_api.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import {
  buttons_for_admins,
  buttons_for_managers,
  buttons_for_timofey,
} from './constants';
import { Manager } from 'src/managers/entities/manager.entity';

export class StartCommand extends Command {
  private readonly logger = new Logger(StartCommand.name);
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(TelegramApi)
    private readonly telegramRepository: Repository<TelegramApi>,
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
  ) {
    super(client);
  }
  handle(): void {
    this.client.start(async (ctx) => {
      const existingUser = await this.telegramRepository.findOne({
        where: {
          chat_id: ctx.chat.id.toString(),
        },
      });
      const user = {
        chat_id: ctx.chat.id.toString(),
        name:
          ctx.from.first_name +
          ' ' +
          (ctx.from.last_name ? ctx.from.last_name : ''),
        username: ctx.from.username,
      };
      if (existingUser) {
        await this.telegramRepository.update(
          { chat_id: existingUser.chat_id },
          user,
        );
      } else {
        await this.telegramRepository.save(user);
      }
      this.session(ctx);
      // }
    });
  }

  async session(ctx: MyContext): Promise<void> {
    this.logger.log(`${ctx.from.username} запустил комманду /start`);
    const authStatus = await this.telegramRepository.findOne({
      where: { chat_id: ctx.chat?.id.toString() },
    });
    console.log(authStatus);
    const team = await this.managerRepository.findOne({
      where: { name: authStatus.manager },
    });
    console.log(team);
    if (authStatus.authorization) {
      if (authStatus.role === 'manager' && team.team == 'Тимофей') {
        ctx.reply('Выберите команду:', {
          reply_markup: {
            keyboard: buttons_for_timofey,
            resize_keyboard: true,
          },
        });
      }
      if (authStatus.role === 'manager' && team.team == 'Ринат') {
        ctx.reply('Выберите команду:', {
          reply_markup: {
            keyboard: buttons_for_managers,
            resize_keyboard: true,
          },
        });
      }
      if (authStatus.role === 'admin') {
        ctx.reply('Выберите команду:', {
          reply_markup: {
            keyboard: buttons_for_admins,
            resize_keyboard: true,
          },
        });
      }
    } else {
      ctx.reply(
        'Запрос на авторизацию отправлен. Вам придет уведомление о готовности.\n\nОжидайте🆔...',
        {
          reply_markup: {
            keyboard: [[{ text: '👤Авторизация👤' }]],
            resize_keyboard: true,
          },
        },
      );
      this.client.telegram.sendMessage(
        1810423951,
        `Пользователь @${ctx.from.username} отправил запрос на авторизацию`,
      );
    }
  }
}
