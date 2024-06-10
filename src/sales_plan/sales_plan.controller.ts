import { Controller, Get } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';

@Controller('sales')
export class SalesPlanController {
  constructor(private readonly salesPlanService: SalesPlanService) {}

  @Get('manager')
  async getManager() {
    await this.salesPlanService.getManagers();
    await this.salesPlanService.getMonthlySales();
    //по каждому менеджеру складываем количество закрытий
  }
}
