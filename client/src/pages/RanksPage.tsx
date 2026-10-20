import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, CircleHelp, Crown, Loader2, Medal, RefreshCw, Trophy, X } from "lucide-react";

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

type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  monthDeposits: number;
  isVip: boolean;
  isCurrentUser: boolean;
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useQuery<MemberStatus>({
    queryKey: ["/api/user/rank"],
  });
  const leaderboard = useQuery<{ entries: LeaderboardEntry[] }>({
    queryKey: ["/api/leaderboard"],
    enabled: showLeaderboard,
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
            data-testid="leaderboard-open-button"
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-400/[0.14]"
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

      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Top depositors leaderboard"
          data-testid="leaderboard-modal"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[24px] border border-white/[0.12] bg-[#161616] sm:rounded-[24px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
                  <Trophy className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-white">Top depositors</h2>
                  <p className="text-xs text-white/45">Paid deposits · this UTC month</p>
                </div>
              </div>
              <button
                type="button"
                data-testid="leaderboard-close-button"
                onClick={() => setShowLeaderboard(false)}
                aria-label="Close leaderboard"
                className="grid h-9 w-9 place-items-center rounded-lg text-white/55 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3" data-testid="leaderboard-list">
              {leaderboard.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard…
                </div>
              ) : leaderboard.isError ? (
                <div role="alert" className="px-3 py-10 text-center">
                  <p className="text-sm text-white/70">Leaderboard is temporarily unavailable.</p>
                  <button type="button" onClick={() => void leaderboard.refetch()} className="mt-4 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15">
                    Try again
                  </button>
                </div>
              ) : !leaderboard.data || leaderboard.data.entries.length === 0 ? (
                <div className="px-3 py-12 text-center text-sm text-white/45">
                  No deposits recorded yet this month. Be the first on the board.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {leaderboard.data.entries.map((entry) => (
                    <li
                      key={entry.userId}
                      data-testid={`leaderboard-row-${entry.rank}`}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                        entry.isCurrentUser
                          ? "border-amber-400/40 bg-amber-400/[0.1]"
                          : "border-white/[0.07] bg-[#1c1c1c]"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                          entry.rank === 1
                            ? "bg-amber-400/20 text-amber-300"
                            : entry.rank === 2
                            ? "bg-slate-300/15 text-slate-200"
                            : entry.rank === 3
                            ? "bg-orange-400/15 text-orange-300"
                            : "bg-white/[0.06] text-white/55"
                        }`}
                      >
                        {entry.rank <= 3 ? <Medal className="h-4 w-4" aria-hidden="true" /> : entry.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {entry.username}
                          {entry.isCurrentUser && <span className="ml-2 text-xs text-amber-300">You</span>}
                        </p>
                        {entry.isVip && (
                          <p className="flex items-center gap-1 text-xs text-amber-300/80">
                            <Crown className="h-3 w-3" aria-hidden="true" /> VIP
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-white">{money(entry.monthDeposits)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
