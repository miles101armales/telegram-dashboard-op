import { Module } from '@nestjs/common';
import { GetcourseApiService } from './getcourse_api.service';
import { GetcourseApiController } from './getcourse_api.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetcourseApi } from './entities/getcourse_api.entity';
import { Sales } from 'src/sales_plan/entities/sales.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GetcourseApi, Sales])],
  controllers: [GetcourseApiController],
  providers: [GetcourseApiService],
})
export class GetcourseApiModule {}
