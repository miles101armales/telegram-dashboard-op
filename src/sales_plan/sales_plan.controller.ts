import { Controller, Get, Query } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { Cron } from '@nestjs/schedule';
import { ManagersGateway } from 'src/managers/managers.gateway';
import { ManagersService } from 'src/managers/managers.service';

@Controller('sales')
export class SalesPlanController {
  constructor(
    private readonly salesPlanService: SalesPlanService,
    private readonly managersGateway: ManagersGateway,
    private readonly managerService: ManagersService,
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

  @Get('all')
  async getAllSales() {
    return await this.salesPlanService.getAllSales();
  }

  // НОВЫЙ КОЛБЭК НА ПОЛУЧЕНИЕ ЗАКРЫТОГО ЗАКАЗА ПО ХОЛОДКЕ

  @Get('sale')
  async saleMotivationCallback(
    @Query('idAzatGc') idAzatGc: number,
    @Query('productName') productName: string,
    @Query('managerName') managerName: string,
    @Query('profit') profit: string,
  ) {
    console.log('sale');
    const id = Number(idAzatGc);
    await this.salesPlanService.callbackToUpdate({
      idAzatGc: id,
      productName,
      managerName,
      profit,
      tags: 'Мотивация тест',
      payedAt: new Date().toISOString(),
    });
    await this.managerService.calculateSalary();
    return this.managersGateway.notifyClients();
  }

  @Get('realtime')
  async realtimeUpdate() {
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
