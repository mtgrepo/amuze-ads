import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { CampaignService } from "./campaign.service";

@Injectable()
export class CampaignOwnershipGuard implements CanActivate {
  constructor(private readonly campaignService: CampaignService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const campaign = await this.campaignService.findCampaignById(request.params.id);

    if (!user || campaign.advertiserId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this campaign');
    }

    return true;
  }
}
