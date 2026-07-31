import axios, {
  type AxiosRequestConfig,
} from "axios";

import crypto from "crypto";

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

type CashfreeErrorResponse = {
  message?: string;
  code?: string;
  type?: string;
};

export class CashfreeService {
  private static readonly baseUrl =
    process.env.CASHFREE_ENV === "PROD"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  /*
   * Keep the version configurable so an API upgrade
   * does not require a code change.
   */
  private static readonly apiVersion =
    process.env.CASHFREE_API_VERSION ??
    "2025-01-01";

  private static getCredentials(): {
    clientId: string;
    clientSecret: string;
  } {
    const clientId =
      process.env.CASHFREE_APP_ID?.trim();

    const clientSecret =
      process.env
        .CASHFREE_SECRET_KEY
        ?.trim();

    if (!clientId || !clientSecret) {
      throw new Error(
        "Cashfree credentials are not configured",
      );
    }

    return {
      clientId,
      clientSecret,
    };
  }

  private static getRequestConfig(
    includeContentType = false,
  ): AxiosRequestConfig {
    const {
      clientId,
      clientSecret,
    } = this.getCredentials();

    return {
      timeout: 15_000,
      headers: {
        ...(includeContentType
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        "x-client-id": clientId,
        "x-client-secret":
          clientSecret,
        "x-api-version":
          this.apiVersion,
        "x-request-id":
          crypto.randomUUID(),
      },
    };
  }

  private static validateIdentifier(
    fieldName: string,
    value: string,
  ): string {
    const normalized =
      value.trim();

    if (!normalized) {
      throw new Error(
        `${fieldName} is required`,
      );
    }

    return normalized;
  }

  private static validateOrderId(
    orderId: string,
  ): string {
    const normalized =
      this.validateIdentifier(
        "orderId",
        orderId,
      );

    if (
      normalized.length < 3 ||
      normalized.length > 45 ||
      !/^[A-Za-z0-9_-]+$/.test(
        normalized,
      )
    ) {
      throw new Error(
        "orderId must be 3 to 45 characters and contain only letters, numbers, underscores or hyphens",
      );
    }

    return normalized;
  }

  private static validateAmount(
    fieldName: string,
    value: number,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 1
    ) {
      throw new Error(
        `${fieldName} must be a valid number greater than or equal to 1`,
      );
    }

    const rounded =
      Math.round(
        (value + Number.EPSILON) *
          100,
      ) / 100;

    if (
      Math.abs(value - rounded) >
      Number.EPSILON
    ) {
      throw new Error(
        `${fieldName} may contain at most two decimal places`,
      );
    }

    return rounded;
  }

  private static getReturnUrl(
    orderId: string,
  ): string {
    const configuredUrl =
      process.env
        .CASHFREE_RETURN_URL
        ?.trim();

    if (!configuredUrl) {
      throw new Error(
        "CASHFREE_RETURN_URL is not configured",
      );
    }

    let url: URL;

    try {
      url = new URL(configuredUrl);
    } catch {
      throw new Error(
        "CASHFREE_RETURN_URL must be a valid absolute URL",
      );
    }

    if (
      process.env.CASHFREE_ENV ===
        "PROD" &&
      url.protocol !== "https:"
    ) {
      throw new Error(
        "CASHFREE_RETURN_URL must use HTTPS in production",
      );
    }

    url.searchParams.set(
      "order_id",
      orderId,
    );

    return url.toString();
  }

  private static getNotifyUrl():
    | string
    | undefined {
    const configuredUrl =
      process.env
        .CASHFREE_WEBHOOK_URL
        ?.trim();

    if (!configuredUrl) {
      return undefined;
    }

    let url: URL;

    try {
      url = new URL(configuredUrl);
    } catch {
      throw new Error(
        "CASHFREE_WEBHOOK_URL must be a valid absolute URL",
      );
    }

    if (
      process.env.CASHFREE_ENV ===
        "PROD" &&
      url.protocol !== "https:"
    ) {
      throw new Error(
        "CASHFREE_WEBHOOK_URL must use HTTPS in production",
      );
    }

    return url.toString();
  }

  private static getProviderError(
    error: unknown,
    fallback: string,
  ): Error {
    if (axios.isAxiosError<
      CashfreeErrorResponse
    >(error)) {
      const providerMessage =
        error.response?.data?.message;

      const wrappedError =
        new Error(
          providerMessage ||
            fallback,
        ) as Error & {
          statusCode?: number;
          providerCode?: string;
        };

      wrappedError.statusCode =
        error.response?.status ?? 502;

      if (
        error.response?.data?.code
      ) {
        wrappedError.providerCode =
          error.response.data.code;
      }

      return wrappedError;
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(fallback);
  }

  static async createOrder(
    input: CreateOrderInput,
  ) {
    const orderId =
      this.validateOrderId(
        input.orderId,
      );

    const amount =
      this.validateAmount(
        "amount",
        input.amount,
      );

    const customerId =
      this.validateIdentifier(
        "userId",
        input.userId,
      );

    const customerPhone =
      this.validateIdentifier(
        "customerPhone",
        input.customerPhone,
      );

    const returnUrl =
      this.getReturnUrl(orderId);

    const notifyUrl =
      this.getNotifyUrl();

    const orderMeta: {
      return_url: string;
      notify_url?: string;
    } = {
      return_url: returnUrl,
    };

    if (notifyUrl) {
      orderMeta.notify_url =
        notifyUrl;
    }

    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      order_expiry_time:
        new Date(
          Date.now() +
            30 * 60 * 1000,
        ).toISOString(),
      customer_details: {
        customer_id:
          customerId,
        customer_name:
          input.customerName.trim(),
        customer_email:
          input.customerEmail.trim(),
        customer_phone:
          customerPhone,
      },
      order_meta: orderMeta,
    };

    try {
      const response =
        await axios.post(
          `${this.baseUrl}/orders`,
          payload,
          this.getRequestConfig(true),
        );

      return response.data;
    } catch (error: unknown) {
      throw this.getProviderError(
        error,
        "Failed to create Cashfree order",
      );
    }
  }

  static async getOrder(
    orderId: string,
  ) {
    const normalizedOrderId =
      this.validateOrderId(orderId);

    try {
      const response =
        await axios.get(
          `${this.baseUrl}/orders/${encodeURIComponent(
            normalizedOrderId,
          )}`,
          this.getRequestConfig(),
        );

      return response.data;
    } catch (error: unknown) {
      throw this.getProviderError(
        error,
        "Failed to fetch Cashfree order",
      );
    }
  }

  static verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    timestamp: string,
  ): boolean {
    const {
      clientSecret,
    } = this.getCredentials();

    const normalizedTimestamp =
      timestamp.trim();

    const normalizedSignature =
      signature.trim();

    if (
      !normalizedTimestamp ||
      !/^\d+$/.test(
        normalizedTimestamp,
      ) ||
      !normalizedSignature
    ) {
      return false;
    }

    const rawPayload =
      Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : rawBody;

    const computedSignature =
      crypto
        .createHmac(
          "sha256",
          clientSecret,
        )
        .update(
          normalizedTimestamp +
            rawPayload,
          "utf8",
        )
        .digest();

    let receivedSignature:
      Buffer;

    try {
      receivedSignature =
        Buffer.from(
          normalizedSignature,
          "base64",
        );
    } catch {
      return false;
    }

    if (
      receivedSignature.length === 0 ||
      computedSignature.length !==
        receivedSignature.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      computedSignature,
      receivedSignature,
    );
  }

  static async refundPayment(
    input: RefundPaymentInput,
  ) {
    const orderId =
      this.validateOrderId(
        input.orderId,
      );

    const refundId =
      this.validateIdentifier(
        "refundId",
        input.refundId,
      );

    const amount =
      this.validateAmount(
        "refund amount",
        input.amount,
      );

    const reason =
      this.validateIdentifier(
        "refund reason",
        input.reason,
      );

    const payload = {
      refund_amount: amount,
      refund_id: refundId,
      refund_note: reason,
    };

    try {
      const response =
        await axios.post(
          `${this.baseUrl}/orders/${encodeURIComponent(
            orderId,
          )}/refunds`,
          payload,
          this.getRequestConfig(true),
        );

      return response.data;
    } catch (error: unknown) {
      throw this.getProviderError(
        error,
        "Failed to process refund",
      );
    }
  }
}
