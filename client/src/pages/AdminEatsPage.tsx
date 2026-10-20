import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clock3, MessageCircle, RefreshCw, Send, Utensils, Wallet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EatsRequest = { id: number; userId: number; category: string; customerName: string; username: string; siteUrl: string; updatedAt: string; completedAt: string | null; chargedAmount: number | null };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const categoryLabel = (category: string, siteUrl: string) => !siteUrl ? "Eats Chat" : category === "weed" ? "Weed Sites" : category === "facebook" ? "Facebook" : "Food Sites";
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function AdminEatsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requests = useQuery<EatsRequest[]>({ queryKey: ["/api/admin/eats"], refetchInterval: 10000 });
  const activeId = requests.data?.some((request) => request.id === selectedId) ? selectedId : requests.data?.[0]?.id ?? null;
  const activeRequest = requests.data?.find((request) => request.id === activeId);
  const openCount = requests.data?.filter((request) => !request.completedAt).length ?? 0;
  const chargeCents = Math.round(Number(chargeAmount) * 100);
  const messages = useQuery<ChatMessage[]>({
    queryKey: ["/api/admin/eats", activeId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/eats/${activeId}/messages`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load this conversation.");
      return response.json();
    },
    enabled: !!activeId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeId, messages.data?.length]);
  useEffect(() => {
    setMessage("");
    setChargeAmount("");
  }, [activeId]);

  const send = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/eats/${activeId}/messages`, { message: message.trim() }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eats", activeId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eats"] });
    },
    onError: (error: Error) => toast({ title: "Message failed", description: error.message, variant: "destructive" }),
  });
  const complete = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/eats/${activeId}/complete`, { amountCents: chargeCents });
      return response.json();
    },
    onSuccess: () => {
      setChargeAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eats"] });
      toast({ title: "Order completed", description: "The charge was deducted from the customer's balance." });
    },
    onError: (error: Error) => toast({ title: "Could not complete order", description: error.message, variant: "destructive" }),
  });
  const submitReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeId && message.trim() && !send.isPending) send.mutate();
  };

  return (
    <main className="mx-auto min-h-[80dvh] max-w-[1440px] px-3 py-5 text-foreground sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-primary">
            <span className="h-px w-6 bg-primary/70" /> OmniMarket / Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-[2.6rem]">Eats inbox</h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">Private order conversations, ready for your reply.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[.06] px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-semibold">{openCount} open orders</span>
        </div>
      </header>

      <div className="grid min-h-[min(740px,calc(100dvh-190px))] gap-3 lg:grid-cols-[310px_minmax(0,1fr)]">
        <Card className="flex min-h-[245px] min-w-0 flex-col overflow-hidden rounded-2xl border-white/[.09] bg-[#10100f]/95 shadow-[0_20px_70px_rgba(0,0,0,.22)] lg:min-h-0">
          <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Queue</p>
              <h2 className="mt-1 text-lg font-semibold">Conversations</h2>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-1 font-mono text-xs text-muted-foreground">{requests.data?.length ?? "—"}</span>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="Customer conversations">
            {requests.isLoading && (
              <div className="space-y-2 p-2" aria-label="Loading conversations">
                {[0, 1, 2].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-xl bg-white/[.045]" />)}
              </div>
            )}
            {requests.isError && (
              <div className="m-2 rounded-xl border border-destructive/20 bg-destructive/[.06] p-4">
                <p className="text-sm font-medium">Inbox unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">Your conversations could not be loaded.</p>
                <Button variant="outline" size="sm" onClick={() => void requests.refetch()} className="mt-3 gap-2"><RefreshCw className="h-3.5 w-3.5" /> Try again</Button>
              </div>
            )}
            {requests.data?.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setChargeAmount(""); }}
                  aria-current={isActive ? "true" : undefined}
                  className={`group w-full rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? "border-primary/35 bg-primary/[.09]" : "border-transparent hover:border-white/[.08] hover:bg-white/[.035]"}`}>
                  <span className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${isActive ? "border-primary/25 bg-primary/[.12] text-primary" : "border-white/[.08] bg-white/[.035] text-muted-foreground"}`} aria-hidden="true">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{item.customerName}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatTime(item.updatedAt)}</span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{categoryLabel(item.category, item.siteUrl)} · #{item.id}</span>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.completedAt ? "bg-emerald-500/70" : "bg-primary"}`} />
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
            {!requests.isLoading && !requests.isError && !requests.data?.length && (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/15 bg-primary/[.06] text-primary"><MessageCircle className="h-5 w-5" /></span>
                <p className="mt-3 text-sm font-semibold">The inbox is clear</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">New Eats requests will appear here as soon as a customer starts a chat.</p>
              </div>
            )}
          </div>
          <div className="hidden items-center gap-2 border-t border-white/[.07] px-4 py-3 text-[10px] text-muted-foreground sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Open
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500/70" /> Completed
          </div>
        </Card>

        <Card className="flex min-h-[510px] min-w-0 flex-col overflow-hidden rounded-2xl border-white/[.09] bg-[#10100f]/95 shadow-[0_20px_70px_rgba(0,0,0,.22)] lg:min-h-0">
          {activeRequest ? (
            <>
              <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-white/[.07] px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/[.07] text-primary"><Utensils className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold sm:text-base">{activeRequest.customerName}</h2>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{categoryLabel(activeRequest.category, activeRequest.siteUrl)} <span className="px-1 text-primary/60">/</span> Order #{activeRequest.id}</p>
                  </div>
                </div>
                <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${activeRequest.completedAt ? "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-400" : "border-primary/20 bg-primary/[.07] text-primary"}`}>
                  {activeRequest.completedAt ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                  {activeRequest.completedAt ? "Completed" : "In progress"}
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(234,179,8,.035),transparent_55%)] px-4 py-5 sm:px-7 sm:py-7" aria-live="polite" aria-label="Conversation messages">
                <div className="mb-5 flex items-center justify-center gap-3 text-[9px] font-semibold uppercase tracking-[.2em] text-muted-foreground/70">
                  <span className="h-px w-8 bg-white/10" /> Private order chat <span className="h-px w-8 bg-white/10" />
                </div>
                {messages.isLoading && (
                  <div className="space-y-4" aria-label="Loading messages">
                    <div className="h-16 w-[68%] animate-pulse rounded-2xl bg-white/[.045]" />
                    <div className="ml-auto h-20 w-[61%] animate-pulse rounded-2xl bg-primary/[.06]" />
                    <div className="h-12 w-[52%] animate-pulse rounded-2xl bg-white/[.045]" />
                  </div>
                )}
                {messages.isError && (
                  <div className="m-auto max-w-sm rounded-2xl border border-destructive/20 bg-destructive/[.05] p-5 text-center">
                    <p className="text-sm font-semibold">Messages could not be loaded</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try again to reopen this conversation.</p>
                    <Button variant="outline" size="sm" onClick={() => void messages.refetch()} className="mt-3 gap-2"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
                  </div>
                )}
                {messages.data?.map((item) => {
                  const isStaff = item.senderRole === "admin";
                  return (
                    <article key={item.id} className={`mb-3 flex w-full ${isStaff ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-2xl border px-3.5 py-3 sm:max-w-[72%] ${isStaff ? "rounded-br-md border-primary/20 bg-primary/[.08]" : "rounded-bl-md border-white/[.08] bg-[#171715]"}`}>
                        <p className={`mb-1.5 text-[9px] font-bold uppercase tracking-[.16em] ${isStaff ? "text-primary/80" : "text-muted-foreground"}`}>{isStaff ? "Eats team" : "Customer"}</p>
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{item.message}</p>
                        {item.createdAt && <time className="mt-2 block text-right font-mono text-[9px] text-muted-foreground/70">{formatTime(item.createdAt)}</time>}
                      </div>
                    </article>
                  );
                })}
                {!messages.isLoading && !messages.isError && !messages.data?.length && (
                  <div className="m-auto max-w-xs py-12 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/[.05] text-primary"><MessageCircle className="h-5 w-5" /></span>
                    <p className="mt-4 text-sm font-semibold">Start the conversation</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Send a message to help the customer with their Eats request.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/[.07] bg-[#0d0d0c]">
                <form onSubmit={submitReply} className="px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-end gap-2 rounded-xl border border-white/[.1] bg-[#151513] p-1.5 transition-colors focus-within:border-primary/40">
                    <Textarea
                      aria-label={`Reply to ${activeRequest.customerName}`}
                      disabled={send.isPending || messages.isError}
                      value={message}
                      maxLength={2000}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (message.trim() && !send.isPending) send.mutate(); } }}
                      placeholder="Write a reply…"
                      className="min-h-10 max-h-32 resize-y border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                    />
                    <Button type="submit" aria-label="Send reply" disabled={!message.trim() || send.isPending || messages.isError} className="h-9 shrink-0 gap-2 rounded-lg px-3 text-xs font-bold">
                      <Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{send.isPending ? "Sending" : "Send"}</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground/70">
                    <span>Enter to send <span className="px-1 text-white/20">·</span> Shift + Enter for a new line</span>
                    <span>{message.length}/2000</span>
                  </div>
                </form>

                <details className="border-t border-white/[.06]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-5">
                    <Wallet className="h-3.5 w-3.5 text-primary/80" />
                    <span>Order completion</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/70">{activeRequest.completedAt ? `Charged ${money(activeRequest.chargedAmount ?? 0)}` : "Optional · charge customer balance"}</span>
                  </summary>
                  <div className="flex flex-wrap items-end gap-2 border-t border-white/[.05] bg-white/[.015] px-4 py-3 sm:px-5">
                    {activeRequest.completedAt ? (
                      <p className="flex items-center gap-2 text-xs font-medium text-emerald-400"><Check className="h-4 w-4" /> Completed and charged {money(activeRequest.chargedAmount ?? 0)}</p>
                    ) : (
                      <>
                        <label className="min-w-36 flex-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Charge amount ($)
                          <Input aria-label="Charge amount in dollars" type="number" min="0.01" max="1000000" step="0.01" value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} placeholder="0.00" className="mt-1.5 h-9 bg-background text-sm normal-case tracking-normal" />
                        </label>
                        <Button type="button" size="sm" disabled={!Number.isSafeInteger(chargeCents) || chargeCents < 1 || chargeCents > 100000000 || complete.isPending} onClick={() => {
                          if (window.confirm(`Mark order #${activeRequest.id} complete and deduct ${money(chargeCents)} from ${activeRequest.customerName}'s balance?`)) complete.mutate();
                        }}>
                          {complete.isPending ? "Processing…" : "Complete order"}
                        </Button>
                      </>
                    )}
                  </div>
                </details>
              </div>
            </>
          ) : requests.isLoading || requests.isError ? (
            <div className="m-auto max-w-sm px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.025] text-muted-foreground"><MessageCircle className="h-5 w-5" /></span>
              <h2 className="mt-4 text-base font-semibold">{requests.isError ? "Inbox unavailable" : "Loading conversations"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{requests.isError ? "Retry the inbox request to continue." : "Your latest customer chats are on their way."}</p>
              {requests.isError && <Button variant="outline" onClick={() => void requests.refetch()} className="mt-4 gap-2"><RefreshCw className="h-4 w-4" /> Retry inbox</Button>}
            </div>
          ) : (
            <div className="m-auto max-w-sm px-6 py-12 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/15 bg-primary/[.06] text-primary"><MessageCircle className="h-6 w-6" /></span>
              <p className="mt-5 text-lg font-semibold">Ready when they are</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Customer conversations will open here. Select a chat from the queue to reply.</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
