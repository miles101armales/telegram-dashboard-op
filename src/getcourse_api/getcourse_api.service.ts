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

  async requestSales(month: string) {
    try {
      const PREFIX = this.configService.get('DB_PREFIX');
      const result = await axios.get(
        // `${PREFIX}/deals?key=${apiKey}&created_at[from]=${this.agoDateGc}&created_at[to]=${this.nowDateGc}`,
        `${PREFIX}/exports/getsales?month=${month}`,
        // `http://31.41.155.30:3000/api/exports/getsales?month=${month}`,
      );
      if (result.status == 200) {
        return result;
      } else {
        console.error('Ошибка получения Заказов');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async writeExportData(data: AxiosResponse) {
    const newData: string[] = data.data;
    const arrOfObjects: any[] = [];
    newData.forEach((item: any, index) => {
      console.log(`Processing item ${index}:`, item);

      const payedPrice = Number(item.payedPrice);
      if (payedPrice !== 0) {
        const obj = {
          id: item.id || 'N/A',
          product: item.orderName || 'N/A',
          manager: item.managerName || 'N/A',
          payedPrice: item.payedPrice || 'N/A',
          date: item.createdAt || 'N/A',
          tags: item.orderTag || 'N/A',
        };

        console.log(`Constructed object:`, obj);
        arrOfObjects.push(obj);
      } else {
        console.log(`Skipped item ${index} because payedPrice is 0.`);
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
    return 'OK';
  }
}
