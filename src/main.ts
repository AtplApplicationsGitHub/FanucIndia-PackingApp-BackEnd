import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PinoLogger } from './common/pino-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);

  const httpsKeyPath = configService.get<string>('SSL_KEY_PATH');
  console.log(httpsKeyPath);
  const httpsCertPath = configService.get<string>('SSL_CERT_PATH');
  console.log(httpsCertPath);
  const isSSL = !!(httpsKeyPath && httpsCertPath);

  let listenApp = app;

  // if (isSSL) {
  //   const httpsOptions = {
  //     key: fs.readFileSync(httpsKeyPath!),
  //     cert: fs.readFileSync(httpsCertPath!),
  //   };
  //   await app.close();
  //   listenApp = await NestFactory.create(AppModule, { httpsOptions, logger: false });
  // }
  if (isSSL) {
    // Read the key and certificate files into variables
    const privateKey = fs.readFileSync(httpsKeyPath!);
    const certificate = fs.readFileSync(httpsCertPath!);

    // Log the contents to the console
    // Using .toString() to see the text content instead of a buffer
    console.log("--- HTTPS Key ---");
    console.log(privateKey.toString()); 

    console.log("--- HTTPS Certificate ---");
    console.log(certificate.toString());

    const httpsOptions = {
        key: privateKey,
        cert: certificate,
    };

    await app.close();
    listenApp = await NestFactory.create(AppModule, { httpsOptions, logger: false });
}

  const pinoAdapter = new PinoLogger();
  listenApp.useLogger(pinoAdapter);

  listenApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fanuc Packing App API')
    .setDescription('API documentation for Fanuc Packing Web & Mobile App')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(listenApp, swaggerConfig);
  SwaggerModule.setup('api', listenApp, document);

  listenApp.useGlobalFilters(new AllExceptionsFilter());

  listenApp.enableCors({
    origin: ['http://localhost:3000', 'https://fanuc.goval.app:444'],
    credentials: true,
  });

  const port = process.env.PORT || 3010;
  await listenApp.listen(port, '0.0.0.0');
  pinoAdapter.log(`Application is listening on port ${port}`, 'bootstrap');
  pinoAdapter.log('Application started', 'bootstrap');
}

bootstrap();
