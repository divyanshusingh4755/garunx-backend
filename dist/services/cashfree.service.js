import axios from "axios";
import crypto from "crypto";
export class CashfreeService {
    static baseUrl = process.env.CASHFREE_ENV === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
    static clientId = process.env.CASHFREE_APP_ID;
    static clientSecret = process.env.CASHFREE_SECRET_KEY;
    static async createOrder(input) {
        try {
            const payload = {
                order_id: input.orderId,
                order_amount: Number(input.amount),
                order_currency: "INR",
                order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                customer_details: {
                    customer_id: input.userId || `guest_${Date.now()}`,
                    customer_name: input.customerName,
                    customer_email: input.customerEmail,
                    customer_phone: input.customerPhone,
                },
                order_meta: {
                    return_url: process.env.CASHFREE_RETURN_URL ||
                        "http://localhost:3000/payment/success?order_id={order_id}",
                    notify_url: process.env.CASHFREE_WEBHOOK_URL ||
                        "http://localhost:4000/webhooks/cashfree",
                },
            };
            const response = await axios.post(`${this.baseUrl}/orders`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "x-client-id": this.clientId,
                    "x-client-secret": this.clientSecret,
                    "x-api-version": "2022-09-01",
                },
            });
            return response.data;
        }
        catch (error) {
            console.error("Cashfree createOrder error:", error?.response?.data || error.message);
            throw new Error("Failed to create cashfree order");
        }
    }
    static async getOrder(orderId) {
        try {
            const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
                headers: {
                    "x-client-id": this.clientId,
                    "x-client-secret": this.clientSecret,
                    "x-api-version": "2022-09-01",
                },
            });
            return response.data;
        }
        catch (error) {
            console.error("Cashfree getOrder error:", error?.response?.data || error.message);
            throw new Error("Failed to fetch Cashfree order");
        }
    }
    static verifyWebhookSignature(rawBody, signature, timestamp) {
        if (!this.clientSecret) {
            throw new Error("Missing secret");
        }
        const signaturePayload = timestamp + rawBody;
        const computedHash = crypto
            .createHmac("sha256", this.clientSecret)
            .update(signaturePayload)
            .digest("base64");
        const computedBuffer = Buffer.from(computedHash);
        const signatureBuffer = Buffer.from(signature);
        if (computedBuffer.length !== signatureBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
    }
}
//# sourceMappingURL=cashfree.service.js.map