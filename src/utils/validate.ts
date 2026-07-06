import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError
        });
    }

    next();
};