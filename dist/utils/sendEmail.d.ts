interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare class EmailService {
    static sendEmail(params: SendEmailParams): Promise<{
        messageId: string;
        accepted: (string | import("nodemailer/lib/mailer/index.js").Address)[];
        rejected: (string | import("nodemailer/lib/mailer/index.js").Address)[];
    }>;
}
export {};
//# sourceMappingURL=sendEmail.d.ts.map