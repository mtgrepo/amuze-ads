import { PartialType } from "@nestjs/mapped-types";
import { CreateAdSetsDTO } from "./create-ad-sets.dto";

export class UpdateAdSetsDTO extends PartialType(CreateAdSetsDTO) {}