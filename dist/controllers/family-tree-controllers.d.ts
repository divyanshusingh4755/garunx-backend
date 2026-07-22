import type { Request, Response } from "express";
export declare const addFamilyMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFamilyTree: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFamilyMembers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFamilyMemberById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateFamilyMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteFamilyMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=family-tree-controllers.d.ts.map