import { Controller, Get, Logger, Query } from '@nestjs/common';
import { GetcourseApiService } from './getcourse_api.service';
import { Cron } from '@nestjs/schedule';

@Controller('getcourse')
export class GetcourseApiController {
  private readonly logger = new Logger(GetcourseApiController.name);
  constructor(private readonly getcourseApiService: GetcourseApiService) {}

  @Get('id')
  async getId() {
    const response = await this.getcourseApiService.requestExportId();
    return await this.getcourseApiService.createExportId(response, 3, 60000);
  }

  @Get('data')
  async getData() {
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
