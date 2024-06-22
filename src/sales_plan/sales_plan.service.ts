import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { Sales } from './entities/sales.entity';
import { GetcourseApiService } from 'src/getcourse_api/getcourse_api.service';
import { GetcourseApi } from 'src/getcourse_api/entities/getcourse_api.entity';
import { AllSales } from './entities/all-sales.entity';
import { all } from 'axios';

@Injectable()
export class SalesPlanService {
  private saleProfit: AllSales;
  private readonly logger = new Logger(SalesPlanService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly getcourseApiService: GetcourseApiService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
    @InjectRepository(AllSales)
    private readonly allSalesRepository: Repository<AllSales>,
  ) {}

  async postSale() {
    const findedExports =
      await this.getcourseApiService.findByStatus('creating');
    if (!findedExports) {
      console.log('Экспортов для выгрузки не найдено');
    }
    for (const _export of findedExports) {
      const result = await this.getcourseApiService.makeExport(
        _export.export_id,
      );
      console.log(
        `Export data with ID: ${_export.export_id} has been exported`,
      );
      await this.getcourseApiService.writeExportExistData(result);
    }
  }

  async callbackToUpdate(sale: {
    idAzatGc: number;
    productName: string;
    managerName: string;
    profit: string;
    payedAt: Date;
    tags: string;
  }) {
    await this.allSalesRepository.save(sale);
    const response = await this.getcourseApiService.requestExportId();
    await this.getcourseApiService.createExportId(response, 3, 6000);
    setTimeout(async () => {
      const findedExports =
        await this.getcourseApiService.findByStatus('creating');
      if (!findedExports) {
        console.log('Экспортов для выгрузки не найдено');
      }
      for (const _export of findedExports) {
        const result = await this.getcourseApiService.makeExport(
          _export.export_id,
        );
        console.log(
          `Export data with ID: ${_export.export_id} has been exported`,
        );
        await this.getcourseApiService.writeExportExistData(result);
      }
    }, 10000);
    setTimeout(() => {
      this.updateSale(sale.idAzatGc);
    }, 1000);
  }

  async getManagers() {
    const sales = await this.salesRepository.find();
    for (const sale of sales) {
      const existingManager = await this.managersRepository.exists({
        where: { name: sale.managerName },
      });
      if (!existingManager) {
        await this.managersRepository.save({
          name: sale.managerName,
        });
        this.logger.log(`Менеджер ${sale.managerName} сохранен.`);
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
      this.logger.log(manager.name);

      let quantityOfMotivationSales = 0;
      let motivation_sales = 0; // Переменная для хранения суммы по "Мотивация Тест"

      for (const sale of sales) {
        const idAzatGc = sale.idAzatGc;
        const allsale = await this.salesRepository.findOne({
          where: { idAzatGc: Number(idAzatGc) },
        });

        console.log(
          await this.salesRepository.findOne({
            where: { idAzatGc: Number(sale.idAzatGc.toString()) },
          }),
        );
        if (allsale.profit !== null) {
          motivation_sales += Number(Number(allsale.profit).toFixed(0));
          quantityOfMotivationSales += 1;
        }
      }

      console.log(motivation_sales);

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

  async updateSale(idAzatGc: number) {
    const newSale = await this.allSalesRepository.findOne({
      where: { idAzatGc },
    });

    if (newSale) {
      await this.salesRepository.update(
        { idAzatGc },
        { profit: newSale.profit },
      );
    } else {
      console.log('Заказ не найден');
    }
  }
}
