import { Composer, Scenes, Telegraf } from 'telegraf';
import { WizardScene } from 'telegraf/typings/scenes';
import { Scene } from '../classes/scene.class';
import { MyContext } from '../interfaces/context.interface';

export class BlankScene extends Scene {
  public scene: WizardScene<MyContext>;
  constructor(public client: Telegraf<MyContext>) {
    super(client);
  }

  handle(): void {
    const step1Handler = new Composer<MyContext>();
    step1Handler.action('tinkoff', async (ctx) => {
      ctx.session.bank = 'Тинькофф';
      ctx.reply('Введите Продукт', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Деньги под ключ', callback_data: 'dpk' }],
            [{ text: 'Миллион на дропах', callback_data: 'drops' }],
            [{ text: 'Информационный канал', callback_data: 'channel' }],
            [{ text: 'Мастер инвестиций', callback_data: 'mi' }],
          ],
        },
      });
      ctx.wizard.selectStep(1);
      return ctx.wizard.next();
    });
    step1Handler.action('alwaysyes', async (ctx) => {
      ctx.session.bank = 'ВсегдаДа';
      ctx.reply('Введите Фамилию, Имя и Отчество клиента');
      return ctx.wizard.next();
    });

    const step2Handler = new Composer<MyContext>();
    step2Handler.action(['dpk', 'drops', 'channel', 'mi'], async (ctx) => {
      switch (ctx.match.input) {
        case 'dpk':
          ctx.session.product = 'Деньги под ключ';
          break;

        case 'drops':
          ctx.session.product = 'Миллион на дропах';
          break;

        case 'channel':
          ctx.session.product = 'Информационный канал';
          break;

        case 'mi':
          ctx.session.product = 'Мастер инвестиций';
          break;
      }
      ctx.reply('Введите Срок', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '10 месяцев', callback_data: '10' }],
            [{ text: '12 месяцев', callback_data: '12' }],
            [{ text: '18 месяцев', callback_data: '18' }],
            [{ text: '24 месяцев', callback_data: '24' }],
          ],
        },
      });
      return ctx.wizard.next(); // Переходим к следующему шагу
    });
    step2Handler.hears(
      /[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?/,
      async (ctx) => {
        ctx.session.client_name = ctx.message.text;
        ctx.reply('Введите Продукт', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Деньги под ключ', callback_data: 'dpk' }],
              [{ text: 'Миллион на дропах', callback_data: 'drops' }],
              [{ text: 'Информационный канал', callback_data: 'channel' }],
              [{ text: 'Мастер инвестиций', callback_data: 'mi' }],
            ],
          },
        });
        ctx.wizard.selectStep(1);
        //запись ответа по кнопке в переменную
        return ctx.wizard.next();
      },
    );

    const step3Handler = new Composer<MyContext>();
    step3Handler.action(['10', '12', '18', '24'], async (ctx) => {
      switch (ctx.match.input) {
        case '10':
          ctx.session.time = '10 месяцев';
          break;

        case '12':
          ctx.session.time = '12 месяцев';
          break;

        case '18':
          ctx.session.time = '18 месяцев';
          break;

        case '24':
          ctx.session.time = '24 месяца';
          break;
      }
      ctx.reply('Введите Сумму');
      return ctx.wizard.next(); // Переходим к следующему шагу
    });

    const step5Handler = new Composer<MyContext>();
    step5Handler.hears(/[1-9]{4,6}/, async (ctx) => {
      console.log(ctx.msg.text);
      ctx.session.price = ctx.msg.text;

      let message = `Заявка от @${ctx.from.username}:\n\n`;
      if (ctx.session.bank == 'Тинькофф') {
        message += `Банк: <b>${ctx.session.bank}</b>\n`;
        message += `Продукт: <b>${ctx.session.product}</b>\n`;
        message += `Сумма: <b>${ctx.session.price}</b>\n`;
        message += `Срок: <b>${ctx.session.time}</b>\n`;
      } else {
        message += `Банк: <b>${ctx.session.bank}</b>\n`;
        message += `ФИО: <b>${ctx.session.client_name}</b>\n`;
        message += `Продукт: <b>${ctx.session.product}</b>\n`;
        message += `Сумма: <b>${ctx.session.price}</b>\n`;
        message += `Срок: <b>${ctx.session.time}</b>\n`;
      }
      ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Верно', callback_data: 'complete' },
              { text: 'Начать сначала', callback_data: 'again' },
            ],
          ],
        },
        parse_mode: 'HTML',
      });
      return ctx.wizard.next();
    });

    const step4Handler = new Composer<MyContext>();
    step4Handler.action(['complete', 'again'], async (ctx) => {
      if (ctx.match.input == 'complete') {
        ctx.reply('Заявка отправлена');
        ctx.telegram.forwardMessage(603055492, 7241388767, ctx.msg.message_id);
        return ctx.scene.leave();
      } else {
        ctx.reply('Выберите банк', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Тинькофф', callback_data: 'tinkoff' }],
              [{ text: 'ВсегдаДа', callback_data: 'alwaysyes' }],
            ],
          },
        });
        ctx.wizard.selectStep(0);
        return ctx.wizard.next();
      }
    });

    this.scene = new Scenes.WizardScene(
      'blank',
      async (ctx) => {
        ctx.reply('Выберите банк', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Тинькофф', callback_data: 'tinkoff' }],
              [{ text: 'ВсегдаДа', callback_data: 'alwaysyes' }],
            ],
          },
        });
        return ctx.wizard.next();
      },
      step1Handler,
      step2Handler,
      step3Handler,
      step5Handler,
      step4Handler,
    );
  }
}
