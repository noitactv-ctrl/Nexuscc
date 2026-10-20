import { useState, useMemo, useEffect } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { Download, Loader2, RefreshCw, Search, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

type TabType = "all" | "cards" | "ach" | "logs";

function getTier(totalDepositsCents: number): { label: string; discount: string } {
  const dollars = totalDepositsCents / 100;
  if (dollars >= 500) return { label: "Gold", discount: "15% off" };
  if (dollars >= 200) return { label: "Silver", discount: "10% off" };
  if (dollars >= 50) return { label: "Bronze", discount: "5% off" };
  return { label: "Starter", discount: "0% off" };
}

function isAchOrder(order: any): boolean {
  return (order.orderId ?? "").startsWith("ACH-");
}

function isCardOrder(order: any): boolean {
  return (
    (order.orderId ?? "").startsWith("CARD-") ||
    (!isAchOrder(order) && (order.items ?? []).some((i: any) => i.itemType === "card" || i.cardId != null))
  );
}

function isLogOrder(order: any): boolean {
  return !isCardOrder(order) && !isAchOrder(order);
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    fulfilled: { label: "FULFILLED", cls: "bg-red-900/40 text-red-400" },
    delivering: { label: "FULFILLED", cls: "bg-red-900/40 text-red-400" },
    pending: { label: "PENDING", cls: "bg-yellow-900/40 text-yellow-400" },
    waiting_payment: { label: "UNPAID", cls: "bg-orange-900/40 text-orange-400" },
    refunded: { label: "REFUNDED", cls: "bg-red-900/40 text-red-400" },
    replaced: { label: "REPLACED", cls: "bg-red-900/40 text-red-400" },
  };
  const entry = map[status] ?? { label: status?.toUpperCase() ?? "—", cls: "bg-[#0d0d0d] text-white/45" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading, isError, refetch, isRefetching } = useOrders();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryString = useSearch();
  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const exportOrders = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/orders/export", { credentials: "include" });
      if (!response.ok) throw new Error("Unable to export orders.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Orders exported", description: "Your text file is downloading." });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to export orders.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const requestedTab = new URLSearchParams(queryString).get("tab");
    setTab(
      requestedTab === "cards" || requestedTab === "ach" || requestedTab === "logs"
        ? requestedTab
        : "all",
    );
  }, [queryString]);
  const createVouch = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("POST", "/api/vouches/create-token", { orderId });
      return response.json() as Promise<{ telegramUrl: string }>;
    },
    onSuccess: (result) => {
      window.location.assign(result.telegramUrl);
    },
    onError: (error: Error) => {
      toast({
        title: "Vouch unavailable",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  const { data: features } = useQuery<any>({
    queryKey: ["/api/settings/features"],
    enabled: !!user,
  });

  const totalDepositsCents = useMemo(() => {
    if (!transactions) return 0;
    return transactions
      .filter((t: any) => t.type === "deposit" || t.type === "manual_deposit")
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const tier = getTier(totalDepositsCents);
  const allOrders = orders ?? [];

  const totalSpentCents = useMemo(() => {
    return allOrders
      .filter((o: any) => o.status === "fulfilled" || o.status === "delivering" || o.status === "replaced")
      .reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
  }, [allOrders]);

  const cardOrders = useMemo(() => allOrders.filter(isCardOrder), [allOrders]);
  const achOrders = useMemo(() => allOrders.filter(isAchOrder), [allOrders]);
  const logOrders = useMemo(() => allOrders.filter(isLogOrder), [allOrders]);

  const tabOrders = tab === "cards" ? cardOrders : tab === "ach" ? achOrders : tab === "logs" ? logOrders : allOrders;

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return tabOrders;
    const q = search.toLowerCase();
    return tabOrders.filter((o: any) =>
      (o.orderId ?? "").toLowerCase().includes(q) ||
      (o.status ?? "").toLowerCase().includes(q)
    );
  }, [tabOrders, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-sm text-red-400">
        Failed to load orders. Please refresh.
      </div>
    );
  }

  const now = new Date();

  const showCards = features?.checker === true || features?.cards === true;
  const showLogs = features?.logs === true;

  const tabs: { key: TabType; label: string; count: number; href?: string }[] = [
    { key: "all", label: "all", count: allOrders.length },
    ...(showCards ? [{ key: "cards" as TabType, label: "cards", count: cardOrders.length, href: "/cards" }] : []),
    ...(achOrders.length > 0 ? [{ key: "ach" as TabType, label: "ach", count: achOrders.length }] : []),
    ...(showLogs ? [{ key: "logs" as TabType, label: "logs", count: logOrders.length, href: "/shop" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Purchase history</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Track purchases, check delivery status, and revisit order details.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            data-testid="btn-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            {isRefetching ? "Refreshing" : "Refresh"}
          </button>
          <button
            onClick={exportOrders}
            disabled={isExporting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            data-testid="btn-export-orders"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
          <a
            href="https://t.me/+uh_mmVGlIZFjM2Ux"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:col-span-1"
            data-testid="btn-support"
          >
            Support
          </a>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Order account summary">
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Orders found</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{allOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all categories</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Total deposits</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">${(totalDepositsCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Funds added to your account</p>
        </div>
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Member tier</p>
          <p className="mt-2 text-2xl font-bold text-primary">{tier.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tier.discount} on eligible purchases</p>
        </div>
      </section>

      <section className="space-y-4" aria-label="Order list">
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/50 p-3 sm:p-4">
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Filter orders">
            {tabs.map((t) => (
              <div key={t.key} className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                  data-testid={`tab-${t.key}`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.key ? "bg-primary/15" : "bg-white/5"}`}>{t.count}</span>
                </button>
                {t.href && (
                  <Link href={t.href}>
                    <span className="cursor-pointer px-1 text-[10px] font-medium text-primary/80 hover:text-primary" data-testid={`link-shop-${t.key}`}>
                      Shop
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by order ID or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              data-testid="input-search-orders"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <span><strong className="font-semibold text-foreground">{filteredOrders.length}</strong> results</span>
          <span className="hidden sm:inline">Select an order to view its details</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-5 py-12 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold">{search ? "No matching orders" : "No orders in this category"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{search ? "Try another order ID or status." : "Your purchases will appear here."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => {
              const isCard = isCardOrder(order);
              const isFulfilled = order.status === "fulfilled" || order.status === "delivering" || order.status === "replaced";
              const vouchStatus = order.vouchStatus as "pending" | "approved" | "rejected" | null;
              const itemNames = (order.items ?? []).map((item: any) =>
                item.variant?.product?.name || item.variant?.name || (item.itemType === "card" ? "Card" : "Product"),
              );

              return (
                <article key={order.id} className="overflow-hidden rounded-xl border border-border/80 bg-card/60 transition-colors hover:border-primary/25">
                  <button
                    type="button"
                    onClick={() => setLocation(`/order/${order.orderId}`)}
                    className="block w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-5"
                    data-testid={`btn-order-${order.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-xs font-semibold text-foreground">#{order.orderId}</span>
                          <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${isCard ? "bg-red-500/10 text-red-300" : isAchOrder(order) ? "bg-cyan-500/10 text-cyan-300" : "bg-primary/10 text-primary"}`}>
                            {isCard ? "Card" : isAchOrder(order) ? "ACH" : "Log"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? "item" : "items"} · {formatDate(order.createdAt, undefined, "")}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {statusBadge(order.status)}
                        <p className="mt-2 font-mono text-base font-semibold tabular-nums">${(order.total / 100).toFixed(2)}</p>
                      </div>
                    </div>
                    {itemNames.length > 0 && (
                      <div className="mt-4 border-t border-border/70 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Purchased items</p>
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/85">{itemNames.join(" · ")}</p>
                      </div>
                    )}
                    <p className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-primary">View order <span aria-hidden="true">→</span></p>
                  </button>

                  {vouchStatus === "approved" ? (
                    <p className="border-t border-border/70 px-4 py-3 text-xs text-emerald-400 sm:px-5">Vouch submitted — $0.50 credit awarded</p>
                  ) : vouchStatus === "pending" ? (
                    <p className="border-t border-border/70 px-4 py-3 text-xs text-yellow-400 sm:px-5">Vouch under review</p>
                  ) : vouchStatus === "rejected" ? (
                    <p className="border-t border-border/70 px-4 py-3 text-xs text-red-400 sm:px-5">Vouch rejected</p>
                  ) : isFulfilled ? (
                    <div className="border-t border-border/70 px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Submit a vouch for this order? Send an image showing your genuine experience through our Telegram bot. Approved genuine vouches receive $0.50 in site credit.",
                          );
                          if (confirmed) createVouch.mutate(order.id);
                        }}
                        disabled={createVouch.isPending}
                        className="w-full rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 sm:w-auto"
                        data-testid={`btn-submit-vouch-${order.id}`}
                      >
                        {createVouch.isPending ? "Generating secure link..." : "Submit a vouch"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
