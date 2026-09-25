import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdvertiserService } from "./advertiser.service";

@Injectable()
export class AdvertiserAccessGuard implements CanActivate {
  constructor(private readonly advertiserService: AdvertiserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !(await this.advertiserService.canManageAccount(user, request.params.id))) {
      throw new ForbiddenException('You do not have permission to access this account');
    }
    return true;
  }
}
