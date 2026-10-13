const NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1";
import { createHmac, timingSafeEqual } from "crypto";

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not configured");
  return key;
}

export interface NowPaymentsInvoice {
  id: string;
  url: string;
  status?: string;
  price_amount?: number;
  price_currency?: string;
  [key: string]: any;
}

export interface NowPaymentsPayment {
  payment_id: number | string;
  payment_status: string;
  pay_address: string;
  pay_amount: number | string;
  pay_currency: string;
  price_amount: number | string;
  price_currency: string;
  network?: string;
  payin_extra_id?: string | null;
  expiration_estimate_date?: string;
  [key: string]: any;
}

export async function getNowPaymentsCurrencies(): Promise<string[]> {
  const response = await fetch(`${NOWPAYMENTS_API_BASE}/currencies`, {
    headers: { "x-api-key": getApiKey() },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NOWPayments currencies error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const currencies = Array.isArray(data) ? data : data.currencies;
  if (!Array.isArray(currencies)) throw new Error("NOWPayments returned an invalid currency list");
  return currencies
    .map((entry: unknown) => typeof entry === "string" ? entry : (entry as any)?.code ?? (entry as any)?.currency)
    .filter((currency: unknown): currency is string => typeof currency === "string" && currency.length > 0)
    .map((currency: string) => currency.toLowerCase());
}

export async function createNowPaymentsPayment(params: {
  amount: number;       // in USD
  payCurrency: string;
  orderId?: string;
  ipnCallbackUrl?: string;
}): Promise<NowPaymentsPayment> {
  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    price_amount: params.amount,
    price_currency: "usd",
    pay_currency: params.payCurrency.toLowerCase(),
    order_id: params.orderId || `order-${Date.now()}`,
    order_description: "OmniMarket payment",
  };

  if (params.ipnCallbackUrl) body.ipn_callback_url = params.ipnCallbackUrl;

  const response = await fetch(`${NOWPAYMENTS_API_BASE}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("NOWPayments API error:", response.status, errorText);
    throw new Error(`NOWPayments API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as NowPaymentsPayment;
  if (!data.payment_id || !data.pay_address || !data.pay_amount || !data.pay_currency) {
    throw new Error("NOWPayments returned incomplete payment instructions");
  }
  return data;
}

export async function getNowPaymentsPayment(paymentId: string): Promise<NowPaymentsPayment> {
  const apiKey = getApiKey();

  const response = await fetch(`${NOWPAYMENTS_API_BASE}/payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NOWPayments payment status error: ${response.status} - ${errorText}`);
  }

  return await response.json() as NowPaymentsPayment;
}

/** Verify the IPN webhook signature (HMAC-SHA512 of sorted JSON body) */
export function verifyNowPaymentsWebhook(body: Record<string, any>, signature: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return false; // Fail closed — require secret to be configured

  try {
    const sorted = JSON.stringify(
      Object.keys(body).sort().reduce((acc: Record<string, any>, k) => { acc[k] = body[k]; return acc; }, {})
    );
    const expected = createHmac("sha512", secret).update(sorted).digest("hex");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");
    return expectedBuffer.length === signatureBuffer.length
      && timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

export function mapNowPaymentsStatus(status: string): "pending" | "completed" | "failed" | "expired" | "underpaid" {
  switch ((status || "").toLowerCase()) {
    case "finished":                             return "completed";
    case "partially_paid":                       return "underpaid";
    case "failed": case "refunded":              return "failed";
    case "expired":                              return "expired";
    // waiting, confirming, confirmed, sending → pending
    default:                                     return "pending";
  }
}
