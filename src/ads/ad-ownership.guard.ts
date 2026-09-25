import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdService } from "./ad.service";
import { AdvertiserService } from "src/advertisers/advertiser.service";

@Injectable()
export class AdOwnershipGuard implements CanActivate {
  constructor(
    private readonly adService: AdService,
    private readonly advertiserService: AdvertiserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const ad = await this.adService.findAdById(request.params.id);

    const ownerId = ad.adSet?.campaign?.advertiserId;
    if (!user || !ownerId || !(await this.advertiserService.canAccessAdvertiser(user, ownerId))) {
      throw new ForbiddenException('You do not have permission to access this ad');
    }

    return true;
  }
}
