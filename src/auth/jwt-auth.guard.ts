import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Our own JWT (customer portal) first, then the AMUZE admin token (admin portal); 401 if neither is valid.
@Injectable()
export class JwtAuthGuard extends AuthGuard(['jwt', 'amuze-jwt']) {}
