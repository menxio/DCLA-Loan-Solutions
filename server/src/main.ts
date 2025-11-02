  import { ValidationPipe } from '@nestjs/common';
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { SeederModule } from './seeds/seeder.module';
  import { UserSeeder } from './users/user.seeder';
  import helmet from 'helmet';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const allowedOrigins = (process.env.CLIENT_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    });

    app.use(helmet());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    if (process.env.RUN_SEED_ON_STARTUP === 'true') {
      const userSeeder = app.select(SeederModule).get(UserSeeder, { strict: true });
      await userSeeder.seed();
    }

    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT ?? 3000);
  }
  bootstrap();
