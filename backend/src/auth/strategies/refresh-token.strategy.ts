import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, JwtUser } from '../types/jwt-payload.type';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: JwtPayload): JwtUser {
    const authHeader = request.get('authorization') || '';
    const refreshToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    return {
      ...payload,
      refreshToken,
    };
  }
}
