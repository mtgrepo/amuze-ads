import { PartialType } from "@nestjs/mapped-types";
import { CreateCampaignDTO } from "./create-campaign.dto";

export class UpdateCampaignDTO extends PartialType(CreateCampaignDTO) {}