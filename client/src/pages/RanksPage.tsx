import { useQuery } from "@tanstack/react-query";
import { Check, CircleHelp, Crown, Loader2, RefreshCw, Trophy } from "lucide-react";

type MemberStatus = {
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

const money = (cents: number) => `$${(Math.max(0, cents || 0) / 100).toFixed(2)}`;
const dateTime = (value: string | null) => {
  if (!value) return "Resets at midnight UTC";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `Resets ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
};

export default function RanksPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<MemberStatus>({
    queryKey: ["/api/user/rank"],
  });
  const month = data?.paidDepositsMonth ?? 0;
  const week = data?.paidDepositsWeek ?? 0;
  const progress = Math.min(100, Math.round((month / 50000) * 100));

  return (
    <main className="mx-auto w-full max-w-[620px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-7">
        <p className="text-sm font-medium text-white/55">Account benefits</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-white">VIP</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/55">
          VIP status, free daily CC, and privileges (UTC)
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <span className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${data?.isVip ? "bg-amber-400/15 text-amber-300" : "bg-white/[0.08] text-white/80"}`}>
            {isLoading ? "Checking status" : data?.isVip ? "VIP" : "Not VIP"}
          </span>
          <span className="text-sm text-white/45">UTC calendar month</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled
            aria-label="Leaderboard unavailable: no leaderboard data"
            title="Leaderboard data is not available yet"
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-4 text-sm font-medium text-white/40"
          >
            <Trophy className="h-[18px] w-[18px]" aria-hidden="true" />
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-4 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading VIP status">
          <div className="h-[230px] animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
          <div className="h-36 animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
          <div className="h-36 animate-pulse rounded-[22px] border border-white/[0.08] bg-[#171717]" />
        </div>
      ) : isError || !data ? (
        <section role="alert" className="rounded-[22px] border border-red-400/25 bg-[#171717] p-5">
          <h2 className="font-semibold text-white">VIP status unavailable</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/55">We couldn’t load your deposit progress. Try refreshing.</p>
          <button type="button" onClick={() => void refetch()} className="mt-4 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15">
            Try again
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
                <Crown className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-[18px] font-semibold text-white">VIP progress this month</h2>
            </div>
            <p className="mt-3 text-[15px] text-white/55">{money(month)} <span className="text-white/35">/</span> $500.00 PAID deposits (UTC month)</p>
            <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/[0.13]" role="progressbar" aria-label="VIP deposit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm text-white/55">
              {data.isVip ? "VIP unlocked for this month." : `Need ${money(Math.max(0, 50000 - month))} more PAID deposits for auto VIP.`}
            </p>
            <p className="mt-2 text-sm text-white/45">
              Free CC (normal pool): {money(month)} / $100.00 ({Math.min(100, Math.round(month / 100))}%)
            </p>
          </section>

          <section aria-label="Deposit and Free CC account statistics" className="mt-4 grid gap-4">
            <article className="min-h-[142px] rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
              <p className="text-[15px] text-white/55">Paid deposits (month)</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-white">{money(month)}</p>
              <p className="mt-6 text-sm text-white/45">VIP auto at $500.00 · Free CC (normal) at $100.00</p>
            </article>
            <article className="min-h-[142px] rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
              <p className="text-[15px] text-white/55">Paid deposits (week)</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-white">{money(week)}</p>
              <p className="mt-6 text-sm text-white/45">Week resets Monday 00:00 UTC</p>
            </article>
            <article className="min-h-[142px] rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
              <p className="text-[15px] text-white/55">Daily free CC allowance</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-white">{data.dailyAllowance}</p>
              <p className="mt-6 text-sm text-white/45">Claimed {data.claimedToday} · Remaining {data.remainingToday}</p>
            </article>
            <article className="min-h-[142px] rounded-[22px] border border-white/[0.12] bg-[#171717] p-5 sm:p-6">
              <p className="text-[15px] text-white/55">Today’s pool left</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-white">{data.poolLeft ?? "—"}</p>
              <p className="mt-6 text-sm text-white/45">{dateTime(data.poolResetAt)}</p>
            </article>
          </section>

          <section className="mt-5 rounded-[20px] border border-white/[0.09] bg-[#131313] p-4">
            <div className="flex gap-3">
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-white/45" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white/80">How your benefits work</p>
                <p className="mt-1 text-sm leading-relaxed text-white/45">
                  $100 in paid deposits during this UTC month unlocks one Free CC claim per day. At $500, VIP unlocks two claims per day.
                </p>
              </div>
            </div>
            {data.isVip && <p className="mt-3 flex items-center gap-2 text-sm text-amber-300"><Check className="h-4 w-4" /> VIP benefits are active</p>}
          </section>
        </>
      )}
    </main>
  );
}
