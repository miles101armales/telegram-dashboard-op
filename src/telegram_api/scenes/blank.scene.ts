import { Telegraf } from 'telegraf';
import { WizardScene } from 'telegraf/typings/scenes';
import { Scene } from '../classes/scene.class';
import { MyContext } from '../interfaces/context.interface';

export class BlankScene extends Scene {
	public scene: WizardScene<MyContext>;
  	constructor(public client: Telegraf<MyContext>) {
			super(client);
		}

	handle(): void {
	}
}