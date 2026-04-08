import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../types/jwt-payload.type';

export const GetCurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

export const GetCurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    return request.user?.sub;
  },
);
