import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AdvertiserPostsService } from "./advertiser-posts.service";

@Injectable()
export class AdvertiserPostOwnershipGuard implements CanActivate {
  constructor(private readonly advertiserPostsService: AdvertiserPostsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const post = await this.advertiserPostsService.findOne(request.params.id);

    if (!user || post.advertiser_id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this post');
    }

    return true;
  }
}
