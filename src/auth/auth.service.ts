import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { fullSchema } from '../database/database.module';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    // Find user by email
    const user = await this.database.query.users.findFirst({
      where: eq(fullSchema.users.email, email),
      with: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'user',
      },
      jwtSecret,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name || 'user',
      },
    };
  }

  async validateToken(token: string) {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, jwtSecret) as any;

      // Verify user still exists
      const user = await this.database.query.users.findFirst({
        where: eq(fullSchema.users.id, decoded.userId),
        with: {
          role: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'user',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
