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
import { ok } from 'assert';

const fullNameMap: { [key: string]: string } = {
  "Сергей": "Сергей Кириллов",
  "Артур": "Ишкуватов Артур",
  "Камилла": "Камилла Камилла Наилевна",
  "Катя": "Катя Рафикова",
  "Роберт": "Роберт",
  "Тимофей": "Тимофей Иванов",
  "Ринат": "Ринат Шарифуллин",
  "Мансур": "Мансур Кильдебаев",
  "Диана": "Диана Тагирова",
  "Алсу": "Алсу Салимова",
  "Данила": "Данила Щербаков",
  "Денис": "Денис Иштуганов",
  "Арман": "Арман Кузембаев",
  "Стас": "Стас Власов",
  "Алиса": "Алиса",
  "Ксюша": "Ксюша Никитина",
  "Фарида": "Фарида",
  "Эльвина": "Эльвина",
  "Рамиль": "Рамиль Ахмадеев",
  "Радмир": "Радмир Байрамгулов"
};

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
    @InjectRepository(GetcourseApi)
    private readonly exportsRepository: Repository<GetcourseApi>,
  ) {
    this.telegramApiService = new TelegramApiService(
      this.configService,
      this.managersRepository,
      this.telegramRepository,
      this.exportsRepository,
      this.salesRepository,
    );
    this.checkDatabaseConnection();
  }

  /**
   * Безопасно преобразует строку в число
   * @param value Строка для преобразования
   * @returns Число или null, если преобразование невозможно
   */
  private safeParseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    // Если уже число, возвращаем как есть
    if (typeof value === 'number') {
      return value;
    }

    // Заменяем запятую на точку для корректной обработки десятичных чисел
    const normalizedValue = value.toString().replace(',', '.');
    
    // Пытаемся преобразовать в число
    const parsedValue = parseFloat(normalizedValue);
    
    // Проверяем, что получили корректное число
    if (isNaN(parsedValue)) {
      this.logger.warn(`Failed to parse number from value: ${value}`);
      return null;
    }

    return parsedValue;
  }

  private async checkDatabaseConnection() {
    try {
      await this.salesRepository.query('SELECT 1');
      this.logger.log('Database connection successful');
    } catch (error) {
      this.logger.error(`Database connection failed: ${error.message}`);
      throw error;
    }
  }

  private validateSaleData(sale: any) {
    if (!sale.idAzatGc || !sale.productName || !sale.managerName) {
      throw new Error('Missing required sale data');
    }
    
    // Используем новую функцию для проверки profit
    const profitValue = this.safeParseNumber(sale.profit);
    if (profitValue === null) {
      throw new Error('Invalid profit value');
    }
    
    if (!sale.payedAt || isNaN(Date.parse(sale.payedAt))) {
      throw new Error('Invalid payedAt date');
    }
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
    this.logger.log(`Starting sale processing: ${JSON.stringify(sale)}`);
    
    try {
      // Валидация данных
      this.validateSaleData(sale);

      // Преобразуем profit в число для сохранения
      const profitValue = this.safeParseNumber(sale.profit);
      if (profitValue === null) {
        throw new Error('Invalid profit value');
      }

      // Сохраняем продажу в базу данных в рамках транзакции
      await this.salesRepository.manager.transaction(async transactionalEntityManager => {
        const newSale = transactionalEntityManager.create(Sales, {
          idAzatGc: sale.idAzatGc,
          productName: sale.productName,
          managerName: sale.managerName,
          profit: profitValue.toString(), // Сохраняем как строку, но уже проверенную
          payedAt: sale.payedAt,
          tags: sale.tags
        });
        
        await transactionalEntityManager.save(newSale);
        this.logger.log(`Sale saved to database: ${sale.idAzatGc} with profit: ${profitValue}`);
      });

      // Запрашиваем экспорт
      const response = await this.getcourseApiService.requestExportId();
      await this.getcourseApiService.createExportId(response, 3, 6000);

      // Обрабатываем экспорт после задержки
      setTimeout(async () => {
        try {
          const findedExports = await this.getcourseApiService.findByStatus('creating');
          this.logger.log(`Found ${findedExports?.length || 0} exports`);

          if (!findedExports?.length) {
            this.logger.warn('No exports found for processing');
            return;
          }

          for (const _export of findedExports) {
            try {
              const result = await this.getcourseApiService.makeExport(
                _export.export_id,
                3,
                10000,
              );
              this.logger.log(`Export data with ID: ${_export.export_id} has been exported`);
              await this.getcourseApiService.writeExportExistData(result);
            } catch (exportError) {
              this.logger.error(`Failed to process export ${_export.export_id}: ${exportError.message}`);
            }
          }

          // Обновляем статистику после задержки
          setTimeout(async () => {
            try {
              await this.getManagers();
              await this.getMonthlySales();
              // Отправляем округленное значение profit для уведомления
              await this.telegramApiService.sendUpdate(sale.managerName, Math.round(profitValue).toString());
              this.logger.log(`Successfully completed all updates for sale ${sale.idAzatGc}`);
            } catch (updateError) {
              this.logger.error(`Failed to update statistics: ${updateError.message}`);
            }
          }, 10000);
        } catch (exportError) {
          this.logger.error(`Export processing failed: ${exportError.message}`);
        }
      }, 120000);

    } catch (error) {
      this.logger.error(`Sale processing failed: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
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

        if (allsale && allsale.profit !== null) {
          // Используем безопасное преобразование числа
          const profitValue = this.safeParseNumber(allsale.profit);
          if (profitValue !== null) {
            motivation_sales += profitValue;
            quantityOfMotivationSales += 1;
            this.logger.log(`Added profit ${profitValue} for sale ${idAzatGc}`);
          } else {
            this.logger.warn(`Invalid profit value for sale ${idAzatGc}: ${allsale.profit}`);
          }
        }
      }

      const avgPayedPrice = quantityOfMotivationSales > 0 
        ? motivation_sales / quantityOfMotivationSales 
        : 0;

      this.logger.log(`Manager ${manager.name}: total sales=${motivation_sales}, quantity=${quantityOfMotivationSales}, avg=${avgPayedPrice}`);

      // Округляем значения перед сохранением в базу данных
      const roundedMonthlySales = Math.round(motivation_sales);
      const roundedAvgPayedPrice = Math.round(avgPayedPrice);

      this.managersRepository.update(
        { name: manager.name },
        {
          monthly_sales: roundedMonthlySales,
          quantityOfSales: quantityOfMotivationSales,
          avgPayedPrice: roundedAvgPayedPrice || 0,
        },
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

  async getAllSales() {
    // Получаем все записи из таблицы Sales
    const sales = await this.salesRepository.find();

    // Проходим по каждой записи и обновляем managerName
    for (const sale of sales) {
      if (sale.managerName === 'Менеджер Алина Хамитова') {
        sale.managerName = 'Алина Хамитова';
      } else if (sale.managerName === 'Анастасия Иванова / Куратор') {
        sale.managerName = 'Анастасия Иванова';
      } else if (sale.managerName === 'Катя Рафикова') {
        sale.managerName = 'Екатерина Рафикова';
      }
    }

    console.log(sales);

    return sales;
  }
}
