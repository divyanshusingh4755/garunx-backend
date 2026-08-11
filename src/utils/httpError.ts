export class HttpError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new RangeError(
        "HTTP status code must be an integer between 400 and 599",
      );
    }

    super(message);

    this.name = "HttpError";

    this.statusCode = statusCode;

    Error.captureStackTrace?.(this, HttpError);
  }
}
