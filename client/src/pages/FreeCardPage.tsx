import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft, Check, Clock3, Gift, Loader2, RefreshCw, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FreeCardStatus = {
  paidDepositsMonth: number;
  paidDepositsWeek: number;
  isVip: boolean;
  eligible: boolean;
  dailyAllowance: number;
  claimedToday: number;
  remainingToday: number;
  poolLeft: number | null;
  poolResetAt: string | null;
};

type ClaimHistoryItem = {
  id: string | number;
  description: string;
  createdAt: string;
  orderId: string | number;
};

const money = (cents: number) => `$${(Math.max(0, cents || 0) / 100).toFixed(2)}`;
const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
};

export default function FreeCardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const {
    data: status,
    isLoading,
    isError,
    refetch: refreshStatus,
    isFetching: isRefreshing,
  } = useQuery<FreeCardStatus>({ queryKey: ["/api/user/free-card/status"] });
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refreshHistory,
  } = useQuery<ClaimHistoryItem[]>({ queryKey: ["/api/user/free-card/history"] });

  const claim = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/free-card/claim", { quantity });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not claim free CC.");
      return payload as { orderId: string | number; quantity: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/free-card/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/free-card/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({
        title: "Free CC claimed",
        description: `${result.quantity} ${result.quantity === 1 ? "card is" : "cards are"} ready in your orders.`,
      });
    },
    onError: (error: Error) => toast({
      title: "Claim unavailable",
      description: error.message,
      variant: "destructive",
    }),
  });

  const maxQuantity = Math.max(0, Math.min(status?.remainingToday ?? 0, status?.poolLeft ?? 0));
  const canClaim = Boolean(status?.eligible && status.remainingToday > 0 && (status.poolLeft ?? 0) > 0);
  const progress = Math.min(100, Math.round(((status?.paidDepositsMonth ?? 0) / 10000) * 100));
  const refresh = () => {
    void refreshStatus();
    void refreshHistory();
  };

  return (
    <main className="mx-auto w-full max-w-[620px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-6">
        <button
          type="button"
          onClick={() => setLocation("/profile")}
          aria-label="Back to profile"
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-3 text-sm text-white/75 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Profile
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/55">Member benefit</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-white">Free CC</h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/55">
              First come, first served from the shared card pool.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="Refresh Free CC status and claim history"
            className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#171717] text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading Free CC status">
          <div className="h-[150px] animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
          <div className="h-[150px] animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
          <div className="h-[280px] animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
        </div>
      ) : isError || !status ? (
        <section role="alert" className="rounded-[22px] border border-red-400/25 bg-[#171717] p-5">
          <h2 className="font-semibold text-white">Free CC status unavailable</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/55">We couldn’t check your eligibility or today’s inventory.</p>
          <button type="button" onClick={refresh} className="mt-4 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15">
            Try again
          </button>
        </section>
      ) : (
        <>
          <section aria-label="Your Free CC account statistics" className="grid gap-4">
            <article className="min-h-[140px] rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
              <p className="text-[15px] text-white/55">Paid deposits (month)</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-white">{money(status.paidDepositsMonth)}</p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progress toward normal Free CC eligibility" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/45">VIP auto at $500.00 · Free CC (normal) at $100.00</p>
            </article>
            <div className="grid grid-cols-2 gap-3">
              <article className="min-h-[126px] rounded-[20px] border border-white/[0.12] bg-[#171717] p-4 sm:p-5">
                <p className="text-sm leading-snug text-white/55">Daily free CC allowance</p>
                <p className="mt-2 text-[28px] font-semibold text-white">{status.dailyAllowance}</p>
                <p className="mt-3 text-xs text-white/45">Claimed {status.claimedToday} · Remaining {status.remainingToday}</p>
              </article>
              <article className="min-h-[126px] rounded-[20px] border border-white/[0.12] bg-[#171717] p-4 sm:p-5">
                <p className="text-sm leading-snug text-white/55">Today’s pool left</p>
                <p className="mt-2 text-[28px] font-semibold text-white">{status.poolLeft ?? "—"}</p>
                <p className="mt-3 text-xs text-white/45">Shared inventory</p>
              </article>
            </div>
            <p className="flex items-center gap-2 px-1 text-xs text-white/40">
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {status.poolResetAt
               ? `Daily claims reset ${displayDate(status.poolResetAt)} UTC`
                 : "Daily claims reset at 00:00 UTC"}
            </p>
          </section>

          {!status.eligible && (
            <section className="mt-5 rounded-[22px] border border-amber-400/40 bg-[#17130d] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <div>
                  <h2 className="text-[19px] font-semibold text-white">Free CC locked</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                    Deposit at least $100.00 this calendar month (PAID) to unlock the normal free CC pool, or $500.00 for VIP.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLocation("/deposit")}
                    className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#f3313b] px-5 text-[15px] font-semibold text-[#150708] transition hover:bg-[#ff4952] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17130d]"
                  >
                    <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                    Deposit now
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-white" aria-hidden="true" />
              <h2 className="text-[20px] font-semibold text-white">Claim free CC</h2>
            </div>
            <p className="mt-2 text-[15px] text-white/55">First come, first served from today’s pool.</p>

            {!status.eligible ? (
              <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/35 bg-amber-400/[0.05] p-4 text-sm leading-relaxed text-white/65" role="note">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <p>Need $100+ in PAID deposits this calendar month for normal free CC. VIP unlocks at $500.</p>
              </div>
            ) : status.poolLeft === 0 ? (
              <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/35 bg-amber-400/[0.05] p-4 text-sm leading-relaxed text-white/65" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <p>The shared pool is empty right now. Check back after inventory is replenished.</p>
              </div>
            ) : status.remainingToday === 0 ? (
              <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/35 bg-amber-400/[0.05] p-4 text-sm leading-relaxed text-white/65" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <p>You’ve used today’s Free CC allowance. Your next allowance starts at 00:00 UTC.</p>
              </div>
            ) : (
              <>
                {!status.isVip && (
                  <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/35 bg-amber-400/[0.05] p-4 text-sm leading-relaxed text-white/65" role="note">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                    <p>VIP ($500+ PAID deposits this month) unlocks two daily claims. Your normal Free CC access is active.</p>
                  </div>
                )}
                <label htmlFor="free-card-quantity" className="mt-6 block text-[15px] font-medium text-white">Quantity</label>
                <input
                  id="free-card-quantity"
                  type="number"
                  min={1}
                  max={maxQuantity}
                  step={1}
                  inputMode="numeric"
                  value={Math.min(quantity, maxQuantity)}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    setQuantity(Number.isFinite(next) ? Math.max(1, Math.min(maxQuantity, next)) : 1);
                  }}
                  className="mt-2 h-12 w-44 rounded-xl border border-white/[0.14] bg-[#1c1c1c] px-4 text-[15px] text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
                />
                <button
                  type="button"
                  onClick={() => claim.mutate()}
                  disabled={!canClaim || claim.isPending || quantity < 1 || quantity > maxQuantity}
                  className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#f3313b] px-4 text-[16px] font-semibold text-[#150708] transition hover:bg-[#ff4952] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
                >
                  {claim.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Gift className="h-5 w-5" aria-hidden="true" />}
                  {claim.isPending ? "Claiming…" : "Claim free CC"}
                </button>
              </>
            )}
          </section>

          <section className="mt-5 rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6" aria-labelledby="claim-history-title">
            <h2 id="claim-history-title" className="text-[20px] font-semibold text-white">Claim history</h2>
            <p className="mt-1 text-[15px] text-white/55">Your free CC claims</p>
            {historyLoading ? (
              <div className="mt-6 space-y-3" aria-label="Loading claim history">
                <div className="h-14 animate-pulse rounded-xl bg-white/[0.05]" />
                <div className="h-14 animate-pulse rounded-xl bg-white/[0.05]" />
              </div>
            ) : historyError ? (
              <div role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4">
                <p className="text-sm text-white/65">Could not load claim history.</p>
                <button type="button" onClick={() => void refreshHistory()} className="mt-2 text-sm font-medium text-amber-300 hover:text-amber-200">Try again</button>
              </div>
            ) : !history?.length ? (
              <div className="grid min-h-[120px] place-items-center text-center text-[15px] text-white/45">No claims yet</div>
            ) : (
              <ul className="mt-5 divide-y divide-white/[0.08]">
                {history.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/85">{item.description}</p>
                      <p className="mt-1 text-xs text-white/45">{displayDate(item.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocation(`/order/${item.orderId}`)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
                      aria-label={`View order ${item.orderId}`}
                    >
                      <Check className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                      Order
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
