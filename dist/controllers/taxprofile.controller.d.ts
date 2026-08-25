import type { Request, Response } from "express";
export declare class TaxProfileController {
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listActive(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static exportCsv(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=taxprofile.controller.d.ts.map