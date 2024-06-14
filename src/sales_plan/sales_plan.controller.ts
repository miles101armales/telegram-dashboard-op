import { Controller, Get, Query } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { Cron } from '@nestjs/schedule';

@Controller('sales')
export class SalesPlanController {
  constructor(private readonly salesPlanService: SalesPlanService) {}

  @Get('manager')
  @Cron('31 22 * * *')
  async getManager() {
    await this.salesPlanService.getManagers();
    await this.salesPlanService.getMonthlySales();
    //по каждому менеджеру складываем количество закрытий
  }

  // НОВЫЙ КОЛБЭК НА ПОЛУЧЕНИЕ ЗАКРЫТОГО ЗАКАЗА ПО ХОЛОДКЕ

  @Get('sale')
  async saleMotivationCallback(
    @Query('idAzatGc') idAzatGc: number,
    @Query('productName') productName: string,
    @Query('managerName') managerName: string,
    @Query('profit') profit: number,
    @Query('payedAt') payedAt: Date,
  ) {
    this.salesPlanService.postSale({
      idAzatGc,
      productName,
      managerName,
      profit,
      payedAt,
      tags: 'Мотивация тест',
      id: 0,
    });
  }

  // НОВЫЙ КОЛБЭК НА ОБНОВЛЕНИЕ ЗАКАЗА ПО ВОЗВРАТУ

  @Get('cancel')
  async saleCancelledCallback() {}
}
