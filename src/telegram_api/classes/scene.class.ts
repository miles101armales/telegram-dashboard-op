import { Telegraf } from 'telegraf';
import { WizardScene } from 'telegraf/typings/scenes';
import { MyContext } from '../interfaces/context.interface';

export abstract class Scene {
  public scene: WizardScene<MyContext>;
  constructor(public client: Telegraf<MyContext>) {}

  abstract handle(): void;
}
