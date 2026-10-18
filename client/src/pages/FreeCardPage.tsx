import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Check, Gift, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FreeCardStatus = {
  deposited: number;
  required: number;
  eligible: boolean;
  claimed: boolean;
  available: boolean;
};

export default function FreeCardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: status, isLoading, isError } = useQuery<FreeCardStatus>({
    queryKey: ["/api/user/free-card/status"],
  });

  const claim = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/free-card/claim", {});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not claim your free card.");
      return payload as { orderId: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/free-card/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({ title: "Free card claimed", description: "Your card is ready in your orders." });
      setLocation(`/order/${result.orderId}`);
    },
    onError: (error: Error) => toast({ title: "Claim unavailable", description: error.message, variant: "destructive" }),
  });

  const deposited = status?.deposited ?? 0;
  const required = status?.required ?? 1000;
  const progress = Math.min(100, Math.round((deposited / required) * 100));

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">VIP benefits</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Free Card</h1>
        <p className="mt-1 text-sm text-white/50">Make a qualifying deposit this week and claim one random card.</p>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-amber-400/25 bg-[#171717] shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
              <Gift className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-white">Weekly card reward</h2>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                Deposit at least <strong className="font-semibold text-white">$10</strong> during the current UTC week to unlock one free card selected at random from Buy Cards inventory.
              </p>
            </div>
          </div>
          {status?.claimed ? (
            <div className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-3 text-sm font-semibold text-emerald-300">
              <Check className="h-4 w-4" aria-hidden="true" /> Claimed this week
            </div>
          ) : (
            <button
              type="button"
              onClick={() => claim.mutate()}
              disabled={isLoading || isError || !status?.eligible || !status.available || claim.isPending}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {claim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : !status?.eligible || !status?.available ? <LockKeyhole className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
              {claim.isPending ? "Claiming…" : "Claim Card"}
            </button>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-5 sm:px-7">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> Checking this week’s deposit activity…
            </div>
          ) : isError ? (
            <p role="alert" className="text-sm text-red-300">Could not load Free Card eligibility. Refresh the page to try again.</p>
          ) : (
            <>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/45">Deposits this UTC week</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">${(deposited / 100).toFixed(2)} <span className="text-sm font-medium text-white/40">/ $10.00</span></p>
                </div>
                <p className="text-right text-xs text-white/45">
                  {status?.claimed ? "Weekly reward used" : status?.eligible ? "You’re eligible" : `$${(Math.max(0, required - deposited) / 100).toFixed(2)} to go`}
                </p>
              </div>
              <div
                role="progressbar"
                aria-label="Progress toward the weekly deposit requirement"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-white/10"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              {!status?.available && !status?.claimed && (
                <p className="mt-3 text-xs text-amber-200/70">There are no cards available right now. Your eligibility will remain available for this UTC week.</p>
              )}
            </>
          )}
        </div>
      </section>

      <p className="mt-5 text-center text-xs leading-relaxed text-white/40">
        Deposits are counted from Monday 00:00 UTC through the end of the UTC week. Claims are limited to one card per user per UTC week.
      </p>
    </main>
  );
}
