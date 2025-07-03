import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // 1. Create an initial app to get ConfigService
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // 2. Read HTTPS cert/key paths from .env
  const httpsKeyPath = configService.get<string>('/etc/letsencrypt/live/fanuc.goval.app/fullchain.pem');
  const httpsCertPath = configService.get<string>('/etc/letsencrypt/live/fanuc.goval.app/privkey.pem');

  // 3. Prepare HTTPS options (read files synchronously)
  const httpsOptions = {
    key: fs.readFileSync(httpsKeyPath),
    cert: fs.readFileSync(httpsCertPath),
  };

  // 4. Close the first app instance, then create the HTTPS app
  await app.close();
  const httpsApp = await NestFactory.create(AppModule, { httpsOptions });

  httpsApp.useGlobalPipes(
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
  const document = SwaggerModule.createDocument(httpsApp, config);
  SwaggerModule.setup('api', httpsApp, document);

  httpsApp.useGlobalFilters(new AllExceptionsFilter());

  httpsApp.enableCors({
    origin: ['https://fanuc.goval.app:5173'],
    credentials: true,
  });

  await httpsApp.listen(process.env.PORT ?? 3010);
}
bootstrap();
