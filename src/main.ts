import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Always create the app first (we need ConfigService)
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const httpsKeyPath = configService.get<string>('SSL_KEY_PATH');
  const httpsCertPath = configService.get<string>('SSL_CERT_PATH');
  const isSSL = httpsKeyPath && httpsCertPath;

  let listenApp = app;

  if (isSSL) {
    // If SSL is configured, close HTTP app and start HTTPS app
    console.log('SSL enabled: Starting in HTTPS mode');
    const httpsOptions = {
      key: fs.readFileSync(httpsKeyPath!),
      cert: fs.readFileSync(httpsCertPath!),
    };
    await app.close();
    listenApp = await NestFactory.create(AppModule, { httpsOptions });
  } else {
    // No SSL: run in HTTP mode (good for local/dev)
    console.log('SSL not set: Starting in HTTP mode (local/dev)');
  }

  // Print useful config for debugging
  const databaseUrl = listenApp.get(ConfigService).get<string>('DATABASE_URL');
  console.log('Database URL:', databaseUrl);

  listenApp.useGlobalPipes(
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
  const document = SwaggerModule.createDocument(listenApp, config);
  SwaggerModule.setup('api', listenApp, document);

  listenApp.useGlobalFilters(new AllExceptionsFilter());

  listenApp.enableCors({
    // origin: ['https://fanuc.goval.app:444'],
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  await listenApp.listen(process.env.PORT ?? 3000);
}

bootstrap();
