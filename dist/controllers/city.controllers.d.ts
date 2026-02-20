import type { Request, Response } from 'express';
export declare const createCity: (req: Request, res: Response) => Promise<void>;
export declare const updateCity: (req: Request, res: Response) => Promise<void>;
export declare const getAllCity: (req: Request, res: Response) => Promise<void>;
export declare const getCityById: (req: Request, res: Response) => Promise<void>;
export declare const deleteCity: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=city.controllers.d.ts.map