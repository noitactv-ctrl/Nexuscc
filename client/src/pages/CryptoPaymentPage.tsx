import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import QRCode from "qrcode";
import { Check, Copy, Loader2 } from "lucide-react";

type PaymentDetails = {
  paymentId: string;
  amount: number;
  currency: string;
  purpose: "deposit" | "order";
  status: string;
  payAddress: string;
  payAmount: string;
  payCurrency: string;
  network: string | null;
  payinExtraId: string | null;
  expiresAt: string | null;
};

async function loadJson(url: string) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Unable to load payment details.");
  return body;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      className="h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-[#171717] text-white hover:bg-white/10"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check className="mx-auto h-5 w-5 text-emerald-400" /> : <Copy className="mx-auto h-5 w-5" />}
    </button>
  );
}

export default function CryptoPaymentPage() {
  const [, params] = useRoute("/crypto-payment/:paymentId");
  const paymentId = params?.paymentId ?? "";
  const [qrCode, setQrCode] = useState("");
  const details = useQuery<PaymentDetails>({
    queryKey: ["/api/payments/crypto", paymentId],
    queryFn: () => loadJson(`/api/payments/crypto/${encodeURIComponent(paymentId)}`),
    enabled: Boolean(paymentId),
  });
  const status = useQuery<{ status: string }>({
    queryKey: ["/api/payments/crypto/status", paymentId],
    queryFn: () => loadJson(`/api/payments/crypto/${encodeURIComponent(paymentId)}/status`),
    enabled: Boolean(paymentId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const address = details.data?.payAddress;
    if (!address) return;
    let active = true;
    QRCode.toDataURL(address, { width: 300, margin: 1, errorCorrectionLevel: "M" })
      .then(value => { if (active) setQrCode(value); })
      .catch(() => { if (active) setQrCode(""); });
    return () => { active = false; };
  }, [details.data?.payAddress]);

  if (details.isLoading) {
    return <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center gap-3 text-white/60"><Loader2 className="h-5 w-5 animate-spin" />Loading real payment instructions…</div>;
  }
  if (details.isError || !details.data) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-red-300">{details.error?.message || "Payment instructions are unavailable."}</div>;
  }

  const payment = details.data;
  const networkName = payment.network || payment.payCurrency.toUpperCase();
  const expires = payment.expiresAt ? new Date(payment.expiresAt) : null;
  const statusText = status.data?.status || payment.status;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-7 text-white">
      <section className="space-y-5 rounded-2xl border border-white/10 bg-[#151515] p-5 sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Crypto Payment</h1>
            <p className="mt-1 text-sm text-white/50">Send the exact amount using the selected network.</p>
          </div>
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm capitalize text-blue-300">{statusText}</span>
        </header>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#222] p-4 text-sm sm:grid-cols-3">
          <div><p className="text-white/50">Currency</p><p className="mt-1 font-semibold">{payment.currency}</p></div>
          <div><p className="text-white/50">Network</p><p className="mt-1 font-semibold">{networkName}</p></div>
          <div><p className="text-white/50">Coin</p><p className="mt-1 font-semibold">{payment.payCurrency.toUpperCase()}</p></div>
          <div><p className="text-white/50">Amount</p><p className="mt-1 font-semibold">${(payment.amount / 100).toFixed(2)}</p></div>
          <div className="col-span-2"><p className="text-white/50">Track ID</p><p className="mt-1 break-all font-mono text-xs">{payment.paymentId}</p></div>
          <div className="col-span-2 sm:col-span-3"><p className="text-white/50">Expires</p><p className="mt-1 font-semibold">{expires && !Number.isNaN(expires.getTime()) ? expires.toLocaleString() : "Not provided by payment provider"}</p></div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Deposit Address</span>
          <span className="flex items-stretch gap-2">
            <span className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-[#222] px-3 py-3 font-mono text-sm">{payment.payAddress}</span>
            <CopyButton value={payment.payAddress} />
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Pay Amount</span>
          <span className="flex items-stretch gap-2">
            <span className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-[#222] px-3 py-3 font-mono text-sm">
              <span className="break-all">{payment.payAmount} {payment.payCurrency.toUpperCase()}</span>
            </span>
            <CopyButton value={payment.payAmount} />
          </span>
        </label>
        {payment.payinExtraId && (
          <label className="block space-y-2">
            <span className="text-sm font-medium">Memo / destination tag</span>
            <span className="flex items-stretch gap-2">
              <span className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-[#222] px-3 py-3 font-mono text-sm">{payment.payinExtraId}</span>
              <CopyButton value={payment.payinExtraId} />
            </span>
          </label>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">QR Code</p>
          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-[#222] p-5">
            {qrCode
              ? <img src={qrCode} alt={`QR code for ${payment.payCurrency.toUpperCase()} payment address`} className="h-60 w-60 max-w-full bg-white p-2" />
              : <Loader2 className="h-6 w-6 animate-spin text-white/50" />}
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm leading-6 text-blue-200">
          <strong>Important:</strong> Only send {payment.payCurrency.toUpperCase()} using the {networkName} network to this address. Sending other coins or using another network may result in permanent loss.
        </div>
      </section>
    </main>
  );
}
