import { PartialType } from '@nestjs/mapped-types';
import { CreateAdvertiserPostDto } from './create-advertiser-post.dto';

export class UpdateAdvertiserPostDto extends PartialType(CreateAdvertiserPostDto) {}
