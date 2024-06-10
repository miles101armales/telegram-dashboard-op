import { Controller, Get, Logger } from '@nestjs/common';
import { GetcourseApiService } from './getcourse_api.service';
import { Cron } from '@nestjs/schedule';

@Controller('getcourse')
export class GetcourseApiController {
  private readonly logger = new Logger(GetcourseApiController.name);
  constructor(private readonly getcourseApiService: GetcourseApiService) {}

  @Get('create')
  @Cron('01 21 * * *')
  async createExportId() {
    try {
      this.logger.log(
        'Создаем ID экспорта запросов в геткурс и записываем в БД экспортов',
      );
      this.getcourseApiService.createRequest();
    } catch (error) {}
    return;
  }

  @Get('export')
  @Cron('01 22 * * *')
  async makeExportById() {
    try {
      const findedExports =
        await this.getcourseApiService.findByStatus('creating');
      if (!findedExports) {
        console.log('Экспортов для выгрузки не найдено');
      }
      this.getcourseApiService.exportDataFromExports(findedExports);
    } catch (error) {
      console.error(error);
    }
  }
}
