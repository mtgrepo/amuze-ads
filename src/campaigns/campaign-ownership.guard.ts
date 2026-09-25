import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { CampaignService } from "./campaign.service";
import { AdvertiserService } from "src/advertisers/advertiser.service";

@Injectable()
export class CampaignOwnershipGuard implements CanActivate {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly advertiserService: AdvertiserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const campaign = await this.campaignService.findCampaignById(request.params.id);

    if (!user || !(await this.advertiserService.canAccessAdvertiser(user, campaign.advertiserId))) {
      throw new ForbiddenException('You do not have permission to access this campaign');
    }

    return true;
  }
}
