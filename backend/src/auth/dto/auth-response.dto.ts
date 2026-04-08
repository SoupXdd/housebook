import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client/index';

class AuthUserDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, required: false })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true, required: false })
  bio!: string | null;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
