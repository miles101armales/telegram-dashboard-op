import { Telegraf } from 'telegraf';
import { MyContext } from '../interfaces/context.interface';

export abstract class Command {
  constructor(public client: Telegraf<MyContext>) {}

  abstract handle(): void;
}
