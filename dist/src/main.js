"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/all-exceptions.filter");
const pino_logger_service_1 = require("./common/pino-logger.service");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: false });
    const configService = app.get(config_1.ConfigService);
    const httpsKeyPath = configService.get('SSL_KEY_PATH');
    const httpsCertPath = configService.get('SSL_CERT_PATH');
    const isSSL = !!(httpsKeyPath && httpsCertPath);
    let listenApp = app;
    if (isSSL) {
        const httpsOptions = {
            key: fs.readFileSync(httpsKeyPath),
            cert: fs.readFileSync(httpsCertPath),
        };
        await app.close();
        listenApp = await core_1.NestFactory.create(app_module_1.AppModule, { httpsOptions, logger: false });
    }
    const pinoAdapter = new pino_logger_service_1.PinoLogger();
    listenApp.useLogger(pinoAdapter);
    listenApp.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Fanuc Packing App API')
        .setDescription('API documentation for Fanuc Packing Web & Mobile App')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(listenApp, swaggerConfig);
    swagger_1.SwaggerModule.setup('api', listenApp, document);
    listenApp.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    listenApp.enableCors({
        origin: ['http://localhost:3000', 'https://fanuc.goval.app:444'],
        credentials: true,
    });
    await listenApp.listen(process.env.PORT ?? 3010);
    pinoAdapter.log('Application started', 'bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map