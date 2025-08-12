import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PinoLogger } from './common/pino-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Disable Nest’s built-in logger
  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);

  const httpsKeyPath = configService.get<string>('SSL_KEY_PATH');
  const httpsCertPath = configService.get<string>('SSL_CERT_PATH');
  const isSSL = !!(httpsKeyPath && httpsCertPath);

  let listenApp = app;

  if (isSSL) {
    const httpsOptions = {
      key: fs.readFileSync(httpsKeyPath!),
      cert: fs.readFileSync(httpsCertPath!),
    };
    await app.close();
    // Also disable built-in logger on HTTPS instance
    listenApp = await NestFactory.create(AppModule, { httpsOptions, logger: false });
  }

  // Route all Nest logs & framework internals through our Pino adapter
  const pinoAdapter = new PinoLogger();
  listenApp.useLogger(pinoAdapter);

  // Global validation
  listenApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fanuc Packing App API')
    .setDescription('API documentation for Fanuc Packing Web & Mobile App')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(listenApp, swaggerConfig);
  SwaggerModule.setup('api', listenApp, document);

  // Global exception filter
  listenApp.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  listenApp.enableCors({
    origin: ['http://localhost:3000', 'https://fanuc.goval.app:444'],
    credentials: true,
  });

  await listenApp.listen(process.env.PORT ?? 3010);
  // Use our adapter directly to log bootstrap success
  pinoAdapter.log('Application started', 'bootstrap');
}

bootstrap();
