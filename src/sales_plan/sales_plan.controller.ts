import { Controller, Get } from '@nestjs/common';
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
}
