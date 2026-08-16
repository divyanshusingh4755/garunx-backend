interface CreateOrderInput {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    userId: string;
}
interface RefundPaymentInput {
    orderId: string;
    refundId: string;
    amount: number;
    reason: string;
}
interface CashfreePaymentAttempt {
    cf_payment_id: string | number;
    order_id: string;
    payment_status: string;
    payment_amount: number;
    payment_group?: string;
    payment_time?: string;
    payment_completion_time?: string;
    is_captured?: boolean;
}
export declare class CashfreeService {
    static getSuccessfulPaymentForOrder(orderId: string): Promise<CashfreePaymentAttempt | null>;
    private static readonly baseUrl;
    private static readonly apiVersion;
    private static wait;
    private static getCredentials;
    private static getRequestConfig;
    private static validateIdentifier;
    private static validateOrderId;
    private static validateAmount;
    private static getReturnUrl;
    private static getNotifyUrl;
    private static getProviderError;
    static createOrder(input: CreateOrderInput): Promise<any>;
    static getOrder(orderId: string): Promise<any>;
    static verifyWebhookSignature(rawBody: string | Buffer, signature: string, timestamp: string): boolean;
    static refundPayment(input: RefundPaymentInput): Promise<any>;
}
export {};
//# sourceMappingURL=cashfree.service.d.ts.map