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
export declare class CashfreeService {
    private static baseUrl;
    private static clientId;
    private static clientSecret;
    static createOrder(input: CreateOrderInput): Promise<any>;
    static getOrder(orderId: string): Promise<any>;
    static verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean;
    static refundPayment(input: RefundPaymentInput): Promise<any>;
}
export {};
//# sourceMappingURL=cashfree.service.d.ts.map