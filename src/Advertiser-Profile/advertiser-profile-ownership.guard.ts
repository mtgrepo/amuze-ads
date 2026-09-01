import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdvertiserProfilesService } from "./advertiser-profiles.service";

@Injectable()
export class AdvertiserProfileOwnershipGuard implements CanActivate {
  constructor(private readonly advertiserProfilesService: AdvertiserProfilesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const profile = await this.advertiserProfilesService.findOne(request.params.id);

    if (!user || profile.advertiser_id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this profile');
    }

    return true;
  }
}
