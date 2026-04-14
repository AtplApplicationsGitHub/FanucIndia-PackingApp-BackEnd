import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PinoLogger } from './common/pino-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers
  app.use(helmet());

  // Response compression for large JSON payloads
  app.use(compression());

  app.set('trust proxy', 1);

  // Reduced global limits to prevent OOM crashes.
  // Use Multer streams in specific controllers for large ERP file uploads.
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  const pinoAdapter = new PinoLogger();
  app.useLogger(pinoAdapter);

  app.useGlobalPipes(
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
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true,
    credentials: true,
  });

  const port = process.env.PORT || 3011;
  const server = await app.listen(port, '0.0.0.0');
  
  // Reduced timeout to 60 seconds to prevent resource starvation & slow-loris attacks
  server.setTimeout(60000); 
  
  pinoAdapter.log(`Application is listening on port ${port}`, 'bootstrap');
  pinoAdapter.log('Application started', 'bootstrap');
}

bootstrap();