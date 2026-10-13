import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import {
  Activity, ArrowUpRight, CheckCircle2, CircleAlert, CreditCard, MessageSquare,
  Package, ShoppingBag, Wallet, WalletCards,
} from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type ActivityRow = { createdAt: string | Date; amount: number; type: string };
type DepositRow = { id: string; amount: number; status: string; createdAt: string | Date };
type DashboardTab = "overview" | "purchases" | "deposits";

const dateKey = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const currency = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const parseTime = (value: string | Date) => new Date(value).getTime();

function isDepositOrder(order: any) {
  return ["cashapp", "venmo", "chime", "zelle"].includes(String(order.paymentMethod ?? "").toLowerCase())
    && !(order.items ?? []).length;
}

function makeDailyData(rows: ActivityRow[], days: number, type: "purchase" | "deposit") {
  const today = new Date();
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - index - 1));
    return date;
  });
  return dates.map((date) => {
    const key = dateKey(date);
    const matched = rows.filter((row) => dateKey(row.createdAt) === key);
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: matched.filter((row) => row.type === type || (type === "deposit" && ["manual_deposit", "pending"].includes(row.type))).length,
      amount: matched
        .filter((row) => type === "deposit"
          ? row.type === "deposit" || row.type === "manual_deposit"
          : row.type === type)
        .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0) / 100,
    };
  });
}

function makeMonthlyData(rows: ActivityRow[], months: number, type: "purchase" | "deposit") {
  const now = new Date();
  const periods = Array.from({ length: months }, (_, index) => new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1));
  return periods.map((date) => {
    const key = monthKey(date);
    const matched = rows.filter((row) => monthKey(new Date(row.createdAt)) === key);
    return {
      label: date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit" }),
      count: matched.filter((row) => row.type === type || (type === "deposit" && ["manual_deposit", "pending"].includes(row.type))).length,
      amount: matched
        .filter((row) => type === "deposit"
          ? row.type === "deposit" || row.type === "manual_deposit"
          : row.type === type)
        .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0) / 100,
      refunds: matched.filter((row) => row.type === "refund").reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0) / 100,
    };
  });
}

function makeWeeklyData(rows: ActivityRow[], weeks: number, type: "purchase" | "deposit") {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - ((startOfThisWeek.getDay() + 6) % 7));
  const starts = Array.from({ length: weeks }, (_, index) => {
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - (weeks - index - 1) * 7);
    return start;
  });
  return starts.map((start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const matched = rows.filter((row) => parseTime(row.createdAt) >= start.getTime() && parseTime(row.createdAt) < end.getTime());
    return {
      label: `Week ${Math.ceil((start.getDate() + new Date(start.getFullYear(), start.getMonth(), 1).getDay()) / 7)}, ${start.getFullYear()}`,
      count: matched.filter((row) => row.type === type || (type === "deposit" && ["manual_deposit", "pending"].includes(row.type))).length,
      amount: matched
        .filter((row) => type !== "deposit" || row.type === "deposit" || row.type === "manual_deposit")
        .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0) / 100,
    };
  });
}

function MetricCard({
  label, value, detail, icon: Icon, emphasis,
}: {
  label: string; value: string; detail: string; icon: typeof Package; emphasis?: string;
}) {
  return (
    <article className="min-h-[154px] rounded-[22px] border border-white/10 bg-[#141414] p-5 sm:min-h-[182px] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="pt-4 sm:pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-white/55 sm:text-sm">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${emphasis ?? "text-white"}`}>{value}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-5 text-white/50">{detail}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-white/85">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function ChartCard({
  title, subtitle, data, countLabel, amountLabel, countColor = "#2563eb", amountColor = "#19bd85", showRefunds = false,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; count: number; amount: number; refunds?: number }>;
  countLabel: string;
  amountLabel: string;
  countColor?: string;
  amountColor?: string;
  showRefunds?: boolean;
}) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-[#141414] p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm text-white/50 sm:text-base">{subtitle}</p>
      <div className="mt-7 h-[260px] w-full sm:mt-9 sm:h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`area-${title.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={amountColor} stopOpacity={0.18} />
                <stop offset="95%" stopColor={amountColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="3 5" vertical />
            <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={14} />
            <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={38} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              contentStyle={{ background: "#101010", border: "1px solid #333", borderRadius: 12, color: "#fff" }}
              labelStyle={{ color: "#fff", marginBottom: 6 }}
              formatter={(value: number, name: string) => [
                name === amountLabel || name === "Refunded" ? currency(Math.round(value * 100)) : value,
                name,
              ]}
            />
            <Area yAxisId="right" type="monotone" dataKey="amount" name={amountLabel} stroke={amountColor} fill={`url(#area-${title.replace(/\W/g, "")})`} strokeWidth={2.5} />
            <Line yAxisId="left" type="monotone" dataKey="count" name={countLabel} stroke={countColor} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            {showRefunds && <Line yAxisId="right" type="monotone" dataKey="refunds" name="Refunded" stroke="#f59e0b" strokeWidth={2} dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function StatusCard({ orders }: { orders: any[] }) {
  const completed = orders.filter((order) => ["fulfilled", "delivering", "replaced"].includes(order.status)).length;
  const refunded = orders.filter((order) => order.status === "refunded").length;
  const partial = orders.filter((order) => order.status === "partial").length;
  const rows = [
    { label: "Completed", count: completed, color: "text-emerald-400", icon: CheckCircle2 },
    { label: "Refunded", count: refunded, color: "text-rose-400", icon: CircleAlert },
    { label: "Partial", count: partial, color: "text-amber-400", icon: CircleAlert },
  ];
  return (
    <article className="rounded-[22px] border border-white/10 bg-[#141414] p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-white sm:text-xl"><Package className="h-5 w-5" />Order status</h2>
      <div className="mt-7 space-y-3">
        {rows.map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between text-sm sm:text-base">
            <span className={`flex items-center gap-3 ${color}`}><Icon className="h-5 w-5" /> <span className="text-white/55">{label}</span></span>
            <span className="min-w-14 rounded-full bg-white/[0.08] px-3 py-1 text-center text-white/90">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const { user } = useAuth();
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useOrders();
  const { data: transactions = [], isLoading: transactionsLoading, isError: transactionsError } = useQuery<ActivityRow[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: deposits = [], isLoading: depositsLoading, isError: depositsError } = useQuery<DepositRow[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: purchasedCards = [], isLoading: cardsLoading, isError: cardsError } = useQuery<any[]>({
    queryKey: ["/api/user/cards"],
    enabled: !!user,
  });

  const purchaseOrders = useMemo(() => orders.filter((order: any) => !isDepositOrder(order)), [orders]);
  const purchases = useMemo(() => transactions.filter((row) => row.type === "purchase"), [transactions]);
  const creditedDeposits = useMemo(
    () => transactions.filter((row) => row.type === "deposit" || row.type === "manual_deposit"),
    [transactions],
  );
  const pendingDeposits = deposits.filter((deposit) => ["pending", "waiting_payment", "unpaid", "underpaid"].includes(deposit.status.toLowerCase()));
  const paidDepositTotal = creditedDeposits.reduce((sum, deposit) => sum + Math.abs(Number(deposit.amount) || 0), 0);
  const purchaseTotal = purchases.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const refundTotal = transactions.filter((row) => row.type === "refund").reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const purchaseActivity: ActivityRow[] = purchases;
  const depositActivity: ActivityRow[] = [
    ...creditedDeposits,
    ...pendingDeposits.map((deposit) => ({ createdAt: deposit.createdAt, amount: deposit.amount, type: "pending" })),
  ];
  const dailyPurchases = useMemo(() => makeDailyData(purchaseActivity, 30, "purchase"), [purchaseActivity]);
  const dailyDeposits = useMemo(() => makeDailyData(depositActivity, 30, "deposit"), [depositActivity]);
  const monthlyPurchases = useMemo(() => makeMonthlyData(transactions, 4, "purchase"), [transactions]);
  const weeklyPurchases = useMemo(() => makeWeeklyData(purchaseActivity, 12, "purchase"), [purchaseActivity]);
  const monthlyDeposits = useMemo(() => makeMonthlyData(depositActivity, 6, "deposit"), [depositActivity]);
  const weeklyDeposits = useMemo(() => makeWeeklyData(depositActivity, 12, "deposit"), [depositActivity]);
  const pendingAmount = pendingDeposits.reduce((sum, deposit) => sum + Math.max(0, Number(deposit.amount) || 0), 0);
  const averageDeposit = creditedDeposits.length ? paidDepositTotal / creditedDeposits.length : 0;
  const largestDeposit = creditedDeposits.length ? Math.max(...creditedDeposits.map((deposit) => Math.abs(Number(deposit.amount) || 0))) : 0;

  const anyLoading = ordersLoading || transactionsLoading || depositsLoading || cardsLoading;
  const anyError = ordersError || transactionsError || depositsError || cardsError;
  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "purchases", label: "Purchases" },
    { id: "deposits", label: "Deposits" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <section className="rounded-[22px] border border-white/10 bg-[#171717] p-5 sm:p-7">
        <p className="text-sm font-medium tracking-wide text-white/55">AVAILABLE BALANCE</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{currency(user?.balance ?? 0)}</p>
        <p className="mt-2 text-sm text-white/55 sm:text-base">Account overview · orders, deposits, and spend</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Link href="/deposit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:h-12 sm:text-base">
            <Wallet className="h-4 w-4" />Deposit
          </Link>
          <Link href="/cards" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-white transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 sm:h-12 sm:text-base">
            <CreditCard className="h-4 w-4" />Buy cards
          </Link>
          <Link href="/support" className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-white transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 sm:h-12 sm:text-base">
            <MessageSquare className="h-4 w-4" />Support
          </Link>
        </div>
      </section>

      <nav aria-label="Account dashboard sections" className="mt-6 grid grid-cols-3 rounded-2xl bg-[#171717] p-1.5">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-xl px-2 text-sm font-medium transition-colors sm:text-base ${
              tab === id ? "border border-white/15 bg-[#202020] text-white shadow-sm" : "text-white/55 hover:text-white"
            }`}
            aria-pressed={tab === id}
          >
            {label}
          </button>
        ))}
      </nav>

      {anyError && (
        <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Some account statistics could not be loaded. Displayed totals may be incomplete.
        </div>
      )}
      {anyLoading && (
        <div className="mt-4 text-xs text-white/40">Updating your account statistics…</div>
      )}

      {tab === "overview" && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <MetricCard label="Orders" value={purchaseOrders.length.toLocaleString()} detail={`${purchaseOrders.filter((order: any) => ["fulfilled", "delivering", "replaced"].includes(order.status)).length.toLocaleString()} completed`} icon={ShoppingBag} />
            <MetricCard label="Spent" value={currency(purchaseTotal)} detail={`${currency(refundTotal)} refunded`} icon={Activity} />
            <MetricCard label="Cards" value={purchasedCards.length.toLocaleString()} detail="Total purchased" icon={CreditCard} />
            <MetricCard label="Deposits" value={(creditedDeposits.length + pendingDeposits.length).toLocaleString()} detail={`${creditedDeposits.length} paid · ${pendingDeposits.length} pending`} icon={WalletCards} />
          </div>
          <MetricCard label="Deposit amount" value={currency(paidDepositTotal)} detail={`Avg ${currency(averageDeposit)}`} icon={Activity} />
          <StatusCard orders={purchaseOrders} />
          <ChartCard title="Daily purchases" subtitle="Last 30 days · purchases & amount" data={dailyPurchases} countLabel="Purchases" amountLabel="Amount ($)" />
          <ChartCard title="Daily deposits" subtitle="Last 30 days · deposits & paid amount" data={dailyDeposits} countLabel="Deposits" amountLabel="Amount ($)" countColor="#f59e0b" amountColor="#a855f7" />
        </div>
      )}

      {tab === "purchases" && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <MetricCard label="Orders" value={purchaseOrders.length.toLocaleString()} detail={`All time ${purchaseOrders.length.toLocaleString()}`} icon={ShoppingBag} />
            <MetricCard label="Spent" value={currency(purchaseTotal)} detail={`All time ${currency(purchaseTotal)}`} icon={Activity} />
            <MetricCard label="Cards" value={purchasedCards.length.toLocaleString()} detail={`All time ${purchasedCards.length.toLocaleString()}`} icon={CreditCard} />
            <MetricCard label="Refunded" value={currency(refundTotal)} detail={`${purchaseOrders.filter((order: any) => order.status === "refunded").length} full`} icon={CircleAlert} emphasis="text-rose-400" />
          </div>
          <Link href="/orders" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#141414] text-sm font-medium text-white hover:border-blue-500/60 hover:bg-blue-500/10">
            View my orders <ArrowUpRight className="h-4 w-4" />
          </Link>
          <ChartCard title="Monthly purchases" subtitle="Amount, purchases, refunded" data={monthlyPurchases} countLabel="Purchases" amountLabel="Amount ($)" showRefunds />
          <ChartCard title="Weekly purchases" subtitle="Orders & amount by week" data={weeklyPurchases} countLabel="Orders" amountLabel="Amount ($)" />
        </div>
      )}

      {tab === "deposits" && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <MetricCard label="Total" value={(creditedDeposits.length + pendingDeposits.length).toLocaleString()} detail="Paid and pending records" icon={WalletCards} />
            <MetricCard label="Paid" value={currency(paidDepositTotal)} detail={`${creditedDeposits.length} deposits`} icon={CheckCircle2} />
            <MetricCard label="Pending" value={currency(pendingAmount)} detail={`${pendingDeposits.length} pending`} icon={CircleAlert} emphasis="text-amber-400" />
            <MetricCard label="Average" value={currency(averageDeposit)} detail={`Largest ${currency(largestDeposit)}`} icon={Activity} />
          </div>
          <Link href="/my-deposits" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#141414] text-sm font-medium text-white hover:border-blue-500/60 hover:bg-blue-500/10">
            View my deposits <ArrowUpRight className="h-4 w-4" />
          </Link>
          <ChartCard title="Monthly deposits" subtitle="Total vs paid amount" data={monthlyDeposits} countLabel="Deposits" amountLabel="Paid amount ($)" countColor="#f59e0b" amountColor="#2563eb" />
          <ChartCard title="Weekly deposits" subtitle="Deposits & paid amount by week" data={weeklyDeposits} countLabel="Deposits" amountLabel="Paid amount ($)" countColor="#f59e0b" amountColor="#a855f7" />
        </div>
      )}

      <footer className="mt-10 border-t border-white/10 py-8 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-white/55">
          <span className={`h-2 w-2 rounded-full ${anyError ? "bg-amber-400" : "bg-emerald-400"}`} />
          {anyError ? "Account data temporarily unavailable" : "Account data connected"}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-white/50">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link><span>•</span>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link><span>•</span>
          <a href="/api/health" className="hover:text-white">Status</a>
        </div>
        <p className="mt-4 text-xs text-white/35">OmniMarket · All rights reserved</p>
      </footer>
    </main>
  );
}
