import { Module } from '@nestjs/common';
import { TelegramApiService } from './telegram_api.service';
import { TelegramApiController } from './telegram_api.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { TelegramApi } from './entities/telegram_api.entity';
import { SalesPlanService } from 'src/sales_plan/sales_plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([Manager, TelegramApi])],
  controllers: [TelegramApiController],
  providers: [TelegramApiService],
  exports: [TelegramApiModule],
})
export class TelegramApiModule {}
