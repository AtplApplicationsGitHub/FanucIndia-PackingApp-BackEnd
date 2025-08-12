"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinoLogger = void 0;
const logger_1 = require("./logger");
class PinoLogger {
    log(message, context) {
        logger_1.logger.info({ context }, message);
    }
    error(message, trace, context) {
        logger_1.logger.error({ context, trace }, message);
    }
    warn(message, context) {
        logger_1.logger.warn({ context }, message);
    }
    debug(message, context) {
        logger_1.logger.debug({ context }, message);
    }
    verbose(message, context) {
        logger_1.logger.trace({ context }, message);
    }
}
exports.PinoLogger = PinoLogger;
//# sourceMappingURL=pino-logger.service.js.map