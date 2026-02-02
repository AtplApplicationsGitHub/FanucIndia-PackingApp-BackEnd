"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _appmodule = require("./app.module");
const _allexceptionsfilter = require("./common/all-exceptions.filter");
const _pinologgerservice = require("./common/pino-logger.service");
const _swagger = require("@nestjs/swagger");
const _common = require("@nestjs/common");
const _express = require("express");
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule, {
        logger: false
    });
    app.use((0, _express.json)({
        limit: '200mb'
    }));
    app.use((0, _express.urlencoded)({
        extended: true,
        limit: '200mb'
    }));
    const pinoAdapter = new _pinologgerservice.PinoLogger();
    app.useLogger(pinoAdapter);
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const swaggerConfig = new _swagger.DocumentBuilder().setTitle('Fanuc Packing App API').setDescription('API documentation for Fanuc Packing Web & Mobile App').setVersion('1.0').addBearerAuth().build();
    const document = _swagger.SwaggerModule.createDocument(app, swaggerConfig);
    _swagger.SwaggerModule.setup('api', app, document);
    app.useGlobalFilters(new _allexceptionsfilter.AllExceptionsFilter());
    app.enableCors({
        origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true,
        credentials: true
    });
    const port = process.env.PORT || 3011;
    const server = await app.listen(port, '0.0.0.0');
    server.setTimeout(600000);
    pinoAdapter.log(`Application is listening on port ${port}`, 'bootstrap');
    pinoAdapter.log('Application started', 'bootstrap');
}
bootstrap();

//# sourceMappingURL=main.js.map