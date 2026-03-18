import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      this.logger.debug(`Attempting to validate user with email: ${email}`);
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        this.logger.warn(`Validation failed: user with email ${email} not found`);
        return null;
      }

      const passwordMatch = await bcrypt.compare(pass, user.password);
      if (passwordMatch) {
        const { password, ...result } = user;
        return result;
      }
      this.logger.warn(`Validation failed: password mismatch for ${email}`);
      return null;
    } catch (error) {
      this.logger.error(`Error validating user ${email}`, error.stack);
      throw new InternalServerErrorException('User validation failed');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    this.logger.log(`Login successful for user ${user.email}`);
    return {
      access_token: token,
      user,
    };
  }
}
