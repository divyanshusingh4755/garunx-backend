import type { Request, Response } from "express";
export declare const createPackage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePackage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const togglePackageStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPackageById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllPackages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePackageLocations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removePackageLocation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePackageTiers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removePackageTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFullPackage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPackageDiagnostics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=package.controllers.d.ts.map