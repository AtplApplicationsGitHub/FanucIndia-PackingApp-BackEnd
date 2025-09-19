"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SftpService", {
    enumerable: true,
    get: function() {
        return SftpService;
    }
});
const _common = require("@nestjs/common");
const _ssh2sftpclient = /*#__PURE__*/ _interop_require_default(require("ssh2-sftp-client"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SftpService = class SftpService {
    getConfig() {
        const { SFTP_HOST, SFTP_PORT, SFTP_USERNAME, SFTP_PASSWORD, SFTP_PRIVATE_KEY, SFTP_PASSPHRASE, SFTP_RETRIES, SFTP_RETRY_FACTOR, SFTP_RETRY_MIN_TIMEOUT, SFTP_READY_TIMEOUT } = process.env;
        if (!SFTP_HOST) throw new Error('SFTP_HOST is required');
        if (!SFTP_USERNAME) throw new Error('SFTP_USERNAME is required');
        if (!SFTP_PASSWORD && !SFTP_PRIVATE_KEY) {
            throw new Error('Either SFTP_PASSWORD or SFTP_PRIVATE_KEY must be set');
        }
        const cfg = {
            host: SFTP_HOST,
            port: SFTP_PORT ? Number(SFTP_PORT) : 22,
            username: SFTP_USERNAME,
            retries: SFTP_RETRIES ? Number(SFTP_RETRIES) : 2,
            retry_factor: SFTP_RETRY_FACTOR ? Number(SFTP_RETRY_FACTOR) : 2,
            retry_minTimeout: SFTP_RETRY_MIN_TIMEOUT ? Number(SFTP_RETRY_MIN_TIMEOUT) : 500,
            readyTimeout: SFTP_READY_TIMEOUT ? Number(SFTP_READY_TIMEOUT) : 20000
        };
        if (SFTP_PRIVATE_KEY) {
            cfg.privateKey = Buffer.from(SFTP_PRIVATE_KEY, 'base64');
            if (SFTP_PASSPHRASE) cfg.passphrase = SFTP_PASSPHRASE;
        } else {
            cfg.password = SFTP_PASSWORD;
        }
        return cfg;
    }
    async withClient(fn) {
        const client = new _ssh2sftpclient.default();
        try {
            await client.connect(this.getConfig());
            return await fn(client);
        } catch (err) {
            this.logger.error(`SFTP operation failed: ${err?.message || err}`);
            throw err;
        } finally{
            try {
                await client.end();
            } catch  {}
        }
    }
    async ensureDir(remoteDir) {
        return this.withClient(async (c)=>{
            const segments = _path.posix.normalize(remoteDir).split('/');
            let cur = '';
            for (const seg of segments){
                if (!seg) continue;
                cur += `/${seg}`;
                const exists = await c.exists(cur);
                if (!exists) {
                    await c.mkdir(cur);
                }
            }
        });
    }
    async put(localPath, remotePath) {
        const remoteDir = _path.posix.dirname(remotePath);
        await this.ensureDir(remoteDir);
        await this.withClient((c)=>c.put(localPath, remotePath));
        return {
            remotePath,
            remoteDir
        };
    }
    async getStream(remotePath) {
        return this.withClient((c)=>c.get(remotePath));
    }
    async delete(remotePath) {
        return this.withClient(async (c)=>{
            const exists = await c.exists(remotePath);
            if (!exists) return false;
            await c.delete(remotePath, false);
            return true;
        });
    }
    constructor(){
        this.logger = new _common.Logger(SftpService.name);
    }
};
SftpService = _ts_decorate([
    (0, _common.Injectable)()
], SftpService);

//# sourceMappingURL=sftp.service.js.map