import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CircleDollarSign } from "lucide-react";

type SellerProfit = {
  sellerId: number;
  username: string;
  sales: number;
  grossCents: number;
  sellerProfitCents: number;
  platformShareCents: number;
  items: { orderId: string; itemType: string; itemName: string; quantity: number; createdAt: string; allocatedCents: number; sellerProfitCents: number }[];
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function AdminProfitsPage() {
  const { data: sellers = [], isLoading, isError } = useQuery<SellerProfit[]>({
    queryKey: ["/api/admin/profits"],
    queryFn: async () => {
      const response = await fetch("/api/admin/profits", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load seller profits.");
      return response.json();
    },
  });
  const gross = sellers.reduce((sum, seller) => sum + seller.grossCents, 0);
  const sellerTotal = sellers.reduce((sum, seller) => sum + seller.sellerProfitCents, 0);
  const platformTotal = sellers.reduce((sum, seller) => sum + seller.platformShareCents, 0);

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-foreground">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Admin</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-black"><CircleDollarSign className="h-7 w-7 text-primary" />Profits Page</h1>
      <p className="mt-2 text-sm text-muted-foreground">Completed seller sales are allocated after order discounts, then split 50/50. Refunds and admin-owned inventory are excluded. This is an earnings report, not a payout record.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Seller-attributed sales</p><p className="mt-1 text-2xl font-bold">{dollars(gross)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Seller half · 50%</p><p className="mt-1 text-2xl font-bold text-emerald-400">{dollars(sellerTotal)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Platform half · 50%</p><p className="mt-1 text-2xl font-bold text-primary">{dollars(platformTotal)}</p></CardContent></Card>
    </div>
    {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : isError ? <p className="text-sm text-destructive">Could not load seller profit history.</p> : sellers.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No completed seller sales yet.</CardContent></Card> :
      <div className="space-y-4">{sellers.map(seller => <Card key={seller.sellerId} className="overflow-hidden">
        <CardHeader className="pb-3"><CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
          <span>{seller.username} <span className="text-xs font-normal text-muted-foreground">· {seller.sales} item{seller.sales === 1 ? "" : "s"} sold</span></span>
          <span className="text-emerald-400">Seller share: {dollars(seller.sellerProfitCents)}</span>
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <p className="rounded bg-muted/50 p-2">Attributed sales: <b>{dollars(seller.grossCents)}</b></p>
            <p className="rounded bg-muted/50 p-2">Seller share: <b>{dollars(seller.sellerProfitCents)}</b></p>
            <p className="rounded bg-muted/50 p-2">Platform share: <b>{dollars(seller.platformShareCents)}</b></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Sale</th><th className="py-2 pr-3">Seller half</th><th className="py-2">Item</th></tr></thead>
              <tbody>{seller.items.map((item, index) => <tr key={`${item.orderId}-${index}`} className="border-t border-border/60">
                <td className="py-2 pr-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-3 font-mono">{item.orderId}</td>
                <td className="py-2 pr-3">{dollars(item.allocatedCents)}</td>
                <td className="py-2 pr-3 text-emerald-400">{dollars(item.sellerProfitCents)}</td>
                <td className="py-2">{item.itemName} · {item.itemType}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>)}</div>}
  </main>;
}
