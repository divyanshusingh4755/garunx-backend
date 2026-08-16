import { Types } from "mongoose";
import { type IFAQ } from "../models/faq.model.js";
type FaqUpdateData = Partial<Pick<IFAQ, "name" | "question" | "answer" | "faqType" | "displayOrder">>;
export declare class FAQService {
    private static invalidateFaqCache;
    private static ensureValidId;
    static createFaq(faqData: Partial<IFAQ>): Promise<import("mongoose").Document<unknown, {}, IFAQ, {}, import("mongoose").DefaultSchemaOptions> & IFAQ & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateFaq(id: string, updateData: FaqUpdateData): Promise<import("mongoose").Document<unknown, {}, IFAQ, {}, import("mongoose").DefaultSchemaOptions> & IFAQ & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getFaqById(id: string): Promise<IFAQ & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteFaq(id: string): Promise<import("mongoose").Document<unknown, {}, IFAQ, {}, import("mongoose").DefaultSchemaOptions> & IFAQ & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleFaqStatus(id: string): Promise<import("mongoose").Document<unknown, {}, IFAQ, {}, import("mongoose").DefaultSchemaOptions> & IFAQ & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findFaqs(searchTerm?: string, faqType?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IFAQ & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static exportFaqsToCsv(faqIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=faq.service.d.ts.map