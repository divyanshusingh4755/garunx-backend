import axios, {} from "axios";
import crypto from "crypto";
export class CashfreeService {
    static async getSuccessfulPaymentForOrder(orderId) {
        const normalizedOrderId = this.validateOrderId(orderId);
        try {
            const response = await axios.get(`${this.baseUrl}/orders/${encodeURIComponent(normalizedOrderId)}/payments`, this.getRequestConfig());
            const payments = Array.isArray(response.data)
                ? response.data
                : [];
            const successfulPayments = payments.filter((payment) => payment.payment_status ===
                "SUCCESS");
            if (successfulPayments.length ===
                0) {
                return null;
            }
            /*
             * Normally an order should have one
             * successful payment.
             *
             * Selecting the latest makes the
             * recovery flow deterministic if
             * Cashfree returns multiple attempts.
             */
            successfulPayments.sort((a, b) => {
                const aTime = new Date(a.payment_completion_time ??
                    a.payment_time ??
                    0).getTime();
                const bTime = new Date(b.payment_completion_time ??
                    b.payment_time ??
                    0).getTime();
                return bTime - aTime;
            });
            return (successfulPayments[0] ??
                null);
        }
        catch (error) {
            throw this.getProviderError(error, "Failed to fetch Cashfree payment details");
        }
    }
    static baseUrl = process.env.CASHFREE_ENV === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
    /*
     * Keep the version configurable so an API upgrade
     * does not require a code change.
     */
    static apiVersion = process.env.CASHFREE_API_VERSION ?? "2025-01-01";
    static async wait(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
    static getCredentials() {
        const clientId = process.env.CASHFREE_APP_ID?.trim();
        const clientSecret = process.env.CASHFREE_SECRET_KEY?.trim();
        if (!clientId || !clientSecret) {
            throw new Error("Cashfree credentials are not configured");
        }
        return {
            clientId,
            clientSecret,
        };
    }
    static getRequestConfig(includeContentType = false) {
        const { clientId, clientSecret } = this.getCredentials();
        return {
            timeout: 15_000,
            headers: {
                ...(includeContentType
                    ? {
                        "Content-Type": "application/json",
                    }
                    : {}),
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
                "x-api-version": this.apiVersion,
                "x-request-id": crypto.randomUUID(),
            },
        };
    }
    static validateIdentifier(fieldName, value) {
        const normalized = value.trim();
        if (!normalized) {
            throw new Error(`${fieldName} is required`);
        }
        return normalized;
    }
    static validateOrderId(orderId) {
        const normalized = this.validateIdentifier("orderId", orderId);
        if (normalized.length < 3 ||
            normalized.length > 45 ||
            !/^[A-Za-z0-9_-]+$/.test(normalized)) {
            throw new Error("orderId must be 3 to 45 characters and contain only letters, numbers, underscores or hyphens");
        }
        return normalized;
    }
    static validateAmount(fieldName, value) {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
            throw new Error(`${fieldName} must be a valid number greater than or equal to 1`);
        }
        const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
        if (Math.abs(value - rounded) > 1e-9) {
            throw new Error(`${fieldName} may contain at most two decimal places`);
        }
        return rounded;
    }
    static getReturnUrl(orderId) {
        const configuredUrl = process.env.CASHFREE_RETURN_URL?.trim();
        if (!configuredUrl) {
            throw new Error("CASHFREE_RETURN_URL is not configured");
        }
        let url;
        try {
            url = new URL(configuredUrl);
        }
        catch {
            throw new Error("CASHFREE_RETURN_URL must be a valid absolute URL");
        }
        if (process.env.CASHFREE_ENV === "PROD" && url.protocol !== "https:") {
            throw new Error("CASHFREE_RETURN_URL must use HTTPS in production");
        }
        url.searchParams.set("order_id", orderId);
        return url.toString();
    }
    static getNotifyUrl() {
        const configuredUrl = process.env.CASHFREE_WEBHOOK_URL?.trim();
        if (!configuredUrl) {
            return undefined;
        }
        let url;
        try {
            url = new URL(configuredUrl);
        }
        catch {
            throw new Error("CASHFREE_WEBHOOK_URL must be a valid absolute URL");
        }
        if (process.env.CASHFREE_ENV === "PROD" && url.protocol !== "https:") {
            throw new Error("CASHFREE_WEBHOOK_URL must use HTTPS in production");
        }
        return url.toString();
    }
    static getProviderError(error, fallback) {
        if (axios.isAxiosError(error)) {
            const providerMessage = error.response?.data?.message;
            const wrappedError = new Error(providerMessage || fallback);
            wrappedError.statusCode = error.response?.status ?? 502;
            if (error.response?.data?.code) {
                wrappedError.providerCode = error.response.data.code;
            }
            return wrappedError;
        }
        if (error instanceof Error) {
            return error;
        }
        return new Error(fallback);
    }
    static async createOrder(input) {
        const orderId = this.validateOrderId(input.orderId);
        const amount = this.validateAmount("amount", input.amount);
        const customerId = this.validateIdentifier("userId", input.userId);
        const customerName = this.validateIdentifier("customerName", input.customerName);
        const customerPhone = this.validateIdentifier("customerPhone", input.customerPhone);
        const customerEmail = input.customerEmail.trim();
        const returnUrl = this.getReturnUrl(orderId);
        const notifyUrl = this.getNotifyUrl();
        const orderMeta = {
            return_url: returnUrl,
        };
        if (notifyUrl) {
            orderMeta.notify_url = notifyUrl;
        }
        const payload = {
            order_id: orderId,
            order_amount: amount,
            order_currency: "INR",
            order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            customer_details: {
                customer_id: customerId,
                customer_name: customerName,
                customer_phone: customerPhone,
                ...(customerEmail
                    ? {
                        customer_email: customerEmail,
                    }
                    : {}),
            },
            order_meta: orderMeta,
        };
        try {
            const response = await axios.post(`${this.baseUrl}/orders`, payload, this.getRequestConfig(true));
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const providerCode = error.response?.data?.code;
                const providerMessage = error.response?.data?.message;
                const requestId = error.response?.headers?.["x-request-id"];
                console.error("Cashfree create-order failed", {
                    status,
                    providerCode,
                    providerMessage,
                    requestId,
                    orderId,
                });
                const ambiguousFailure = status === 500 || status === 502 || status === 503 || status === 504;
                const duplicateOrder = providerCode === "order_already_exists" ||
                    providerMessage?.toLowerCase().includes("same id is already present");
                if (ambiguousFailure || duplicateOrder) {
                    let recoveryError;
                    for (let attempt = 1; attempt <= 3; attempt += 1) {
                        try {
                            const existingOrder = await this.getOrder(orderId);
                            if (existingOrder?.order_id === orderId &&
                                existingOrder?.payment_session_id) {
                                return existingOrder;
                            }
                        }
                        catch (error) {
                            recoveryError = error;
                        }
                        if (attempt < 3) {
                            await this.wait(500);
                        }
                    }
                    console.error("Cashfree order recovery failed", {
                        orderId,
                        message: recoveryError instanceof Error
                            ? recoveryError.message
                            : "Unknown error",
                    });
                }
            }
            throw this.getProviderError(error, "Failed to create Cashfree order");
        }
    }
    static async getOrder(orderId) {
        const normalizedOrderId = this.validateOrderId(orderId);
        try {
            const response = await axios.get(`${this.baseUrl}/orders/${encodeURIComponent(normalizedOrderId)}`, this.getRequestConfig());
            return response.data;
        }
        catch (error) {
            throw this.getProviderError(error, "Failed to fetch Cashfree order");
        }
    }
    static verifyWebhookSignature(rawBody, signature, timestamp) {
        const { clientSecret } = this.getCredentials();
        const normalizedTimestamp = timestamp.trim();
        const normalizedSignature = signature.trim();
        if (!normalizedTimestamp ||
            !/^\d+$/.test(normalizedTimestamp) ||
            !normalizedSignature) {
            return false;
        }
        const rawPayload = Buffer.isBuffer(rawBody)
            ? rawBody.toString("utf8")
            : rawBody;
        const computedSignature = crypto
            .createHmac("sha256", clientSecret)
            .update(normalizedTimestamp + rawPayload, "utf8")
            .digest();
        let receivedSignature;
        try {
            receivedSignature = Buffer.from(normalizedSignature, "base64");
        }
        catch {
            return false;
        }
        if (receivedSignature.length === 0 ||
            computedSignature.length !== receivedSignature.length) {
            return false;
        }
        return crypto.timingSafeEqual(computedSignature, receivedSignature);
    }
    static async refundPayment(input) {
        const orderId = this.validateOrderId(input.orderId);
        const refundId = this.validateIdentifier("refundId", input.refundId);
        const amount = this.validateAmount("refund amount", input.amount);
        const reason = this.validateIdentifier("refund reason", input.reason);
        const payload = {
            refund_amount: amount,
            refund_id: refundId,
            refund_note: reason,
        };
        try {
            const response = await axios.post(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds`, payload, this.getRequestConfig(true));
            return response.data;
        }
        catch (error) {
            throw this.getProviderError(error, "Failed to process refund");
        }
    }
}
//# sourceMappingURL=cashfree.service.js.map