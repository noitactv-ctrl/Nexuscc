import "./_group.css";
import { Filter, Search, ShoppingCart } from "lucide-react";

const examples = [
  { id: 1, bank: "CHASE", balance: "$4,990", price: "$12.00" },
  { id: 2, bank: "WELLS FARGO", balance: "$3,298.09", price: "$10.00" },
  { id: 3, bank: "BANK OF AMERICA", balance: "$2,750", price: "$8.50" },
];

export function Current() {
  return (
    <main className="min-h-screen bg-black px-4 pb-8 pt-6 sm:px-6">
      <div className="mx-auto max-w-[1120px] space-y-5">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Shopping</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Banks</h1>
          <p className="mt-1 text-sm text-white/50">Browse available bank accounts and check their listed balances.</p>
        </header>
        <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input placeholder="Search banks or balances" className="h-11 w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-3 text-sm text-white placeholder:text-white/30" />
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141414] px-4 text-sm font-medium text-white/65">
            <Filter className="h-4 w-4" /> Filters
          </button>
        </section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Available banks</h2>
          <span className="text-xs text-white/40">{examples.length} offers</span>
        </div>
        <section className="grid gap-3 sm:grid-cols-2">
          {examples.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-base font-semibold uppercase tracking-wide text-white">{item.bank}</p><p className="mt-1 text-xs text-white/45">Bank account</p></div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-right"><p className="text-base font-bold text-amber-300">{item.price}</p><p className="text-[10px] text-white/40">price</p></div>
              </div>
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Available balance</p>
                <p className="mt-1 font-mono text-lg font-semibold text-white">{item.balance}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/65"><ShoppingCart className="h-3 w-3" /> Add</button>
                <button className="flex-1 rounded-xl bg-amber-400 py-2 text-xs font-bold text-black">Buy for {item.price}</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
