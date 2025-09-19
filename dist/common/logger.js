"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get logAuthFailure () {
        return logAuthFailure;
    },
    get logger () {
        return logger;
    }
});
const _pino = /*#__PURE__*/ _interop_require_default(require("pino"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let FailureSampler = class FailureSampler {
    shouldLog(ip, code) {
        const key = `${ip}:${code}`;
        const now = Date.now();
        let entry = this.buckets.get(key);
        if (!entry || now >= entry.resetAt) {
            entry = {
                count: 0,
                resetAt: now + this.windowMs
            };
            this.buckets.set(key, entry);
        }
        entry.count += 1;
        return entry.count === 1 || entry.count % this.sampleRate === 0;
    }
    constructor(sampleRate = 10){
        this.buckets = new Map();
        this.windowMs = 60_000;
        this.sampleRate = sampleRate;
    }
};
const sampler = new FailureSampler(10);
const logger = (0, _pino.default)({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        pid: false,
        hostname: false
    },
    timestamp: _pino.default.stdTimeFunctions.isoTime,
    serializers: {
        req: (req)=>({
                method: req.method,
                url: req.url,
                id: req.id,
                ip: req.ip
            })
    }
});
function logAuthFailure({ code, message, ip, userId, requestId }) {
    if (!sampler.shouldLog(ip, code)) {
        return;
    }
    logger.warn({
        component: 'auth',
        code,
        ip,
        userId,
        requestId
    }, message);
}

//# sourceMappingURL=logger.js.map