import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdCreativeService } from "./ad-creative.service";

@Injectable()
export class AdCreativeOwnershipGuard implements CanActivate {
  constructor(private readonly adCreativeService: AdCreativeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const creative = await this.adCreativeService.findOne(request.params.id);

    if (!user || creative.advertiserId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this ad creative');
    }

    return true;
  }
}
