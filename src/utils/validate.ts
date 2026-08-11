import type { NextFunction, Request, Response } from "express";

import { validationResult } from "express-validator";

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array({
      onlyFirstError: true,
    })[0];

    const message =
      typeof firstError?.msg === "string"
        ? firstError.msg
        : "Validation failed";

    res.status(400).json({
      success: false,
      message,
      ...(firstError
        ? {
            error: firstError,
          }
        : {}),
    });

    return;
  }

  next();
};
