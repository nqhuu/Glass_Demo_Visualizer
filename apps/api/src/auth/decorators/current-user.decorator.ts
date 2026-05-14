import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../auth.types';

// VI: Lay payload JWT da duoc strategy xac thuc tu request handler.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): JwtPayload => {
  const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
  return request.user;
});
