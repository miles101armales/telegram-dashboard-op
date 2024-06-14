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

  async postSale(sale: Sales) {
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
        if (sale.managerName !== '' || undefined) {
          await this.managersRepository.save({
            name: sale.managerName,
          });
        }
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
      let quantityOfSales = 0;
      let motivation_sales = 0; // Переменная для хранения суммы по "Мотивация Тест"
      let other_sales = 0; // Переменная для хранения суммы по остальным тегам

      for (const sale of sales) {
        // Преобразуем строку tags в массив и фильтруем нужные элементы
        const cleanedTagsString = sale.tags.replace(/{|}/g, '');
        const tagsArray = cleanedTagsString
          .split('","')
          .map((tag) => tag.replace(/^"|"$/g, ''));
        const filteredTags = tagsArray.filter((tag) =>
          tag.includes('Мотивация Тест'),
        );

        const pay = Math.round(Number(sale.profit)); // Преобразование в целое число

        // Если есть соответствующие элементы, добавляем payedPrice к motivation_sales
        if (filteredTags.length > 0) {
          motivation_sales += pay;
          quantityOfMotivationSales += 1;
        } else {
          // Если нет соответствующих элементов, добавляем payedPrice к other_sales
          other_sales += pay;
          quantityOfSales += 1;
        }
      }

      // Проверка на деление на ноль и вычисление среднего значения
      const avgPayedPrice =
        quantityOfMotivationSales > 0
          ? Math.round(motivation_sales / quantityOfMotivationSales)
          : 0; // Преобразование в целое число
      // Обновляем данные в базе данных
      this.managersRepository.update(
        { name: manager.name },
        {
          monthly_sales: motivation_sales,
          quantityOfSales: quantityOfMotivationSales,
          avgPayedPrice: Math.round(avgPayedPrice),
        }, // Замените monthly_sales на нужное поле, если требуется
      );

      // Если вам нужно сохранить другие продажи в другой переменной в базе данных, добавьте соответствующее поле
      this.managersRepository.update(
        { name: manager.name },
        { hot_monthly_sales: other_sales }, // Добавьте это поле в сущность Manager, если необходимо
      );
    }
  }
}
