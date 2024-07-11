import { Controller, Get, Query } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { Cron } from '@nestjs/schedule';
import { ManagersGateway } from 'src/managers/managers.gateway';

@Controller('sales')
export class SalesPlanController {
  constructor(
    private readonly salesPlanService: SalesPlanService,
    private readonly managersGateway: ManagersGateway,
  ) {}

  @Get('manager')
  async getManager() {
    await this.salesPlanService.getManagers();
    //по каждому менеджеру складываем количество закрытий
  }

  @Get('monthly')
  async getSales() {
    await this.salesPlanService.getMonthlySales();
  }

  // НОВЫЙ КОЛБЭК НА ПОЛУЧЕНИЕ ЗАКРЫТОГО ЗАКАЗА ПО ХОЛОДКЕ

  @Get('sale')
  async saleMotivationCallback(
    @Query('idAzatGc') idAzatGc: number,
    @Query('productName') productName: string,
    @Query('managerName') managerName: string,
    @Query('profit') profit: string,
  ) {
    const id = Number(idAzatGc);
    await this.salesPlanService.callbackToUpdate({
      idAzatGc: id,
      productName,
      managerName,
      profit,
      tags: 'Мотивация тест',
      payedAt: new Date().toISOString(),
    });
    return this.managersGateway.notifyClients();
  }

  @Get('export')
  async export() {
    this.salesPlanService.postSale();
  }

  // НОВЫЙ КОЛБЭК НА ОБНОВЛЕНИЕ ЗАКАЗА ПО ВОЗВРАТУ

  @Get('cancel')
  async saleCancelledCallback() {}
}
