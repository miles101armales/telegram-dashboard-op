import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from './entities/manager.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ManagersService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Manager)
    private readonly managersRepository: Repository<Manager>,
  ) {}

  async calculateSalary() {
    const managers = await this.managersRepository.find();
    for (const manager of managers) {
      const salary = Number(manager.monthly_sales) * 0.05;
      this.managersRepository.update(
        { name: manager.name },
        { salary: Number(salary.toFixed(0)) },
      );
    }
  }

  async getLeaderboardList() {
    // Получаем всех менеджеров из базы данных
    const managers = await this.managersRepository.find();

    // Сортируем менеджеров по monthly_sales в порядке убывания
    const sortedManagers = managers.sort(
      (a, b) => b.monthly_sales - a.monthly_sales,
    );

    // Возвращаем отсортированный список
    return sortedManagers;
  }
}
