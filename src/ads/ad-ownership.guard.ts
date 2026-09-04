import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdService } from "./ad.service";

@Injectable()
export class AdOwnershipGuard implements CanActivate {
  constructor(private readonly adService: AdService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const ad = await this.adService.findAdById(request.params.id);

    if (!user || ad.adSet?.campaign?.advertiserId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this ad');
    }

    return true;
  }
}
