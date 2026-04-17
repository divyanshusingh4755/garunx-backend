import type { Request, Response } from "express";
export declare const createPackage: (req: Request, res: Response) => Promise<void>;
export declare const updatePackage: (req: Request, res: Response) => Promise<void>;
export declare const getPackageDetails: (req: Request, res: Response) => Promise<void>;
export declare const getPackageById: (req: Request, res: Response) => Promise<void>;
export declare const getFullPackageDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePackageStatus: (req: Request, res: Response) => Promise<void>;
export declare const getPackages: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=package.controllers.d.ts.map