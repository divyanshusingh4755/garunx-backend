import nodemailer from "nodemailer";

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

const transporter =
    nodemailer.createTransport({
        host: process.env.SMTP_HOST,

        port: Number(
            process.env.SMTP_PORT ?? 587,
        ),

        secure:
            process.env.SMTP_SECURE ===
            "true",

        auth: {
            user:
                process.env.SMTP_USER,

            pass:
                process.env.SMTP_PASS,
        },
    });

export class EmailService {
    static async sendEmail(
        params: SendEmailParams,
    ) {
        const {
            to,
            subject,
            html,
            text,
        } = params;

        if (!to) {
            throw new Error(
                "Email recipient is required",
            );
        }

        if (!subject) {
            throw new Error(
                "Email subject is required",
            );
        }

        if (!html) {
            throw new Error(
                "Email body is required",
            );
        }

        const result =
            await transporter.sendMail({
                from:
                    process.env.SMTP_FROM ??
                    process.env.SMTP_USER,

                to,

                subject,

                html,

                ...(text && {
                    text,
                }),
            });

        return {
            messageId:
                result.messageId,

            accepted:
                result.accepted,

            rejected:
                result.rejected,
        };
    }
}