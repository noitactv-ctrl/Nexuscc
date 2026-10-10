import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, ChevronDown, Columns3, Search, WalletCards } from "lucide-react";

type Deposit = {
  id: string;
  orderId?: string | null;
  type: "crypto" | "cashapp" | "venmo" | "chime" | "zelle";
  amount: number;
  status: string;
  paymentId?: string;
  checkoutUrl?: string;
  paymentNote?: string;
  createdAt: string;
};

const COLUMNS = [
  { id: "orderId", label: "OrderId" },
  { id: "depositId", label: "DepositId" },
  { id: "amount", label: "Amount" },
  { id: "status", label: "Status" },
  { id: "txnId", label: "Txn_Id" },
  { id: "createdAt", label: "CreatedAt" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];
const INITIAL_COLUMNS: Record<ColumnId, boolean> = {
  orderId: true,
  depositId: true,
  amount: true,
  status: true,
  txnId: true,
  createdAt: true,
};

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    completed: "Paid",
    fulfilled: "Paid",
    delivering: "Paid",
    waiting_payment: "Waiting",
    unpaid: "Waiting",
    pending: "Pending",
    underpaid: "Underpaid",
    failed: "Failed",
    expired: "Expired",
    refunded: "Refunded",
    cancelled: "Cancelled",
    manual_accept: "Manual Accept",
  };
  return labels[status.toLowerCase()] ?? status.replace(/[_-]/g, " ");
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (["completed", "fulfilled", "delivering", "paid"].includes(normalized)) {
    return "border-emerald-500/15 bg-emerald-500/10 text-emerald-400";
  }
  if (["failed", "expired", "refunded", "cancelled"].includes(normalized)) {
    return "border-rose-500/15 bg-rose-500/10 text-rose-300";
  }
  if (normalized === "underpaid") return "border-amber-500/15 bg-amber-500/10 text-amber-300";
  return "border-orange-500/15 bg-orange-500/10 text-orange-300";
}

export default function MyDepositsPage() {
  const { data: deposits, isLoading, isError, refetch } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const statuses = useMemo(
    () => Array.from(new Set((deposits ?? []).map((deposit) => deposit.status))).sort((a, b) => a.localeCompare(b)),
    [deposits],
  );
  const filteredDeposits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (deposits ?? []).filter((deposit) => {
      const matchesSearch = !query
        || deposit.id.toLowerCase().includes(query)
        || deposit.orderId?.toLowerCase().includes(query)
        || deposit.paymentId?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || deposit.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deposits, search, statusFilter]);
  const visibleColumns = COLUMNS.filter((column) => columns[column.id]);
  const allVisibleSelected = filteredDeposits.length > 0
    && filteredDeposits.every((deposit) => selectedIds.includes(deposit.id));

  function toggleRow(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllRows() {
    if (allVisibleSelected) {
      const visible = new Set(filteredDeposits.map((deposit) => deposit.id));
      setSelectedIds((current) => current.filter((id) => !visible.has(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...filteredDeposits.map((deposit) => deposit.id)])));
    }
  }

  function cellValue(deposit: Deposit, column: ColumnId) {
    switch (column) {
      case "orderId":
        return <span className="font-mono text-[13px] text-white/85">{deposit.orderId || deposit.id}</span>;
      case "depositId":
        return <span className="font-mono text-[13px] text-white/70">{deposit.paymentId || "—"}</span>;
      case "amount":
        return <span className="font-semibold tabular-nums text-white">{money(deposit.amount)}</span>;
      case "status":
        return <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${statusTone(deposit.status)}`}>{statusLabel(deposit.status)}</span>;
      case "txnId":
        return <span className="font-mono text-[13px] text-white/70">—</span>;
      case "createdAt":
        return <span className="whitespace-nowrap text-sm text-white/60">{dateLabel(deposit.createdAt)}</span>;
    }
  }

  return (
    <main className="min-h-[calc(100dvh-52px)] bg-[#090909] px-4 pb-12 pt-7 text-white sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-12 sm:mb-14">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] sm:text-[38px]">My Deposits</h1>
          <p className="mt-3 text-base text-[#a3a3a3] sm:text-[20px]">View and manage your deposit history</p>
        </header>

        <section aria-label="Deposit history">
          <div className="relative mb-6">
            <button
              type="button"
              onClick={() => setColumnsOpen((open) => !open)}
              aria-expanded={columnsOpen}
              className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#333] bg-[#151515] px-4 text-base font-medium text-white transition-colors hover:bg-[#1c1c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Columns3 className="h-4 w-4 text-white/65" />
              Columns
              <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${columnsOpen ? "rotate-180" : ""}`} />
            </button>
            {columnsOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close columns menu"
                  onClick={() => setColumnsOpen(false)}
                />
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[184px] rounded-xl border border-[#333] bg-[#171717] p-1.5 shadow-2xl shadow-black/60">
                  {COLUMNS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setColumns((current) => ({ ...current, [id]: !current[id] }))}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-white/90 transition-colors hover:bg-white/[0.07]"
                      aria-pressed={columns[id]}
                    >
                      <span className="grid h-4 w-4 place-items-center text-white">
                        {columns[id] && <Check className="h-4 w-4" />}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(260px,1fr)_minmax(190px,295px)] sm:items-end sm:gap-6">
            <label className="block min-w-0">
              <span className="mb-2 block text-base font-medium text-white">Search</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by order ID..."
                  className="h-14 w-full rounded-xl border border-[#363636] bg-[#151515] pl-12 pr-4 text-base text-white outline-none transition-colors placeholder:text-[#858585] focus:border-[#666] sm:text-lg"
                />
              </span>
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-base font-medium text-white">Status Filter</span>
              <span className="relative block">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-14 w-full appearance-none rounded-xl border border-[#363636] bg-[#151515] px-4 pr-11 text-base text-white outline-none transition-colors focus:border-[#666]"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              </span>
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#292929] bg-[#090909]">
            {isLoading ? (
              <div className="space-y-0" aria-label="Loading deposits">
                <div className="h-[60px] animate-pulse border-b border-[#292929] bg-[#111]" />
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-[58px] animate-pulse border-b border-[#242424] bg-[#0d0d0d]" />
                ))}
              </div>
            ) : isError ? (
              <div className="flex min-h-[230px] flex-col items-center justify-center px-6 text-center">
                <p className="text-lg font-semibold text-white">Deposits could not be loaded</p>
                <p className="mt-2 text-sm text-[#999]">Please try again in a moment.</p>
                <button type="button" onClick={() => void refetch()} className="mt-5 rounded-lg border border-[#383838] bg-[#171717] px-4 py-2 text-sm text-white hover:bg-[#222]">
                  Retry
                </button>
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className="flex min-h-[230px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[235px]">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-[#2c2c2c] bg-[#141414] text-white/55">
                  <WalletCards className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {(deposits ?? []).length === 0 ? "No deposits found" : "No matching deposits"}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#929292]">
                  {(deposits ?? []).length === 0
                    ? "You haven't made any deposits yet."
                    : "Try adjusting your search or status filter."}
                </p>
                {(deposits ?? []).length === 0 && (
                  <Link href="/deposit" className="mt-5 inline-flex h-10 items-center rounded-lg border border-[#383838] bg-[#151515] px-4 text-sm font-medium text-white transition-colors hover:bg-[#202020]">
                    Create a deposit
                  </Link>
                )}
              </div>
            ) : visibleColumns.length === 0 ? (
              <div className="flex min-h-[230px] items-center justify-center px-6 text-center text-sm text-[#929292]">
                Choose at least one column to view your deposit records.
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="h-[58px] border-b border-[#333] text-sm font-medium text-[#f1f1f1]">
                      <th className="w-16 px-5">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllRows}
                          aria-label="Select all visible deposits"
                          className="h-5 w-5 cursor-pointer accent-white"
                        />
                      </th>
                      {visibleColumns.map(({ id, label }) => (
                        <th key={id} className="whitespace-nowrap px-4 py-4 font-medium">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeposits.map((deposit) => (
                      <tr key={deposit.id} className="h-[58px] border-b border-[#303030] transition-colors last:border-b-0 hover:bg-white/[0.025]">
                        <td className="px-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(deposit.id)}
                            onChange={() => toggleRow(deposit.id)}
                            aria-label={`Select deposit ${deposit.id}`}
                            className="h-5 w-5 cursor-pointer accent-white"
                          />
                        </td>
                        {visibleColumns.map(({ id }) => (
                          <td key={id} className="max-w-[340px] whitespace-nowrap px-4 py-3">{cellValue(deposit, id)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!isLoading && !isError && filteredDeposits.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#777]">
              <span>{filteredDeposits.length} {filteredDeposits.length === 1 ? "deposit" : "deposits"}</span>
              {selectedIds.length > 0 && <span>{selectedIds.length} selected</span>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
