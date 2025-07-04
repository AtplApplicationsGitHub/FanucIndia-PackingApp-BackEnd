import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';  // <-- Import ConfigService

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/fanuc.goval.app/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/fanuc.goval.app/fullchain.pem'),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Get ConfigService instance from the app context
  const configService = app.get(ConfigService);

  // Fetch and log DATABASE_URL
  const databaseUrl = configService.get<string>('DATABASE_URL');
  console.log('Database URL:', databaseUrl);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Fanuc Packing App API')
    .setDescription('API documentation for Fanuc Packing Web & Mobile App')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: ['https://fanuc.goval.app:444'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
