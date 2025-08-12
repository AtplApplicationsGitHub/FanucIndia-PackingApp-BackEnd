export declare class SftpService {
    private readonly logger;
    private getConfig;
    private withClient;
    ensureDir(remoteDir: string): Promise<void>;
    put(localPath: string, remotePath: string): Promise<{
        remotePath: string;
        remoteDir: string;
    }>;
    getStream(remotePath: string): Promise<unknown>;
    delete(remotePath: string): Promise<boolean>;
}
