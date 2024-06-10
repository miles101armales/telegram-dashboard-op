import { Controller } from '@nestjs/common';
import { TelegramApiService } from './telegram_api.service';

@Controller('telegram-api')
export class TelegramApiController {
  constructor(private readonly telegramApiService: TelegramApiService) {}
}
