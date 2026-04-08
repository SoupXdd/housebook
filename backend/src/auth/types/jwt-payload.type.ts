import { Role } from '@prisma/client/index';

export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
};

export type JwtUser = JwtPayload & {
  refreshToken?: string;
};
