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
import { TelegramApiService } from 'src/telegram_api/telegram_api.service';
import { TelegramApi } from 'src/telegram_api/entities/telegram_api.entity';

@Injectable()
export class SalesPlanService {
  private readonly telegramApiService: TelegramApiService;
  private readonly logger = new Logger(SalesPlanService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly getcourseApiService: GetcourseApiService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
    @InjectRepository(TelegramApi)
    private readonly telegramRepository: Repository<TelegramApi>,
  ) {
    this.telegramApiService = new TelegramApiService(
      this.configService,
      this.managersRepository,
      this.telegramRepository,
    );
  }

  async postSale() {
    const findedExports =
      await this.getcourseApiService.findByStatus('creating');
    if (!findedExports) {
      console.log('Экспортов для выгрузки не найдено');
    }
    for (const _export of findedExports) {
      const result = await this.getcourseApiService.makeExport(
        _export.export_id,
        3,
        10000,
      );
      this.logger.log(
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
    payedAt: string;
    tags: string;
  }) {
    // this.logger.log(`New sale callback to update with id: ${sale.idAzatGc}`);
    // await this.salesRepository.save(sale);
    // const response = await this.getcourseApiService.requestExportId();
    // await this.getcourseApiService.createExportId(response, 3, 6000);
    // setTimeout(async () => {
    //   const findedExports =
    //     await this.getcourseApiService.findByStatus('creating');
    //   this.logger.log(`Found ${findedExports.length} exports`);
    //   if (!findedExports) {
    //     console.log('Экспортов для выгрузки не найдено');
    //   }
    //   for (const _export of findedExports) {
    //     const result = await this.getcourseApiService.makeExport(
    //       _export.export_id,
    //       3,
    //       10000,
    //     );
    //     this.logger.log(
    //       `Export data with ID: ${_export.export_id} has been exported`,
    //     );
    //     await this.getcourseApiService.writeExportExistData(result);
    //   }
    //   setTimeout(async () => {
    //     // await this.updateSale(sale.idAzatGc);
    //     await this.getManagers();
    //     await this.getMonthlySales();
    //     await this.telegramApiService.sendUpdate(sale.managerName, sale.profit);
    //   }, 10000);
    // }, 120000);
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
      this.logger.log(`Get Motivation Sales for ${manager.name}`);

      let quantityOfMotivationSales = 0;
      let motivation_sales = 0; // Переменная для хранения суммы по "Мотивация Тест"

      for (const sale of sales) {
        const idAzatGc = sale.idAzatGc;
        const allsale = await this.salesRepository.findOne({
          where: { idAzatGc: Number(idAzatGc) },
        });

        if (allsale.profit !== null) {
          motivation_sales += Number(Number(allsale.profit).toFixed(0));
          quantityOfMotivationSales += 1;
        }
      }

      const avgPayedPrice = motivation_sales / quantityOfMotivationSales;


      this.managersRepository.update(
        { name: manager.name },
        {
          monthly_sales: motivation_sales,
          quantityOfSales: quantityOfMotivationSales,
          avgPayedPrice: Math.round(avgPayedPrice) ? Math.round(avgPayedPrice) : 0,
        }, // Замените monthly_sales на нужное поле, если требуется
      );
    }
  }

  async getFormattedDate() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    this.telegramApiService.updatedTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }
}
