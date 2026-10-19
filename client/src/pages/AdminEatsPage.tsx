import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type EatsRequest = { id: number; userId: number; category: string; customerName: string; email: string; phone: string; address: string; siteUrl: string; username: string };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };

export default function AdminEatsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const requests = useQuery<EatsRequest[]>({ queryKey: ["/api/admin/eats"], refetchInterval: 10000 });
  const activeId = selectedId ?? requests.data?.[0]?.id ?? null;
  const messages = useQuery<ChatMessage[]>({ queryKey: ["/api/admin/eats", activeId, "messages"], queryFn: async () => (await fetch(`/api/admin/eats/${activeId}/messages`, { credentials: "include" })).json(), enabled: !!activeId, refetchInterval: 5000 });
  const send = useMutation({ mutationFn: () => apiRequest("POST", `/api/admin/eats/${activeId}/messages`, { message }), onSuccess: () => { setMessage(""); queryClient.invalidateQueries({ queryKey: ["/api/admin/eats", activeId, "messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/eats"] }); }, onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }) });
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-foreground"><header><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Admin</p><h1 className="mt-2 text-3xl font-black">Eats Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Review Buy For You requests and chat privately with customers.</p></header>
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]"><Card><CardHeader><CardTitle>Requests</CardTitle></CardHeader><CardContent className="space-y-2">{(requests.data ?? []).map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${activeId === item.id ? "border-primary bg-primary/10" : "border-border"}`}><span className="block font-semibold">{item.customerName} · #{item.id}</span><span className="text-muted-foreground">{item.category === "weed" ? "Weed Sites" : item.category === "facebook" ? "Facebook" : "Food Sites"} · {item.username}</span></button>)}{!requests.data?.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}</CardContent></Card>
      <div className="space-y-4">{activeId && requests.data?.find(r => r.id === activeId) && <Card><CardHeader><CardTitle>Customer details</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2">{(() => { const r = requests.data!.find(x => x.id === activeId)!; return <><p>Name: {r.customerName}</p><p>Email: <a className="text-primary underline" href={`mailto:${r.email}`}>{r.email}</a></p><p>Phone: <a className="text-primary underline" href={`tel:${r.phone}`}>{r.phone}</a></p><p>Category: {r.category === "weed" ? "Weed Sites" : r.category === "facebook" ? "Facebook" : "Food Sites"}</p><p className="sm:col-span-2">Site URL: {r.siteUrl ? <a className="break-all text-primary underline" href={r.siteUrl} target="_blank" rel="noopener noreferrer">{r.siteUrl}</a> : "—"}</p><p className="sm:col-span-2">Address: {r.address}</p></>; })()}</CardContent></Card>}
      <Card><CardHeader><CardTitle>Private chat {activeId ? `· #${activeId}` : ""}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="max-h-96 space-y-2 overflow-y-auto">{(messages.data ?? []).map(m => <div key={m.id} className={`rounded-lg p-3 text-sm ${m.senderRole === "admin" ? "bg-primary/10" : "bg-muted"}`}><p className="mb-1 text-[10px] uppercase text-muted-foreground">{m.senderRole}</p>{m.message}</div>)}{activeId && !messages.data?.length && <p className="text-sm text-muted-foreground">Send the customer a message to start the conversation.</p>}</div><Textarea disabled={!activeId} value={message} maxLength={2000} onChange={e => setMessage(e.target.value)} placeholder="Reply to customer…" /><Button disabled={!activeId || !message.trim() || send.isPending} onClick={() => send.mutate()}>Send reply</Button></CardContent></Card></div>
    </div>
  </main>;
}
