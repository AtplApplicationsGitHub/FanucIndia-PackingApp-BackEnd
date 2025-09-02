import { SoSearchService } from './so-search.service';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class SoSearchController {
    private readonly soSearchService;
    constructor(soSearchService: SoSearchService);
    findDetails(soNumber: string, req: AuthRequest): Promise<any>;
}
