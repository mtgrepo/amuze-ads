import { PartialType } from "@nestjs/mapped-types";
import { CreateAdPackageDto } from "./create-ad-package.dto";

export class UpdateAdPackageDto extends PartialType(CreateAdPackageDto) {}
