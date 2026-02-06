import multer from "multer";
import multerS3 from 'multer-s3';
import { s3 } from "../config/s3.js";
import path from "path";
export const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const fileName = `${Date.now()}_${Math.random() * 1E9}`;
            cb(null, `uploads/${fileName}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
//# sourceMappingURL=upload.js.map