import { FormEvent, useState } from "react";
import { CheckCircle2, Gift, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";

type RedemptionResult = {
  amountAdded: number;
  newBalance: number;
};

export default function RedeemCodePage() {
  const { user } = useAuth();
  const { redeemCode } = useWallet();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [error, setError] = useState("");

  const displayedBalance = result?.newBalance ?? user?.balance ?? 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Enter a code to continue.");
      return;
    }

    setError("");
    redeemCode.mutate(normalizedCode, {
      onSuccess: (data) => {
        setResult(data);
        setCode("");
      },
      onError: (err) => {
        setResult(null);
        setError(err instanceof Error ? err.message : "Unable to redeem this code.");
      },
    });
  }

  return (
    <main className="mx-auto w-full max-w-[620px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-7">
        <p className="text-sm font-medium text-white/55">Wallet</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-white">Redeem code</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/55">Add balance to your GorillaCC account with a balance code.</p>
      </header>

      <section className="rounded-[22px] border border-white/10 bg-[#171717] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-white/55">CURRENT BALANCE</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-white" data-testid="text-redeem-balance">
              ${(displayedBalance / 100).toFixed(2)}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70">
            <WalletCards className="h-5 w-5" />
          </span>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mt-4 rounded-[22px] border border-white/10 bg-[#171717] p-5 sm:p-6">
        <label htmlFor="redeem-code" className="mb-2 block text-sm font-medium text-white/80">
          Balance code
        </label>
        <input
          id="redeem-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError("");
            setResult(null);
          }}
          placeholder="VOUCH-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-white/10 bg-[#111] px-4 font-mono text-sm tracking-wide text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-400/60"
          data-testid="input-redeem-code"
        />
        <p className="mt-2 text-xs text-white/40">Codes are case-insensitive and can only be used once.</p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3" role="status">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Code redeemed successfully
            </div>
            <p className="mt-1 text-xs text-emerald-200/70">
              ${(result.amountAdded / 100).toFixed(2)} was added to your balance.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={redeemCode.isPending || !code.trim()}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-400 text-base font-semibold text-black transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="button-redeem-code"
        >
          {redeemCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {redeemCode.isPending ? "Redeeming..." : "Redeem code"}
        </button>
      </form>

      <div className="mt-4 flex gap-3 rounded-[22px] border border-white/10 bg-[#171717] px-5 py-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
        <p className="text-sm leading-relaxed text-white/55">
          Balance codes are issued by GorillaCC admins. Once redeemed, the value is added directly to your account and the code cannot be used again.
        </p>
      </div>
    </main>
  );
}
