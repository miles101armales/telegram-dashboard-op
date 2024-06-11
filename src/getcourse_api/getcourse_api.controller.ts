import { Controller, Get, Logger } from '@nestjs/common';
import { GetcourseApiService } from './getcourse_api.service';
import { Cron } from '@nestjs/schedule';

@Controller('getcourse')
export class GetcourseApiController {
  private readonly logger = new Logger(GetcourseApiController.name);
  constructor(private readonly getcourseApiService: GetcourseApiService) {}

  @Get('getsales')
  async getSalesFromDatabase() {
    const now = new Date();
    const month = (now.getMonth() + 1).toLocaleString('en-US', {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
    const data = await this.getcourseApiService.requestSales(month);
    return await this.getcourseApiService.writeExportData(data);
  }
}
