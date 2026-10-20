import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EatsRequest = { id: number; userId: number; category: string; customerName: string; email: string; phone: string; address: string; siteUrl: string; username: string; balance: number; completedAt: string | null; chargedAmount: number | null };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function AdminEatsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const requests = useQuery<EatsRequest[]>({ queryKey: ["/api/admin/eats"], refetchInterval: 10000 });
  const activeId = selectedId ?? requests.data?.[0]?.id ?? null;
  const activeRequest = requests.data?.find(r => r.id === activeId);
  const chargeCents = Math.round(Number(chargeAmount) * 100);
  const messages = useQuery<ChatMessage[]>({ queryKey: ["/api/admin/eats", activeId, "messages"], queryFn: async () => (await fetch(`/api/admin/eats/${activeId}/messages`, { credentials: "include" })).json(), enabled: !!activeId, refetchInterval: 5000 });
  const send = useMutation({ mutationFn: () => apiRequest("POST", `/api/admin/eats/${activeId}/messages`, { message }), onSuccess: () => { setMessage(""); queryClient.invalidateQueries({ queryKey: ["/api/admin/eats", activeId, "messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/eats"] }); }, onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }) });
  const complete = useMutation({
    mutationFn: async () => {
      const amountCents = Math.round(Number(chargeAmount) * 100);
      const response = await apiRequest("POST", `/api/admin/eats/${activeId}/complete`, { amountCents });
      return response.json();
    },
    onSuccess: (_result, _variables, _context) => {
      setChargeAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eats"] });
      toast({ title: "Order completed", description: "The charge was deducted from the customer's balance." });
    },
    onError: (e: Error) => toast({ title: "Could not complete order", description: e.message, variant: "destructive" }),
  });
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-foreground"><header><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Admin</p><h1 className="mt-2 text-3xl font-black">Eats Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Review Eats requests and chat privately with customers.</p></header>
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]"><Card><CardHeader><CardTitle>Requests</CardTitle></CardHeader><CardContent className="space-y-2">{(requests.data ?? []).map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); setChargeAmount(""); }} className={`w-full rounded-lg border p-3 text-left text-sm ${activeId === item.id ? "border-primary bg-primary/10" : "border-border"}`}><span className="block font-semibold">{item.customerName} · #{item.id}</span><span className="text-muted-foreground">{item.category === "weed" ? "Weed Sites" : item.category === "facebook" ? "Facebook" : "Food Sites"} · {item.username}</span><span className="mt-1 block text-xs">{item.completedAt ? `Completed · ${money(item.chargedAmount ?? 0)}` : "Awaiting completion"}</span></button>)}{!requests.data?.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}</CardContent></Card>
      <div className="space-y-4">{activeRequest && <Card><CardHeader><CardTitle>Customer details</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2"><p>Name: {activeRequest.customerName}</p><p>Email: <a className="text-primary underline" href={`mailto:${activeRequest.email}`}>{activeRequest.email}</a></p><p>Phone: <a className="text-primary underline" href={`tel:${activeRequest.phone}`}>{activeRequest.phone}</a></p><p>Category: {activeRequest.category === "weed" ? "Weed Sites" : activeRequest.category === "facebook" ? "Facebook" : "Food Sites"}</p><p>Current balance: {money(activeRequest.balance)}</p><p>Site URL: {activeRequest.siteUrl ? <a className="break-all text-primary underline" href={activeRequest.siteUrl} target="_blank" rel="noopener noreferrer">{activeRequest.siteUrl}</a> : "—"}</p><p className="sm:col-span-2">Address: {activeRequest.address}</p>
          {activeRequest.completedAt ? <p className="font-semibold text-emerald-400 sm:col-span-2">Completed and charged {money(activeRequest.chargedAmount ?? 0)}.</p> : <div className="flex flex-wrap items-end gap-2 sm:col-span-2"><label className="min-w-40 flex-1 text-xs text-muted-foreground">Completed order amount ($)<Input type="number" min="0.01" max="1000000" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="0.00" className="mt-1" /></label><Button disabled={!Number.isSafeInteger(chargeCents) || chargeCents < 1 || chargeCents > 100000000 || complete.isPending} onClick={() => { if (window.confirm(`Mark order #${activeRequest.id} complete and deduct ${money(chargeCents)} from ${activeRequest.customerName}'s balance?`)) complete.mutate(); }}>{complete.isPending ? "Processing…" : "Complete & deduct balance"}</Button></div>}
        </CardContent></Card>}
      <Card><CardHeader><CardTitle>Private chat {activeId ? `· #${activeId}` : ""}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="max-h-96 space-y-2 overflow-y-auto">{(messages.data ?? []).map(m => <div key={m.id} className={`rounded-lg p-3 text-sm ${m.senderRole === "admin" ? "bg-primary/10" : "bg-muted"}`}><p className="mb-1 text-[10px] uppercase text-muted-foreground">{m.senderRole}</p>{m.message}</div>)}{activeId && !messages.data?.length && <p className="text-sm text-muted-foreground">Send the customer a message to start the conversation.</p>}</div><Textarea disabled={!activeId} value={message} maxLength={2000} onChange={e => setMessage(e.target.value)} placeholder="Reply to customer…" /><Button disabled={!activeId || !message.trim() || send.isPending} onClick={() => send.mutate()}>Send reply</Button></CardContent></Card></div>
    </div>
  </main>;
}
