import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederModule } from './seeds/seeder.module';
import { UserSeeder } from './users/user.seeder';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  const userSeeder = app.select(SeederModule).get(UserSeeder, { strict: true });
  await userSeeder.seed();

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
