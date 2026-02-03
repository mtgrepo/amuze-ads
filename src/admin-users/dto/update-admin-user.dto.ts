import { PartialType } from "@nestjs/mapped-types";
import { CreateAdminUserDTO } from "./create-admin-user.dto";

export class UpdateAdminUserDTO extends PartialType(CreateAdminUserDTO) {}