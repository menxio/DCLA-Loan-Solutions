import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      console.log('[validateUser] Finding user with email:', email);
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        console.log('[validateUser] User not found');
        return null;
      }

      const passwordMatch = await bcrypt.compare(pass, user.password);
      console.log('[validateUser] Password match:', passwordMatch);

      if (passwordMatch) {
        const { password, ...result } = user;
        return result;
      }

      return null;
    } catch (error) {
      console.error('[validateUser] Error:', error);
      throw new InternalServerErrorException('User validation failed');
    }
  }

  async login(loginDto: LoginDto) {
    console.log('[login] Login attempt with:', loginDto);
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      console.log('[login] Invalid credentials');
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    console.log('[login] Login successful. Payload:', payload);
    return {
      access_token: token,
    };
  }
}
