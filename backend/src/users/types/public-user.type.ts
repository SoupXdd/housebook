import { Role } from '@prisma/client/index';

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};
