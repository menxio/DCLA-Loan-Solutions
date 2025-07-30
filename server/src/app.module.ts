import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoansModule } from './loans/loans.module';
import { BorrowersModule } from './borrowers/borrowers.module';
import { SavingsModule } from './savings/savings.module';
import { SeederModule } from './seeds/seeder.module';
import { CentersModule } from './centers/centers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    LoansModule,
    BorrowersModule,
    SavingsModule,
    SeederModule,
    CentersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
