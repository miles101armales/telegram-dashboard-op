import { Module } from '@nestjs/common';
import { SalesPlanService } from './sales_plan.service';
import { SalesPlanController } from './sales_plan.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manager } from 'src/managers/entities/manager.entity';
import { Sales } from './entities/sales.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Manager, Sales])],
  controllers: [SalesPlanController],
  providers: [SalesPlanService],
})
export class SalesPlanModule {}
