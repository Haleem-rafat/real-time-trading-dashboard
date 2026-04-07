import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Typed `request.user` so `@UserFromPayload()` returns a real
 * JwtPayload instead of `any`, which silences the downstream
 * @typescript-eslint/no-unsafe-* rules in every controller.
 */
interface AuthedRequest extends Request {
  user: JwtPayload;
}

export const UserFromPayload = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    return request.user;
  },
);
