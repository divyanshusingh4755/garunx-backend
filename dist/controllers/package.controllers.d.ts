import type { Request, Response } from "express";
export declare const createPackage: (req: Request, res: Response) => Promise<void>;
export declare const getPacakgesByLocation: (req: Request, res: Response) => Promise<void>;
export declare const getPacakgeById: (req: Request, res: Response) => Promise<void>;
export declare const updatePackage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const togglePackageStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllPackages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=package.controllers.d.ts.map