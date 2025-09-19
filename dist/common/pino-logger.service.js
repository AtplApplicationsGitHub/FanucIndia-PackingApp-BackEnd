"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PinoLogger", {
    enumerable: true,
    get: function() {
        return PinoLogger;
    }
});
const _logger = require("./logger");
let PinoLogger = class PinoLogger {
    log(message, context) {
        _logger.logger.info({
            context
        }, message);
    }
    error(message, trace, context) {
        _logger.logger.error({
            context,
            trace
        }, message);
    }
    warn(message, context) {
        _logger.logger.warn({
            context
        }, message);
    }
    debug(message, context) {
        _logger.logger.debug({
            context
        }, message);
    }
    verbose(message, context) {
        _logger.logger.trace({
            context
        }, message);
    }
};

//# sourceMappingURL=pino-logger.service.js.map