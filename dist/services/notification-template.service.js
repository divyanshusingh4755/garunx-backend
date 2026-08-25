import { isValidPreferenceModeForCategory } from "../constants/notification-policy.js";
import { NotificationTemplate } from "../models/notification-template.model.js";
export class NotificationTemplateService {
    static renderText(text, variables) {
        return text.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, key) => {
            const value = variables[key];
            if (value === undefined || value === null) {
                return "";
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            return String(value);
        });
    }
    static getRequiredVariables(texts) {
        const variables = new Set();
        for (const text of texts) {
            if (!text) {
                continue;
            }
            const matches = text.matchAll(/{{\s*([^{}]+?)\s*}}/g);
            for (const match of matches) {
                const key = match[1]?.trim();
                if (key) {
                    variables.add(key);
                }
            }
        }
        return [...variables];
    }
    static validateVariables(requiredVariables, variables) {
        const missingVariables = requiredVariables.filter((key) => variables[key] === undefined || variables[key] === null);
        if (missingVariables.length > 0) {
            throw new Error(`Missing notification template variables: ${missingVariables.join(", ")}`);
        }
    }
    static async renderTemplate(params) {
        const { templateCode, variables = {}, includeEmail = false, includePush = false } = params;
        const template = await NotificationTemplate.findOne({ code: templateCode.trim().toUpperCase(), isActive: true });
        if (!template) {
            throw new Error("Notification template not found or inactive");
        }
        const textsToValidate = [template.title, template.message,];
        if (includeEmail) {
            textsToValidate.push(template.emailSubject, template.emailBody);
        }
        if (includePush) {
            textsToValidate.push(template.pushTitle, template.pushMessage);
        }
        const requiredVariables = this.getRequiredVariables(textsToValidate);
        this.validateVariables(requiredVariables, variables);
        return {
            templateId: template._id,
            code: template.code,
            type: template.type,
            category: template.category,
            preferenceMode: template.preferenceMode,
            title: this.renderText(template.title, variables),
            message: this.renderText(template.message, variables),
            ...(template.emailSubject && { emailSubject: this.renderText(template.emailSubject, variables) }),
            ...(template.emailBody && { emailBody: this.renderText(template.emailBody, variables) }),
            ...(template.pushTitle && { pushTitle: this.renderText(template.pushTitle, variables) }),
            ...(template.pushMessage && { pushMessage: this.renderText(template.pushMessage, variables) }),
        };
    }
    static async createTemplate(params) {
        const code = params.code.trim().toUpperCase();
        const preferenceMode = params.preferenceMode ?? (params.category === "SYSTEM" ? "REQUIRED" : "OPTIONAL");
        if (!isValidPreferenceModeForCategory(params.category, preferenceMode)) {
            throw new Error(`Invalid preference mode ${preferenceMode} for notification category ${params.category}`);
        }
        const existing = await NotificationTemplate.findOne({ code });
        if (existing) {
            throw new Error("Notification template code already exists");
        }
        return NotificationTemplate.create({ ...params, code, preferenceMode });
    }
    static async getTemplates(params) {
        const { page = 1, limit = 20, type, isActive, category } = params;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const query = {};
        if (type) {
            query.type = type;
        }
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (category) {
            query.category = category;
        }
        const skip = (safePage - 1) * safeLimit;
        const [templates, total,] = await Promise.all([
            NotificationTemplate.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
            NotificationTemplate.countDocuments(query),
        ]);
        return {
            templates,
            pagination: {
                page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit),
            },
        };
    }
    static async getTemplateById(templateId) {
        const template = await NotificationTemplate.findById(templateId);
        if (!template) {
            throw new Error("Notification template not found");
        }
        return template;
    }
    static async updateTemplate(params) {
        const { templateId, code, category, preferenceMode, ...updates } = params;
        const currentTemplate = await NotificationTemplate.findById(templateId);
        if (!currentTemplate) {
            throw new Error("Notification template not found");
        }
        const updateData = { ...updates };
        if (code) {
            const normalizedCode = code.trim().toUpperCase();
            const existing = await NotificationTemplate.findOne({ code: normalizedCode, _id: { $ne: templateId } });
            if (existing) {
                throw new Error("Notification template code already exists");
            }
            updateData.code = normalizedCode;
        }
        const effectiveCategory = category ?? currentTemplate.category;
        const effectivePreferenceMode = preferenceMode ?? currentTemplate.preferenceMode;
        if (!isValidPreferenceModeForCategory(effectiveCategory, effectivePreferenceMode)) {
            throw new Error(`Invalid preference mode ${effectivePreferenceMode} for notification category ${effectiveCategory}`);
        }
        if (category !== undefined) {
            updateData.category = category;
        }
        if (preferenceMode !== undefined) {
            updateData.preferenceMode = preferenceMode;
        }
        const template = await NotificationTemplate.findByIdAndUpdate(templateId, { $set: updateData }, { new: true, runValidators: true });
        if (!template) {
            throw new Error("Notification template not found");
        }
        return template;
    }
}
//# sourceMappingURL=notification-template.service.js.map