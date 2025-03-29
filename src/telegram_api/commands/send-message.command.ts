import { InjectRepository } from '@nestjs/typeorm';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';
import { Command } from '../classes/command.class';
import { TelegramApi } from '../entities/telegram_api.entity';
import { MyContext } from '../interfaces/context.interface';

export class SendMessageCommand extends Command {
	constructor(
		public client: Telegraf<MyContext>,
		@InjectRepository(TelegramApi)
		private readonly telegramApiRepository: Repository<TelegramApi>,
	) {
		super(client)
	}

	async handle() {
		this.client.command('auth', async (ctx) => {
			return this.handled(ctx);
		});
	}

	async handled(ctx) {}
}