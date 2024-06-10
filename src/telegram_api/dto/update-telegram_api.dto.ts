import { PartialType } from '@nestjs/mapped-types';
import { CreateTelegramApiDto } from './create-telegram_api.dto';

export class UpdateTelegramApiDto extends PartialType(CreateTelegramApiDto) {}
