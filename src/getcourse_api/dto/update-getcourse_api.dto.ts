import { PartialType } from '@nestjs/mapped-types';
import { CreateGetcourseApiDto } from './create-getcourse_api.dto';

export class UpdateGetcourseApiDto extends PartialType(CreateGetcourseApiDto) {}
