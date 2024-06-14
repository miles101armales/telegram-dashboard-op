import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { Sales } from './entities/sales.entity';

@Injectable()
export class SalesPlanService {
  private readonly logger = new Logger(SalesPlanService.name);
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
  ) {}

  async postSale(sale) {
    const existingSale = await this.salesRepository.findOne({
      where: {
        idAzatGc: sale.idAzatGc,
      },
    });

    if (existingSale) {
      await this.salesRepository.update(
        { idAzatGc: existingSale.idAzatGc },
        sale,
      );
      console.log(existingSale);
      this.logger.log(`Заказ ${sale.idAzatGc} обновлен в базе данных`);
    } else {
      this.salesRepository.save(sale);
      this.logger.log(`Заказ ${sale.idAzatGc} добавлен в базу данных`);
    }

    return sale;
  }

  async getManagers() {
    console.log('Start processing...');
    const sales = await this.salesRepository.find();
    for (const sale of sales) {
      const existingManager = await this.managersRepository.exists({
        where: { name: sale.managerName },
      });
      if (!existingManager) {
        await this.managersRepository.save({
           name: sale.managerName,
        });
      }
    }
  }

  async getMonthlySales() {
    const managers = await this.managersRepository.find();

    for (const manager of managers) {
      const sales = await this.salesRepository.find({
        where: {
          managerName: manager.name,
        },
      });

      let quantityOfMotivationSales = 0;
      let motivation_sales = 0; // Переменная для хранения суммы по "Мотивация Тест"

      for (const sale of sales) {
        motivation_sales += Number(sale.profit);
        quantityOfMotivationSales += 1;
      }

      const avgPayedPrice = motivation_sales / quantityOfMotivationSales;

      this.managersRepository.update(
        { name: manager.name },
        {
          monthly_sales: motivation_sales,
          quantityOfSales: quantityOfMotivationSales,
          avgPayedPrice: Math.round(avgPayedPrice),
        }, // Замените monthly_sales на нужное поле, если требуется
      );
    }
  }
}
