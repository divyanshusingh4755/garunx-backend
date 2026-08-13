import type { Request, Response } from "express";
export declare const createService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleServiceStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getServiceById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getServicesByLocation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllServices: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllServicesAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateServiceLocations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeServiceLocation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateServiceTiers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeServiceTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFullService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFullServiceByCities: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getServiceDiagnostics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=service.controllers.d.ts.map