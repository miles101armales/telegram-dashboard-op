import { Module } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { SalesPlanController } from './sales_plan.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Sales } from './entities/sales.entity';
import { GetcourseApiService } from 'src/getcourse_api/getcourse_api.service';
import { AllSales } from './entities/all-sales.entity';
import { GetcourseApiModule } from 'src/getcourse_api/getcourse_api.module';
import { GetcourseApiController } from 'src/getcourse_api/getcourse_api.controller';
import { GetcourseApi } from 'src/getcourse_api/entities/getcourse_api.entity';
import { TelegramApiService } from 'src/telegram_api/telegram_api.service';
import { TelegramApi } from 'src/telegram_api/entities/telegram_api.entity';
import { TelegramApiModule } from 'src/telegram_api/telegram_api.module';

@Module({
  imports: [TypeOrmModule.forFeature([Manager, Sales, AllSales, GetcourseApi, TelegramApi]), TelegramApiModule],
  controllers: [SalesPlanController],
  providers: [SalesPlanService, GetcourseApiService],
})
export class SalesPlanModule {}
