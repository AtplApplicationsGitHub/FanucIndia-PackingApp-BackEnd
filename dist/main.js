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
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule, {
        logger: false
    });
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
        origin: [
            'http://localhost:3000',
            'https://fanuc.goval.app:444'
        ],
        credentials: true
    });
    const port = process.env.PORT || 3011;
    await app.listen(port, '0.0.0.0');
    pinoAdapter.log(`Application is listening on port ${port}`, 'bootstrap');
    pinoAdapter.log('Application started', 'bootstrap');
}
bootstrap();

//# sourceMappingURL=main.js.map