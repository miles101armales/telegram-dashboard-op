import { Controller, Get, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { Cron } from '@nestjs/schedule';
import { ManagersGateway } from 'src/managers/managers.gateway';
import { ManagersService } from 'src/managers/managers.service';

@Controller('sales')
export class SalesPlanController {
  private readonly logger = new Logger(SalesPlanController.name);

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
    this.logger.log(`Received sale callback with idAzatGc: ${idAzatGc}, profit: ${profit}`);

    try {
      // Проверка обязательных параметров
      if (!idAzatGc || !productName || !managerName || !profit) {
        throw new HttpException(
          'Missing required parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Проверка формата idAzatGc
      const id = Number(idAzatGc);
      if (isNaN(id)) {
        throw new HttpException(
          'Invalid idAzatGc format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Проверка формата profit - используем безопасное преобразование
      // Здесь мы просто проверяем, что profit не пустой, так как валидация
      // будет выполнена в сервисе
      if (!profit || profit.trim() === '') {
        throw new HttpException(
          'Profit cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Обработка продажи
      await this.salesPlanService.callbackToUpdate({
        idAzatGc: id,
        productName,
        managerName,
        profit,
        tags: 'Мотивация тест',
        payedAt: new Date().toISOString(),
      });

      // Обновление статистики
      await this.managerService.calculateSalary();
      
      // Отправка уведомления
      await this.managersGateway.notifyClients();

      this.logger.log(`Successfully processed sale with idAzatGc: ${idAzatGc}, profit: ${profit}`);
      return { success: true, message: 'Sale processed successfully' };

    } catch (error) {
      this.logger.error(`Failed to process sale: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
