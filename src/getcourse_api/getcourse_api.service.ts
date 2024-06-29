import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GetcourseApi } from './entities/getcourse_api.entity';
import { Between, Repository } from 'typeorm';
import { Sales } from 'src/sales_plan/entities/sales.entity';
import axios, { AxiosResponse } from 'axios';
import { CreateSaleDto } from 'src/sales_plan/dto/create-sales_plan.dto';
import { AllSales } from 'src/sales_plan/entities/all-sales.entity';

@Injectable()
export class GetcourseApiService {
  private readonly logger = new Logger(GetcourseApiService.name);
  private nowDateGc: string;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(GetcourseApi)
    private readonly exportsRepository: Repository<GetcourseApi>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
  ) {}

  async requestExportId() {
    try {
      const now = new Date();
      this.nowDateGc = now.toISOString().split('T')[0];
      const apiKey = this.configService.get('GC_API_KEY');
      const PREFIX = this.configService.get('GC_PREFIX');
      const result = await axios.get(
        `${PREFIX}/deals?key=${apiKey}&created_at[from]=${this.nowDateGc}`,
      );
      if (result.status === 200) {
        this.logger.log(`Request Export ID: ${result.data.info.export_id}`);
        return result;
      } else {
        throw new Error('Ошибка получения ID экспорта');
      }
    } catch (error) {
      console.error('Ошибка при запросе ID экспорта:', error);
      throw error;
    }
  }

  async findByStatus(status: 'creating' | 'exported') {
    return await this.exportsRepository.find({
      where: {
        status,
      },
    });
  }

  async createExportId(
    response: AxiosResponse,
    maxRetries: number,
    delayMs: number,
  ): Promise<GetcourseApi> {
    try {
      if (!response || !response.data.success) {
        throw new Error('Не удалось создать экспорт');
      }

      const export_id = response.data.info.export_id;
      const newExport = await this.exportsRepository.save({
        name: 'Экспорт заказов Азат',
        export_id,
        status: 'creating',
      });

      this.logger.log('Export ID записан в базу данных');
      return newExport;
    } catch (error) {
      console.error('Ошибка при создании экспортного ID:', error);
      return undefined;
    }
  }

  async makeExport(
    export_id: number,
    maxRetries: number,
    delayMs: number,
  ): Promise<AxiosResponse | undefined> {
    const apiKey = this.configService.get('GC_API_KEY');
    const PREFIX = this.configService.get('GC_PREFIX');
    const makeRequest = async (): Promise<AxiosResponse | undefined> => {
      try {
        const result = await axios.get(
          `${PREFIX}/exports/${export_id}?key=${apiKey}`,
        );

        if (result.data.error && result.data.error_code === 910) {
          await this.exportsRepository.update(
            { export_id },
            { status: 'bad_export_id' },
          );
          throw new Error('Файл не создан, попробуйте другой фильтр');
        }

        const updatedStatus = await this.exportsRepository.update(
          { export_id },
          { status: 'exported' },
        );

        console.log(updatedStatus);

        this.logger.log(`Статус ${export_id} обновлен до "exported"`);

        return result;
      } catch (error) {
        console.error('Ошибка при выполнении экспорта:', error);

        if (maxRetries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          console.log(new Date(), 'Повторная попытка ', maxRetries - 1);
          return makeRequest();
        } else {
          console.error('Превышено максимальное количество повторов');
          return undefined;
        }
      }
    };

    return await makeRequest();
  }

  async writeExportExistData(data: AxiosResponse) {
    const newData: string[][] = data.data.info.items;
    const realArrOfObjects: any[] = [];

    newData.forEach((item) => {
      const itemString = JSON.stringify(item[item.length - 2]);

      if (
        Number(item[10]) > 1 &&
        itemString.includes('Мотивация') &&
        !itemString.includes('возврат')
      ) {
        realArrOfObjects.push({
          idAzatGc: item[0],
          productName: item[8],
          payedAt: item[7],
          profit: item[15],
          tags: item[item.length - 2],
          managerName: item[19],
        });
      }
    });
    this.logger.log('Количество обычных заказов: ', realArrOfObjects.length);
    const batchSize: number = 100;
    for (let i = 0; i < realArrOfObjects.length; i += batchSize) {
      const batch = realArrOfObjects.slice(i, i + batchSize);
      const promises = batch.map(async (item: CreateSaleDto) => {
        const existingItem = await this.salesRepository.findOne({
          where: {
            idAzatGc: item.idAzatGc,
          },
        });
        if (existingItem) {
          await this.salesRepository.update(
            { id: existingItem.idAzatGc },
            item,
          );
        } else {
          await this.salesRepository.save(item);
          this.logger.log(`New sale added with ID: ${item.idAzatGc}`);
        }
      });
      await Promise.all(promises);
      console.log('Processed batch of ordinary orders: ', i);
    }
  }

  async exportDataFromExports(exports: GetcourseApi[]) {
    try {
      for (const _export of exports) {
        const result = await this.makeExport(_export.export_id, 3, 10000);
        console.log(
          `Export data with ID: ${_export.export_id} has been exported`,
        );
        await this.writeExportExistData(result);
      }
    } catch (error) {
      console.error(error);
    }
  }
}
