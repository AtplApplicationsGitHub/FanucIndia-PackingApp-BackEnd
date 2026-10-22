import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PinoLogger } from './common/pino-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import {
  BOM_AUDIT_MOBILE_JSON_LIMIT,
  BOM_AUDIT_MOBILE_PATH_PREFIX,
} from './modules/bom-audit/bom-audit.constants';
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
  // BOM Completeness handheld: a full audit submit (up to 20,000 scanned lines) is bigger than 2 MB,
  // so ONLY the /bom-audit/mobile/ routes get a larger JSON limit. Registered BEFORE the global parser
  // (the global one skips a body that is already parsed).
  const bomAuditMobileJson = json({ limit: BOM_AUDIT_MOBILE_JSON_LIMIT });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.includes(BOM_AUDIT_MOBILE_PATH_PREFIX)
      ? bomAuditMobileJson(req, res, next)
      : next(),
  );

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