import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clock3, MessageCircle, Send, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Category = "food" | "weed" | "facebook";
type Destination = { name: string; mark: string };
type RequestItem = { id: number; category: string; customerName: string; siteUrl: string; createdAt: string };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };

const categories: { id: Category; label: string }[] = [
  { id: "food", label: "Food Sites" },
  { id: "weed", label: "Weed Sites" },
  { id: "facebook", label: "Facebook" },
];

const destinations: Record<Category, Destination[]> = {
  food: [
    { name: "Panda Express", mark: "🐼" }, { name: "Smoothie King", mark: "🥤" },
    { name: "Jack in the Box", mark: "🍔" }, { name: "Dairy Queen", mark: "🍦" },
    { name: "Insomnia Cookies", mark: "🍪" }, { name: "Dominos Pizza", mark: "🍕" },
    { name: "Zaxbys", mark: "🍗" }, { name: "Applebees", mark: "🍽️" },
    { name: "Little Caesars", mark: "👑" }, { name: "Raising Canes (Pick Up)", mark: "🐔" },
    { name: "Papa Johns", mark: "🍕" }, { name: "Wawa", mark: "☕" },
    { name: "Sonic (Pick Up)", mark: "🌭" }, { name: "Olive Garden", mark: "🫒" },
    { name: "Jersey Mikes", mark: "🥖" }, { name: "Tropical Smoothie Café", mark: "🌴" },
    { name: "Subway", mark: "🥙" }, { name: "Chilis", mark: "🌶️" },
    { name: "Buffalo Wild Wings", mark: "🦅" }, { name: "Wingstop", mark: "🔥" },
    { name: "Firehouse Subs", mark: "🚒" }, { name: "Pizza Hut", mark: "🏠" },
    { name: "Auntie Annes", mark: "🥨" },
  ],
  weed: [
    { name: "Weed site or dispensary", mark: "W" },
    { name: "Delivery menu", mark: "D" },
    { name: "Other listing", mark: "+" },
  ],
  facebook: [
    { name: "Facebook Marketplace", mark: "f" },
    { name: "Facebook shop", mark: "S" },
    { name: "Facebook listing", mark: "L" },
  ],
};

const categoryName = (value: string) => categories.find((item) => item.id === value)?.label ?? "Food Sites";
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function BuyForYouPage() {
  const { toast } = useToast();
  const [category, setCategory] = useState<Category>("food");
  const [selected, setSelected] = useState<Destination | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", siteUrl: "" });
  const modalRef = useRef<HTMLDivElement>(null);

  const requests = useQuery<RequestItem[]>({ queryKey: ["/api/buy-for-you"], refetchInterval: 10000 });
  const activeId = selectedId ?? requests.data?.[0]?.id ?? null;
  const messages = useQuery<ChatMessage[]>({
    queryKey: ["/api/buy-for-you", activeId, "messages"],
    queryFn: async () => (await fetch(`/api/buy-for-you/${activeId}/messages`, { credentials: "include" })).json(),
    enabled: !!activeId,
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/buy-for-you", { ...form, category })).json(),
    onSuccess: (request: RequestItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
      setSelectedId(request.id);
      setSelected(null);
      setForm({ name: "", email: "", phone: "", address: "", siteUrl: "" });
      toast({ title: "Request submitted", description: "An admin will contact you in your private chat." });
    },
    onError: (error: Error) => toast({ title: "Could not submit request", description: error.message, variant: "destructive" }),
  });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", `/api/buy-for-you/${activeId}/messages`, { message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you", activeId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
    },
    onError: (error: Error) => toast({ title: "Message failed", description: error.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!selected) return;
    modalRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submitRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) create.mutate();
  };
  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeId && message.trim() && !send.isPending) send.mutate();
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-6 pb-16 text-foreground sm:py-8">
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.12] via-primary/[0.06] to-primary/[0.12] p-5 text-center sm:p-7">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-primary/70">Limited time</p>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">GET <span className="text-primary">50% OFF</span> ALL EATS</h1>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">Choose a restaurant below to start a private order chat with our team.</p>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Buy for you categories">
        {categories.map((item) => (
          <button key={item.id} role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${category === item.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border/80 bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <section aria-label={`${categoryName(category)} listings`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {destinations[category].map((item) => (
          <button key={item.name} type="button" onClick={() => setSelected(item)}
            className="group flex min-h-[100px] items-center gap-3 rounded-xl border border-border/80 bg-card/50 px-3 py-3.5 text-left transition-all hover:border-primary/35 hover:bg-primary/[0.04] active:scale-[0.98] sm:min-h-[112px] sm:px-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/[0.08] text-xl text-primary ${category === "facebook" ? "font-black" : ""}`} aria-hidden="true">{item.mark}</span>
            <span className="text-xs font-semibold leading-snug text-foreground/85 group-hover:text-foreground sm:text-sm">{item.name}</span>
          </button>
        ))}
      </section>

      <p className="text-center text-[11px] text-muted-foreground">Prices vary by location. Choose a listing to start your order request.</p>

      {requests.data?.length ? (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/50">
          <header className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">Your Eats Chat</h2>
              <p className="text-xs text-muted-foreground">Private messages with the team handling your order.</p>
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Clock3 className="h-3.5 w-3.5" /> Order history</span>
          </header>
          <div className="grid md:grid-cols-[220px_1fr]">
            <nav aria-label="Your order requests" className="flex gap-2 overflow-x-auto border-b border-border/70 p-3 md:block md:space-y-2 md:border-b-0 md:border-r">
              {requests.data.map((request) => (
                <button key={request.id} type="button" onClick={() => setSelectedId(request.id)} aria-current={activeId === request.id ? "true" : undefined}
                  className={`min-w-[170px] rounded-xl border p-3 text-left text-xs transition-colors md:w-full ${activeId === request.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background/50 text-foreground hover:border-primary/30"}`}>
                  <span className="block font-bold">{categoryName(request.category)} · #{request.id}</span>
                  <span className="mt-1 block truncate text-muted-foreground">{request.siteUrl}</span>
                </button>
              ))}
            </nav>
            <div className="flex min-h-[340px] min-w-0 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
                {messages.isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
                {messages.isError && <button className="text-sm text-destructive underline" onClick={() => void messages.refetch()}>Messages could not be loaded. Try again.</button>}
                {messages.data?.map((item) => (
                  <div key={item.id} className={`max-w-[90%] rounded-xl border p-3 text-sm ${item.senderRole === "admin" ? "border-border/80 bg-background/70" : "ml-auto border-primary/20 bg-primary/[0.08]"}`}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.senderRole === "admin" ? "Eats team" : "You"}</p>
                    <p className="whitespace-pre-wrap break-words">{item.message}</p>
                    {item.createdAt && <time className="mt-2 block text-right text-[10px] text-muted-foreground">{formatTime(item.createdAt)}</time>}
                  </div>
                ))}
                {!messages.isLoading && !messages.isError && !messages.data?.length && <p className="text-center text-sm text-muted-foreground">While you wait for an admin, send your delivery details and preferred payment method along with your cart.</p>}
              </div>
              <form onSubmit={submitMessage} className="flex items-end gap-2 border-t border-border/70 p-3 sm:p-4">
                <Textarea aria-label="Write a message" disabled={!activeId} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message…" className="min-h-11 resize-y bg-background/70" />
                <Button type="submit" size="icon" aria-label="Send message" disabled={!activeId || !message.trim() || send.isPending} className="h-11 w-11 shrink-0"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm sm:items-center sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="buy-for-you-dialog-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">{categoryName(category)}</p><h2 id="buy-for-you-dialog-title" className="mt-1 text-lg font-bold">{selected.name}</h2></div>
              <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </header>
            <form onSubmit={submitRequest} className="space-y-4 p-5">
              {category === "food" && <div className="rounded-xl border border-primary/20 bg-primary/[0.07] p-3"><p className="text-sm font-bold text-primary">50% off your Eats order</p><p className="mt-1 text-xs text-muted-foreground">An Eats team member will join your private chat to help place the order.</p></div>}
              <label className="block space-y-1.5 text-xs font-semibold">Site or listing URL <span className="text-primary">*</span><Input required type="url" maxLength={2048} placeholder="https://…" value={form.siteUrl} onChange={(event) => updateForm("siteUrl", event.target.value)} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-xs font-semibold">Full name <span className="text-primary">*</span><Input required autoComplete="name" maxLength={100} value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label>
                <label className="block space-y-1.5 text-xs font-semibold">Email <span className="text-primary">*</span><Input required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></label>
                <label className="block space-y-1.5 text-xs font-semibold">Phone number <span className="text-primary">*</span><Input required type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} /></label>
                <label className="block space-y-1.5 text-xs font-semibold sm:col-span-2">Delivery address <span className="text-primary">*</span><Textarea required autoComplete="street-address" maxLength={500} value={form.address} onChange={(event) => updateForm("address", event.target.value)} /></label>
              </div>
              <p className="text-[11px] text-muted-foreground">Your order request will be sent to our team. They’ll continue with you in this private chat.</p>
              <Button type="submit" disabled={create.isPending} className="w-full gap-2">{create.isPending ? "Sending request…" : <><Check className="h-4 w-4" /> Start order chat</>}</Button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
