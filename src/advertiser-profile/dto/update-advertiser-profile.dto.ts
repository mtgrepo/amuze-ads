import { PartialType } from '@nestjs/mapped-types';
import { CreateAdvertiserProfileDto } from './create-advertiser-profile.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateAdvertiserProfileDto extends PartialType(CreateAdvertiserProfileDto) {}
