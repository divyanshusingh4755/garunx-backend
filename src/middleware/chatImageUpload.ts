import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js"
import { randomUUID } from "crypto";
import type { Request } from "express";
import { HttpError } from "../utils/httpError.js";

const bucket = process.env.AWS_S3_BUCKET;

if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured")
}

const ALLOWED_CHAT_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
])

export const chatImageUpload = multer({
    storage: multerS3({
        s3,
        bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req: Request, file, callback): void => {
            const conversationId = req.params.conversationId;
            const extensionMap: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp"
            };

            const extension = extensionMap[file.mimetype];
            const fileName = randomUUID();

            callback(
                null,
                `chat/${conversationId}/${fileName}${extension}`
            )
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    },

    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_CHAT_IMAGE_TYPES.has(file.mimetype)) {
            callback(
                new HttpError(
                    400,
                    "Only JPEG, PNG and WebP images are allowed",
                ),
            )

            return;
        }

        callback(null, true);
    }
})