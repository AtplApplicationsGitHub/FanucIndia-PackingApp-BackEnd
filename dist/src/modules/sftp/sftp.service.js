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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SftpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SftpService = void 0;
const common_1 = require("@nestjs/common");
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const path = __importStar(require("path"));
let SftpService = SftpService_1 = class SftpService {
    logger = new common_1.Logger(SftpService_1.name);
    getConfig() {
        const { SFTP_HOST, SFTP_PORT, SFTP_USERNAME, SFTP_PASSWORD, SFTP_PRIVATE_KEY, SFTP_PASSPHRASE, SFTP_RETRIES, SFTP_RETRY_FACTOR, SFTP_RETRY_MIN_TIMEOUT, SFTP_READY_TIMEOUT, } = process.env;
        if (!SFTP_HOST)
            throw new Error('SFTP_HOST is required');
        if (!SFTP_USERNAME)
            throw new Error('SFTP_USERNAME is required');
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
            readyTimeout: SFTP_READY_TIMEOUT ? Number(SFTP_READY_TIMEOUT) : 20000,
        };
        if (SFTP_PRIVATE_KEY) {
            cfg.privateKey = Buffer.from(SFTP_PRIVATE_KEY, 'base64');
            if (SFTP_PASSPHRASE)
                cfg.passphrase = SFTP_PASSPHRASE;
        }
        else {
            cfg.password = SFTP_PASSWORD;
        }
        return cfg;
    }
    async withClient(fn) {
        const client = new ssh2_sftp_client_1.default();
        try {
            await client.connect(this.getConfig());
            return await fn(client);
        }
        catch (err) {
            this.logger.error(`SFTP operation failed: ${err?.message || err}`);
            throw err;
        }
        finally {
            try {
                await client.end();
            }
            catch {
            }
        }
    }
    async ensureDir(remoteDir) {
        return this.withClient(async (c) => {
            const segments = path.posix.normalize(remoteDir).split('/');
            let cur = '';
            for (const seg of segments) {
                if (!seg)
                    continue;
                cur += `/${seg}`;
                const exists = await c.exists(cur);
                if (!exists) {
                    await c.mkdir(cur);
                }
            }
        });
    }
    async put(localPath, remotePath) {
        const remoteDir = path.posix.dirname(remotePath);
        await this.ensureDir(remoteDir);
        await this.withClient((c) => c.put(localPath, remotePath));
        return { remotePath, remoteDir };
    }
    async getStream(remotePath) {
        return this.withClient((c) => c.get(remotePath));
    }
    async delete(remotePath) {
        return this.withClient(async (c) => {
            const exists = await c.exists(remotePath);
            if (!exists)
                return false;
            await c.delete(remotePath, false);
            return true;
        });
    }
};
exports.SftpService = SftpService;
exports.SftpService = SftpService = SftpService_1 = __decorate([
    (0, common_1.Injectable)()
], SftpService);
//# sourceMappingURL=sftp.service.js.map