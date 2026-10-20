import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCryptoCurrencies } from "@/hooks/use-crypto-currencies";
import { apiRequest } from "@/lib/queryClient";
import QRCode from "qrcode";
import {
  Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ExternalLink, Send, Minus, Plus, ChevronDown
} from "lucide-react";
import { SiBitcoin, SiCashapp } from "react-icons/si";
import { formatDate } from "@/lib/date-utils";

type ManualMethod = "cashapp" | "venmo" | "zelle" | "chime" | "applepay";
type Method = "crypto" | ManualMethod;

type Deposit = {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentId?: string;
  checkoutUrl?: string;
  paymentNote?: string;
  createdAt: string;
};

type ManualResult = { note: string; handle: string; amount: number; method: Method; depositId: string };
type ManualMethodConfig = { enabled: boolean; handle?: string; tag?: string; fee: number };

function LetterIcon({ letter, className = "", style }: { letter: string; className?: string; style?: React.CSSProperties }) {
  return <span className={`flex items-center justify-center font-black ${className}`} style={style}>{letter}</span>;
}

const BONUS_TIERS = [
  { min: 100,  max: 249,  bonus: "+10%", example: "$100 → $110"     },
  { min: 250,  max: 499,  bonus: "+13%", example: "$250 → $282.50"  },
  { min: 500,  max: 999,  bonus: "+16%", example: "$500 → $580"     },
  { min: 1000, max: 2499, bonus: "+20%", example: "$1,000 → $1,200" },
  { min: 2500, max: 4999, bonus: "+25%", example: "$2,500 → $3,125" },
  { min: 5000, max: null, bonus: "+30%", example: "$5,000 → $6,500" },
];

function methodColor(type: string) {
  if (type === "cashapp") return "#00D632";
  if (type === "venmo") return "#3D95CE";
  if (type === "zelle") return "#9B59E8";
  if (type === "chime") return "#00D632";
  if (type === "applepay") return "#d9d9d9";
  return "#F7931A";
}
function methodLabel(type: string) {
  if (type === "cashapp") return "CashApp";
  if (type === "venmo") return "Venmo";
  if (type === "zelle") return "Zelle";
  if (type === "chime") return "Chime";
  if (type === "applepay") return "Apple Cash";
  return "Crypto";
}

function CopyBtn({ value, className = "", children }: { value: string; className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0 ${className}`}
      data-testid="btn-copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {children && (copied ? "Copied" : children)}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (["completed","delivering","fulfilled"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-400"><CheckCircle2 className="h-3 w-3" />credited</span>;
  if (["failed","expired"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-400/70"><XCircle className="h-3 w-3" />{status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400/70"><AlertTriangle className="h-3 w-3" />underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] font-mono text-white/30 animate-pulse"><Clock className="h-3 w-3" />pending</span>;
}

function manualPaymentUrl(method: ManualMethod, handle: string) {
  const recipient = handle.trim();
  if (method === "cashapp") {
    const tag = recipient.replace(/^\$+/, "");
    return tag ? `https://cash.app/$${encodeURIComponent(tag)}` : null;
  }
  if (method === "venmo") {
    const username = recipient.replace(/^@/, "");
    return /^[A-Za-z0-9_-]+$/.test(username) ? `https://venmo.com/u/${encodeURIComponent(username)}` : null;
  }
  return null;
}

function PaymentQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let current = true;
    QRCode.toDataURL(value, { width: 260, margin: 1, errorCorrectionLevel: "M" })
      .then(url => { if (current) setSrc(url); })
      .catch(() => { if (current) setSrc(""); });
    return () => { current = false; };
  }, [value]);
  if (!src) return <div className="h-52 w-52 animate-pulse rounded-xl bg-white/5" aria-label="Preparing payment QR code" />;
  return <img src={src} alt="Scan to open the configured payment recipient" className="h-52 w-52 rounded-lg bg-white p-2" />;
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed","delivering","fulfilled"].includes(deposit.status);
  const color = methodColor(deposit.type);
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
      isCredited ? "bg-red-950/10 border-red-900/15" :
      ["failed","expired"].includes(deposit.status) ? "bg-red-950/10 border-red-900/15" :
      "bg-white/[0.02] border-white/[0.05]"
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: `${color}18`, color }}>
          {deposit.type === "crypto" ? "₿" : deposit.type.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-white">
              {deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending"}
            </span>
            <StatusBadge status={deposit.status} />
          </div>
          <p className="text-[9px] text-white/20 font-mono">{methodLabel(deposit.type)} · {formatDate(deposit.createdAt)}</p>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-2 flex-shrink-0 text-white/20 hover:text-white/60 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}


/* ── MANUAL DEPOSIT PANEL ── */
function ManualDepositPanel({ result, status, onReset }: { result: ManualResult; status: string; onReset: () => void }) {
  const color = methodColor(result.method);
  const name = methodLabel(result.method);
  const payUrl = manualPaymentUrl(result.method as ManualMethod, result.handle);
  const isComplete = ["completed", "paid", "delivering", "fulfilled"].includes(status);
  const needsReview = ["failed", "expired", "cancelled", "refunded"].includes(status);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white" style={{ background: `${color}25`, color }}>
            {name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{name} deposit</h2>
            <p className="text-sm text-white/45">Send the exact amount and include the payment note.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {payUrl && (
          <div className="flex justify-center rounded-xl bg-[#1a1a1a] p-4">
            <PaymentQr value={payUrl} />
          </div>
        )}

        <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-4">
          <p className="text-sm leading-6 text-amber-100">
            <span className="font-bold text-amber-300">Important: </span>
            Send only through {name}. Include the exact payment note so staff can match and confirm your deposit.
          </p>
        </div>

        <div className="space-y-3">
          <CopyField label={result.method === "cashapp" ? "Cash App tag" : result.method === "applepay" ? "Apple Cash recipient" : `${name} recipient`} value={result.handle} />
          <CopyField label="Note to include" value={result.note} accent={color} />
          <CopyField label="Amount to send" value={(result.amount / 100).toFixed(2)} prefix="$" />
        </div>

        <div className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${isComplete ? "bg-emerald-500/10 text-emerald-400" : needsReview ? "bg-amber-500/10 text-amber-300" : "bg-blue-500/10 text-blue-300"}`}>
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : needsReview ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4 animate-pulse" />}
          {isComplete ? "Deposit confirmed" : needsReview ? "Payment needs review" : "Waiting for confirmation"}
        </div>
        <div className="flex min-h-12 items-center justify-center rounded-xl bg-white/[0.04] px-4 text-sm font-semibold text-white/50">
          {isComplete ? "Your balance has been updated." : needsReview ? "Contact support for help with this deposit." : "Waiting for staff to confirm your payment…"}
        </div>
        <p className="text-center text-xs text-white/35">This page checks for confirmation automatically.</p>

        <button onClick={onReset} className="w-full border-t border-white/10 pt-4 text-sm text-white/45 transition-colors hover:text-white" data-testid="btn-new-deposit">
          Create another deposit
        </button>
      </div>
    </div>
  );
}

function CopyField({ label, value, prefix, accent }: { label: string; value: string; prefix?: string; accent?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide text-white/55">{label}</p>
      <div className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#151515] px-3">
        {prefix && <span className="text-sm font-semibold text-white/40">{prefix}</span>}
        <p className="min-w-0 flex-1 break-all font-mono text-sm text-white" style={accent ? { color: accent } : undefined}>{value || "Not configured"}</p>
        {value && <CopyBtn value={value} className="h-9 w-auto gap-2 px-3 text-xs"><span>Copy</span></CopyBtn>}
      </div>
    </div>
  );
}
/* ══════════════════════════════════════════════
   MAIN DEPOSIT PAGE
══════════════════════════════════════════════ */
export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [selectedOption, setSelectedOption] = useState<string | null>("crypto");
  const [amountInput, setAmountInput] = useState("");
  const [cryptoCurrency, setCryptoCurrency] = useState("");
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);
  const cryptoCurrencies = useCryptoCurrencies();

  const { data: paymentMethods } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/payment-methods"],
  });

  const { data: manualMethods } = useQuery<{
    cashapp: ManualMethodConfig;
    venmo: ManualMethodConfig;
    zelle: ManualMethodConfig;
    chime: ManualMethodConfig;
    applepay: ManualMethodConfig;
  }>({ queryKey: ["/api/site-settings/manual-payments"] });

  const { data: minDeposits } = useQuery<Record<string, number>>({
    queryKey: ["/api/site-settings/min-deposits"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 20000,
  });

  const cashappEnabled = paymentMethods?.cashapp !== false && manualMethods?.cashapp.enabled !== false;
  const venmoEnabled = paymentMethods?.venmo === true && manualMethods?.venmo.enabled === true;
  const zelleEnabled = paymentMethods?.zelle === true && manualMethods?.zelle.enabled === true;
  const chimeEnabled = paymentMethods?.chime === true && manualMethods?.chime.enabled === true;
  const applePayEnabled = paymentMethods?.applepay === true && manualMethods?.applepay.enabled === true;

  const parsedAmount = parseFloat(amountInput) || 0;
  const minimumDeposit = selectedOption === "crypto"
    ? Math.max(1, minDeposits?.crypto ?? 0)
    : Math.max(0.01, minDeposits?.[selectedOption as ManualMethod] ?? 0.01);

  const recentDeposits = deposits?.slice(0, 15) ?? [];

  useEffect(() => {
    if (window.location.hash !== "#deposit-history") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("deposit-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [recentDeposits.length]);

  /* ── Crypto mutation ── */
  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const amount = parsedAmount;
      const cryptoMin = Math.max(1, minDeposits?.crypto ?? 0);
      if (!amount || amount < cryptoMin) throw new Error(`Minimum deposit is $${cryptoMin.toFixed(2)}`);
      if (!cryptoCurrency) throw new Error("Choose a supported cryptocurrency.");
      const res = await apiRequest("POST", "/api/payments/crypto/create", {
        amount: String(Math.round(amount * 100)),
        purpose: "deposit",
        payCurrency: cryptoCurrency,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Unable to create crypto payment.");
      }
      return res.json() as Promise<{ paymentId: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      sessionStorage.setItem("lastCryptoPaymentId", data.paymentId);
      sessionStorage.setItem("lastCryptoPurpose", "deposit");
      setLocation(`/crypto-payment/${encodeURIComponent(data.paymentId)}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ── Manual mutations ── */
  async function createManual(method: ManualMethod) {
    const amount = parsedAmount;
    if (!amount || amount < 0.01) throw new Error("Enter the amount you want to deposit");
    const min = minDeposits?.[method] ?? 0;
    if (min > 0 && amount < min) throw new Error(`Minimum deposit for ${methodLabel(method)} is $${min.toFixed(2)}`);
    const endpoint = method === "cashapp" ? "/api/orders/cashapp" : `/api/deposits/${method}`;
    const res = await apiRequest("POST", endpoint, { amount });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `Unable to create ${methodLabel(method)} deposit`);
    }
    return res.json();
  }

  const manualMutation = useMutation({
    mutationFn: (method: ManualMethod) => createManual(method),
    onSuccess: (data, method) => {
      const config = manualMethods?.[method];
      setManualResult({
        note: data.paymentNote,
        handle: data.cashappTag || data.handle || config?.tag || config?.handle || "",
        amount: Math.round(parsedAmount * 100),
        method,
        depositId: `cashapp_${data.order.id}`,
      });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      qc.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const isPending = cryptoMutation.isPending || manualMutation.isPending;

  function feeLabel(fee: number | undefined) {
    if (!fee || fee === 0) return "0% fee";
    return `${fee}% fee`;
  }

  const paymentOptions = [
    { id: "crypto", label: "Crypto", sub: cryptoCurrencies.data?.slice(0, 5).map(currency => currency.toUpperCase()).join(" · ") || "Provider-supported coins", Icon: SiBitcoin, color: "#F7931A", fee: "0% fee" },
    ...(cashappEnabled ? [{ id: "cashapp", label: "CashApp", sub: "instant", Icon: SiCashapp, color: "#00D632", fee: feeLabel(manualMethods?.cashapp?.fee) }] : []),
    ...(venmoEnabled ? [{ id: "venmo", label: "Venmo", sub: "instant", Icon: (props: any) => <LetterIcon {...props} letter="V" />, color: "#3D95CE", fee: feeLabel(manualMethods?.venmo?.fee) }] : []),
    ...(zelleEnabled ? [{ id: "zelle", label: "Zelle", sub: "instant", Icon: (props: any) => <LetterIcon {...props} letter="Z" />, color: "#9B59E8", fee: feeLabel(manualMethods?.zelle?.fee) }] : []),
    ...(chimeEnabled ? [{ id: "chime", label: "Chime", sub: "instant", Icon: (props: any) => <LetterIcon {...props} letter="C" />, color: "#00D632", fee: feeLabel(manualMethods?.chime?.fee) }] : []),
    ...(applePayEnabled ? [{ id: "applepay", label: "Apple Pay", sub: "Apple Cash", Icon: (props: any) => <LetterIcon {...props} letter="" />, color: "#d9d9d9", fee: feeLabel(manualMethods?.applepay?.fee) }] : []),
  ];

  const isSelectedCrypto = selectedOption === "crypto";

  function adjustAmount(delta: number) {
    const next = Math.max(0, Math.round((parsedAmount + delta) * 100) / 100);
    setAmountInput(next > 0 ? next.toFixed(2) : "");
  }

  function handleContinue() {
    if (!selectedOption) return;
    if (isSelectedCrypto) cryptoMutation.mutate();
    else if (["cashapp", "venmo", "zelle", "chime", "applepay"].includes(selectedOption)) {
      manualMutation.mutate(selectedOption as ManualMethod);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">

        {/* ── Page heading ── */}
        <div className="pt-1 pb-0.5 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Deposit</h1>
          <p className="text-sm text-white/50">Deposit funds to your account</p>
        </div>

        {manualResult ? (
          <ManualDepositPanel
            result={manualResult}
            status={deposits?.find(deposit => deposit.id === manualResult.depositId)?.status ?? "pending"}
            onReset={() => { setManualResult(null); setSelectedOption("crypto"); setAmountInput(""); }}
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#181818] p-3 sm:p-4 space-y-3">
            {/* ── Payment method ── */}
            <div className="grid grid-cols-2 gap-2">
              {paymentOptions.map(opt => {
                const isActive = selectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedOption(opt.id);
                      if (opt.id !== "crypto") setCryptoCurrency("");
                    }}
                    className={`min-h-10 flex items-center justify-center gap-2 rounded-lg border px-2 text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? "border-white/80 bg-[#f1f1f1] text-black"
                        : "border-white/15 bg-[#0d0d0d] text-white hover:border-white/35"
                    }`}
                    data-testid={`btn-payment-${opt.id}`}
                  >
                    {opt.id === "crypto" ? (
                      <span className="text-lg leading-none" aria-hidden="true">🪙</span>
                    ) : (
                      <opt.Icon className="h-5 w-5 flex-shrink-0" style={{ color: opt.color }} />
                    )}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {isSelectedCrypto && (
              <>
                {/* Live provider-supported currencies */}
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-white">Coin / network</span>
                  <span className="relative block">
                    <select
                      value={cryptoCurrency}
                      onChange={e => setCryptoCurrency(e.target.value)}
                      className="appearance-none w-full h-10 rounded-lg border border-white/15 bg-[#202020] px-3 pr-8 text-sm text-white outline-none focus:border-white/40 transition-colors"
                      data-testid="select-crypto-currency"
                    >
                      <option value="">
                        {cryptoCurrencies.isLoading ? "Loading supported currencies..." : "Select coin / network..."}
                      </option>
                      {(cryptoCurrencies.data ?? []).map(currency => (
                        <option key={currency} value={currency}>{currency.toUpperCase()}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  </span>
                </label>
                {cryptoCurrencies.isError && (
                  <p className="text-xs text-red-400" role="alert">
                    {cryptoCurrencies.error.message}
                  </p>
                )}
              </>
            )}

            {/* ── Amount ── */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Amount (USD)</p>
              <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustAmount(-1)}
                  className="h-10 rounded-lg border border-white/10 bg-[#202020] text-lg text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  aria-label="Decrease amount"
                >
                  <Minus className="h-4 w-4 mx-auto" />
                </button>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="15.00"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full h-10 rounded-lg border border-white/15 bg-[#202020] px-3 text-center text-sm text-white outline-none focus:border-white/40 transition-colors placeholder:text-white/45"
                  data-testid="input-amount"
                />
                <button
                  type="button"
                  onClick={() => adjustAmount(1)}
                  className="h-10 rounded-lg border border-white/10 bg-[#202020] text-lg text-white/70 hover:text-white hover:border-white/30 transition-colors"
                  aria-label="Increase amount"
                >
                  <Plus className="h-4 w-4 mx-auto" />
                </button>
              </div>
              <p className="text-sm text-white/50">Minimum deposit: ${minimumDeposit.toFixed(2)}</p>
            </div>

            {/* ── Create deposit ── */}
            <button
              onClick={handleContinue}
              disabled={!selectedOption || isPending || !amountInput || parsedAmount <= 0}
              className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              data-testid="btn-continue-deposit"
            >
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : "Create Deposit"}
            </button>
          </div>
        )}

        {/* ── History ── */}
        {recentDeposits.length > 0 && (
          <div id="deposit-history" className="space-y-2 pt-2 scroll-mt-20">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">Deposit History</p>
              <button onClick={() => refetchDeposits()} className="text-white/20 hover:text-white/50 transition-colors" data-testid="btn-refresh-deposits">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {recentDeposits.map(dep => <DepositRow key={dep.id} deposit={dep} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/8 py-6 px-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-5 text-xs font-semibold text-white/50 tracking-widest uppercase">
          <a href="https://t.me/+3-lMkt-idutkOTIx" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center h-5 w-5 rounded-full bg-primary">
            <Send className="h-2.5 w-2.5 text-white fill-white" />
          </a>
          <span>TOS</span>
          <span>FAQs</span>
        </div>
        <p className="text-xs text-white/25">© 2026 GorillaCC. All rights reserved</p>
      </div>
    </div>
  );
}
