import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RequestItem = { id: number; category: string; customerName: string; siteUrl: string; createdAt: string };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };

export default function BuyForYouPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "food", name: "", email: "", phone: "", address: "", siteUrl: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const requests = useQuery<RequestItem[]>({ queryKey: ["/api/buy-for-you"], refetchInterval: 10000 });
  const activeId = selectedId ?? requests.data?.[0]?.id ?? null;
  const messages = useQuery<ChatMessage[]>({ queryKey: ["/api/buy-for-you", activeId, "messages"], queryFn: async () => (await fetch(`/api/buy-for-you/${activeId}/messages`, { credentials: "include" })).json(), enabled: !!activeId, refetchInterval: 5000 });
  const create = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/buy-for-you", form)).json(), onSuccess: (request: RequestItem) => { queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] }); setSelectedId(request.id); toast({ title: "Request submitted", description: "An admin will contact you here." }); }, onError: (e: Error) => toast({ title: "Could not submit request", description: e.message, variant: "destructive" }) });
  const send = useMutation({ mutationFn: () => apiRequest("POST", `/api/buy-for-you/${activeId}/messages`, { message }), onSuccess: () => { setMessage(""); queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you", activeId, "messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] }); }, onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }) });
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-foreground">
    <header><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Personal shopping</p><h1 className="mt-2 text-3xl font-black">Buy For You</h1><p className="mt-2 text-sm text-muted-foreground">Choose a category and share your contact and delivery details. An admin will follow up in your private request chat.</p></header>
    <Card><CardHeader><CardTitle>New request</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
      <select aria-label="Site category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="food">Food Sites</option><option value="weed">Weed Sites</option><option value="facebook">Facebook</option></select>
      <Input placeholder="Site URL (https://…)" type="url" maxLength={2048} value={form.siteUrl} onChange={e => setForm({ ...form, siteUrl: e.target.value })} />
      <Input placeholder="Full name" maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="Email" type="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <Input placeholder="Phone number" type="tel" maxLength={40} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      <Textarea placeholder="Full address" maxLength={500} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
      <Button disabled={create.isPending} onClick={() => create.mutate()} className="sm:col-span-2">{create.isPending ? "Submitting…" : "Submit request"}</Button>
    </CardContent></Card>
    <section className="grid gap-4 lg:grid-cols-[260px_1fr]"><Card><CardHeader><CardTitle>Your requests</CardTitle></CardHeader><CardContent className="space-y-2">{(requests.data ?? []).map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${activeId === item.id ? "border-primary bg-primary/10" : "border-border"}`}>{item.category === "weed" ? "Weed Sites" : item.category === "facebook" ? "Facebook" : "Food Sites"} · #{item.id}</button>)}{!requests.data?.length && <p className="text-sm text-muted-foreground">Your requests will appear here.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Request chat {activeId ? `· #${activeId}` : ""}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="max-h-72 space-y-2 overflow-y-auto">{(messages.data ?? []).map(m => <div key={m.id} className={`rounded-lg p-3 text-sm ${m.senderRole === "admin" ? "bg-primary/10" : "bg-muted"}`}><p className="mb-1 text-[10px] uppercase text-muted-foreground">{m.senderRole === "admin" ? "Admin" : "You"}</p>{m.message}</div>)}{activeId && !messages.data?.length && <p className="text-sm text-muted-foreground">An admin can reply here.</p>}</div><Textarea disabled={!activeId} value={message} maxLength={2000} onChange={e => setMessage(e.target.value)} placeholder="Message the admin…" /><Button disabled={!activeId || !message.trim() || send.isPending} onClick={() => send.mutate()}>Send message</Button></CardContent></Card>
    </section>
    <p className="text-xs text-muted-foreground">Your contact and address details are visible only to you and admins handling requests.</p>
  </main>;
}
