import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ManagersModule } from './managers/managers.module';
import { SalesPlanModule } from './sales_plan/sales_plan.module';
import { GetcourseApiModule } from './getcourse_api/getcourse_api.module';
import { TelegramApiModule } from './telegram_api/telegram_api.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramApi } from './telegram_api/entities/telegram_api.entity';
import { Manager } from './managers/entities/manager.entity';
import { GetcourseApi } from './getcourse_api/entities/getcourse_api.entity';
import { SalesPlan } from './sales_plan/entities/sales_plan.entity';
import { Sales } from './sales_plan/entities/sales.entity';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ManagersModule,
    SalesPlanModule,
    GetcourseApiModule,
    TelegramApiModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        synchronize: true,
        entities: [TelegramApi, Manager, GetcourseApi, SalesPlan, Sales],
        toRetry(err) {
          return false;
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
