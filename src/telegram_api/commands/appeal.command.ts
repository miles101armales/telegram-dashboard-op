import { Scenes } from 'telegraf';
import { Scene } from '../classes/scene.class';
import { MyContext } from '../interfaces/context.interface';

export class AppealCommand extends Scene {
  handle() {
    this.scene = new Scenes.WizardScene(
      'appeal',
      async (ctx) => {
        ctx.reply(
          'Отправьте ваше сообщение, пожелание или проблему, которую необходимо решить' +
            '\n\nНапример у вас проблемы с оборудованием, не работает приложение или есть пожелания',
        );
        ctx.wizard.next();
      },
      async (ctx: MyContext) => {
        ctx.forwardMessage('1810423951', {
          message_thread_id: ctx.message.message_thread_id,
        });
        ctx.reply('Сообщение отправлено /start');
        ctx.scene.leave();
      },
    );
  }
}
