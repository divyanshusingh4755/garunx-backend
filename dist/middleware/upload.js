import { extname, } from "node:path";
import { randomUUID, } from "node:crypto";
import multer from "multer";
import multerS3 from "multer-s3";
import { s3, } from "../config/s3.js";
const bucket = process.env.AWS_S3_BUCKET;
if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
}
export const upload = multer({
    storage: multerS3({
        s3,
        bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (_req, file, callback) => {
            const extension = extname(file.originalname).toLowerCase();
            const fileName = randomUUID();
            callback(null, `uploads/${fileName}${extension}`);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
//# sourceMappingURL=upload.js.map