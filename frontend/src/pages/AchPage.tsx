import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Filter, X, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

function AchRow({ ach, inCart, onToggleCart }: { ach: any; inCart: boolean; onToggleCart: (a: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ach/${ach.id}/purchase`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ach"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Purchase complete", description: "ACH delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <article className={`rounded-2xl border p-4 transition-all duration-200 sm:p-5 ${inCart ? "border-blue-400/40 bg-blue-400/[0.06]" : "border-white/10 bg-[#141414] hover:border-white/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold uppercase tracking-wide text-white">{ach.bankName}</p>
          <p className="mt-1 text-xs text-white/45">Bank account</p>
        </div>
        <div className="shrink-0 rounded-xl border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2 text-right">
          <p className="font-display text-base font-bold text-blue-300">${(ach.price / 100).toFixed(2)}</p>
          <p className="text-[10px] text-white/40">price</p>
        </div>
      </div>
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Available balance</p>
        <p className="mt-1 font-mono text-lg font-semibold text-white">${String(ach.balance).replace(/^\$/, "")}</p>
      </div>
      <div className="mt-4 flex gap-2">
          <button
            onClick={() => onToggleCart(ach)}
            aria-pressed={inCart}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
              inCart
                ? "border-blue-400/50 bg-blue-400/10 text-blue-300"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:border-blue-400/30 hover:text-blue-300"
            }`}
            data-testid={`btn-cart-ach-${ach.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "Added" : "Add"}
          </button>
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-400 py-2 text-xs font-bold text-black transition-colors hover:bg-blue-300 disabled:opacity-50"
            data-testid={`btn-buy-ach-${ach.id}`}
          >
            {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Buy for $${(ach.price / 100).toFixed(2)}`}
          </button>
      </div>
    </article>
  );
}

export default function AchPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [cartIds, setCartIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: achList, isLoading } = useQuery<any[]>({ queryKey: ["/api/ach"] });

  const filtered = useMemo(() => {
    if (!achList) return [];
    return achList.filter((a: any) => {
      const matchSearch = !search
        || a.bankName?.toLowerCase().includes(search.toLowerCase())
        || a.balance?.toLowerCase().includes(search.toLowerCase());
      const priceDollars = a.price / 100;
      const matchPriceMin = !priceMin || priceDollars >= parseFloat(priceMin);
      const matchPriceMax = !priceMax || priceDollars <= parseFloat(priceMax);
      return matchSearch && matchPriceMin && matchPriceMax;
    });
  }, [achList, search, priceMin, priceMax]);

  const cartItems = useMemo(() => (achList ?? []).filter((a: any) => cartIds.has(a.id)), [achList, cartIds]);
  const cartTotal = cartItems.reduce((sum: number, a: any) => sum + a.price, 0);
  const activeFilters = (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const toggleCart = (ach: any) => {
    setCartIds(prev => {
      const next = new Set(prev);
      if (next.has(ach.id)) next.delete(ach.id);
      else next.add(ach.id);
      return next;
    });
  };

  const purchaseCart = async () => {
    if (cartItems.length === 0) return;
    let purchased = 0;
    for (const ach of cartItems) {
      try {
        const res = await apiRequest("POST", `/api/ach/${ach.id}/purchase`, {});
        if (res.ok) purchased++;
        else {
          const err = await res.json().catch(() => ({}));
          toast({ title: `Failed: ${ach.bankName}`, description: err.message, variant: "destructive" });
        }
      } catch {
        toast({ title: `Failed: ${ach.bankName}`, variant: "destructive" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/ach"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setCartIds(new Set());
    if (purchased > 0) {
      toast({ title: `${purchased} ACH purchased`, description: "Check your orders" });
      setLocation("/orders");
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-blue-400" /></div>;
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-5 px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">Shopping</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Banks</h1>
        <p className="mt-1 text-sm text-white/50">Browse available bank accounts and check their listed balances.</p>
      </header>
      {/* Cart checkout bar */}
      {cartIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-400/25 bg-blue-400/[0.06] px-4 py-3">
          <div><p className="text-sm font-semibold text-white">{cartIds.size} selected</p><p className="mt-0.5 text-xs text-white/50">Total ${(cartTotal / 100).toFixed(2)}</p></div>
          <button onClick={purchaseCart} className="rounded-xl bg-blue-400 px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-blue-300">Checkout</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="text"
          placeholder="Search banks or balances"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-blue-400/40"
          data-testid="input-search-ach"
        />
      </div>

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        aria-expanded={showFilters}
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
          showFilters || activeFilters > 0
            ? "border-blue-400/35 bg-blue-400/[0.08] text-blue-300"
            : "border-white/10 bg-[#141414] text-white/65 hover:border-white/20 hover:text-white"
        }`}
        data-testid="btn-ach-filters"
      >
        <Filter className="h-3 w-3" />
        Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
      </button>

      {showFilters && (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Price range</p>
            <button
              onClick={() => { setPriceMin(""); setPriceMax(""); setShowFilters(false); }}
              className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-white/45">Minimum price</label>
              <input type="number" step="0.01" placeholder="0.00" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/40"
                data-testid="input-ach-price-min" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/45">Maximum price</label>
              <input type="number" step="0.01" placeholder="100.00" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/40"
                data-testid="input-ach-price-max" />
            </div>
          </div>
        </div>
      )}

      {/* Add selected button */}
      <button
        onClick={purchaseCart}
        disabled={cartIds.size === 0}
        className="w-full rounded-xl border border-white/10 bg-[#141414] py-2.5 text-xs font-medium text-white/55 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40 flex items-center justify-center gap-2"
        data-testid="btn-add-selected-ach"
      >
        <ShoppingCart className="h-3 w-3" />
        Buy selected ({cartIds.size})
      </button>

      {/* List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-white">Available banks</h2>
          <span className="text-xs text-white/40">{filtered.length} {filtered.length === 1 ? "offer" : "offers"}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#141414] px-4 py-14 text-center text-sm text-white/45">No banks match your search or price filters.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((ach: any) => (
              <AchRow key={ach.id} ach={ach} inCart={cartIds.has(ach.id)} onToggleCart={toggleCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
