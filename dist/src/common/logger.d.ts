import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export declare function logAuthFailure({ code, message, ip, userId, requestId, }: {
    code: string;
    message: string;
    ip: string;
    userId?: string;
    requestId?: string;
}): void;
