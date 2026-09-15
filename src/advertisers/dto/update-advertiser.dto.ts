import { PartialType } from '@nestjs/mapped-types';
import { CreateAdvertiserDTO } from './create-advertiser.dto';

export class UpdateAdvertiserDTO extends PartialType(CreateAdvertiserDTO) {}
