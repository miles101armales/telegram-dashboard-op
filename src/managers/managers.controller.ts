import { Controller, Get } from '@nestjs/common';
import { ManagersService } from './managers.service';

@Controller('managers')
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Get('salary')
  async salary() {
    this.managersService.calculateSalary();
  }

  @Get('leaderboard')
  async getLeaderboardList() {
    return await this.managersService.getLeaderboardList();
  }
}
