import type { Request, Response } from 'express';
export declare const createLocation: (req: Request, res: Response) => Promise<void>;
export declare const updateLocation: (req: Request, res: Response) => Promise<void>;
export declare const getAllLocation: (req: Request, res: Response) => Promise<void>;
export declare const getLocationById: (req: Request, res: Response) => Promise<void>;
export declare const deleteLocation: (req: Request, res: Response) => Promise<void>;
export declare const searchServicesByLocationDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=location.controllers.d.ts.map