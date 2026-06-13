import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { LoansModule } from './loans/loans.module';
import { SavingsModule } from './savings/savings.module';
import { CentersModule } from './centers/centers.module';
import { MembersModule } from './members/members.module';
import { CollectionsModule } from './collections/collections.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RolesModule } from './roles/roles.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNC === 'true',
      migrationsRun: process.env.TYPEORM_RUN_MIGRATIONS === 'true',
      migrations: ['dist/migrations/*.js'],
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    UsersModule,
    RolesModule,
    AuthModule,
    LoansModule,
    SavingsModule,
    CentersModule,
    MembersModule,
    CollectionsModule,
    RepaymentsModule,
    PortfolioModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
