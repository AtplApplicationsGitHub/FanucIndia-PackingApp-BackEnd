import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // 1. Create initial app to get ConfigService
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 2. Read HTTPS cert/key paths from .env or environment
  const httpsKeyPath = configService.get<string>('SSL_KEY_PATH');
  const httpsCertPath = configService.get<string>('SSL_CERT_PATH');

  // 3. Prepare HTTPS options only if both are set
  let httpsOptions: { key?: Buffer; cert?: Buffer } | undefined = undefined;
  if (httpsKeyPath && httpsCertPath) {
    httpsOptions = {
      key: fs.readFileSync(httpsKeyPath),
      cert: fs.readFileSync(httpsCertPath),
    };
  }

  // 4. Close the initial app, create HTTPS or HTTP app accordingly
  await app.close();

  // If HTTPS options are set, use HTTPS, else fallback to HTTP (useful for local/testing)
  const appFinal = await NestFactory.create(AppModule, httpsOptions ? { httpsOptions } : {});

  appFinal.useGlobalPipes(
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
  const document = SwaggerModule.createDocument(appFinal, config);
  SwaggerModule.setup('api', appFinal, document);

  appFinal.useGlobalFilters(new AllExceptionsFilter());

  appFinal.enableCors({
    origin: ['https://fanuc.goval.app:444'],
    credentials: true,
  });

  // 5. Start server
  await appFinal.listen(process.env.PORT ?? 3010);
}
bootstrap();
