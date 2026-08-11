export class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
            throw new RangeError("HTTP status code must be an integer between 400 and 599");
        }
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        Error.captureStackTrace?.(this, HttpError);
    }
}
//# sourceMappingURL=httpError.js.map