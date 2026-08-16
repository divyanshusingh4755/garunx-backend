import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
interface FamilyTreeNotificationTemplateSeed {
    code: string;
    type: NotificationType;
    category: NotificationCategory;
    preferenceMode: NotificationPreferenceMode;
    title: string;
    message: string;
    emailSubject?: string;
    emailBody?: string;
    pushTitle?: string;
    pushMessage?: string;
    isActive: boolean;
}
export declare const FAMILY_TREE_NOTIFICATION_TEMPLATES: FamilyTreeNotificationTemplateSeed[];
export {};
//# sourceMappingURL=family-tree-notification-template.d.ts.map