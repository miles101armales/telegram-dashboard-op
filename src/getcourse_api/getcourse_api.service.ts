import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GetcourseApi } from './entities/getcourse_api.entity';
import { Between, Repository } from 'typeorm';
import { Sales } from 'src/sales_plan/entities/sales.entity';
import axios, { AxiosResponse } from 'axios';
import { CreateSaleDto } from 'src/sales_plan/dto/create-sales_plan.dto';

@Injectable()
export class GetcourseApiService {
  private agoDateGc: string;
  private nowDateGc: string;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(GetcourseApi)
    private readonly exportsRepository: Repository<GetcourseApi>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
  ) {
    const now = new Date();
    const quarterAgo = new Date(now);
    // quarterAgo.setMonth(quarterAgo.getMonth() - 1);
    quarterAgo.setDate(quarterAgo.getDate() - 1);
    this.agoDateGc = quarterAgo.toISOString().split('T')[0];
    this.nowDateGc = now.toISOString().split('T')[0];
  }

  async createRequest(): Promise<GetcourseApi> {
    const response = await this.requestExportId();
    return await this.createExportId(response, 3, 60000);
  }

  async requestExportId() {
    try {
      const apiKey = this.configService.get('GC_API_KEY');
      const PREFIX = this.configService.get('GC_PREFIX');
      const result = await axios.get(
        // `${PREFIX}/deals?key=${apiKey}&created_at[from]=${this.agoDateGc}&created_at[to]=${this.nowDateGc}`,
        `${PREFIX}/deals?key=${apiKey}&created_at[from]=2024-06-01&created_at[to]=${this.nowDateGc}`,
      );
      console.log('Запрос на получение Export ID отправлен');
      if (result.status == 200) {
        return result;
      } else {
        console.error('Ошибка получения ID экспорта');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async createExportId(
    response: AxiosResponse,
    maxRetries: number,
    delayMs: number,
  ): Promise<GetcourseApi> {
    try {
      if (!response) {
        console.error('Не выгружен файл экспорта');
      }
      if (!response.data.success) {
        if (maxRetries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          console.log(new Date(), 'Retry ', maxRetries - 1);
          return this.createExportId(response, maxRetries - 1, delayMs);
        } else {
          throw new Error('Max retries exceeded');
        }
      }
      const export_id = response.data.info.export_id;
      const newExport = this.exportsRepository.save({
        name: 'Экспорт заказов Азат',
        export_id,
        status: 'creating',
      });
      console.log('Export ID сохранен');
      return newExport;
    } catch (error) {
      return;
    }
  }

  async findByStatus(status: 'creating' | 'exported') {
    return this.exportsRepository.find({
      where: {
        status,
      },
    });
  }

  async makeExport(export_id: number) {
    try {
      const apiKey = this.configService.get('GC_API_KEY');
      const PREFIX = this.configService.get('GC_PREFIX');
      const result = await axios.get(
        `${PREFIX}/exports/${export_id}?key=${apiKey}`,
      );
      if (result.data.error && result.data.error_code === 910) {
        await this.exportsRepository.update(
          { id: export_id },
          { status: 'bad_export_id' },
        );
        throw new Error('Файл не создан, попробуйте другой фильтр');
      }
      this.exportsRepository.update(
        { export_id: export_id },
        { status: 'exported' },
      );
      return result;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  async writeExportData(data: AxiosResponse) {
    const newData: string[][] = data.data.info.items;
    const arrOfObjects: any[] = [];
    newData.forEach((item) => {
      if (Number(item[10]) !== 0) {
        const tagItemIndex = item.length - 2;
        arrOfObjects.push({
          id: item[0],
          product: item[8],
          manager: item[19],
          payedPrice: item[11],
          date: item[7],
          // tags: JSON.stringify(item[tagItemIndex]).replace(/[[\]]/g, ''),
          tags: item[tagItemIndex],
        });
      }
    });

    console.log('Количество оплаченных заказов: ', arrOfObjects.length);

    const batchSize: number = 100;

    for (let i = 0; i < arrOfObjects.length; i += batchSize) {
      const batch = arrOfObjects.slice(i, i + batchSize);
      const promises = batch.map(async (item: CreateSaleDto) => {
        const existingItem = await this.salesRepository.findOne({
          where: {
            id: item.id,
          },
        });
        if (existingItem) {
          await this.salesRepository.update({ id: existingItem.id }, item);
        } else {
          this.salesRepository.save(item);
        }
      });
      await Promise.all(promises);
      console.log('Processed batch of ordinary orders: ', i);
    }
  }

  async exportDataFromExports(exports: GetcourseApi[]) {
    try {
      for (const _export of exports) {
        const result = await this.makeExport(_export.export_id);
        console.log(
          `Export data with ID: ${_export.export_id} has been exported`,
        );
        await this.writeExportData(result);
      }
    } catch (error) {
      console.error(error);
    }
  }
}
