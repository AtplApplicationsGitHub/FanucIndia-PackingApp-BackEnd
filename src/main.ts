import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Create the app instance (needed to access ConfigService)
  const app = await NestFactory.create(AppModule);

  // Get ConfigService instance from the app context
  const configService = app.get(ConfigService);

  // Fetch SSL paths from .env
  const httpsKeyPath = configService.get<string>('SSL_KEY_PATH');
  const httpsCertPath = configService.get<string>('SSL_CERT_PATH');

  // Log the fetched values (for debugging)
  console.log('SSL_KEY_PATH:', httpsKeyPath);
  console.log('SSL_CERT_PATH:', httpsCertPath);

  // Throw a clear error if not set
  if (!httpsKeyPath || !httpsCertPath) {
    throw new Error('SSL_KEY_PATH and SSL_CERT_PATH must be set in your environment!');
  }

  // Prepare HTTPS options
  const httpsOptions = {
    key: fs.readFileSync(httpsKeyPath),
    cert: fs.readFileSync(httpsCertPath),
  };

  // Close the first app instance and create HTTPS app
  await app.close();
  const httpsApp = await NestFactory.create(AppModule, { httpsOptions });

  // Log DATABASE_URL (for debugging)
  const databaseUrl = httpsApp.get(ConfigService).get<string>('DATABASE_URL');
  console.log('Database URL:', databaseUrl);

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
    origin: ['https://fanuc.goval.app:444'],
    credentials: true,
  });

  await httpsApp.listen(process.env.PORT ?? 3000);
}
bootstrap();
