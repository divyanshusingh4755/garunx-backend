import type { Request, Response } from "express";
export declare const createFamilyTreeInvitation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const validateFamilyTreeInvitation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const acceptFamilyTreeInvitation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestFamilyTreeJoin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPendingFamilyTreeJoinRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const decideFamilyTreeJoinRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const activateFamilyTreeJoinRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestDiscoveredFamilyTreeJoin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPendingFamilyTreeInvitations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=family-tree-access-request.controller.d.ts.map