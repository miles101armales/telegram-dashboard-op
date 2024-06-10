import { Controller, Get, Logger } from '@nestjs/common';
import { GetcourseApiService } from './getcourse_api.service';

@Controller('getcourse')
export class GetcourseApiController {
  private readonly logger = new Logger(GetcourseApiController.name);
  constructor(private readonly getcourseApiService: GetcourseApiService) {}

  @Get('create')
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
