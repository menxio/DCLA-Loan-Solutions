import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed() {
    const existing = await this.userRepo.findOne({
      where: { email: 'admin@example.com' },
    });

    if (existing) {
      console.log('Admin already exists. Skipping seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = this.userRepo.create({
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Super',
      middleName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    });

    await this.userRepo.save(admin);
    console.log('✅ Admin seeded: admin@example.com / admin123');
  }
}
