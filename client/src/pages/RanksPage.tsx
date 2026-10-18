import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Loader2, LockKeyhole, Trophy } from "lucide-react";

const RANKS = [
  { key: "newbie", label: "Newbie", emoji: "🌱", discount: 0, threshold: 0 },
  { key: "regular", label: "Regular", emoji: "⭐", discount: 2, threshold: 10000 },
  { key: "vip", label: "VIP", emoji: "💎", discount: 5, threshold: 50000 },
  { key: "nyc", label: "Silverback", emoji: "🫆", discount: 10, threshold: 100000 },
];

function getRankIdx(totalDeposited: number) {
  if (totalDeposited >= 100000) return 3;
  if (totalDeposited >= 50000) return 2;
  if (totalDeposited >= 10000) return 1;
  return 0;
}

export default function RanksPage() {
  const [, setLocation] = useLocation();
  const { data: rankData, isLoading } = useQuery<any>({ queryKey: ["/api/user/rank"] });

  const totalDeposited = rankData?.totalDeposited ?? 0;
  const currentIdx = getRankIdx(totalDeposited);
  const current = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((totalDeposited - current.threshold) / (next.threshold - current.threshold)) * 100))
    : 100;

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-6 flex items-center gap-4 sm:mb-8">
        <button
          type="button"
          onClick={() => setLocation("/profile")}
          aria-label="Back to profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Member benefits</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ranks</h1>
          <p className="mt-1 text-sm text-white/50">Deposit more, save more on every order.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-[22px] border border-white/10 bg-[#141414]">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" aria-label="Loading rank" />
        </div>
      ) : (
        <>
          <section className="mb-7 rounded-[22px] border border-amber-400/25 bg-[#171717] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <Trophy className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Your current rank</p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">{current.label}</h2>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-left sm:min-w-32 sm:text-right">
                <p className="font-display text-2xl font-bold text-amber-300">
                  {current.discount > 0 ? `${current.discount}%` : "—"}
                </p>
                <p className="mt-0.5 text-xs text-white/50">discount per order</p>
              </div>
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/45">Lifetime deposits</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">${(totalDeposited / 100).toFixed(2)}</p>
                </div>
                {next ? (
                  <p className="max-w-44 text-right text-xs leading-relaxed text-white/50">
                    <span className="font-semibold text-white">${(next.threshold / 100).toLocaleString()}</span>
                    {" "}to unlock {next.label}
                  </p>
                ) : (
                  <p className="max-w-48 text-right text-xs leading-relaxed text-amber-300/80">
                    Top rank unlocked. Your discount applies automatically.
                  </p>
                )}
              </div>
              <div
                role="progressbar"
                aria-label="Progress toward next rank"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {next && (
                <p className="mt-2 text-xs text-white/45">
                  ${(Math.max(0, next.threshold - totalDeposited) / 100).toLocaleString()} more to unlock {next.discount}% off
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="rank-tiers-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="rank-tiers-heading" className="font-display text-lg font-semibold text-white">All ranks</h2>
                <p className="mt-1 text-sm text-white/45">Your deposit history unlocks automatic savings.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Lifetime deposits
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {RANKS.map((rank, i) => {
                const isUnlocked = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <article
                    key={rank.key}
                    className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors sm:p-5 ${
                      isCurrent
                        ? "border-amber-400/35 bg-amber-400/[0.06]"
                        : "border-white/10 bg-[#141414] hover:border-white/20"
                    } ${!isUnlocked ? "opacity-55" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        isCurrent ? "bg-amber-400/10 text-amber-300" : "bg-white/[0.04] text-white/55"
                      }`}>
                        {isUnlocked ? <span className="text-xl">{rank.emoji}</span> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`font-display text-base font-semibold ${isCurrent ? "text-amber-300" : "text-white"}`}>{rank.label}</h3>
                          {isCurrent && (
                            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">Current</span>
                          )}
                          {isUnlocked && !isCurrent && <Check className="h-3.5 w-3.5 text-amber-400" aria-label="Unlocked" />}
                        </div>
                        <p className="mt-1 text-xs text-white/45">
                          {rank.threshold === 0 ? "Starting rank" : `$${(rank.threshold / 100).toLocaleString()}+ deposited`}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-display text-lg font-bold ${isUnlocked && rank.discount > 0 ? "text-amber-300" : "text-white/35"}`}>
                        {rank.discount > 0 ? `${rank.discount}%` : "—"}
                      </p>
                      <p className="text-[10px] text-white/40">off</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs leading-relaxed text-white/45">
            Discounts apply automatically at checkout and are based on your total lifetime deposits.
          </p>
        </>
      )}
    </main>
  );
}
