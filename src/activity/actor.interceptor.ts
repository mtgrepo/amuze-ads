import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { Observable } from "rxjs";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { ACTOR_KEY, type Actor } from "./activity.service";

/**
 * Remembers who is signed in for the rest of the request, so the history knows who acted without the user
 * being passed through every service. Interceptors run after guards, so request.user is already set.
 */
@Injectable()
export class ActorInterceptor implements NestInterceptor {
    constructor(private readonly cls: ClsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() === 'http' && this.cls.isActive()) {
            const user = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>().user;
            if (user?.id) {
                const actor: Actor = { type: user.role === 'admin' ? 'admin' : 'advertiser', id: user.id, role: user.role };
                this.cls.set(ACTOR_KEY, actor);
            }
        }
        return next.handle();
    }
}
