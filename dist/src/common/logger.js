"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logAuthFailure = logAuthFailure;
const pino_1 = __importDefault(require("pino"));
class FailureSampler {
    buckets = new Map();
    windowMs = 60_000;
    sampleRate;
    constructor(sampleRate = 10) {
        this.sampleRate = sampleRate;
    }
    shouldLog(ip, code) {
        const key = `${ip}:${code}`;
        const now = Date.now();
        let entry = this.buckets.get(key);
        if (!entry || now >= entry.resetAt) {
            entry = { count: 0, resetAt: now + this.windowMs };
            this.buckets.set(key, entry);
        }
        entry.count += 1;
        return entry.count === 1 || entry.count % this.sampleRate === 0;
    }
}
const sampler = new FailureSampler(10);
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        pid: false,
        hostname: false,
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            id: req.id,
            ip: req.ip,
        })
    }
});
function logAuthFailure({ code, message, ip, userId, requestId, }) {
    if (!sampler.shouldLog(ip, code)) {
        return;
    }
    exports.logger.warn({
        component: 'auth',
        code,
        ip,
        userId,
        requestId,
    }, message);
}
//# sourceMappingURL=logger.js.map