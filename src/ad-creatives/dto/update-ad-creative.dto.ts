import { PartialType } from "@nestjs/mapped-types";
import { CreateAdCreativeDto } from "./create-ad-creative.dto";

export class UpdateAdCreativeDto extends PartialType(CreateAdCreativeDto) {}
