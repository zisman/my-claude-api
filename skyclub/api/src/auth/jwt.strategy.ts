import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'skyclub-dev-secret',
    });
  }

  async validate(payload: { sub: string; tenantId: string; role: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, isActive: true },
    });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }
}
